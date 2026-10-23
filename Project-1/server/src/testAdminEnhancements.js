import { initDatabase, dbGet, dbAll, dbRun } from './config/db.js';
import { getDashboardData, getStudents, getEnrollments, submitAssignment, gradeAssignment, submitQuiz } from './controllers/lmsController.js';

async function runTests() {
  console.log('--- STARTING ADMIN ENHANCEMENTS TEST SUITE ---');
  await initDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Admin Dashboard Payload Structure
  console.log('\n[TEST 1] Testing getDashboardData for role: admin...');
  {
    const req = {
      query: { role: 'admin', userId: '1' },
      headers: { 'x-user-role': 'admin', 'x-user-id': '1' }
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getDashboardData(req, res);
    assert(data && data.success === true, 'getDashboard returns success: true');
    assert(Array.isArray(data.allStudents) && data.allStudents.length > 0, `allStudents has ${data.allStudents?.length} records`);
    assert(Array.isArray(data.coursesSummary) && data.coursesSummary.length > 0, `coursesSummary has ${data.coursesSummary?.length} records`);
    assert(Array.isArray(data.allProctors) && data.allProctors.length > 0, `allProctors has ${data.allProctors?.length} records`);

    // Verify student data enrichment
    const sampleStudent = data.allStudents[0];
    assert('proctor_id' in sampleStudent, 'Student record includes proctor_id');
    assert('enrolled_course_ids' in sampleStudent, 'Student record includes enrolled_course_ids');
    assert('enrolled_course_names' in sampleStudent, 'Student record includes enrolled_course_names');

    // Verify course data enrichment with enrolled students
    const sampleCourse = data.coursesSummary.find(c => c.enrolled_count > 0);
    assert(sampleCourse && Array.isArray(sampleCourse.enrolled_students), 'Course includes enrolled_students array');
    assert(sampleCourse.enrolled_students.length === sampleCourse.enrolled_count, 
      `Course ${sampleCourse.course_id} enrolled_students count (${sampleCourse.enrolled_students.length}) matches enrolled_count (${sampleCourse.enrolled_count})`);

    // Verify proctor data enrichment with assigned wards
    const sampleProctor = data.allProctors.find(p => p.ward_count > 0);
    assert(sampleProctor && Array.isArray(sampleProctor.wards), 'Proctor includes wards array');
    assert(sampleProctor.wards.length === sampleProctor.ward_count,
      `Proctor ${sampleProctor.proctor_id} wards count (${sampleProctor.wards.length}) matches ward_count (${sampleProctor.ward_count})`);
  }

  // TEST 2: getStudents with Course Filter
  console.log('\n[TEST 2] Testing getStudents filtered by courseId: 301...');
  {
    const req = {
      query: { courseId: '301' },
      headers: {}
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getStudents(req, res);
    assert(data && data.success === true, 'getStudents with courseId returns success: true');
    assert(Array.isArray(data.students) && data.students.length > 0, `Found ${data.students?.length} students enrolled in Course 301`);
    
    // Cross check with direct enrolls query
    const dbRows = await dbAll('SELECT student_id FROM enrolls WHERE course_id = 301');
    assert(data.students.length === dbRows.length, `Returned students count matches DB enrolls count (${dbRows.length})`);
  }

  // TEST 3: getStudents with Proctor Filter
  console.log('\n[TEST 3] Testing getStudents filtered by proctorId: 1...');
  {
    const req = {
      query: { proctorId: '1' },
      headers: {}
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getStudents(req, res);
    assert(data && data.success === true, 'getStudents with proctorId returns success: true');
    assert(Array.isArray(data.students) && data.students.length > 0, `Found ${data.students?.length} student wards under Proctor 1`);
    
    // Verify each returned student has proctor_id = 1
    const allMatch = data.students.every(s => s.proctor_id === 1);
    assert(allMatch, 'All returned students have proctor_id === 1');
  }

  // TEST 4: getEnrollments with Proctor Filter and Course Filter
  console.log('\n[TEST 4] Testing getEnrollments filtered by proctorId and courseId...');
  {
    const req = {
      query: { proctorId: '1' },
      headers: {}
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getEnrollments(req, res);
    assert(data && data.success === true, 'getEnrollments with proctorId returns success: true');
    assert(Array.isArray(data.enrollments) && data.enrollments.length > 0, `Found ${data.enrollments?.length} enrollments for wards under Proctor 1`);
    
    // Verify joined proctor details
    const firstEnr = data.enrollments[0];
    assert(firstEnr.proctor_first !== undefined, 'Enrollment record contains proctor_first');
    assert(firstEnr.proctor_cabin !== undefined, 'Enrollment record contains proctor_cabin');
    assert(firstEnr.proctor_id === 1, 'Enrollment proctor_id matches 1');
  }

  // TEST 5: Verify Admin CANNOT submit assignments (403 Forbidden)
  console.log('\n[TEST 5] Testing submitAssignment blocked for Admin...');
  {
    const req = {
      body: {
        student_id: 901,
        course_id: 301,
        assignment_id: 1,
        submission_content: 'Admin attempt to submit coursework',
        role: 'admin'
      },
      headers: { 'x-user-role': 'admin' }
    };
    let statusCode = 200;
    let data = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => { data = d; }
    };

    await submitAssignment(req, res);
    assert(statusCode === 403, `submitAssignment returned 403 Forbidden (got ${statusCode})`);
    assert(data && data.success === false && data.error.includes('Access Denied'), 'Response message confirms access denied for submitAssignment');
  }

  // TEST 6: Verify Admin CANNOT grade assignments (403 Forbidden)
  console.log('\n[TEST 6] Testing gradeAssignment blocked for Admin...');
  {
    const req = {
      body: {
        student_id: 101,
        course_id: 301,
        assignment_id: 1,
        marks_obtained: 25,
        instructor_feedback: 'Admin trying to grade',
        role: 'admin'
      },
      headers: { 'x-user-role': 'admin' }
    };
    let statusCode = 200;
    let data = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => { data = d; }
    };

    await gradeAssignment(req, res);
    assert(statusCode === 403, `gradeAssignment returned 403 Forbidden (got ${statusCode})`);
    assert(data && data.success === false && data.error.includes('Only faculty instructors'), 'Response message confirms access denied for gradeAssignment');
  }

  // TEST 7: Verify Admin CANNOT take/submit quizzes (403 Forbidden)
  console.log('\n[TEST 7] Testing submitQuiz blocked for Admin...');
  {
    const req = {
      body: {
        student_id: 901,
        quiz_id: 1,
        course_id: 301,
        answers: { 1: 1 },
        role: 'admin'
      },
      headers: { 'x-user-role': 'admin' }
    };
    let statusCode = 200;
    let data = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => { data = d; }
    };

    await submitQuiz(req, res);
    assert(statusCode === 403, `submitQuiz returned 403 Forbidden (got ${statusCode})`);
    assert(data && data.success === false, 'submitQuiz response confirms access denied for admin');
  }

  // TEST 8: Verify Instructor CAN grade assignments (Authorized)
  console.log('\n[TEST 8] Testing gradeAssignment allowed for Faculty Instructor...');
  {
    // First ensure a submission exists
    await dbRun(`
      INSERT OR IGNORE INTO submits (student_id, course_id, assignment_id, submission_date, submission_content, status)
      VALUES (101, 301, 1, '2026-03-01', 'Test solution', 'SUBMITTED')
    `);

    const req = {
      body: {
        student_id: 101,
        course_id: 301,
        assignment_id: 1,
        marks_obtained: 24,
        instructor_feedback: 'Solid relational understanding.',
        role: 'instructor'
      },
      headers: { 'x-user-role': 'instructor', 'x-user-id': '1' }
    };
    let statusCode = 200;
    let data = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => { data = d; }
    };

    await gradeAssignment(req, res);
    assert(statusCode === 200, `gradeAssignment returned 200 OK (got ${statusCode})`);
    assert(data && data.success === true, 'Faculty instructor successfully graded assignment');
    assert(data && data.marks_obtained === 24, 'Marks awarded correctly recorded as 24');
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
