import { dbAll, dbGet, dbRun, dbRawQuery, getDatabaseType } from '../config/db.js';

// Table schema metadata to assist UI forms & validation
export const TABLE_SCHEMAS = {
  department: {
    primaryKey: ['dept_id'],
    columns: [
      { name: 'dept_id', type: 'number', label: 'Department ID', required: true },
      { name: 'dept_name', type: 'text', label: 'Department Name', required: true }
    ]
  },
  proctor: {
    primaryKey: ['proctor_id'],
    columns: [
      { name: 'proctor_id', type: 'number', label: 'Proctor ID', required: true },
      { name: 'first_name', type: 'text', label: 'First Name', required: true },
      { name: 'middle_name', type: 'text', label: 'Middle Name', required: false },
      { name: 'last_name', type: 'text', label: 'Last Name', required: true },
      { name: 'cabin_no', type: 'text', label: 'Cabin Number', required: false }
    ]
  },
  proctor_phone: {
    primaryKey: ['proctor_id', 'phone_no'],
    columns: [
      { name: 'proctor_id', type: 'number', label: 'Proctor ID', required: true, refTable: 'proctor', refCol: 'proctor_id' },
      { name: 'phone_no', type: 'text', label: 'Phone Number (10 digits)', required: true }
    ]
  },
  student: {
    primaryKey: ['student_id'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true },
      { name: 'first_name', type: 'text', label: 'First Name', required: true },
      { name: 'middle_name', type: 'text', label: 'Middle Name', required: false },
      { name: 'last_name', type: 'text', label: 'Last Name', required: true },
      { name: 'dob', type: 'date', label: 'Date of Birth (Age >= 16)', required: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true },
      { name: 'proctor_id', type: 'number', label: 'Proctor ID', required: false, refTable: 'proctor', refCol: 'proctor_id' }
    ]
  },
  student_phone: {
    primaryKey: ['student_id', 'phone_no'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'phone_no', type: 'text', label: 'Phone Number (10 digits)', required: true }
    ]
  },
  account: {
    primaryKey: ['student_id', 'account_id'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'account_id', type: 'number', label: 'Account ID', required: true },
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true }
    ]
  },
  instructor: {
    primaryKey: ['instructor_id'],
    columns: [
      { name: 'instructor_id', type: 'number', label: 'Instructor ID', required: true },
      { name: 'first_name', type: 'text', label: 'First Name', required: true },
      { name: 'middle_name', type: 'text', label: 'Middle Name', required: false },
      { name: 'last_name', type: 'text', label: 'Last Name', required: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true },
      { name: 'cabin_no', type: 'text', label: 'Cabin Number', required: false },
      { name: 'dept_id', type: 'number', label: 'Department ID', required: false, refTable: 'department', refCol: 'dept_id' }
    ]
  },
  instructor_phone: {
    primaryKey: ['instructor_id', 'phone_no'],
    columns: [
      { name: 'instructor_id', type: 'number', label: 'Instructor ID', required: true, refTable: 'instructor', refCol: 'instructor_id' },
      { name: 'phone_no', type: 'text', label: 'Phone Number (10 digits)', required: true }
    ]
  },
  course: {
    primaryKey: ['course_id'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true },
      { name: 'course_name', type: 'text', label: 'Course Name', required: true },
      { name: 'dept_id', type: 'number', label: 'Department ID', required: false, refTable: 'department', refCol: 'dept_id' }
    ]
  },
  // Phase 2: TEACHES Table
  teaches: {
    primaryKey: ['instructor_id', 'course_id'],
    columns: [
      { name: 'instructor_id', type: 'number', label: 'Instructor ID', required: true, refTable: 'instructor', refCol: 'instructor_id' },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' }
    ]
  },
  module: {
    primaryKey: ['course_id', 'module_no'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'module_no', type: 'number', label: 'Module Number', required: true },
      { name: 'name', type: 'text', label: 'Module Name', required: true },
      { name: 'lecture_hours', type: 'number', label: 'Lecture Hours (> 0)', required: true }
    ]
  },
  assignment: {
    primaryKey: ['course_id', 'assignment_id'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'assignment_id', type: 'number', label: 'Assignment ID', required: true },
      { name: 'name', type: 'text', label: 'Assignment Name', required: true },
      { name: 'marks', type: 'number', label: 'Total Marks (>= 0)', required: true },
      { name: 'due_date', type: 'date', label: 'Due Date', required: true }
    ]
  },
  quiz: {
    primaryKey: ['course_id', 'quiz_id'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'quiz_id', type: 'number', label: 'Quiz ID', required: true },
      { name: 'title', type: 'text', label: 'Quiz Title', required: true },
      { name: 'total_marks', type: 'number', label: 'Total Marks (> 0)', required: true }
    ]
  },
  // Phase 5: Relational Quiz Tables
  quiz_question: {
    primaryKey: ['course_id', 'quiz_id', 'question_id'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'quiz_id', type: 'number', label: 'Quiz ID', required: true },
      { name: 'question_id', type: 'number', label: 'Question ID', required: true },
      { name: 'question_text', type: 'text', label: 'Question Text', required: true },
      { name: 'marks', type: 'number', label: 'Marks', required: true }
    ]
  },
  quiz_option: {
    primaryKey: ['course_id', 'quiz_id', 'question_id', 'option_id'],
    columns: [
      { name: 'course_id', type: 'number', label: 'Course ID', required: true },
      { name: 'quiz_id', type: 'number', label: 'Quiz ID', required: true },
      { name: 'question_id', type: 'number', label: 'Question ID', required: true },
      { name: 'option_id', type: 'number', label: 'Option ID', required: true },
      { name: 'option_text', type: 'text', label: 'Option Text', required: true },
      { name: 'is_correct', type: 'number', label: 'Is Correct (0 or 1)', required: true }
    ]
  },
  quiz_attempt: {
    primaryKey: ['attempt_id'],
    columns: [
      { name: 'attempt_id', type: 'number', label: 'Attempt ID (Auto)', required: false },
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'quiz_id', type: 'number', label: 'Quiz ID', required: true },
      { name: 'score', type: 'number', label: 'Score Obtained', required: true },
      { name: 'started_at', type: 'text', label: 'Started Timestamp', required: false },
      { name: 'submitted_at', type: 'text', label: 'Submitted Timestamp', required: false }
    ]
  },
  quiz_answer: {
    primaryKey: ['attempt_id', 'question_id'],
    columns: [
      { name: 'attempt_id', type: 'number', label: 'Attempt ID', required: true, refTable: 'quiz_attempt', refCol: 'attempt_id' },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true },
      { name: 'quiz_id', type: 'number', label: 'Quiz ID', required: true },
      { name: 'question_id', type: 'number', label: 'Question ID', required: true },
      { name: 'selected_option_id', type: 'number', label: 'Selected Option ID', required: true }
    ]
  },
  enrolls: {
    primaryKey: ['student_id', 'course_id'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' }
    ]
  },
  // Phase 4: Upgraded Submits Table
  submits: {
    primaryKey: ['student_id', 'course_id', 'assignment_id'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'assignment_id', type: 'number', label: 'Assignment ID', required: true },
      { name: 'submission_date', type: 'date', label: 'Submission Date', required: true },
      { name: 'submission_content', type: 'text', label: 'Submission Content / Text', required: false },
      { name: 'marks_obtained', type: 'number', label: 'Marks Awarded', required: false },
      { name: 'instructor_feedback', type: 'text', label: 'Instructor Feedback', required: false },
      { name: 'status', type: 'text', label: 'Status (SUBMITTED/GRADED/LATE)', required: false }
    ]
  },
  progress_analytics: {
    primaryKey: ['student_id', 'progress_id'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'progress_id', type: 'number', label: 'Progress ID', required: true },
      { name: 'cgpa', type: 'number', label: 'CGPA (0 - 10)', required: true, step: '0.01' },
      { name: 'daily_tracker', type: 'text', label: 'Daily Tracker', required: false },
      { name: 'time_spent', type: 'number', label: 'Time Spent (mins >= 0)', required: true },
      { name: 'leaderboard_position', type: 'number', label: 'Leaderboard Rank', required: false }
    ]
  },
  // Phase 3: Upgraded Course Feedback Table
  course_feedback: {
    primaryKey: ['student_id', 'feedback_no'],
    columns: [
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'feedback_no', type: 'number', label: 'Feedback No', required: true },
      { name: 'course_id', type: 'number', label: 'Course ID', required: true, refTable: 'course', refCol: 'course_id' },
      { name: 'instructor_id', type: 'number', label: 'Instructor ID', required: false, refTable: 'instructor', refCol: 'instructor_id' },
      { name: 'rating', type: 'number', label: 'Rating (1 - 5)', required: true },
      { name: 'comments', type: 'text', label: 'Student Feedback Comments', required: false },
      { name: 'feedback_date', type: 'text', label: 'Feedback Date', required: false }
    ]
  },
  // Phase 10: Normalized Study Session Table
  study_session: {
    primaryKey: ['session_id'],
    columns: [
      { name: 'session_id', type: 'number', label: 'Session ID (Auto)', required: false },
      { name: 'student_id', type: 'number', label: 'Student ID', required: true, refTable: 'student', refCol: 'student_id' },
      { name: 'study_date', type: 'text', label: 'Study Date', required: false },
      { name: 'time_spent', type: 'number', label: 'Time Spent (mins > 0)', required: true },
      { name: 'topic', type: 'text', label: 'Study Topic / Subject', required: false }
    ]
  },
  // Phase 8: Database Audit Log Table
  audit_log: {
    primaryKey: ['audit_id'],
    columns: [
      { name: 'audit_id', type: 'number', label: 'Audit ID (Auto)', required: false },
      { name: 'table_name', type: 'text', label: 'Target Table Name', required: true },
      { name: 'operation', type: 'text', label: 'Operation (INSERT/UPDATE/DELETE)', required: true },
      { name: 'record_id', type: 'text', label: 'Record Primary Key ID', required: true },
      { name: 'changed_at', type: 'text', label: 'Timestamp of Mutation', required: false },
      { name: 'description', type: 'text', label: 'Audit Description', required: false }
    ]
  }
};

// Constraint Validator (mirrors MySQL dump triggers and CHECK constraints)
function validateRow(table, row) {
  // 1. Student Age check (Trigger: check_student_age, age >= 16)
  if (table === 'student' && row.dob) {
    const birthDate = new Date(row.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 16) {
      throw new Error('Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.');
    }
  }

  // 2. Phone number regex: ^[0-9]{10}$
  if ((table === 'student_phone' || table === 'instructor_phone' || table === 'proctor_phone') && row.phone_no) {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(row.phone_no.trim())) {
      throw new Error('Constraint Violation: Phone number must be exactly 10 digits (0-9).');
    }
  }

  // 3. Email check
  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      throw new Error('Constraint Violation: Invalid email format.');
    }
  }

  // 4. Lecture hours check (> 0)
  if (table === 'module' && row.lecture_hours !== undefined) {
    if (Number(row.lecture_hours) <= 0) {
      throw new Error('Constraint Violation (module_chk_1): Lecture hours must be greater than 0.');
    }
  }

  // 5. Assignment marks check (>= 0)
  if (table === 'assignment' && row.marks !== undefined) {
    if (Number(row.marks) < 0) {
      throw new Error('Constraint Violation (assignment_chk_1): Marks must be 0 or greater.');
    }
  }

  // 6. Submissions marks check
  if (table === 'submits' && row.marks_obtained !== undefined && row.marks_obtained !== null && row.marks_obtained !== '') {
    if (Number(row.marks_obtained) < 0) {
      throw new Error('Constraint Violation: Marks obtained cannot be negative.');
    }
  }

  // 7. Quiz total_marks check (> 0)
  if (table === 'quiz' && row.total_marks !== undefined) {
    if (Number(row.total_marks) <= 0) {
      throw new Error('Constraint Violation (quiz_chk_1): Total marks must be greater than 0.');
    }
  }

  // 8. Rating check (1 - 5)
  if (table === 'course_feedback' && row.rating !== undefined) {
    const r = Number(row.rating);
    if (r < 1 || r > 5) {
      throw new Error('Constraint Violation (chk_feedback_rating): Rating must be between 1 and 5.');
    }
  }

  // 9. Study session time spent check (> 0)
  if (table === 'study_session' && row.time_spent !== undefined) {
    if (Number(row.time_spent) <= 0) {
      throw new Error('Constraint Violation (chk_study_time): Study time spent must be greater than 0.');
    }
  }

  // 10. CGPA check (0 to 10) & time_spent >= 0
  if (table === 'progress_analytics') {
    if (row.cgpa !== undefined && (Number(row.cgpa) < 0 || Number(row.cgpa) > 10)) {
      throw new Error('Constraint Violation (progress_analytics_chk_1): CGPA must be between 0.0 and 10.0.');
    }
    if (row.time_spent !== undefined && Number(row.time_spent) < 0) {
      throw new Error('Constraint Violation (progress_analytics_chk_2): Time spent cannot be negative.');
    }
  }
}

// 1. Get Schema Meta Information
export async function getSchema(req, res) {
  try {
    const tables = Object.keys(TABLE_SCHEMAS).map(name => ({
      name,
      ...TABLE_SCHEMAS[name]
    }));
    res.json({ success: true, dbType: getDatabaseType(), tables });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 2. READ / VIEW records from table
export async function getTableRecords(req, res) {
  const { table } = req.params;
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return res.status(404).json({ success: false, error: `Table '${table}' not found in schema.` });

  try {
    const search = req.query.search || '';
    let sql = `SELECT * FROM ${table}`;
    const params = [];

    if (search.trim()) {
      const searchClauses = schema.columns.map(col => `${col.name} LIKE ?`);
      sql += ` WHERE ${searchClauses.join(' OR ')}`;
      schema.columns.forEach(() => params.push(`%${search.trim()}%`));
    }

    sql += ` ORDER BY ${schema.primaryKey.join(', ')} ASC`;

    const rows = await dbAll(sql, params);
    res.json({ success: true, table, total: rows.length, rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 3. CREATE / INSERT record
export async function insertRecord(req, res) {
  const { table } = req.params;
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return res.status(404).json({ success: false, error: `Table '${table}' not found in schema.` });

  try {
    const rowData = req.body;
    validateRow(table, rowData);

    const cols = [];
    const placeholders = [];
    const values = [];

    for (const col of schema.columns) {
      if (rowData[col.name] !== undefined && rowData[col.name] !== '') {
        cols.push(col.name);
        placeholders.push('?');
        values.push(rowData[col.name]);
      }
    }

    if (cols.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid data provided to insert.' });
    }

    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await dbRun(sql, values);

    res.json({ success: true, message: `Record successfully inserted into '${table}'!`, result });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
}

// 4. UPDATE record
export async function updateRecord(req, res) {
  const { table } = req.params;
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return res.status(404).json({ success: false, error: `Table '${table}' not found in schema.` });

  try {
    const { key, data } = req.body;
    if (!key || Object.keys(key).length === 0) {
      return res.status(400).json({ success: false, error: 'Primary key is required for update.' });
    }

    validateRow(table, { ...key, ...data });

    const setClauses = [];
    const values = [];

    for (const [colName, val] of Object.entries(data)) {
      if (schema.columns.some(c => c.name === colName) && !schema.primaryKey.includes(colName)) {
        setClauses.push(`${colName} = ?`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update.' });
    }

    const whereClauses = [];
    for (const pk of schema.primaryKey) {
      whereClauses.push(`${pk} = ?`);
      values.push(key[pk]);
    }

    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    const result = await dbRun(sql, values);

    res.json({ success: true, message: `Record in '${table}' updated successfully!`, result });
  } catch (err) {
    console.error('Update error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
}

// 5. DELETE record
export async function deleteRecord(req, res) {
  const { table } = req.params;
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return res.status(404).json({ success: false, error: `Table '${table}' not found in schema.` });

  try {
    const key = req.body;
    if (!key || Object.keys(key).length === 0) {
      return res.status(400).json({ success: false, error: 'Primary key is required for deletion.' });
    }

    const whereClauses = [];
    const values = [];
    for (const pk of schema.primaryKey) {
      if (key[pk] === undefined) {
        return res.status(400).json({ success: false, error: `Missing primary key component '${pk}'` });
      }
      whereClauses.push(`${pk} = ?`);
      values.push(key[pk]);
    }

    const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
    const result = await dbRun(sql, values);

    res.json({ success: true, message: `Record from '${table}' deleted successfully!`, result });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
}

// 6. Interactive SQL Query Runner
export async function executeRawQuery(req, res) {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'SQL query cannot be empty.' });
    }

    const startTime = Date.now();
    const result = await dbRawQuery(query);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      success: true,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rows.length,
      executionTimeMs,
      dbType: getDatabaseType()
    });
  } catch (err) {
    console.error('SQL query error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
}
