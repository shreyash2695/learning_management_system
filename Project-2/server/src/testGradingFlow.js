import { initDatabase, dbGet, dbAll } from './config/db.js';
import { getSubmissions, gradeAssignment } from './controllers/lmsController.js';

async function runTests() {
  console.log('--- STARTING INSTRUCTOR SUBMISSIONS & GRADING TEST SUITE ---');
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

  // TEST 1: getSubmissions for Instructor 201
  console.log('\n[TEST 1] Testing getSubmissions for Instructor 201...');
  {
    const req = {
      query: { instructorId: '201' },
      headers: {}
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getSubmissions(req, res);
    assert(data && data.success === true, 'getSubmissions returns success: true');
    assert(Array.isArray(data.submissions) && data.submissions.length > 0, `Instructor 201 has ${data.submissions?.length} submissions in taught courses`);
  }

  // TEST 2: getSubmissions with courseId and assignmentId filtering
  console.log('\n[TEST 2] Testing getSubmissions scoped to Course 301 and Assignment 1...');
  {
    const req = {
      query: { instructorId: '201', courseId: '301', assignmentId: '1' },
      headers: {}
    };
    let data = null;
    const res = {
      json: (d) => { data = d; },
      status: () => res
    };

    await getSubmissions(req, res);
    assert(data && data.success === true, 'Filtered getSubmissions returns success: true');
    const allMatch = data.submissions.every(s => s.course_id === 301 && s.assignment_id === 1);
    assert(allMatch, 'All returned submissions match course_id=301 and assignment_id=1');
    assert(data.submissions.length > 0, `Found ${data.submissions.length} submissions for Course 301, Assignment 1`);
  }

  // TEST 3: gradeAssignment with valid marks
  console.log('\n[TEST 3] Testing gradeAssignment awarding 95 marks to Student 111...');
  {
    const req = {
      body: {
        student_id: 111,
        course_id: 301,
        assignment_id: 1,
        marks_obtained: 95,
        instructor_feedback: 'Outstanding normalization decomposition and query optimization.',
        status: 'GRADED'
      }
    };
    let result = null;
    const res = {
      json: (d) => { result = d; },
      status: () => res
    };

    await gradeAssignment(req, res);
    assert(result && result.success === true, 'gradeAssignment succeeded');
    assert(result.marks_obtained === 95, 'marks_obtained returned 95');
    assert(result.status === 'GRADED', 'status is GRADED');

    // Verify directly in DB
    const dbRow = await dbGet('SELECT * FROM submits WHERE student_id = 111 AND course_id = 301 AND assignment_id = 1');
    assert(dbRow && dbRow.marks_obtained === 95, 'Database submits row has marks_obtained = 95');
    assert(dbRow && dbRow.status === 'GRADED', 'Database submits row has status = GRADED');
    assert(dbRow && dbRow.instructor_feedback.includes('Outstanding normalization'), 'Database submits row has instructor_feedback recorded');
  }

  // TEST 4: gradeAssignment boundary check (> max marks)
  console.log('\n[TEST 4] Testing boundary enforcement: Rejection of marks > assignment.marks...');
  {
    const req = {
      body: {
        student_id: 111,
        course_id: 301,
        assignment_id: 1,
        marks_obtained: 150, // max is 100
        instructor_feedback: 'Too generous.'
      }
    };
    let errorResponse = null;
    let statusCode = 200;
    const res = {
      json: (d) => { errorResponse = d; },
      status: (code) => { statusCode = code; return res; }
    };

    await gradeAssignment(req, res);
    assert(statusCode === 400, 'Rejection returned HTTP 400 Bad Request');
    assert(errorResponse && errorResponse.success === false, 'Error response has success: false');
    assert(errorResponse && errorResponse.error.includes('Constraint Violation'), 'Constraint violation error message returned');
  }

  // TEST 5: Audit log verification
  console.log('\n[TEST 5] Verifying audit_log entry for grading operation...');
  {
    const auditRow = await dbGet("SELECT * FROM audit_log WHERE table_name = 'submits' ORDER BY audit_id DESC LIMIT 1");
    assert(auditRow !== null, 'Audit log row exists for table submits');
    assert(auditRow.description.includes('Graded coursework'), 'Audit description specifies Graded coursework');
  }

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
