import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
let mysqlPool = null;
let sqliteDb = null;

// Initialize Database Adapter
export async function initDatabase() {
  if (dbType === 'mysql') {
    let pool = null;
    try {
      console.log('[DB] Attempting MySQL connection...');
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lms',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true
      });

      // Test connection
      const connection = await pool.getConnection();
      try {
        await connection.query("SET SESSION sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''))");
      } catch (modeErr) {
        console.warn('[DB] Could not set custom session sql_mode:', modeErr.message);
      }

      // Ensure MySQL schema compatibility
      try {
        // 1. Ensure account.password column can store modern hashes (VARCHAR(255))
        try {
          await connection.query("ALTER TABLE account MODIFY COLUMN password VARCHAR(255)");
        } catch (accErr) {
          console.warn('[DB] Could not modify account.password column length:', accErr.message);
        }

        // 2. Ensure instructor.password column exists and is VARCHAR(255)
        const [instCols] = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'instructor' AND COLUMN_NAME = 'password'
        `, [process.env.DB_NAME || 'lms']);
        if (!instCols || instCols.length === 0) {
          await connection.query("ALTER TABLE instructor ADD COLUMN password VARCHAR(255) DEFAULT 'prof123'");
          console.log('[DB] Added missing password column to instructor table in MySQL.');
        } else {
          try {
            await connection.query("ALTER TABLE instructor MODIFY COLUMN password VARCHAR(255) DEFAULT 'prof123'");
          } catch {}
        }

        // 2. Ensure enrollment_request table exists
        await connection.query(`
          CREATE TABLE IF NOT EXISTS enrollment_request (
            request_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            course_id INT NOT NULL,
            status VARCHAR(30) DEFAULT 'PENDING',
            admin_approved TINYINT(1) DEFAULT 0,
            proctor_approved TINYINT(1) DEFAULT 0,
            admin_notes TEXT,
            proctor_notes TEXT,
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. Ensure instructor_notification table exists
        await connection.query(`
          CREATE TABLE IF NOT EXISTS instructor_notification (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            instructor_id INT NOT NULL,
            course_id INT DEFAULT NULL,
            student_id INT DEFAULT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (instructor_id) REFERENCES instructor (instructor_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE SET NULL,
            FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (schemaSyncErr) {
        console.warn('[DB] MySQL schema sync check notice:', schemaSyncErr.message);
      }

      connection.release();
      mysqlPool = pool;
      console.log('[DB] Connected to MySQL database successfully!');
      return { type: 'mysql' };
    } catch (err) {
      if (pool) {
        try { await pool.end(); } catch {}
      }
      mysqlPool = null;
      console.warn('[DB] MySQL connection failed. Falling back to local SQLite:', err.message || err.code || err);
      return initSqlite();
    }
  } else {
    return initSqlite();
  }
}

function initSqlite() {
  const dbPath = path.resolve(__dirname, '../../lms.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  console.log(`[DB] Connected to SQLite database at: ${dbPath}`);

  // Bootstrap tables, run migrations, and seed data
  migrateAndSeedSqlite(sqliteDb);
  return { type: 'sqlite' };
}

function migrateAndSeedSqlite(db) {
  console.log('[DB] Ensuring database schema, migrations, views, and triggers...');

  // 1. Ensure Base Tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS department (
      dept_id INTEGER PRIMARY KEY,
      dept_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS proctor (
      proctor_id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      cabin_no TEXT
    );

    CREATE TABLE IF NOT EXISTS proctor_phone (
      proctor_id INTEGER NOT NULL,
      phone_no TEXT NOT NULL,
      PRIMARY KEY (proctor_id, phone_no),
      FOREIGN KEY (proctor_id) REFERENCES proctor (proctor_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student (
      student_id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      dob TEXT,
      email TEXT NOT NULL UNIQUE,
      proctor_id INTEGER,
      FOREIGN KEY (proctor_id) REFERENCES proctor (proctor_id)
    );

    CREATE TABLE IF NOT EXISTS student_phone (
      student_id INTEGER NOT NULL,
      phone_no TEXT NOT NULL,
      PRIMARY KEY (student_id, phone_no),
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account (
      student_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      username TEXT UNIQUE,
      password TEXT,
      PRIMARY KEY (student_id, account_id),
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instructor (
      instructor_id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      cabin_no TEXT UNIQUE,
      dept_id INTEGER,
      password TEXT DEFAULT 'prof123',
      FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    );

    CREATE TABLE IF NOT EXISTS instructor_phone (
      instructor_id INTEGER NOT NULL,
      phone_no TEXT NOT NULL,
      PRIMARY KEY (instructor_id, phone_no),
      FOREIGN KEY (instructor_id) REFERENCES instructor (instructor_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course (
      course_id INTEGER PRIMARY KEY,
      course_name TEXT NOT NULL,
      dept_id INTEGER,
      FOREIGN KEY (dept_id) REFERENCES department (dept_id)
    );

    -- Phase 2: TEACHES Many-to-Many Relationship Table
    CREATE TABLE IF NOT EXISTS teaches (
      instructor_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      PRIMARY KEY (instructor_id, course_id),
      FOREIGN KEY (instructor_id) REFERENCES instructor (instructor_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS module (
      course_id INTEGER NOT NULL,
      module_no INTEGER NOT NULL,
      name TEXT,
      lecture_hours INTEGER CHECK(lecture_hours > 0),
      PRIMARY KEY (course_id, module_no),
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assignment (
      course_id INTEGER NOT NULL,
      assignment_id INTEGER NOT NULL,
      name TEXT,
      marks INTEGER CHECK(marks >= 0),
      due_date TEXT,
      PRIMARY KEY (course_id, assignment_id),
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz (
      course_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      title TEXT,
      total_marks INTEGER CHECK(total_marks > 0),
      PRIMARY KEY (course_id, quiz_id),
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS enrolls (
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      PRIMARY KEY (student_id, course_id),
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submits (
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      assignment_id INTEGER NOT NULL,
      submission_date TEXT NOT NULL,
      submission_content TEXT DEFAULT 'Completed and submitted coursework solution.',
      marks_obtained INTEGER CHECK(marks_obtained >= 0),
      instructor_feedback TEXT,
      status TEXT CHECK(status IN ('SUBMITTED', 'GRADED', 'LATE')) DEFAULT 'SUBMITTED',
      PRIMARY KEY (student_id, course_id, assignment_id),
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id, assignment_id) REFERENCES assignment (course_id, assignment_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress_analytics (
      student_id INTEGER NOT NULL,
      progress_id INTEGER NOT NULL,
      cgpa REAL CHECK(cgpa BETWEEN 0 AND 10),
      daily_tracker TEXT,
      time_spent INTEGER CHECK(time_spent >= 0),
      leaderboard_position INTEGER,
      PRIMARY KEY (student_id, progress_id),
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_feedback (
      student_id INTEGER NOT NULL,
      feedback_no INTEGER NOT NULL,
      course_id INTEGER,
      instructor_id INTEGER,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5) DEFAULT 5,
      comments TEXT DEFAULT 'Great teaching and comprehensive course content.',
      feedback_date TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, feedback_no),
      FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE,
      FOREIGN KEY (instructor_id) REFERENCES instructor (instructor_id) ON DELETE SET NULL,
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    -- Phase 5: Relational Quiz Schema
    CREATE TABLE IF NOT EXISTS quiz_question (
      course_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      marks INTEGER NOT NULL DEFAULT 10 CHECK(marks > 0),
      PRIMARY KEY (course_id, quiz_id, question_id),
      FOREIGN KEY (course_id, quiz_id) REFERENCES quiz (course_id, quiz_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_option (
      option_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN (0, 1)),
      PRIMARY KEY (course_id, quiz_id, question_id, option_id),
      FOREIGN KEY (course_id, quiz_id, question_id) REFERENCES quiz_question (course_id, quiz_id, question_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_attempt (
      attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      started_at TEXT NOT NULL DEFAULT '2026-09-14 10:00:00',
      submitted_at TEXT NOT NULL DEFAULT '2026-09-14 10:20:00',
      score INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0),
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id, quiz_id) REFERENCES quiz (course_id, quiz_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_answer (
      attempt_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option_id INTEGER NOT NULL,
      PRIMARY KEY (attempt_id, question_id),
      FOREIGN KEY (attempt_id) REFERENCES quiz_attempt (attempt_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id, quiz_id, question_id, selected_option_id) REFERENCES quiz_option (course_id, quiz_id, question_id, option_id) ON DELETE CASCADE
    );

    -- Phase 10: Normalized Study Sessions Table
    CREATE TABLE IF NOT EXISTS study_session (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      study_date TEXT NOT NULL DEFAULT '2026-09-14',
      time_spent INTEGER NOT NULL CHECK(time_spent > 0),
      topic TEXT DEFAULT 'Course Revision',
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
    );

    -- Phase 8: Database Audit Log Table
    CREATE TABLE IF NOT EXISTS audit_log (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      record_id TEXT NOT NULL,
      changed_at TEXT NOT NULL DEFAULT '2026-09-14 12:00:00',
      description TEXT
    );

    -- Phase 12: Enrollment Approval Workflow
    CREATE TABLE IF NOT EXISTS enrollment_request (
      request_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id       INTEGER NOT NULL,
      course_id        INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK(status IN ('PENDING','ADMIN_APPROVED','APPROVED','REJECTED')),
      admin_approved   INTEGER NOT NULL DEFAULT 0 CHECK(admin_approved IN (0,1)),
      proctor_approved INTEGER NOT NULL DEFAULT 0 CHECK(proctor_approved IN (0,1)),
      admin_notes      TEXT,
      requested_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, course_id),
      FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id)  REFERENCES course(course_id)   ON DELETE CASCADE
    );

    -- Phase 12: Instructor Notification Table
    CREATE TABLE IF NOT EXISTS instructor_notification (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      instructor_id   INTEGER NOT NULL,
      message         TEXT NOT NULL,
      course_id       INTEGER,
      student_id      INTEGER,
      is_read         INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
      created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id)     REFERENCES course(course_id)         ON DELETE SET NULL,
      FOREIGN KEY (student_id)    REFERENCES student(student_id)       ON DELETE SET NULL
    );
  `);

  // 2. Perform non-destructive migrations for existing tables if needed
  try {
    const feedbackCols = db.prepare("PRAGMA table_info(course_feedback)").all().map(c => c.name);
    if (!feedbackCols.includes('course_id')) {
      db.exec("ALTER TABLE course_feedback ADD COLUMN course_id INTEGER REFERENCES course(course_id);");
    }
    if (!feedbackCols.includes('rating')) {
      db.exec("ALTER TABLE course_feedback ADD COLUMN rating INTEGER CHECK(rating BETWEEN 1 AND 5) DEFAULT 5;");
    }
    if (!feedbackCols.includes('comments')) {
      db.exec("ALTER TABLE course_feedback ADD COLUMN comments TEXT DEFAULT 'Insightful course and helpful professor.';");
    }
    if (!feedbackCols.includes('feedback_date')) {
      db.exec("ALTER TABLE course_feedback ADD COLUMN feedback_date TEXT DEFAULT '2026-09-14';");
    }

    const submitCols = db.prepare("PRAGMA table_info(submits)").all().map(c => c.name);
    if (!submitCols.includes('submission_content')) {
      db.exec("ALTER TABLE submits ADD COLUMN submission_content TEXT DEFAULT 'Completed and submitted coursework solution.';");
    }
    if (!submitCols.includes('marks_obtained')) {
      db.exec("ALTER TABLE submits ADD COLUMN marks_obtained INTEGER CHECK(marks_obtained >= 0);");
    }
    if (!submitCols.includes('instructor_feedback')) {
      db.exec("ALTER TABLE submits ADD COLUMN instructor_feedback TEXT;");
    }
    if (!submitCols.includes('status')) {
      db.exec("ALTER TABLE submits ADD COLUMN status TEXT CHECK(status IN ('SUBMITTED', 'GRADED', 'LATE')) DEFAULT 'SUBMITTED';");
    }

    const instCols = db.prepare("PRAGMA table_info(instructor)").all().map(c => c.name);
    if (!instCols.includes('password')) {
      db.exec("ALTER TABLE instructor ADD COLUMN password TEXT DEFAULT 'prof123';");
    }
  } catch (e) {
    console.warn('[DB Migration Notice]', e.message);
  }

  // 3. Phase 9: Database Views
  db.exec(`
    DROP VIEW IF EXISTS student_course_view;
    CREATE VIEW student_course_view AS
    SELECT s.student_id, s.first_name, s.last_name, s.email,
           c.course_id, c.course_name, d.dept_name,
           i.instructor_id, i.first_name AS instructor_first, i.last_name AS instructor_last
    FROM student s
    JOIN enrolls e ON s.student_id = e.student_id
    JOIN course c ON e.course_id = c.course_id
    LEFT JOIN department d ON c.dept_id = d.dept_id
    LEFT JOIN teaches t ON c.course_id = t.course_id
    LEFT JOIN instructor i ON t.instructor_id = i.instructor_id;

    DROP VIEW IF EXISTS course_enrollment_summary;
    CREATE VIEW course_enrollment_summary AS
    SELECT c.course_id, c.course_name, d.dept_name,
           COUNT(e.student_id) AS enrolled_students
    FROM course c
    LEFT JOIN department d ON c.dept_id = d.dept_id
    LEFT JOIN enrolls e ON c.course_id = e.course_id
    GROUP BY c.course_id, c.course_name, d.dept_name;

    DROP VIEW IF EXISTS student_performance_view;
    CREATE VIEW student_performance_view AS
    SELECT s.student_id, s.first_name, s.last_name, s.email,
           COUNT(DISTINCT e.course_id) AS total_courses,
           COUNT(DISTINCT sub.assignment_id) AS assignments_submitted,
           ROUND(AVG(sub.marks_obtained), 2) AS avg_assignment_marks,
           ROUND(AVG(qa.score), 2) AS avg_quiz_score,
           COALESCE(SUM(ss.time_spent), 0) AS total_study_minutes
    FROM student s
    LEFT JOIN enrolls e ON s.student_id = e.student_id
    LEFT JOIN submits sub ON s.student_id = sub.student_id
    LEFT JOIN quiz_attempt qa ON s.student_id = qa.student_id
    LEFT JOIN study_session ss ON s.student_id = ss.student_id
    GROUP BY s.student_id, s.first_name, s.last_name, s.email;

    DROP VIEW IF EXISTS course_feedback_summary;
    CREATE VIEW course_feedback_summary AS
    SELECT c.course_id, c.course_name,
           COUNT(cf.feedback_no) AS total_feedback_count,
           ROUND(AVG(cf.rating), 2) AS average_rating
    FROM course c
    LEFT JOIN course_feedback cf ON c.course_id = cf.course_id
    GROUP BY c.course_id, c.course_name;
  `);

  // 4. Phase 8: Database Triggers (SQLite)
  db.exec(`
    DROP TRIGGER IF EXISTS trg_student_age_insert;
    CREATE TRIGGER trg_student_age_insert
    BEFORE INSERT ON student
    FOR EACH ROW
    WHEN NEW.dob IS NOT NULL AND (strftime('%Y', 'now') - strftime('%Y', NEW.dob) - (strftime('%m-%d', 'now') < strftime('%m-%d', NEW.dob))) < 16
    BEGIN
      SELECT RAISE(ABORT, 'Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.');
    END;

    DROP TRIGGER IF EXISTS trg_student_age_update;
    CREATE TRIGGER trg_student_age_update
    BEFORE UPDATE OF dob ON student
    FOR EACH ROW
    WHEN NEW.dob IS NOT NULL AND (strftime('%Y', 'now') - strftime('%Y', NEW.dob) - (strftime('%m-%d', 'now') < strftime('%m-%d', NEW.dob))) < 16
    BEGIN
      SELECT RAISE(ABORT, 'Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.');
    END;

    DROP TRIGGER IF EXISTS trg_submission_marks_check;
    CREATE TRIGGER trg_submission_marks_check
    BEFORE INSERT ON submits
    FOR EACH ROW
    WHEN NEW.marks_obtained IS NOT NULL AND (
      NEW.marks_obtained < 0 OR NEW.marks_obtained > (
        SELECT marks FROM assignment WHERE course_id = NEW.course_id AND assignment_id = NEW.assignment_id
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Constraint Violation (Trigger trg_submission_marks_check): Marks obtained cannot exceed assignment maximum marks or be negative.');
    END;

    DROP TRIGGER IF EXISTS trg_submission_marks_check_update;
    CREATE TRIGGER trg_submission_marks_check_update
    BEFORE UPDATE OF marks_obtained ON submits
    FOR EACH ROW
    WHEN NEW.marks_obtained IS NOT NULL AND (
      NEW.marks_obtained < 0 OR NEW.marks_obtained > (
        SELECT marks FROM assignment WHERE course_id = NEW.course_id AND assignment_id = NEW.assignment_id
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Constraint Violation (Trigger trg_submission_marks_check): Marks obtained cannot exceed assignment maximum marks or be negative.');
    END;

    DROP TRIGGER IF EXISTS trg_student_audit_insert;
    CREATE TRIGGER trg_student_audit_insert
    AFTER INSERT ON student
    FOR EACH ROW
    BEGIN
      INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
      VALUES ('student', 'INSERT', CAST(NEW.student_id AS TEXT), datetime('now'), 'New student registered: ' || NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ')');
    END;

    DROP TRIGGER IF EXISTS trg_student_audit_update;
    CREATE TRIGGER trg_student_audit_update
    AFTER UPDATE ON student
    FOR EACH ROW
    BEGIN
      INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
      VALUES ('student', 'UPDATE', CAST(NEW.student_id AS TEXT), datetime('now'), 'Student record updated: ' || NEW.first_name || ' ' || NEW.last_name);
    END;

    DROP TRIGGER IF EXISTS trg_student_audit_delete;
    CREATE TRIGGER trg_student_audit_delete
    AFTER DELETE ON student
    FOR EACH ROW
    BEGIN
      INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
      VALUES ('student', 'DELETE', CAST(OLD.student_id AS TEXT), datetime('now'), 'Student record removed: ' || OLD.first_name || ' ' || OLD.last_name);
    END;
  `);

  // 5. Phase 12: Performance Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_student_email ON student(email);
    CREATE INDEX IF NOT EXISTS idx_course_dept ON course(dept_id);
    CREATE INDEX IF NOT EXISTS idx_enrolls_course ON enrolls(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrolls_student ON enrolls(student_id);
    CREATE INDEX IF NOT EXISTS idx_submits_lookup ON submits(course_id, assignment_id);
    CREATE INDEX IF NOT EXISTS idx_submits_student ON submits(student_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_course ON course_feedback(course_id);
    CREATE INDEX IF NOT EXISTS idx_teaches_course ON teaches(course_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_course ON quiz(course_id);
    CREATE INDEX IF NOT EXISTS idx_study_session_student ON study_session(student_id);
  `);

  // 6. Seed Data for new and existing tables
  seedAllData(db);
}

function seedAllData(db) {
  // Departments
  db.exec(`
    INSERT OR IGNORE INTO department (dept_id, dept_name) VALUES 
      (1, 'CSE'), (2, 'ECE'), (3, 'MECH'), (4, 'CIVIL'), (5, 'IT');
  `);

  // Proctors
  db.exec(`
    INSERT OR IGNORE INTO proctor (proctor_id, first_name, middle_name, last_name, cabin_no) VALUES
      (1, 'Anu', 'M', 'Nair', 'C101'),
      (2, 'Ravi', 'K', 'Menon', 'C102'),
      (3, 'Sara', 'L', 'Jose', 'C103'),
      (4, 'John', 'P', 'Varghese', 'C104'),
      (5, 'Meera', 'T', 'Das', 'C105');
  `);

  // Proctor phones
  db.exec(`
    INSERT OR IGNORE INTO proctor_phone (proctor_id, phone_no) VALUES
      (1, '9876543210'), (2, '9876543211'), (3, '9876543212'), (4, '9876543213'), (5, '9876543214');
  `);

  // Instructors (5)
  db.exec(`
    INSERT OR IGNORE INTO instructor (instructor_id, first_name, middle_name, last_name, email, cabin_no, dept_id) VALUES
      (201, 'Raj', 'K', 'Menon', 'raj@gmail.com', 'I101', 1),
      (202, 'Anita', 'S', 'Nair', 'anita@gmail.com', 'I102', 2),
      (203, 'Thomas', 'P', 'Jose', 'thomas@gmail.com', 'I103', 3),
      (204, 'Divya', 'R', 'Das', 'divya@gmail.com', 'I104', 4),
      (205, 'Vivek', 'M', 'Kumar', 'vivek@gmail.com', 'I105', 5);
  `);

  // Instructor phones
  db.exec(`
    INSERT OR IGNORE INTO instructor_phone (instructor_id, phone_no) VALUES
      (201, '9000000001'), (202, '9000000002'), (203, '9000000003'), (204, '9000000004'), (205, '9000000005');
  `);

  // Courses (8 courses)
  db.exec(`
    INSERT OR IGNORE INTO course (course_id, course_name, dept_id) VALUES
      (301, 'DBMS', 1),
      (302, 'Networks', 2),
      (303, 'Thermodynamics', 3),
      (304, 'Structures', 4),
      (305, 'Data Science', 5),
      (306, 'Operating Systems', 1),
      (307, 'Digital Electronics', 2),
      (308, 'Machine Learning', 5);
  `);

  // Phase 2: TEACHES M:N Relationship
  db.exec(`
    INSERT OR IGNORE INTO teaches (instructor_id, course_id) VALUES
      (201, 301),
      (201, 306),
      (202, 302),
      (202, 307),
      (203, 303),
      (204, 304),
      (205, 305),
      (205, 308),
      (205, 301),
      (201, 305);
  `);

  // Students (12 realistic students)
  db.exec(`
    INSERT OR IGNORE INTO student (student_id, first_name, middle_name, last_name, dob, email, proctor_id) VALUES
      (101, 'Akhil', 'K', 'Nair', '2000-05-10', 'akhil@gmail.com', 1),
      (102, 'Neha', 'R', 'Das', '2001-03-12', 'neha@gmail.com', 2),
      (103, 'Rahul', 'M', 'Varma', '1999-07-22', 'rahul@gmail.com', 3),
      (104, 'Sneha', 'P', 'Menon', '2002-01-15', 'sneha@gmail.com', 4),
      (105, 'Arjun', 'S', 'Pillai', '2000-09-30', 'arjun@gmail.com', 5),
      (106, 'Vikram', 'R', 'Sharma', '2001-04-10', 'vikram@gmail.com', 1),
      (107, 'Ananya', 'V', 'Iyer', '2002-08-14', 'ananya@gmail.com', 2),
      (108, 'Rohan', 'S', 'Gupta', '2000-11-20', 'rohan@gmail.com', 3),
      (109, 'Pooja', 'B', 'Rao', '2001-06-05', 'pooja@gmail.com', 4),
      (110, 'Siddharth', 'N', 'Patel', '1999-12-18', 'sid@gmail.com', 5),
      (111, 'Kavya', 'M', 'Reddy', '2002-02-28', 'kavya@gmail.com', 1),
      (112, 'Aditya', 'C', 'Joshi', '2001-10-10', 'aditya@gmail.com', 2);
  `);

  // Accounts
  db.exec(`
    INSERT OR IGNORE INTO account (student_id, account_id, username, password) VALUES
      (101, 1, 'akhil_user', 'pass1'),
      (102, 1, 'neha_user', 'pass2'),
      (103, 1, 'rahul_user', 'pass3'),
      (104, 1, 'sneha_user', 'pass4'),
      (105, 1, 'arjun_user', 'pass5'),
      (106, 1, 'vikram_user', 'pass6'),
      (107, 1, 'ananya_user', 'pass7'),
      (108, 1, 'rohan_user', 'pass8'),
      (109, 1, 'pooja_user', 'pass9'),
      (110, 1, 'sid_user', 'pass10'),
      (111, 1, 'kavya_user', 'pass11'),
      (112, 1, 'aditya_user', 'pass12');
  `);

  // Student phones
  db.exec(`
    INSERT OR IGNORE INTO student_phone (student_id, phone_no) VALUES
      (101, '9123456780'), (102, '9123456781'), (103, '9123456782'),
      (104, '9123456783'), (105, '9123456784'), (106, '9123456785'),
      (107, '9123456786'), (108, '9123456787'), (109, '9123456788'),
      (110, '9123456789'), (111, '9123456790'), (112, '9123456791');
  `);

  // Modules
  db.exec(`
    INSERT OR IGNORE INTO module (course_id, module_no, name, lecture_hours) VALUES
      (301, 1, 'ER Model & Relational Algebra', 10),
      (301, 2, 'SQL, Normalization & BCNF', 12),
      (302, 1, 'OSI Reference Model', 8),
      (302, 2, 'TCP/IP and Routing Protocols', 10),
      (303, 1, 'Laws of Thermodynamics', 9),
      (304, 1, 'Structural Load & Stress Analysis', 7),
      (305, 1, 'Python for Data Science', 12),
      (306, 1, 'Processes, Threads & Scheduling', 10),
      (307, 1, 'Boolean Logic & Gate Design', 8),
      (308, 1, 'Supervised & Unsupervised Learning', 14);
  `);

  // Assignments
  db.exec(`
    INSERT OR IGNORE INTO assignment (course_id, assignment_id, name, marks, due_date) VALUES
      (301, 1, 'SQL & Normalization Assignment', 100, '2026-10-01'),
      (301, 2, 'Stored Procedures & Triggers', 50, '2026-10-15'),
      (302, 1, 'Routing Protocols & Wireshark Lab', 80, '2026-10-02'),
      (303, 1, 'Heat Transfer Problem Set', 70, '2026-10-03'),
      (304, 1, 'Truss Bridge Structural Analysis', 60, '2026-10-04'),
      (305, 1, 'Exploratory Data Analysis Project', 90, '2026-10-05'),
      (306, 1, 'Process Synchronization in C', 75, '2026-10-12'),
      (307, 1, 'Karnaugh Maps & Combinational Circuits', 50, '2026-10-18'),
      (308, 1, 'Linear Regression & Classification', 100, '2026-10-25');
  `);

  // Quizzes
  db.exec(`
    INSERT OR IGNORE INTO quiz (course_id, quiz_id, title, total_marks) VALUES
      (301, 1, 'DBMS Fundamentals & SQL Quiz', 30),
      (302, 1, 'Computer Networks Protocol Quiz', 30),
      (303, 1, 'Thermodynamics Assessment', 30),
      (304, 1, 'Structural Mechanics Quiz', 30),
      (305, 1, 'Data Science Foundations Quiz', 30),
      (306, 1, 'Operating Systems Concurrency Quiz', 30);
  `);

  // Phase 5: Quiz Questions
  db.exec(`
    INSERT OR IGNORE INTO quiz_question (course_id, quiz_id, question_id, question_text, marks) VALUES
      -- Quiz 1: DBMS (Course 301)
      (301, 1, 1, 'What is the primary purpose of database normalization?', 10),
      (301, 1, 2, 'Which normal form eliminates partial dependencies on a composite primary key?', 10),
      (301, 1, 3, 'Which SQL clause is executed after GROUP BY to filter aggregate results?', 10),
      -- Quiz 2: Networks (Course 302)
      (302, 1, 1, 'Which layer in the OSI model is responsible for end-to-end packet delivery?', 10),
      (302, 1, 2, 'What protocol is connection-oriented and provides reliable stream delivery?', 10),
      (302, 1, 3, 'Which port is standard for HTTPS communication?', 10),
      -- Quiz 3: Thermodynamics (Course 303)
      (303, 1, 1, 'What does the First Law of Thermodynamics state?', 10),
      (303, 1, 2, 'Which thermodynamic process occurs at strictly constant volume?', 10),
      (303, 1, 3, 'Which cycle represents the theoretical upper limit of heat engine efficiency?', 10),
      -- Quiz 4: Structural Mechanics (Course 304)
      (304, 1, 1, 'What is the ratio of lateral strain to longitudinal strain known as?', 10),
      (304, 1, 2, 'In a simply supported beam with central point load, where is the maximum bending moment?', 10),
      (304, 1, 3, 'Which law defines stress as directly proportional to strain within the elastic limit?', 10),
      -- Quiz 5: Data Science (Course 305)
      (305, 1, 1, 'Which Python library is standard for tabular data manipulation?', 10),
      (305, 1, 2, 'What metric measures the spread of numerical values from the mean?', 10),
      (305, 1, 3, 'Which algorithm is commonly used for classification tasks?', 10),
      -- Quiz 6: Operating Systems (Course 306)
      (306, 1, 1, 'Which condition is NOT one of Coffman four conditions required for deadlock?', 10),
      (306, 1, 2, 'Which scheduling algorithm assigns fixed time slices in cyclic order?', 10),
      (306, 1, 3, 'Which memory management scheme eliminates external fragmentation via fixed-size blocks?', 10);
  `);

  // Phase 5: Quiz Options
  db.exec(`
    INSERT OR IGNORE INTO quiz_option (option_id, course_id, quiz_id, question_id, option_text, is_correct) VALUES
      -- Quiz 1, Q1
      (1, 301, 1, 1, 'Eliminate data redundancy and prevent modification anomalies', 1),
      (2, 301, 1, 1, 'Maximize storage disk space across distributed servers', 0),
      (3, 301, 1, 1, 'Avoid ever needing SQL JOIN operations', 0),
      (4, 301, 1, 1, 'Ensure all columns have alphanumeric values', 0),
      -- Quiz 1, Q2
      (1, 301, 1, 2, 'First Normal Form (1NF)', 0),
      (2, 301, 1, 2, 'Second Normal Form (2NF)', 1),
      (3, 301, 1, 2, 'Third Normal Form (3NF)', 0),
      (4, 301, 1, 2, 'Boyce-Codd Normal Form (BCNF)', 0),
      -- Quiz 1, Q3
      (1, 301, 1, 3, 'WHERE', 0),
      (2, 301, 1, 3, 'ORDER BY', 0),
      (3, 301, 1, 3, 'HAVING', 1),
      (4, 301, 1, 3, 'LIMIT', 0),
      -- Quiz 2, Q1
      (1, 302, 1, 1, 'Network Layer', 1),
      (2, 302, 1, 1, 'Data Link Layer', 0),
      (3, 302, 1, 1, 'Session Layer', 0),
      (4, 302, 1, 1, 'Presentation Layer', 0),
      -- Quiz 2, Q2
      (1, 302, 1, 2, 'UDP', 0),
      (2, 302, 1, 2, 'TCP', 1),
      (3, 302, 1, 2, 'ICMP', 0),
      (4, 302, 1, 2, 'ARP', 0),
      -- Quiz 2, Q3
      (1, 302, 1, 3, '80', 0),
      (2, 302, 1, 3, '443', 1),
      (3, 302, 1, 3, '22', 0),
      (4, 302, 1, 3, '8080', 0),
      -- Quiz 3, Q1
      (1, 303, 1, 1, 'Conservation of Energy principle', 1),
      (2, 303, 1, 1, 'Entropy always increases', 0),
      (3, 303, 1, 1, 'Absolute zero is unattainable', 0),
      (4, 303, 1, 1, 'Ideal gas pressure-volume constancy', 0),
      -- Quiz 3, Q2
      (1, 303, 1, 2, 'Isochoric process', 1),
      (2, 303, 1, 2, 'Isobaric process', 0),
      (3, 303, 1, 2, 'Isothermal process', 0),
      (4, 303, 1, 2, 'Adiabatic process', 0),
      -- Quiz 3, Q3
      (1, 303, 1, 3, 'Carnot cycle', 1),
      (2, 303, 1, 3, 'Rankine cycle', 0),
      (3, 303, 1, 3, 'Diesel cycle', 0),
      (4, 303, 1, 3, 'Otto cycle', 0),
      -- Quiz 4, Q1
      (1, 304, 1, 1, 'Poissons ratio', 1),
      (2, 304, 1, 1, 'Youngs modulus', 0),
      (3, 304, 1, 1, 'Shear modulus', 0),
      (4, 304, 1, 1, 'Bulk modulus', 0),
      -- Quiz 4, Q2
      (1, 304, 1, 2, 'At the midpoint of the beam span', 1),
      (2, 304, 1, 2, 'At the left support', 0),
      (3, 304, 1, 2, 'At the right support', 0),
      (4, 304, 1, 2, 'Uniformly along the beam length', 0),
      -- Quiz 4, Q3
      (1, 304, 1, 3, 'Hookes Law', 1),
      (2, 304, 1, 3, 'Newtons Law', 0),
      (3, 304, 1, 3, 'Bernoullis Law', 0),
      (4, 304, 1, 3, 'Pascals Law', 0),
      -- Quiz 5, Q1
      (1, 305, 1, 1, 'Pandas', 1),
      (2, 305, 1, 1, 'Flask', 0),
      (3, 305, 1, 1, 'Pygame', 0),
      (4, 305, 1, 1, 'BeautifulSoup', 0),
      -- Quiz 5, Q2
      (1, 305, 1, 2, 'Standard Deviation', 1),
      (2, 305, 1, 2, 'Mode', 0),
      (3, 305, 1, 2, 'Median', 0),
      (4, 305, 1, 2, 'Correlation Coefficient', 0),
      -- Quiz 5, Q3
      (1, 305, 1, 3, 'Logistic Regression', 1),
      (2, 305, 1, 3, 'K-Means Clustering', 0),
      (3, 305, 1, 3, 'Principal Component Analysis (PCA)', 0),
      (4, 305, 1, 3, 'Apriori Algorithm', 0),
      -- Quiz 6, Q1
      (1, 306, 1, 1, 'Preemption Allowed', 1),
      (2, 306, 1, 1, 'Mutual Exclusion', 0),
      (3, 306, 1, 1, 'Hold and Wait', 0),
      (4, 306, 1, 1, 'Circular Wait', 0),
      -- Quiz 6, Q2
      (1, 306, 1, 2, 'Round Robin (RR)', 1),
      (2, 306, 1, 2, 'Shortest Job First', 0),
      (3, 306, 1, 2, 'First Come First Served', 0),
      (4, 306, 1, 2, 'Priority Scheduling', 0),
      -- Quiz 6, Q3
      (1, 306, 1, 3, 'Paging', 1),
      (2, 306, 1, 3, 'Swapping', 0),
      (3, 306, 1, 3, 'Contiguous Allocation', 0),
      (4, 306, 1, 3, 'Dynamic Relocation', 0);
  `);

  // Enrolls (25 realistic enrollments)
  db.exec(`
    INSERT OR IGNORE INTO enrolls (student_id, course_id) VALUES
      (101, 301), (101, 302), (101, 305), (101, 306),
      (102, 301), (102, 302), (102, 307),
      (103, 301), (103, 303), (103, 306),
      (104, 302), (104, 304), (104, 307),
      (105, 301), (105, 305), (105, 308),
      (106, 301), (106, 306),
      (107, 302), (107, 307),
      (108, 303), (108, 304),
      (109, 304), (109, 305),
      (110, 305), (110, 308),
      (111, 301), (111, 302),
      (112, 301), (112, 305);
  `);

  // Phase 4 & Phase 18: Submissions (16 realistic records with status, marks, feedback)
  db.exec(`
    INSERT OR IGNORE INTO submits (student_id, course_id, assignment_id, submission_date, submission_content, marks_obtained, instructor_feedback, status) VALUES
      (101, 301, 1, '2026-09-01', 'Implemented 3NF relational schema and verified candidate keys using functional dependency algorithm.', 95, 'Excellent relational modeling and query clarity.', 'GRADED'),
      (102, 302, 1, '2026-09-02', 'Packet capture analysis of TCP three-way handshake with wireshark trace logs.', 75, 'Solid analysis, add more details on congestion window.', 'GRADED'),
      (103, 303, 1, '2026-09-03', 'Carnot cycle efficiency derivations and entropy calculations for closed systems.', 65, 'Good derivations, minor error in equation 4.', 'GRADED'),
      (104, 304, 1, '2026-09-04', 'Truss load calculation matrices with structural strain finite elements.', 55, 'Review cantilever boundary conditions.', 'GRADED'),
      (105, 305, 1, '2026-09-05', 'Exploratory data analysis on census demographics using pandas and seaborn visualizations.', 88, 'Comprehensive visualizations and clear executive summary.', 'GRADED'),
      (106, 301, 1, '2026-09-06', 'SQL query optimization report using EXPLAIN and composite indexes.', 92, 'Great use of indexing for performance.', 'GRADED'),
      (107, 302, 1, '2026-09-07', 'Configured OSPF multi-area routing topology on Cisco Packet Tracer.', 78, 'Correct area assignments.', 'GRADED'),
      (101, 301, 2, '2026-09-10', 'Implemented stored procedures for student enrollment and trigger audit logging.', NULL, NULL, 'SUBMITTED'),
      (102, 301, 1, '2026-09-11', 'Comprehensive database normalization write-up.', 88, 'Well structured.', 'GRADED'),
      (105, 308, 1, '2026-09-12', 'Trained Random Forest and Gradient Boosting models on credit risk dataset.', 94, 'Superb model metrics and validation curve.', 'GRADED'),
      (103, 306, 1, '2026-09-13', 'Producer-Consumer synchronization with POSIX semaphores and mutexes.', 70, 'Working implementation, clean code.', 'GRADED'),
      (104, 307, 1, '2026-09-14', 'Designed 4-bit synchronous binary counter using JK flip-flops.', 48, 'Good circuit schematic.', 'GRADED'),
      (108, 303, 1, '2026-09-14', 'Gas turbine Brayton cycle pressure ratios and thermal efficiency curves.', 68, 'Accurate numerical calculations.', 'GRADED'),
      (110, 308, 1, '2026-09-14', 'Hyperparameter tuning for Support Vector Classifier using GridSearchCV.', 92, 'Solid methodology and parameter search grid.', 'GRADED'),
      (111, 301, 1, '2026-09-15', 'Relational database schema diagrams and Boyce-Codd normal form decomposition.', NULL, NULL, 'LATE'),
      (112, 305, 1, '2026-09-14', 'Customer churn prediction pipeline using logistic regression.', NULL, NULL, 'SUBMITTED');
  `);

  // Phase 5: Quiz Attempts & Answers
  db.exec(`
    INSERT OR IGNORE INTO quiz_attempt (attempt_id, student_id, course_id, quiz_id, score, started_at, submitted_at) VALUES
      (1, 101, 301, 1, 30, '2026-09-10 10:00:00', '2026-09-10 10:22:00'),
      (2, 102, 301, 1, 20, '2026-09-10 11:00:00', '2026-09-10 11:25:00'),
      (3, 105, 301, 1, 30, '2026-09-10 14:00:00', '2026-09-10 14:18:00'),
      (4, 101, 302, 1, 30, '2026-09-11 09:30:00', '2026-09-11 09:50:00'),
      (5, 103, 303, 1, 30, '2026-09-12 10:15:00', '2026-09-12 10:35:00'),
      (6, 106, 306, 1, 20, '2026-09-13 15:00:00', '2026-09-13 15:20:00');
  `);

  db.exec(`
    INSERT OR IGNORE INTO quiz_answer (attempt_id, course_id, quiz_id, question_id, selected_option_id) VALUES
      (1, 301, 1, 1, 1), (1, 301, 1, 2, 2), (1, 301, 1, 3, 3),
      (2, 301, 1, 1, 1), (2, 301, 1, 2, 1), (2, 301, 1, 3, 3),
      (3, 301, 1, 1, 1), (3, 301, 1, 2, 2), (3, 301, 1, 3, 3),
      (4, 302, 1, 1, 1), (4, 302, 1, 2, 2), (4, 302, 1, 3, 2),
      (5, 303, 1, 1, 1), (5, 303, 1, 2, 1), (5, 303, 1, 3, 1),
      (6, 306, 1, 1, 1), (6, 306, 1, 2, 1), (6, 306, 1, 3, 2);
  `);

  // Phase 3 & Phase 18: Course Feedback (16 realistic records)
  db.exec(`
    INSERT OR IGNORE INTO course_feedback (student_id, feedback_no, course_id, instructor_id, rating, comments, feedback_date) VALUES
      (101, 1, 301, 201, 5, 'Prof. Raj explains relational calculus and SQL query optimization with tremendous clarity.', '2026-09-08 14:20:00'),
      (102, 1, 302, 202, 4, 'Very engaging computer networking lectures and hands-on lab experiments.', '2026-09-08 15:10:00'),
      (103, 1, 303, 203, 4, 'Rigorous thermodynamics problem sets and helpful office hour assistance.', '2026-09-09 10:00:00'),
      (104, 1, 304, 204, 3, 'Good structural engineering theory, more practical design software demos would help.', '2026-09-09 11:30:00'),
      (105, 1, 305, 205, 5, 'Data science practical assignments with Python and machine learning algorithms are top notch!', '2026-09-09 16:45:00'),
      (106, 1, 301, 201, 5, 'The stored procedure and trigger demonstrations were extremely insightful.', '2026-09-10 12:15:00'),
      (101, 2, 305, 205, 5, 'Excellent machine learning overview and intuitive explanations of gradient descent.', '2026-09-11 17:00:00'),
      (102, 2, 301, 205, 4, 'Great co-instructor coverage for DBMS query optimization.', '2026-09-12 09:30:00'),
      (107, 1, 302, 202, 5, 'Wireshark lab sessions made network packet structure very easy to grasp.', '2026-09-12 11:00:00'),
      (108, 1, 303, 203, 4, 'Clear derivations on steam tables and entropy equations.', '2026-09-12 14:20:00'),
      (109, 1, 304, 204, 4, 'Truss bridge load simulations were very practical.', '2026-09-13 10:30:00'),
      (110, 1, 305, 205, 5, 'Loved the statistical learning and feature engineering modules.', '2026-09-13 15:15:00'),
      (111, 1, 301, 201, 5, 'Best computer science course this semester, fantastic indexing explanations.', '2026-09-13 16:40:00'),
      (112, 1, 305, 205, 4, 'Practical data science exercises with real-world datasets.', '2026-09-14 09:10:00'),
      (103, 2, 306, 201, 5, 'Concurrency mechanisms and thread synchronization were explained brilliantly.', '2026-09-14 11:45:00'),
      (105, 2, 308, 205, 5, 'Supervised learning and ensemble models taught with rigorous mathematics.', '2026-09-14 13:00:00');
  `);

  // Progress Analytics
  db.exec(`
    INSERT OR IGNORE INTO progress_analytics (student_id, progress_id, cgpa, daily_tracker, time_spent, leaderboard_position) VALUES
      (101, 1, 8.50, 'Excellent', 240, 1),
      (102, 1, 7.80, 'Good', 180, 2),
      (103, 1, 9.10, 'Outstanding', 280, 1),
      (104, 1, 6.90, 'Average', 120, 4),
      (105, 1, 8.20, 'Good', 210, 3),
      (106, 1, 8.70, 'Excellent', 220, 2),
      (107, 1, 7.95, 'Good', 175, 3),
      (108, 1, 8.10, 'Good', 190, 3),
      (109, 1, 7.20, 'Average', 130, 4),
      (110, 1, 8.40, 'Good', 205, 2),
      (111, 1, 8.90, 'Excellent', 250, 1),
      (112, 1, 7.60, 'Good', 160, 3);
  `);

  // Phase 10 & Phase 18: Study Sessions (17 realistic records)
  db.exec(`
    INSERT OR IGNORE INTO study_session (student_id, study_date, time_spent, topic) VALUES
      (101, '2026-09-01 10:00:00', 60, 'Relational Algebra & Normalization'),
      (101, '2026-09-03 14:30:00', 90, 'SQL Subqueries & Views'),
      (101, '2026-09-06 18:00:00', 90, 'Database Indexing & Transactions'),
      (102, '2026-09-02 11:00:00', 60, 'TCP/IP Model Revision'),
      (102, '2026-09-05 16:00:00', 120, 'Wireshark Protocol Capture'),
      (103, '2026-09-03 09:00:00', 140, 'Entropy and Thermodynamics Laws'),
      (103, '2026-09-07 15:00:00', 140, 'Steam Tables & Carnot Engine'),
      (104, '2026-09-04 10:30:00', 60, 'Beam Stress Analysis'),
      (104, '2026-09-08 11:00:00', 60, 'Structural Deflection Calculations'),
      (105, '2026-09-05 13:00:00', 110, 'Pandas DataFrames & Plotting'),
      (105, '2026-09-09 17:00:00', 100, 'Scikit-Learn Classification Models'),
      (106, '2026-09-10 14:00:00', 110, 'Query Execution Plan & B-Tree Indexes'),
      (107, '2026-09-11 10:00:00', 85, 'OSPF & BGP Dynamic Routing Protocols'),
      (108, '2026-09-12 11:30:00', 95, 'Heat Exchanger Sizing & Enthalpy'),
      (109, '2026-09-12 16:00:00', 65, 'Matrix Stiffness Structural Method'),
      (110, '2026-09-13 14:00:00', 105, 'Ensemble Learning & Feature Selection'),
      (111, '2026-09-14 09:30:00', 125, 'Stored Procedures & Relational Division');
  `);

  // Phase 8: Audit Log Initial Record
  db.exec(`
    INSERT OR IGNORE INTO audit_log (audit_id, table_name, operation, record_id, changed_at, description) VALUES
      (1, 'system', 'INSERT', 'INIT-001', '2026-09-01 00:00:00', 'LMS Academic Database Schema and Seed Initialization Complete');
  `);

  // Backfill course_id and rating for any existing feedback that might lack them
  try {
    db.exec(`
      UPDATE course_feedback SET course_id = 301, rating = 5 WHERE course_id IS NULL AND instructor_id = 201;
      UPDATE course_feedback SET course_id = 302, rating = 4 WHERE course_id IS NULL AND instructor_id = 202;
      UPDATE course_feedback SET course_id = 303, rating = 4 WHERE course_id IS NULL AND instructor_id = 203;
      UPDATE course_feedback SET course_id = 304, rating = 3 WHERE course_id IS NULL AND instructor_id = 204;
      UPDATE course_feedback SET course_id = 305, rating = 5 WHERE course_id IS NULL AND instructor_id = 205;
      UPDATE course_feedback SET course_id = 301, rating = 5 WHERE course_id IS NULL;
    `);
  } catch {}

  console.log('[DB] Database migration and seeding verified successfully.');
}

// Dialect Query Adaptation Helper
export function adaptSqlForDialect(sql, isMysql) {
  if (!sql || typeof sql !== 'string') return sql;
  if (isMysql) {
    return sql
      .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
      .replace(/datetime\(\s*'now'\s*,\s*'-?(\d+)\s*minutes?'\s*\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 MINUTE)')
      .replace(/datetime\(\s*'now'\s*,\s*'\+?(\d+)\s*minutes?'\s*\)/gi, 'DATE_ADD(NOW(), INTERVAL $1 MINUTE)')
      .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()');
  } else {
    return sql
      .replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');
  }
}

// Unified Query Helpers
export async function dbAll(sql, params = []) {
  if (mysqlPool) {
    const adaptedSql = adaptSqlForDialect(sql, true);
    const [rows] = await mysqlPool.execute(adaptedSql, params);
    return rows;
  } else if (sqliteDb) {
    const adaptedSql = adaptSqlForDialect(sql, false);
    return sqliteDb.prepare(adaptedSql).all(...params);
  }
  throw new Error('Database not initialized');
}

export async function dbGet(sql, params = []) {
  if (mysqlPool) {
    const adaptedSql = adaptSqlForDialect(sql, true);
    const [rows] = await mysqlPool.execute(adaptedSql, params);
    return rows[0] || null;
  } else if (sqliteDb) {
    const adaptedSql = adaptSqlForDialect(sql, false);
    return sqliteDb.prepare(adaptedSql).get(...params) || null;
  }
  throw new Error('Database not initialized');
}

export async function dbRun(sql, params = []) {
  if (mysqlPool) {
    const adaptedSql = adaptSqlForDialect(sql, true);
    const [result] = await mysqlPool.execute(adaptedSql, params);
    return {
      changes: result.affectedRows,
      lastInsertRowid: result.insertId,
    };
  } else if (sqliteDb) {
    const adaptedSql = adaptSqlForDialect(sql, false);
    const info = sqliteDb.prepare(adaptedSql).run(...params);
    return {
      changes: info.changes,
      lastInsertRowid: info.lastInsertRowid,
    };
  }
  throw new Error('Database not initialized');
}

// Phase 11: Transaction Helper
export async function dbTransaction(callback) {
  if (mysqlPool) {
    const connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    try {
      const helper = {
        all: async (sql, params = []) => {
          const adaptedSql = adaptSqlForDialect(sql, true);
          const [rows] = await connection.execute(adaptedSql, params);
          return rows;
        },
        get: async (sql, params = []) => {
          const adaptedSql = adaptSqlForDialect(sql, true);
          const [rows] = await connection.execute(adaptedSql, params);
          return rows[0] || null;
        },
        run: async (sql, params = []) => {
          const adaptedSql = adaptSqlForDialect(sql, true);
          const [result] = await connection.execute(adaptedSql, params);
          return { changes: result.affectedRows, lastInsertRowid: result.insertId };
        }
      };
      const result = await callback(helper);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } else if (sqliteDb) {
    sqliteDb.exec('BEGIN TRANSACTION;');
    try {
      const helper = {
        all: async (sql, params = []) => sqliteDb.prepare(sql).all(...params),
        get: async (sql, params = []) => sqliteDb.prepare(sql).get(...params) || null,
        run: async (sql, params = []) => {
          const info = sqliteDb.prepare(sql).run(...params);
          return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
        }
      };
      const result = await callback(helper);
      sqliteDb.exec('COMMIT;');
      return result;
    } catch (err) {
      try { sqliteDb.exec('ROLLBACK;'); } catch {}
      throw err;
    }
  }
  throw new Error('Database not initialized');
}

// Raw SQL query executor for interactive SQL Playground & DBMS Demonstrations
export async function dbRawQuery(sql) {
  const trimmed = sql.trim();
  
  if (mysqlPool) {
    const [rows, fields] = await mysqlPool.query(trimmed);
    return {
      rows: Array.isArray(rows) ? rows : [rows],
      columns: fields ? fields.map(f => f.name) : []
    };
  } else if (sqliteDb) {
    const upper = trimmed.toUpperCase();
    if (upper.startsWith('CALL ')) {
      return handleSqliteProcedureCall(trimmed);
    }

    let translatedSql = trimmed;
    translatedSql = translatedSql.replace(/GET_COURSE_STUDENT_COUNT\s*\(([^)]+)\)/gi, '(SELECT COUNT(*) FROM enrolls WHERE course_id = $1)');
    translatedSql = translatedSql.replace(/GET_ENROLLMENT_COUNT\s*\(([^)]+)\)/gi, '(SELECT COUNT(*) FROM enrolls WHERE student_id = $1)');
    translatedSql = translatedSql.replace(/GET_STUDENT_AVERAGE_SCORE\s*\(([^)]+)\)/gi, '(SELECT ROUND(AVG(score), 2) FROM quiz_attempt WHERE student_id = $1)');
    translatedSql = translatedSql.replace(/GET_COURSE_AVERAGE_RATING\s*\(([^)]+)\)/gi, '(SELECT ROUND(AVG(rating), 2) FROM course_feedback WHERE course_id = $1)');

    const stmt = sqliteDb.prepare(translatedSql);
    if (stmt.reader) {
      const rows = stmt.all();
      const columns = rows.length > 0 ? Object.keys(rows[0]) : (stmt.columns ? stmt.columns().map(c => c.name) : []);
      return { rows, columns };
    } else {
      const info = stmt.run();
      return {
        rows: [{ affectedRows: info.changes, lastInsertRowid: info.lastInsertRowid }],
        columns: ['affectedRows', 'lastInsertRowid']
      };
    }
  }
  throw new Error('Database not initialized');
}

// Simulated Stored Procedure handler for SQLite mode (mirrors MySQL Stored Procedures)
function handleSqliteProcedureCall(sql) {
  const clean = sql.replace(/;+$/, '').trim();
  const match = clean.match(/CALL\s+([A-Za-z0-9_]+)\s*\((.*)\)/i);
  if (!match) {
    throw new Error('Invalid CALL syntax. Expected CALL ProcedureName(args)');
  }

  const procName = match[1].toUpperCase();
  const rawArgs = match[2].split(',').map(a => a.trim().replace(/^['"]|['"]$/g, ''));

  if (procName === 'GET_STUDENT_DETAILS') {
    const studentId = parseInt(rawArgs[0], 10);
    const rows = sqliteDb.prepare(`
      SELECT s.*, p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin
      FROM student s
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      WHERE s.student_id = ?
    `).all(studentId);
    return { rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
  }

  if (procName === 'GET_COURSE_STUDENTS') {
    const courseId = parseInt(rawArgs[0], 10);
    const rows = sqliteDb.prepare(`
      SELECT s.student_id, s.first_name, s.last_name, s.email, e.course_id
      FROM enrolls e
      JOIN student s ON e.student_id = s.student_id
      WHERE e.course_id = ?
      ORDER BY s.student_id ASC
    `).all(courseId);
    return { rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
  }

  if (procName === 'GET_STUDENT_COURSES') {
    const studentId = parseInt(rawArgs[0], 10);
    const rows = sqliteDb.prepare(`
      SELECT c.course_id, c.course_name, d.dept_name,
             i.first_name as instructor_first, i.last_name as instructor_last
      FROM enrolls e
      JOIN course c ON e.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      LEFT JOIN teaches t ON c.course_id = t.course_id
      LEFT JOIN instructor i ON t.instructor_id = i.instructor_id
      WHERE e.student_id = ?
      ORDER BY c.course_id ASC
    `).all(studentId);
    return { rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
  }

  if (procName === 'ENROLL_STUDENT') {
    const studentId = parseInt(rawArgs[0], 10);
    const courseId = parseInt(rawArgs[1], 10);

    const student = sqliteDb.prepare('SELECT student_id FROM student WHERE student_id = ?').get(studentId);
    if (!student) throw new Error(`Stored Procedure Error: Student ${studentId} does not exist.`);

    const course = sqliteDb.prepare('SELECT course_id FROM course WHERE course_id = ?').get(courseId);
    if (!course) throw new Error(`Stored Procedure Error: Course ${courseId} does not exist.`);

    const existing = sqliteDb.prepare('SELECT * FROM enrolls WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
    if (existing) throw new Error(`Stored Procedure Error: Student ${studentId} is already enrolled in course ${courseId}.`);

    sqliteDb.prepare('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)').run(studentId, courseId);
    return {
      rows: [{ status: 'SUCCESS', message: `Enrolled student ${studentId} into course ${courseId} via Procedure ENROLL_STUDENT` }],
      columns: ['status', 'message']
    };
  }

  if (procName === 'GRADE_ASSIGNMENT') {
    const studentId = parseInt(rawArgs[0], 10);
    const courseId = parseInt(rawArgs[1], 10);
    const assignmentId = parseInt(rawArgs[2], 10);
    const marks = parseInt(rawArgs[3], 10);
    const feedback = rawArgs[4] || 'Evaluated';

    const info = sqliteDb.prepare(`
      UPDATE submits 
      SET marks_obtained = ?, instructor_feedback = ?, status = 'GRADED'
      WHERE student_id = ? AND course_id = ? AND assignment_id = ?
    `).run(marks, feedback, studentId, courseId, assignmentId);

    return {
      rows: [{ status: 'SUCCESS', affectedRows: info.changes, message: `Graded assignment: marks ${marks}, status GRADED` }],
      columns: ['status', 'affectedRows', 'message']
    };
  }

  throw new Error(`Procedure ${procName} not recognized.`);
}

export function getDatabaseType() {
  return mysqlPool ? 'mysql' : 'sqlite';
}
