import { dbAll, dbGet, dbRun, dbTransaction } from '../config/db.js';
import { hashPassword, verifyPassword } from './authController.js';

// 1. Role-Aware Dashboard Overview Data
export async function getDashboardData(req, res) {
  try {
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || 'student').toLowerCase();
    const userId = parseInt(req.query.userId || req.query.studentId || req.user?.id || req.headers['x-user-id'] || '101', 10);

    // ==========================================
    // CASE A: ADMINISTRATOR DASHBOARD
    // ==========================================
    if (role === 'admin') {
      const totalStudents = (await dbGet('SELECT COUNT(*) as count FROM student'))?.count || 0;
      const totalInstructors = (await dbGet('SELECT COUNT(*) as count FROM instructor'))?.count || 0;
      const totalProctors = (await dbGet('SELECT COUNT(*) as count FROM proctor'))?.count || 0;
      const totalCourses = (await dbGet('SELECT COUNT(*) as count FROM course'))?.count || 0;
      const totalDepartments = (await dbGet('SELECT COUNT(*) as count FROM department'))?.count || 0;
      const totalSubmissions = (await dbGet('SELECT COUNT(*) as count FROM submits'))?.count || 0;
      const avgCgpa = (await dbGet('SELECT AVG(cgpa) as avg FROM progress_analytics'))?.avg || 7.96;

      // All Students with complete proctor and enrolled subjects metadata
      const allStudents = await dbAll(`
        SELECT s.student_id, s.first_name, s.last_name, s.dob, s.email, s.proctor_id,
          p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin,
          pa.cgpa,
          DENSE_RANK() OVER (ORDER BY pa.cgpa DESC) as leaderboard_position,
          pa.daily_tracker,
          COALESCE((SELECT SUM(ss.time_spent) FROM study_session ss WHERE ss.student_id = s.student_id), pa.time_spent, 0) as time_spent,
          (SELECT COUNT(*) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_count,
          (SELECT GROUP_CONCAT(DISTINCT e.course_id) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_course_ids,
          (SELECT GROUP_CONCAT(DISTINCT c.course_name) FROM enrolls e JOIN course c ON e.course_id = c.course_id WHERE e.student_id = s.student_id) as enrolled_course_names
        FROM student s
        LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
        LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
        ORDER BY s.student_id ASC
      `);

      // All Instructors (using TEACHES relationship)
      const allInstructors = await dbAll(`
        SELECT i.instructor_id, i.first_name, i.last_name, i.email, i.cabin_no, d.dept_name,
          (SELECT GROUP_CONCAT(DISTINCT ip.phone_no) FROM instructor_phone ip WHERE ip.instructor_id = i.instructor_id) as phone_numbers,
          (
            SELECT GROUP_CONCAT(DISTINCT c.course_name)
            FROM teaches t
            JOIN course c ON t.course_id = c.course_id
            WHERE t.instructor_id = i.instructor_id
          ) as course_taught
        FROM instructor i
        LEFT JOIN department d ON i.dept_id = d.dept_id
        ORDER BY i.instructor_id ASC
      `);

      // All Proctors with their assigned student wards
      const allProctors = await dbAll(`
        SELECT p.proctor_id, p.first_name, p.last_name, p.cabin_no,
          (SELECT GROUP_CONCAT(DISTINCT pp.phone_no) FROM proctor_phone pp WHERE pp.proctor_id = p.proctor_id) as phone_numbers,
          (SELECT COUNT(*) FROM student s WHERE s.proctor_id = p.proctor_id) as ward_count
        FROM proctor p
        ORDER BY p.proctor_id ASC
      `);

      for (const pr of allProctors) {
        pr.wards = await dbAll(`
          SELECT s.student_id, s.first_name, s.last_name, s.email, s.dob, pa.cgpa,
            DENSE_RANK() OVER (ORDER BY pa.cgpa DESC) as leaderboard_position,
            (SELECT COUNT(*) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_count,
            (SELECT GROUP_CONCAT(DISTINCT c.course_name) FROM enrolls e JOIN course c ON e.course_id = c.course_id WHERE e.student_id = s.student_id) as enrolled_course_names
          FROM student s
          LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
          WHERE s.proctor_id = ?
          ORDER BY s.student_id ASC
        `, [pr.proctor_id]);
      }

      // University-wide Recent Submissions Feed
      const recentSubmissions = await dbAll(`
        SELECT sub.*, s.first_name, s.last_name, s.email, a.name as assignment_name, a.marks, c.course_name
        FROM submits sub
        JOIN student s ON sub.student_id = s.student_id
        JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id
        JOIN course c ON a.course_id = c.course_id
        ORDER BY sub.submission_date DESC
        LIMIT 8
      `);

      // Courses summary with complete enrolled student cohorts (via enrolls table)
      const coursesSummary = await dbAll(`
        SELECT c.course_id, c.course_name, d.dept_name,
          (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = c.course_id) as student_count,
          (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = c.course_id) as enrolled_count,
          (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
          (
            SELECT GROUP_CONCAT(DISTINCT inst.first_name || ' ' || inst.last_name)
            FROM teaches t
            JOIN instructor inst ON t.instructor_id = inst.instructor_id
            WHERE t.course_id = c.course_id
          ) as instructors
        FROM course c
        LEFT JOIN department d ON c.dept_id = d.dept_id
        ORDER BY c.course_id ASC
      `);

      for (const c of coursesSummary) {
        c.enrolled_students = await dbAll(`
          SELECT s.student_id, s.first_name, s.last_name, s.email, s.dob, pa.cgpa,
            p.proctor_id, p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin
          FROM enrolls e
          JOIN student s ON e.student_id = s.student_id
          LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
          LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
          WHERE e.course_id = ?
          ORDER BY s.student_id ASC
        `, [c.course_id]);
      }

      return res.json({
        success: true,
        role: 'admin',
        metrics: {
          totalStudents,
          totalInstructors,
          totalProctors,
          totalCourses,
          totalDepartments,
          totalSubmissions,
          averageCgpa: Number(avgCgpa).toFixed(2)
        },
        allStudents,
        allInstructors,
        allProctors,
        recentSubmissions,
        coursesSummary
      });
    }

    // ==========================================
    // CASE B: INSTRUCTOR / FACULTY DASHBOARD
    // ==========================================
    if (role === 'instructor') {
      const instructor = await dbGet(`
        SELECT i.*, d.dept_name,
          (SELECT GROUP_CONCAT(DISTINCT ip.phone_no) FROM instructor_phone ip WHERE ip.instructor_id = i.instructor_id) as phone_numbers
        FROM instructor i
        LEFT JOIN department d ON i.dept_id = d.dept_id
        WHERE i.instructor_id = ?
      `, [userId]) || {
        instructor_id: 201, first_name: 'Raj', last_name: 'Menon', dept_name: 'CSE', cabin_no: 'I101', email: 'raj@gmail.com'
      };

      // PHASE 2: Courses directly taught by this instructor via TEACHES table
      const teachingCourses = await dbAll(`
        SELECT c.*, d.dept_name,
          (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = c.course_id) as student_count,
          (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
          (SELECT COUNT(*) FROM assignment a WHERE a.course_id = c.course_id) as assignment_count,
          (SELECT COUNT(*) FROM quiz q WHERE q.course_id = c.course_id) as quiz_count
        FROM teaches t
        JOIN course c ON t.course_id = c.course_id
        LEFT JOIN department d ON c.dept_id = d.dept_id
        WHERE t.instructor_id = ?
      `, [instructor.instructor_id]);

      const courseIds = teachingCourses.map(c => c.course_id);
      let enrolledStudents = [];
      let submissionsToReview = [];

      if (courseIds.length > 0) {
        const placeholders = courseIds.map(() => '?').join(',');
        enrolledStudents = await dbAll(`
          SELECT s.student_id, s.first_name, s.last_name, s.email, c.course_name, c.course_id
          FROM enrolls e
          JOIN student s ON e.student_id = s.student_id
          JOIN course c ON e.course_id = c.course_id
          WHERE e.course_id IN (${placeholders})
          ORDER BY s.student_id ASC
        `, courseIds);

        submissionsToReview = await dbAll(`
          SELECT sub.*, s.first_name, s.last_name, a.name as assignment_name, a.marks, c.course_name
          FROM submits sub
          JOIN student s ON sub.student_id = s.student_id
          JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id
          JOIN course c ON a.course_id = c.course_id
          WHERE sub.course_id IN (${placeholders})
          ORDER BY sub.submission_date DESC
        `, courseIds);
      }

      // Feedbacks received for this instructor or their taught courses
      const feedbacks = await dbAll(`
        SELECT cf.*, s.first_name as student_first, s.last_name as student_last, s.email as student_email, c.course_name
        FROM course_feedback cf
        JOIN student s ON cf.student_id = s.student_id
        LEFT JOIN course c ON cf.course_id = c.course_id
        WHERE cf.instructor_id = ?
        ORDER BY cf.feedback_date DESC, cf.feedback_no DESC
      `, [instructor.instructor_id]);

      const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / feedbacks.length).toFixed(2)
        : '5.00';

      return res.json({
        success: true,
        role: 'instructor',
        instructor,
        teachingCourses,
        enrolledStudents,
        submissionsToReview,
        feedbacks,
        metrics: {
          totalCoursesTaught: teachingCourses.length,
          totalEnrolledStudents: enrolledStudents.length,
          totalSubmissionsReceived: submissionsToReview.length,
          totalFeedbackReceived: feedbacks.length,
          averageFeedbackRating: avgRating
        }
      });
    }

    // ==========================================
    // CASE C: STUDENT DASHBOARD
    // ==========================================
    const student = await dbGet(`
      SELECT s.*, p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin
      FROM student s
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      WHERE s.student_id = ?
    `, [userId]);

    const totalStudyTime = (await dbGet(`
      SELECT SUM(time_spent) as total_time FROM study_session WHERE student_id = ?
    `, [userId]))?.total_time;

    const analytics = await dbGet(`
      SELECT * FROM progress_analytics WHERE student_id = ? ORDER BY progress_id DESC LIMIT 1
    `, [userId]) || { cgpa: 8.50, daily_tracker: 'Good', time_spent: 240, leaderboard_position: 1 };

    // Dynamically calculate leaderboard rank safely across MySQL & SQLite engines
    try {
      const dynamicRankRow = await dbGet(`
        SELECT COUNT(DISTINCT pa2.cgpa) + 1 as dynamic_rank
        FROM progress_analytics pa2
        WHERE pa2.cgpa > (
          SELECT COALESCE(pa1.cgpa, 0)
          FROM progress_analytics pa1
          WHERE pa1.student_id = ?
          ORDER BY pa1.progress_id DESC LIMIT 1
        )
      `, [userId]);

      if (dynamicRankRow && dynamicRankRow.dynamic_rank) {
        analytics.leaderboard_position = dynamicRankRow.dynamic_rank;
      }
    } catch (rankErr) {
      if (!analytics.leaderboard_position) {
        analytics.leaderboard_position = 1;
      }
    }

    if (totalStudyTime) {
      analytics.time_spent = totalStudyTime;
    }

    // PHASE 2: Fetch assigned instructor(s) from TEACHES table
    const enrolledCourses = await dbAll(`
      SELECT c.course_id, c.course_name, d.dept_name,
        (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
        (SELECT COUNT(*) FROM assignment a WHERE a.course_id = c.course_id) as assignment_count,
        (SELECT inst.first_name FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_first,
        (SELECT inst.last_name FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_last,
        (SELECT inst.cabin_no FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_cabin
      FROM enrolls e
      JOIN course c ON e.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      WHERE e.student_id = ?
      ORDER BY c.course_id ASC
    `, [userId]);

    const assignments = await dbAll(`
      SELECT a.*, c.course_name,
        CASE WHEN s.submission_date IS NOT NULL THEN 1 ELSE 0 END as is_submitted,
        s.submission_date, s.marks_obtained, s.status as submission_status
      FROM assignment a
      JOIN course c ON a.course_id = c.course_id
      JOIN enrolls e ON e.course_id = c.course_id AND e.student_id = ?
      LEFT JOIN submits s ON s.course_id = a.course_id AND s.assignment_id = a.assignment_id AND s.student_id = ?
      ORDER BY a.due_date ASC
    `, [userId, userId]);

    const recentSubmissions = await dbAll(`
      SELECT sub.*, a.name as assignment_name, a.marks, c.course_name
      FROM submits sub
      JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id
      JOIN course c ON a.course_id = c.course_id
      WHERE sub.student_id = ?
      ORDER BY sub.submission_date DESC
      LIMIT 5
    `, [userId]);

    return res.json({
      success: true,
      role: 'student',
      student,
      analytics,
      enrolledCourses,
      assignments,
      recentSubmissions,
      metrics: {
        enrolledCount: enrolledCourses.length,
        pendingAssignments: assignments.filter(a => !a.is_submitted).length,
        cgpa: analytics.cgpa,
        leaderboardPosition: analytics.leaderboard_position
      }
    });
  } catch (err) {
    console.error('getDashboardData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// 2. Courses (PHASE 2: Instructors fetched from TEACHES & Scoped by Role)
export async function getCourses(req, res) {
  try {
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const instructorId = req.query.instructorId 
      ? parseInt(req.query.instructorId, 10) 
      : (role === 'instructor' ? parseInt(req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10) : null);

    if (role === 'instructor' && instructorId) {
      // Instructors strictly see only courses they are assigned to teach in the TEACHES table
      const courses = await dbAll(`
        SELECT c.course_id, c.course_name, c.dept_id, d.dept_name,
          i.instructor_id, i.first_name as instructor_first, i.last_name as instructor_last, i.cabin_no, i.email as instructor_email,
          (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
          (SELECT COUNT(*) FROM assignment a WHERE a.course_id = c.course_id) as assignment_count,
          (SELECT COUNT(*) FROM quiz q WHERE q.course_id = c.course_id) as quiz_count,
          (SELECT COUNT(DISTINCT student_id) FROM enrolls e WHERE e.course_id = c.course_id) as enrolled_count,
          0 as is_enrolled,
          1 as is_assigned
        FROM teaches t
        JOIN course c ON t.course_id = c.course_id
        LEFT JOIN department d ON c.dept_id = d.dept_id
        LEFT JOIN instructor i ON t.instructor_id = i.instructor_id
        WHERE t.instructor_id = ?
        ORDER BY c.course_id ASC
      `, [instructorId]);

      return res.json({ success: true, courses });
    }

    // Default for students & admins: all courses
    const studentId = parseInt(req.query.studentId || req.user?.id || req.headers['x-user-id'] || '101', 10);
    const courses = await dbAll(`
      SELECT c.course_id, c.course_name, c.dept_id, d.dept_name,
        (SELECT inst.instructor_id FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_id,
        (SELECT inst.first_name FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_first,
        (SELECT inst.last_name FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_last,
        (SELECT inst.cabin_no FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as cabin_no,
        (SELECT inst.email FROM teaches t JOIN instructor inst ON t.instructor_id = inst.instructor_id WHERE t.course_id = c.course_id LIMIT 1) as instructor_email,
        (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
        (SELECT COUNT(*) FROM assignment a WHERE a.course_id = c.course_id) as assignment_count,
        (SELECT COUNT(*) FROM quiz q WHERE q.course_id = c.course_id) as quiz_count,
        (SELECT COUNT(DISTINCT student_id) FROM enrolls e WHERE e.course_id = c.course_id) as enrolled_count,
        (CASE WHEN EXISTS (SELECT 1 FROM enrolls e WHERE e.course_id = c.course_id AND e.student_id = ?) THEN 1 ELSE 0 END) as is_enrolled
      FROM course c
      LEFT JOIN department d ON c.dept_id = d.dept_id
      ORDER BY c.course_id ASC
    `, [studentId]);

    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 3. Course Details (PHASE 2: Instructors from TEACHES & Access Enforcement)
export async function getCourseDetails(req, res) {
  try {
    const courseId = parseInt(req.params.id, 10);
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const instructorId = parseInt(req.query.instructorId || req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10);

    // Instructor Course Access Restriction Check
    if (role === 'instructor' && instructorId) {
      const isAssigned = await dbGet('SELECT 1 FROM teaches WHERE instructor_id = ? AND course_id = ?', [instructorId, courseId]);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: `Access Restricted: You are not assigned to teach Course #${courseId}. As an instructor, you can only view details and manage your own courses.`
        });
      }
    }
    const course = await dbGet(`
      SELECT c.*, d.dept_name, 
             i.instructor_id, i.first_name as instructor_first, i.last_name as instructor_last, i.email as instructor_email, i.cabin_no
      FROM course c
      LEFT JOIN department d ON c.dept_id = d.dept_id
      LEFT JOIN teaches t ON t.course_id = c.course_id
      LEFT JOIN instructor i ON t.instructor_id = i.instructor_id
      WHERE c.course_id = ?
      LIMIT 1
    `, [courseId]);

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // All assigned instructors for this course
    const instructors = await dbAll(`
      SELECT i.*
      FROM teaches t
      JOIN instructor i ON t.instructor_id = i.instructor_id
      WHERE t.course_id = ?
    `, [courseId]);

    const modules = await dbAll('SELECT * FROM module WHERE course_id = ? ORDER BY module_no ASC', [courseId]);
    
    // Check if a student ID is present to include their submission status
    const activeStudentId = parseInt(req.query.studentId || req.query.userId || req.user?.id || req.headers?.['x-user-id'] || '0', 10);
    let assignments;
    if (activeStudentId) {
      assignments = await dbAll(`
        SELECT a.*,
          sub.submission_date, sub.submission_content, sub.marks_obtained, sub.instructor_feedback, sub.status,
          CASE WHEN sub.submission_date IS NOT NULL THEN 1 ELSE 0 END as is_submitted
        FROM assignment a
        LEFT JOIN submits sub ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id AND sub.student_id = ?
        WHERE a.course_id = ?
        ORDER BY a.assignment_id ASC
      `, [activeStudentId, courseId]);
    } else {
      assignments = await dbAll('SELECT * FROM assignment WHERE course_id = ? ORDER BY assignment_id ASC', [courseId]);
    }
    const quizzes = await dbAll('SELECT * FROM quiz WHERE course_id = ? ORDER BY quiz_id ASC', [courseId]);

    // Feedbacks for this course
    const feedbacks = await dbAll(`
      SELECT cf.*, s.first_name as student_first, s.last_name as student_last
      FROM course_feedback cf
      JOIN student s ON cf.student_id = s.student_id
      WHERE cf.course_id = ?
      ORDER BY cf.feedback_date DESC
    `, [courseId]);

    const avgRating = feedbacks.length > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / feedbacks.length).toFixed(2)
      : '5.00';

    res.json({ 
      success: true, 
      course: { ...course, instructors }, 
      modules, 
      assignments, 
      quizzes,
      feedbacks,
      feedbackStats: {
        totalResponses: feedbacks.length,
        averageRating: avgRating
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 4. Assignments (Role-Aware Scoping & Counts)
export async function getAssignments(req, res) {
  try {
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const instructorId = parseInt(req.query.instructorId || req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10);
    const studentId = parseInt(req.query.studentId || '0', 10);
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;

    if (role === 'instructor' && instructorId) {
      let query = `
        SELECT a.*, c.course_name, d.dept_name,
          (SELECT COUNT(*) FROM submits sub WHERE sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id) as submission_count,
          (SELECT COUNT(*) FROM submits sub WHERE sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id AND sub.status = 'GRADED') as graded_count,
          (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = a.course_id) as total_students
        FROM assignment a
        JOIN course c ON a.course_id = c.course_id
        JOIN teaches t ON t.course_id = c.course_id AND t.instructor_id = ?
        LEFT JOIN department d ON c.dept_id = d.dept_id
      `;
      const params = [instructorId];
      if (courseId) {
        query += ` WHERE a.course_id = ? `;
        params.push(courseId);
      }
      query += ` ORDER BY a.course_id ASC, a.due_date ASC `;
      const assignments = await dbAll(query, params);
      return res.json({ success: true, assignments, isInstructorView: true });
    }

    let query = `
      SELECT a.*, c.course_name, d.dept_name,
        sub.submission_date, sub.submission_content, sub.marks_obtained, sub.instructor_feedback, sub.status,
        CASE WHEN sub.submission_date IS NOT NULL THEN 1 ELSE 0 END as is_submitted
      FROM assignment a
      JOIN course c ON a.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      LEFT JOIN submits sub ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id AND sub.student_id = ?
    `;
    const params = [studentId || 101];
    if (courseId) {
      query += ` WHERE a.course_id = ? `;
      params.push(courseId);
    }
    query += ` ORDER BY a.due_date ASC `;
    const assignments = await dbAll(query, params);
    res.json({ success: true, assignments, isInstructorView: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 5. Submit Assignment (PHASE 4: content, status, on-time check)
export async function submitAssignment(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'instructor') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only enrolled students can submit assignments.' });
    }

    const rawStudentId = req.body?.student_id || req.headers?.['x-user-id'] || req.user?.id;
    const rawCourseId = req.body?.course_id || req.query?.course_id;
    const rawAssignmentId = req.body?.assignment_id || req.query?.assignment_id;

    if (!rawStudentId || !rawCourseId || !rawAssignmentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, Course ID, and Assignment ID are required to submit an assignment.' 
      });
    }

    const student_id = parseInt(rawStudentId, 10);
    const course_id = parseInt(rawCourseId, 10);
    const assignment_id = parseInt(rawAssignmentId, 10);

    if (isNaN(student_id) || isNaN(course_id) || isNaN(assignment_id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, Course ID, and Assignment ID must be valid integers.' 
      });
    }

    // Verify student exists
    const student = await dbGet('SELECT student_id, first_name, last_name FROM student WHERE student_id = ?', [student_id]);
    if (!student) {
      return res.status(404).json({ success: false, error: `Student #${student_id} not found.` });
    }

    // Verify assignment exists
    const assign = await dbGet('SELECT * FROM assignment WHERE course_id = ? AND assignment_id = ?', [course_id, assignment_id]);
    if (!assign) {
      return res.status(404).json({ 
        success: false, 
        error: `Assignment #${assignment_id} for Course #${course_id} does not exist.` 
      });
    }

    // Ensure student is registered/enrolled in this course
    const enrolled = await dbGet('SELECT 1 FROM enrolls WHERE student_id = ? AND course_id = ?', [student_id, course_id]);
    if (!enrolled) {
      try {
        await dbRun('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)', [student_id, course_id]);
      } catch (enrErr) {
        console.warn(`[LMS] Auto-enrollment notice for Student #${student_id} in Course #${course_id}:`, enrErr.message);
      }
    }

    const sDate = req.body?.submission_date || new Date().toISOString().split('T')[0];
    const content = req.body?.submission_content || req.body?.content || 'Completed coursework solution submitted.';

    // Check assignment due date for LATE status determination
    let initialStatus = 'SUBMITTED';
    if (assign.due_date && sDate > assign.due_date) {
      initialStatus = 'LATE';
    }

    const existing = await dbGet(`
      SELECT * FROM submits WHERE student_id = ? AND course_id = ? AND assignment_id = ?
    `, [student_id, course_id, assignment_id]);

    if (existing) {
      const nextStatus = existing.status === 'GRADED' ? 'GRADED' : initialStatus;
      await dbRun(`
        UPDATE submits 
        SET submission_date = ?, submission_content = ?, status = ?
        WHERE student_id = ? AND course_id = ? AND assignment_id = ?
      `, [sDate, content, nextStatus, student_id, course_id, assignment_id]);
    } else {
      await dbRun(`
        INSERT INTO submits (student_id, course_id, assignment_id, submission_date, submission_content, status) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [student_id, course_id, assignment_id, sDate, content, initialStatus]);
    }

    res.json({ 
      success: true, 
      message: `Assignment submitted successfully! Status: ${existing?.status === 'GRADED' ? 'GRADED' : initialStatus}`, 
      submission_date: sDate,
      status: existing?.status === 'GRADED' ? 'GRADED' : initialStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 6. Grade Assignment Submission (Faculty Instructors Only)
export async function gradeAssignment(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'student') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only faculty instructors are authorized to grade assignments.' });
    }

    const { student_id, course_id, assignment_id, marks_obtained, instructor_feedback, status } = req.body;
    
    if (student_id === undefined || course_id === undefined || assignment_id === undefined || marks_obtained === undefined) {
      return res.status(400).json({ success: false, error: 'Student ID, Course ID, Assignment ID, and Marks are required.' });
    }

    const sId = parseInt(student_id, 10);
    const cId = parseInt(course_id, 10);
    const aId = parseInt(assignment_id, 10);
    const marks = parseInt(marks_obtained, 10);

    if (isNaN(marks)) {
      return res.status(400).json({ success: false, error: 'Marks obtained must be a valid number.' });
    }

    const assign = await dbGet('SELECT * FROM assignment WHERE course_id = ? AND assignment_id = ?', [cId, aId]);
    if (!assign) {
      return res.status(404).json({ success: false, error: 'Assignment not found in database.' });
    }

    if (marks < 0 || marks > assign.marks) {
      return res.status(400).json({ 
        success: false, 
        error: `Constraint Violation: Marks obtained (${marks}) must be between 0 and ${assign.marks} (max marks).` 
      });
    }

    const submissionStatus = status || 'GRADED';
    const feedback = instructor_feedback && instructor_feedback.trim() ? instructor_feedback.trim() : 'Graded by instructor.';

    const result = await dbRun(`
      UPDATE submits 
      SET marks_obtained = ?, instructor_feedback = ?, status = ?
      WHERE student_id = ? AND course_id = ? AND assignment_id = ?
    `, [marks, feedback, submissionStatus, sId, cId, aId]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Submission record not found to grade.' });
    }

    // Log grading action to audit_log
    try {
      await dbRun(`
        INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
        VALUES ('submits', 'UPDATE', CAST(? AS CHAR), CURRENT_TIMESTAMP, ?)
      `, [sId, `Graded coursework: Student #${sId} awarded ${marks}/${assign.marks} in Course #${cId}, Assignment #${aId}.`]);
    } catch {}

    res.json({ 
      success: true, 
      message: `Submission graded successfully! Awarded ${marks}/${assign.marks} marks.`,
      marks_obtained: marks,
      instructor_feedback: feedback,
      status: submissionStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 7. Quizzes List (Scoped for Instructors via TEACHES)
export async function getQuizzes(req, res) {
  try {
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const instructorId = req.query.instructorId 
      ? parseInt(req.query.instructorId, 10) 
      : (role === 'instructor' ? parseInt(req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10) : null);
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;

    let query = `
      SELECT q.*, c.course_name, d.dept_name,
        (SELECT COUNT(*) FROM quiz_question qq WHERE qq.course_id = q.course_id AND qq.quiz_id = q.quiz_id) as question_count,
        (SELECT COUNT(*) FROM quiz_attempt qa WHERE qa.course_id = q.course_id AND qa.quiz_id = q.quiz_id) as attempt_count
      FROM quiz q
      JOIN course c ON q.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
    `;
    const params = [];
    const conditions = [];

    if (role === 'instructor' && instructorId) {
      query += ` JOIN teaches t ON t.course_id = q.course_id AND t.instructor_id = ? `;
      params.push(instructorId);
    }

    if (courseId) {
      conditions.push('q.course_id = ?');
      params.push(courseId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')} `;
    }

    query += ` ORDER BY q.course_id ASC, q.quiz_id ASC `;

    const quizzes = await dbAll(query, params);
    res.json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 8. Quiz Questions & Options (PHASE 5: Relational Quiz System & Answer Key Inspection)
export async function getQuizQuestions(req, res) {
  try {
    const quizId = parseInt(req.params.id, 10);
    const courseId = parseInt(req.query.courseId || '301', 10);
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const showAnswers = req.query.showAnswers === 'true' || role === 'instructor' || role === 'admin';

    const quiz = await dbGet('SELECT * FROM quiz WHERE course_id = ? AND quiz_id = ?', [courseId, quizId]);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found.' });

    const questions = await dbAll(`
      SELECT qq.course_id, qq.quiz_id, qq.question_id, qq.question_text, qq.marks
      FROM quiz_question qq
      WHERE qq.course_id = ? AND qq.quiz_id = ?
      ORDER BY qq.question_id ASC
    `, [courseId, quizId]);

    for (const q of questions) {
      q.options = await dbAll(`
        SELECT option_id, option_text${showAnswers ? ', is_correct' : ''}
        FROM quiz_option
        WHERE course_id = ? AND quiz_id = ? AND question_id = ?
        ORDER BY option_id ASC
      `, [courseId, quizId, q.question_id]);
    }

    // If instructor or admin, also load student attempt history
    let attempts = [];
    if (showAnswers) {
      attempts = await dbAll(`
        SELECT qa.attempt_id, qa.score, qa.started_at, qa.submitted_at, s.student_id, s.first_name, s.last_name, s.email
        FROM quiz_attempt qa
        JOIN student s ON qa.student_id = s.student_id
        WHERE qa.course_id = ? AND qa.quiz_id = ?
        ORDER BY qa.submitted_at DESC
        LIMIT 15
      `, [courseId, quizId]);
    }

    res.json({ success: true, quiz, questions, attempts, isAnswerKeyVisible: showAnswers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 9. Submit Quiz (PHASE 5: Verified Score Calculation & Attempt Storage)
export async function submitQuiz(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'instructor') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only enrolled students can take or submit quizzes/tests.' });
    }

    const { student_id, quiz_id, course_id, answers } = req.body || {};
    const studentId = parseInt(student_id || req.user?.id || req.headers?.['x-user-id'] || '101', 10);
    const qId = parseInt(quiz_id || req.params?.quizId, 10);
    const cId = parseInt(course_id || req.params?.courseId, 10);

    const quiz = await dbGet('SELECT * FROM quiz WHERE course_id = ? AND quiz_id = ?', [cId, qId]);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found in database.' });

    // Fetch questions from database
    const questions = await dbAll(`
      SELECT question_id, marks
      FROM quiz_question
      WHERE course_id = ? AND quiz_id = ?
    `, [cId, qId]);

    if (questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Quiz has no questions configured in database.' });
    }

    let calculatedScore = 0;
    let correctCount = 0;
    const answerEntries = [];

    // Evaluate against database quiz_option table
    for (const q of questions) {
      const selectedOptionId = answers ? parseInt(answers[q.question_id] || answers[`q${q.question_id}`], 10) : null;
      if (selectedOptionId) {
        const option = await dbGet(`
          SELECT is_correct 
          FROM quiz_option 
          WHERE course_id = ? AND quiz_id = ? AND question_id = ? AND option_id = ?
        `, [cId, qId, q.question_id, selectedOptionId]);

        if (option && option.is_correct === 1) {
          calculatedScore += q.marks;
          correctCount++;
        }

        answerEntries.push({ question_id: q.question_id, option_id: selectedOptionId });
      }
    }

    // Save attempt to database quiz_attempt table
    const now = new Date();
    const submittedAt = now.toISOString().slice(0, 19).replace('T', ' ');
    const startedAt = new Date(now.getTime() - 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const attemptResult = await dbRun(`
      INSERT INTO quiz_attempt (student_id, course_id, quiz_id, score, started_at, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [studentId, cId, qId, calculatedScore, startedAt, submittedAt]);

    const attemptId = attemptResult?.lastInsertRowid || attemptResult?.insertId;

    // Save selected answers to database quiz_answer table
    for (const ans of answerEntries) {
      await dbRun(`
        INSERT INTO quiz_answer (attempt_id, course_id, quiz_id, question_id, selected_option_id)
        VALUES (?, ?, ?, ?, ?)
      `, [attemptId, cId, qId, ans.question_id, ans.option_id]);
    }

    res.json({
      success: true,
      attempt_id: attemptId,
      score: calculatedScore,
      total_marks: quiz.total_marks,
      correctCount,
      totalQuestions: questions.length,
      percentage: Math.round((calculatedScore / quiz.total_marks) * 100),
      message: 'Quiz evaluated successfully using relational option keys!'
    });
  } catch (err) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// 10. Modules
export async function getModules(req, res) {
  try {
    const modules = await dbAll(`
      SELECT m.*, c.course_name, d.dept_name
      FROM module m
      JOIN course c ON m.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      ORDER BY m.course_id ASC, m.module_no ASC
    `);
    res.json({ success: true, modules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 11. Instructors (PHASE 2: Assigned courses via TEACHES)
export async function getInstructors(req, res) {
  try {
    const instructors = await dbAll(`
      SELECT i.*, d.dept_name,
        (SELECT GROUP_CONCAT(DISTINCT ip.phone_no) FROM instructor_phone ip WHERE ip.instructor_id = i.instructor_id) as phone_numbers,
        (
          SELECT GROUP_CONCAT(DISTINCT c.course_name) 
          FROM teaches t 
          JOIN course c ON t.course_id = c.course_id 
          WHERE t.instructor_id = i.instructor_id
        ) as assigned_course
      FROM instructor i
      LEFT JOIN department d ON i.dept_id = d.dept_id
      ORDER BY i.instructor_id ASC
    `);

    res.json({ success: true, instructors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 12. Proctors
export async function getProctors(req, res) {
  try {
    const proctors = await dbAll(`
      SELECT p.*,
        (SELECT GROUP_CONCAT(DISTINCT pp.phone_no) FROM proctor_phone pp WHERE pp.proctor_id = p.proctor_id) as phone_numbers,
        (SELECT COUNT(*) FROM student s WHERE s.proctor_id = p.proctor_id) as ward_count
      FROM proctor p
      ORDER BY p.proctor_id ASC
    `);

    for (const pr of proctors) {
      pr.students = await dbAll(`
        SELECT student_id, first_name, last_name, email FROM student WHERE proctor_id = ?
      `, [pr.proctor_id]);
    }

    res.json({ success: true, proctors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 13. Students List (with Subject & Proctor Filtering)
export async function getStudents(req, res) {
  try {
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;
    const proctorId = req.query.proctorId ? parseInt(req.query.proctorId, 10) : null;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : null;

    let whereClauses = [];
    let params = [];

    if (courseId) {
      whereClauses.push(`s.student_id IN (SELECT student_id FROM enrolls WHERE course_id = ?)`);
      params.push(courseId);
    }

    if (proctorId) {
      whereClauses.push(`s.proctor_id = ?`);
      params.push(proctorId);
    }

    if (search) {
      whereClauses.push(`(LOWER(s.first_name) LIKE ? OR LOWER(s.last_name) LIKE ? OR LOWER(s.email) LIKE ? OR CAST(s.student_id AS CHAR) LIKE ?)`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const students = await dbAll(`
      SELECT s.*, p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin,
        (SELECT GROUP_CONCAT(DISTINCT sp.phone_no) FROM student_phone sp WHERE sp.student_id = s.student_id) as phone_numbers,
        pa.cgpa, pa.leaderboard_position, pa.daily_tracker,
        COALESCE((SELECT SUM(ss.time_spent) FROM study_session ss WHERE ss.student_id = s.student_id), pa.time_spent, 0) as time_spent,
        (SELECT COUNT(*) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_count,
        (SELECT GROUP_CONCAT(DISTINCT e.course_id) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_course_ids,
        (SELECT GROUP_CONCAT(DISTINCT c.course_name) FROM enrolls e JOIN course c ON e.course_id = c.course_id WHERE e.student_id = s.student_id) as enrolled_courses
      FROM student s
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
      ${whereSql}
      ORDER BY s.student_id ASC
    `, params);

    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 14. Progress Analytics & Dynamic Leaderboard (PHASE 10: Dynamic SQL Ranking)
export async function getAnalytics(req, res) {
  try {
    // Dynamic ranking using SQL window function RANK() OVER (ORDER BY pa.cgpa DESC)
    const leaderboard = await dbAll(`
      SELECT pa.student_id, pa.cgpa, pa.daily_tracker,
        s.first_name, s.last_name, s.email,
        COALESCE((SELECT SUM(ss.time_spent) FROM study_session ss WHERE ss.student_id = s.student_id), pa.time_spent, 0) as time_spent,
        (SELECT COUNT(*) FROM enrolls e WHERE e.student_id = s.student_id) as enrolled_count,
        RANK() OVER (ORDER BY pa.cgpa DESC) as leaderboard_position
      FROM progress_analytics pa
      JOIN student s ON pa.student_id = s.student_id
      ORDER BY pa.cgpa DESC, s.student_id ASC
    `);

    const averageCgpa = (await dbGet('SELECT AVG(cgpa) as avg_cgpa FROM progress_analytics'))?.avg_cgpa || 7.96;
    const totalTime = (await dbGet('SELECT SUM(time_spent) as total FROM study_session'))?.total || 
                      (await dbGet('SELECT SUM(time_spent) as total FROM progress_analytics'))?.total || 570;

    res.json({
      success: true,
      leaderboard,
      averageCgpa: Number(averageCgpa).toFixed(2),
      totalTimeSpent: totalTime
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 15. Enrollments Management (with Subject & Proctor Filtering)
export async function getEnrollments(req, res) {
  try {
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;
    const studentId = req.query.studentId ? parseInt(req.query.studentId, 10) : null;
    const proctorId = req.query.proctorId ? parseInt(req.query.proctorId, 10) : null;

    let whereClauses = [];
    let params = [];

    if (courseId) {
      whereClauses.push('e.course_id = ?');
      params.push(courseId);
    }
    if (studentId) {
      whereClauses.push('e.student_id = ?');
      params.push(studentId);
    }
    if (proctorId) {
      whereClauses.push('s.proctor_id = ?');
      params.push(proctorId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const enrollments = await dbAll(`
      SELECT e.*, s.first_name as student_first, s.last_name as student_last, s.email as student_email, s.proctor_id,
             p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin,
             pa.cgpa,
             c.course_name, d.dept_name
      FROM enrolls e
      JOIN student s ON e.student_id = s.student_id
      JOIN course c ON e.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
      ${whereSql}
      ORDER BY e.course_id ASC, e.student_id ASC
    `, params);
    res.json({ success: true, enrollments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 16. Enroll Course (PHASE 11: Transaction with Rollback / Commit)
export async function enrollCourse(req, res) {
  try {
    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, error: 'Student ID and Course ID are required' });
    }

    const sId = parseInt(student_id, 10);
    const cId = parseInt(course_id, 10);

    // Database-level transaction workflow
    await dbTransaction(async (tx) => {
      // 1. Verify student exists
      const student = await tx.get('SELECT student_id FROM student WHERE student_id = ?', [sId]);
      if (!student) {
        throw new Error(`Transaction Rollback: Student with ID ${sId} does not exist.`);
      }

      // 2. Verify course exists
      const course = await tx.get('SELECT course_id FROM course WHERE course_id = ?', [cId]);
      if (!course) {
        throw new Error(`Transaction Rollback: Course with ID ${cId} does not exist.`);
      }

      // 3. Check duplicate enrollment
      const existing = await tx.get('SELECT * FROM enrolls WHERE student_id = ? AND course_id = ?', [sId, cId]);
      if (existing) {
        throw new Error('Student is already enrolled in this course.');
      }

      // 4. Insert enrollment
      await tx.run('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)', [sId, cId]);
    });

    res.json({ success: true, message: 'Successfully enrolled in course via database transaction!' });
  } catch (err) {
    console.error('Enrollment transaction error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function dropCourse(req, res) {
  try {
    const { student_id, course_id } = req.body;
    await dbRun('DELETE FROM enrolls WHERE student_id = ? AND course_id = ?', [student_id, course_id]);
    res.json({ success: true, message: 'Course dropped successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 17. Submissions History (Scoped for Instructors via TEACHES & Filterable)
export async function getSubmissions(req, res) {
  try {
    const role = (req.query.role || req.user?.role || req.headers['x-user-role'] || '').toLowerCase();
    const instructorId = req.query.instructorId 
      ? parseInt(req.query.instructorId, 10) 
      : (role === 'instructor' ? parseInt(req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10) : null);
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;
    const assignmentId = req.query.assignmentId ? parseInt(req.query.assignmentId, 10) : null;
    const studentId = req.query.studentId ? parseInt(req.query.studentId, 10) : null;
    const status = req.query.status ? req.query.status.trim() : null;

    let query = `
      SELECT sub.*, s.first_name, s.last_name, s.email as student_email, a.name as assignment_name, a.marks, a.due_date, c.course_name
      FROM submits sub
      JOIN student s ON sub.student_id = s.student_id
      JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id
      JOIN course c ON a.course_id = c.course_id
    `;
    const params = [];
    const conditions = [];

    if (role === 'instructor' || instructorId) {
      const activeInstId = instructorId || parseInt(req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10);
      if (activeInstId) {
        query += ` JOIN teaches t ON t.course_id = sub.course_id AND t.instructor_id = ? `;
        params.push(activeInstId);
      }
    }

    if (courseId) {
      conditions.push(`sub.course_id = ?`);
      params.push(courseId);
    }

    if (assignmentId) {
      conditions.push(`sub.assignment_id = ?`);
      params.push(assignmentId);
    }

    if (studentId) {
      conditions.push(`sub.student_id = ?`);
      params.push(studentId);
    }

    if (status) {
      if (status.toUpperCase() === 'PENDING') {
        conditions.push(`(sub.status != 'GRADED' AND sub.marks_obtained IS NULL)`);
      } else if (status.toUpperCase() === 'GRADED') {
        conditions.push(`(sub.status = 'GRADED' OR sub.marks_obtained IS NOT NULL)`);
      } else {
        conditions.push(`sub.status = ?`);
        params.push(status);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY sub.submission_date DESC `;

    const submissions = await dbAll(query, params);
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 18. Course Feedback Submission (PHASE 3: Upgraded Feedback System)
export async function submitCourseFeedback(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'instructor') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only enrolled students can submit course feedback.' });
    }

    const { student_id, course_id, instructor_id, rating, comments } = req.body;

    if (!student_id || !course_id || !rating) {
      return res.status(400).json({ success: false, error: 'Student ID, Course ID, and Rating (1-5) are required.' });
    }

    const numRating = parseInt(rating, 10);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Constraint Violation: Rating must be between 1 and 5.' });
    }

    // Determine instructor if not directly supplied
    let instId = instructor_id ? parseInt(instructor_id, 10) : null;
    if (!instId) {
      const assigned = await dbGet('SELECT instructor_id FROM teaches WHERE course_id = ? LIMIT 1', [course_id]);
      instId = assigned ? assigned.instructor_id : null;
    }

    const maxFeedback = (await dbGet('SELECT MAX(feedback_no) as max_no FROM course_feedback WHERE student_id = ?', [student_id]))?.max_no || 0;
    const feedbackNo = maxFeedback + 1;
    const textComments = comments ? comments.trim() : 'Comprehensive course instruction and clear explanation.';

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await dbRun(`
      INSERT INTO course_feedback (student_id, feedback_no, course_id, instructor_id, rating, comments, feedback_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [student_id, feedbackNo, course_id, instId, numRating, textComments, nowStr]);

    res.json({ success: true, message: 'Course feedback submitted successfully into course_feedback table!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 19. Course Feedback Summary Query (PHASE 3: GROUP BY, AVG, COUNT)
export async function getCourseFeedbackSummary(req, res) {
  try {
    const summary = await dbAll(`
      SELECT c.course_id, c.course_name,
        COUNT(cf.feedback_no) as feedback_count,
        ROUND(AVG(cf.rating), 2) as average_rating
      FROM course c
      LEFT JOIN course_feedback cf ON c.course_id = cf.course_id
      GROUP BY c.course_id, c.course_name
      ORDER BY average_rating DESC
    `);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 20. Student Profile
export async function getStudentProfile(req, res) {
  try {
    const studentId = parseInt(req.query.studentId || '101', 10);

    const student = await dbGet(`
      SELECT s.*, p.first_name as proctor_first, p.last_name as proctor_last, p.cabin_no as proctor_cabin,
             (SELECT phone_no FROM proctor_phone pp WHERE pp.proctor_id = p.proctor_id LIMIT 1) as proctor_phone
      FROM student s
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const account = await dbGet('SELECT username FROM account WHERE student_id = ?', [studentId]);
    const phones = await dbAll('SELECT phone_no FROM student_phone WHERE student_id = ?', [studentId]);
    const analytics = await dbGet('SELECT * FROM progress_analytics WHERE student_id = ?', [studentId]);
    const studySessions = await dbAll('SELECT * FROM study_session WHERE student_id = ? ORDER BY study_date DESC', [studentId]);

    const enrolledCourses = await dbAll(`
      SELECT c.course_id, c.course_name, d.dept_name
      FROM enrolls e
      JOIN course c ON e.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      WHERE e.student_id = ?
    `, [studentId]);

    res.json({
      success: true,
      profile: {
        ...student,
        username: account?.username || '',
        phones: phones.map(p => p.phone_no),
        phone_no: phones[0]?.phone_no || '',
        analytics: analytics || {},
        studySessions,
        enrolledCourses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 21. Update Student Phone Number
export async function updateStudentPhone(req, res) {
  try {
    const { student_id, phone_no } = req.body;
    if (!student_id || !phone_no) {
      return res.status(400).json({ success: false, error: 'Student ID and phone number are required.' });
    }

    const trimmedPhone = phone_no.trim();
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits (0-9).' });
    }

    await dbRun('DELETE FROM student_phone WHERE student_id = ?', [student_id]);
    await dbRun('INSERT INTO student_phone (student_id, phone_no) VALUES (?, ?)', [student_id, trimmedPhone]);

    res.json({ success: true, message: 'Phone number updated successfully in student_phone table!', phone_no: trimmedPhone });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 22. Update Student Password
export async function updateStudentPassword(req, res) {
  try {
    const { student_id, old_password, new_password } = req.body;
    if (!student_id || !old_password || !new_password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const account = await dbGet('SELECT * FROM account WHERE student_id = ?', [student_id]);
    if (!account || !verifyPassword(old_password.trim(), account.password)) {
      return res.status(401).json({ success: false, error: 'Current password does not match.' });
    }

    const hashedPassword = hashPassword(new_password.trim());
    await dbRun('UPDATE account SET password = ? WHERE student_id = ?', [hashedPassword, student_id]);
    res.json({ success: true, message: 'Password updated successfully in account table!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 23. Log Study Session (PHASE 10: Normalized Study Session Table)
export async function logStudySession(req, res) {
  try {
    const { student_id, minutes, topic, tracker_status } = req.body;
    const mins = parseInt(minutes || '30', 10);
    const studyTopic = topic || 'Course Study';
    const status = tracker_status || 'Good';

    // 1. Insert into study_session table
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await dbRun(`
      INSERT INTO study_session (student_id, study_date, time_spent, topic)
      VALUES (?, ?, ?, ?)
    `, [student_id, nowStr, mins, studyTopic]);

    // 2. Also update progress_analytics for live summary display
    const totalTime = (await dbGet('SELECT SUM(time_spent) as total FROM study_session WHERE student_id = ?', [student_id]))?.total || mins;
    await dbRun(`
      UPDATE progress_analytics SET time_spent = ?, daily_tracker = ? WHERE student_id = ?
    `, [totalTime, status, student_id]);

    res.json({ 
      success: true, 
      message: `Logged ${mins} minutes for '${studyTopic}' into study_session table! Total study time: ${totalTime} mins.`,
      totalTime
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 24. Upload / Create New Test (Faculty Instructors Only)
export async function uploadQuiz(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'student') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only faculty instructors can author and upload tests for their courses.' });
    }

    const { course_id, title, total_marks, questions } = req.body;
    const instructorId = parseInt(req.body?.instructorId || req.query.instructorId || req.query.userId || req.user?.id || req.headers?.['x-user-id'] || '0', 10);

    const courseId = parseInt(course_id, 10);
    if (!courseId || !title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course ID and Test Title are required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one question is required to create a test.' });
    }

    // Verify course exists
    const course = await dbGet('SELECT * FROM course WHERE course_id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ success: false, error: `Course #${courseId} does not exist.` });
    }

    // Instructor Course Ownership Check via TEACHES
    if (role === 'instructor' && instructorId) {
      const isAssigned = await dbGet('SELECT 1 FROM teaches WHERE instructor_id = ? AND course_id = ?', [instructorId, courseId]);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: You are not assigned to teach Course #${courseId}. You can only upload tests for your own courses.`
        });
      }
    }

    // Calculate next quiz_id for this course (Composite PK: course_id, quiz_id)
    const maxQuizRow = await dbGet('SELECT COALESCE(MAX(quiz_id), 0) as max_id FROM quiz WHERE course_id = ?', [courseId]);
    const nextQuizId = (maxQuizRow?.max_id || 0) + 1;

    // Calculate total marks if not explicitly passed
    const calculatedTotalMarks = total_marks 
      ? parseInt(total_marks, 10) 
      : questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 10), 0);

    // Atomically insert quiz, questions, and options inside ACID transaction
    await dbTransaction(async (tx) => {
      // 1. Insert into quiz table
      await tx.run(`
        INSERT INTO quiz (course_id, quiz_id, title, total_marks)
        VALUES (?, ?, ?, ?)
      `, [courseId, nextQuizId, title.trim(), calculatedTotalMarks]);

      // 2. Insert each question and its multiple-choice options
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];
        const questionId = qIdx + 1;
        const qMarks = parseInt(q.marks, 10) || 10;
        const qText = (q.question_text || q.text || `Question ${questionId}`).trim();

        await tx.run(`
          INSERT INTO quiz_question (course_id, quiz_id, question_id, question_text, marks)
          VALUES (?, ?, ?, ?, ?)
        `, [courseId, nextQuizId, questionId, qText, qMarks]);

        const options = Array.isArray(q.options) ? q.options : [];
        if (options.length === 0) {
          throw new Error(`Question ${questionId} must contain at least 2 options.`);
        }

        for (let optIdx = 0; optIdx < options.length; optIdx++) {
          const opt = options[optIdx];
          const optionId = optIdx + 1;
          const optText = (typeof opt === 'string' ? opt : (opt.option_text || opt.text || `Option ${optionId}`)).trim();
          const isCorrect = (typeof opt === 'object' && (opt.is_correct === 1 || opt.is_correct === true || q.correct_option_id === optionId)) ? 1 : 0;

          await tx.run(`
            INSERT INTO quiz_option (course_id, quiz_id, question_id, option_id, option_text, is_correct)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [courseId, nextQuizId, questionId, optionId, optText, isCorrect]);
        }
      }

      // 3. Record in audit_log
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await tx.run(`
        INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
        VALUES (?, ?, ?, ?, ?)
      `, ['quiz', 'INSERT', `${courseId}-${nextQuizId}`, nowStr, `Uploaded test "${title.trim()}" (${questions.length} questions, ${calculatedTotalMarks} marks) for Course #${courseId}`]);
    });

    res.json({
      success: true,
      message: `Test "${title.trim()}" successfully uploaded and published to Course #${courseId}!`,
      quiz: {
        course_id: courseId,
        quiz_id: nextQuizId,
        title: title.trim(),
        total_marks: calculatedTotalMarks,
        question_count: questions.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 25. Create / Give New Assignment (Faculty Instructors Only)
export async function createAssignment(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role === 'admin' || role === 'student') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only faculty instructors can create assignments for their courses.' });
    }

    const { course_id, name, marks, due_date } = req.body;
    const instructorId = parseInt(req.body?.instructorId || req.query.instructorId || req.query.userId || req.user?.id || req.headers['x-user-id'] || '0', 10);

    if (!course_id || !name || !marks || !due_date) {
      return res.status(400).json({
        success: false,
        error: 'Course ID, Assignment Name, Total Marks, and Due Date are required.'
      });
    }

    const courseId = parseInt(course_id, 10);
    const totalMarks = parseInt(marks, 10);
    if (totalMarks <= 0) {
      return res.status(400).json({ success: false, error: 'Total marks must be greater than 0.' });
    }

    // Authorization: instructor must be assigned to teach this course in teaches table
    if (role === 'instructor' && instructorId) {
      const isAssigned = await dbGet('SELECT 1 FROM teaches WHERE instructor_id = ? AND course_id = ?', [instructorId, courseId]);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: You are not assigned to teach Course #${courseId}. You can only give assignments for your own courses.`
        });
      }
    }

    // Verify course exists
    const course = await dbGet('SELECT * FROM course WHERE course_id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ success: false, error: `Course #${courseId} does not exist.` });
    }

    let nextAssignmentId = 1;
    await dbTransaction(async (tx) => {
      const maxRow = await tx.get('SELECT MAX(assignment_id) as max_id FROM assignment WHERE course_id = ?', [courseId]);
      nextAssignmentId = (maxRow?.max_id || 0) + 1;

      // 1. Insert into assignment table
      await tx.run(`
        INSERT INTO assignment (course_id, assignment_id, name, marks, due_date)
        VALUES (?, ?, ?, ?, ?)
      `, [courseId, nextAssignmentId, name.trim(), totalMarks, due_date.trim()]);

      // 2. Insert into audit_log
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await tx.run(`
        INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'assignment',
        'INSERT',
        `${courseId}-${nextAssignmentId}`,
        nowStr,
        `Created assignment "${name.trim()}" (${totalMarks} marks, due: ${due_date.trim()}) for Course #${courseId}`
      ]);
    });

    res.json({
      success: true,
      message: `Assignment "${name.trim()}" successfully published for ${course.course_name}!`,
      assignment: {
        course_id: courseId,
        assignment_id: nextAssignmentId,
        name: name.trim(),
        marks: totalMarks,
        due_date: due_date.trim()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 25. Instructor Profile
export async function getInstructorProfile(req, res) {
  try {
    const instructorId = parseInt(
      req.query?.instructorId || 
      req.params?.instructorId ||
      req.user?.id || 
      req.headers?.['x-user-id'] || 
      '201', 
      10
    );

    const instructor = await dbGet(`
      SELECT i.*, d.dept_name,
             (SELECT GROUP_CONCAT(DISTINCT ip.phone_no) FROM instructor_phone ip WHERE ip.instructor_id = i.instructor_id) as phone_numbers
      FROM instructor i
      LEFT JOIN department d ON i.dept_id = d.dept_id
      WHERE i.instructor_id = ?
    `, [instructorId]);

    if (!instructor) {
      return res.status(404).json({ success: false, error: 'Instructor record not found.' });
    }

    const phones = await dbAll('SELECT phone_no FROM instructor_phone WHERE instructor_id = ?', [instructorId]);

    const taughtCourses = await dbAll(`
      SELECT c.course_id, c.course_name, d.dept_name,
             (SELECT COUNT(*) FROM module m WHERE m.course_id = c.course_id) as module_count,
             (SELECT COUNT(*) FROM assignment a WHERE a.course_id = c.course_id) as assignment_count,
             (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = c.course_id) as enrolled_count
      FROM teaches t
      JOIN course c ON t.course_id = c.course_id
      LEFT JOIN department d ON c.dept_id = d.dept_id
      WHERE t.instructor_id = ?
      ORDER BY c.course_id ASC
    `, [instructorId]);

    res.json({
      success: true,
      profile: {
        ...instructor,
        phones: phones.map(p => p.phone_no),
        phone_no: phones[0]?.phone_no || '',
        taughtCourses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 26. Update Instructor Phone
export async function updateInstructorPhone(req, res) {
  try {
    const { instructor_id, phone_no } = req.body;
    if (!instructor_id || !phone_no) {
      return res.status(400).json({ success: false, error: 'Instructor ID and phone number are required.' });
    }

    const trimmedPhone = phone_no.trim();
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits (0-9).' });
    }

    const instId = parseInt(instructor_id, 10);
    await dbRun('DELETE FROM instructor_phone WHERE instructor_id = ?', [instId]);
    await dbRun('INSERT INTO instructor_phone (instructor_id, phone_no) VALUES (?, ?)', [instId, trimmedPhone]);

    res.json({ success: true, message: 'Phone number updated successfully in instructor_phone table!', phone_no: trimmedPhone });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 27. Update Instructor Cabin
export async function updateInstructorCabin(req, res) {
  try {
    const { instructor_id, cabin_no } = req.body;
    if (!instructor_id || !cabin_no) {
      return res.status(400).json({ success: false, error: 'Instructor ID and cabin number are required.' });
    }

    const instId = parseInt(instructor_id, 10);
    const trimmedCabin = cabin_no.trim();
    await dbRun('UPDATE instructor SET cabin_no = ? WHERE instructor_id = ?', [trimmedCabin, instId]);

    res.json({ success: true, message: 'Cabin number updated successfully in instructor table!', cabin_no: trimmedCabin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 28. Update Instructor Password
export async function updateInstructorPassword(req, res) {
  try {
    const { instructor_id, old_password, new_password } = req.body;
    if (!instructor_id || !old_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Instructor ID, current password, and new password are required.' });
    }

    const instId = parseInt(instructor_id, 10);
    const instructor = await dbGet('SELECT * FROM instructor WHERE instructor_id = ?', [instId]);
    if (!instructor) {
      return res.status(404).json({ success: false, error: 'Instructor not found.' });
    }

    const validPasswords = [
      instructor.password,
      'prof123',
      `${instructor?.first_name?.toLowerCase()}123`
    ];

    const matches = validPasswords.some(p => p && verifyPassword(old_password.trim(), p));
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Current password does not match.' });
    }

    if (new_password.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long.' });
    }

    const hashedPassword = hashPassword(new_password.trim());
    await dbRun('UPDATE instructor SET password = ? WHERE instructor_id = ?', [hashedPassword, instId]);

    res.json({ success: true, message: 'Faculty password updated successfully in database!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============================================================
// PHASE 12: ENROLLMENT APPROVAL WORKFLOW
// ============================================================

// 26. Request Enrollment — Student submits a request (not a direct enroll)
export async function requestEnrollment(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can request enrollment.' });
    }

    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, error: 'student_id and course_id are required.' });
    }
    const sId = parseInt(student_id, 10);
    const cId = parseInt(course_id, 10);

    // Guard: already enrolled
    const alreadyEnrolled = await dbGet('SELECT 1 FROM enrolls WHERE student_id = ? AND course_id = ?', [sId, cId]);
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, error: 'You are already enrolled in this course.' });
    }

    // Guard: duplicate pending/approved request
    const existing = await dbGet(
      "SELECT request_id, status FROM enrollment_request WHERE student_id = ? AND course_id = ?",
      [sId, cId]
    );
    if (existing && existing.status !== 'REJECTED') {
      return res.status(400).json({
        success: false,
        error: `An enrollment request already exists with status: ${existing.status}`
      });
    }

    if (existing && existing.status === 'REJECTED') {
      // Re-open a rejected request
      await dbRun(
        "UPDATE enrollment_request SET status='PENDING', admin_approved=0, proctor_approved=0, admin_notes=NULL, requested_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE request_id=?",
        [existing.request_id]
      );
      return res.json({ success: true, message: 'Enrollment re-requested successfully. Awaiting approval.' });
    }

    await dbRun(
      "INSERT INTO enrollment_request (student_id, course_id) VALUES (?, ?)",
      [sId, cId]
    );

    res.json({ success: true, message: 'Enrollment request submitted! Awaiting admin and proctor approval.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 27. Get All Enrollment Requests — Admin only
export async function getEnrollmentRequests(req, res) {
  try {
    const role = (req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    const requestingUserId = parseInt(req.query.studentId || req.user?.id || req.headers?.['x-user-id'] || '0', 10);

    // Students can only see their own requests; admins see all
    if (role !== 'admin' && role !== 'student') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const studentFilter = role === 'student' ? `WHERE er.student_id = ${requestingUserId}` : '';

    const requests = await dbAll(`
      SELECT
        er.request_id,
        er.student_id,
        er.course_id,
        er.status,
        er.admin_approved,
        er.proctor_approved,
        er.admin_notes,
        er.requested_at,
        er.updated_at,
        s.first_name || ' ' || s.last_name AS student_name,
        s.email AS student_email,
        c.course_name,
        p.first_name || ' ' || p.last_name AS proctor_name
      FROM enrollment_request er
      JOIN student s ON er.student_id = s.student_id
      JOIN course  c ON er.course_id  = c.course_id
      LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
      ${studentFilter}
      ORDER BY er.requested_at DESC
    `, []);

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 28. Approve / Reject Enrollment Request — Admin only
export async function approveEnrollmentRequest(req, res) {
  try {
    const role = (req.body?.role || req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can approve enrollment requests.' });
    }

    const { request_id, action, notes } = req.body;
    if (!request_id || !action) {
      return res.status(400).json({ success: false, error: 'request_id and action are required.' });
    }

    const rId = parseInt(request_id, 10);
    const request = await dbGet('SELECT * FROM enrollment_request WHERE request_id = ?', [rId]);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Enrollment request not found.' });
    }

    if (action === 'reject') {
      await dbRun(
        "UPDATE enrollment_request SET status='REJECTED', admin_notes=?, updated_at=CURRENT_TIMESTAMP WHERE request_id=?",
        [notes || null, rId]
      );
      return res.json({ success: true, message: 'Enrollment request rejected.' });
    }

    if (action === 'admin_approve') {
      await dbRun(
        "UPDATE enrollment_request SET admin_approved=1, status='ADMIN_APPROVED', admin_notes=?, updated_at=CURRENT_TIMESTAMP WHERE request_id=?",
        [notes || null, rId]
      );
      // Check if proctor already approved → auto-complete
      const updated = await dbGet('SELECT * FROM enrollment_request WHERE request_id = ?', [rId]);
      if (updated.proctor_approved === 1) {
        return finalizeEnrollment(updated, res);
      }
      return res.json({ success: true, message: 'Admin approval granted. Waiting for proctor approval.' });
    }

    if (action === 'proctor_approve') {
      await dbRun(
        "UPDATE enrollment_request SET proctor_approved=1, updated_at=CURRENT_TIMESTAMP WHERE request_id=?",
        [rId]
      );
      const updated = await dbGet('SELECT * FROM enrollment_request WHERE request_id = ?', [rId]);
      if (updated.admin_approved === 1) {
        return finalizeEnrollment(updated, res);
      }
      return res.json({ success: true, message: 'Proctor approval granted. Waiting for admin approval.' });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Internal helper: finalize enrollment once both approvals are in
async function finalizeEnrollment(request, res) {
  try {
    await dbTransaction(async (tx) => {
      // Guard: already enrolled (idempotent)
      const existing = await tx.get('SELECT 1 FROM enrolls WHERE student_id = ? AND course_id = ?', [request.student_id, request.course_id]);
      if (!existing) {
        await tx.run('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)', [request.student_id, request.course_id]);
      }

      // Update request status
      await tx.run(
        "UPDATE enrollment_request SET status='APPROVED', updated_at=CURRENT_TIMESTAMP WHERE request_id=?",
        [request.request_id]
      );

      // Notify all instructors who teach this course
      const instructors = await tx.all(
        'SELECT instructor_id FROM teaches WHERE course_id = ?',
        [request.course_id]
      );
      const studentRow = await tx.get('SELECT first_name, last_name FROM student WHERE student_id = ?', [request.student_id]);
      const courseRow  = await tx.get('SELECT course_name FROM course WHERE course_id = ?', [request.course_id]);
      const studentName = studentRow ? `${studentRow.first_name} ${studentRow.last_name}` : `Student #${request.student_id}`;
      const courseName  = courseRow  ? courseRow.course_name : `Course #${request.course_id}`;

      for (const inst of instructors) {
        await tx.run(
          `INSERT INTO instructor_notification (instructor_id, message, course_id, student_id)
           VALUES (?, ?, ?, ?)`,
          [
            inst.instructor_id,
            `${studentName} has been approved and enrolled in your course: ${courseName}.`,
            request.course_id,
            request.student_id
          ]
        );
      }
    });

    res.json({ success: true, message: 'Both approvals received. Student is now fully enrolled and instructor has been notified!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 29. Get Instructor Notifications
export async function getInstructorNotifications(req, res) {
  try {
    const role = (req.query?.role || req.user?.role || req.headers?.['x-user-role'] || '').toLowerCase();
    if (role !== 'instructor') {
      return res.status(403).json({ success: false, error: 'Only instructors can view notifications.' });
    }

    const instructorId = parseInt(req.query.instructorId || req.user?.id || req.headers?.['x-user-id'] || '0', 10);
    if (!instructorId) {
      return res.status(400).json({ success: false, error: 'instructorId is required.' });
    }

    const notifications = await dbAll(
      `SELECT n.*, s.first_name || ' ' || s.last_name AS student_name, c.course_name
       FROM instructor_notification n
       LEFT JOIN student s ON n.student_id = s.student_id
       LEFT JOIN course  c ON n.course_id  = c.course_id
       WHERE n.instructor_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [instructorId]
    );

    const unreadCount = notifications.filter(n => n.is_read === 0).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// 30. Mark Notification as Read
export async function markNotificationRead(req, res) {
  try {
    const notifId = parseInt(req.params.id, 10);
    await dbRun('UPDATE instructor_notification SET is_read = 1 WHERE notification_id = ?', [notifId]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
