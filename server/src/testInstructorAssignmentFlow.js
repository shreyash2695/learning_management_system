import { initDatabase, dbGet, dbAll } from './config/db.js';
import { getAssignments, createAssignment, submitAssignment } from './controllers/lmsController.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

async function runInstructorAssignmentVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFYING INSTRUCTOR ASSIGNMENT GIVING & SCOPING');
  console.log('====================================================\n');

  await initDatabase();

  const rajInstructorId = 201; // Prof. Raj teaches 301, 305, 306

  // TEST 1: Instructor Assignments Scoping
  console.log('[TEST 1] Instructor Assignments Scoping (Prof. Raj -> instructor_id 201):');
  const reqRajAssign = {
    query: { role: 'instructor', instructorId: String(rajInstructorId) },
    user: { role: 'instructor', id: rajInstructorId },
    headers: {}
  };
  const resRajAssign = createMockRes();
  await getAssignments(reqRajAssign, resRajAssign);

  const rajAssignments = resRajAssign.jsonData.assignments;
  const courseIds = [...new Set(rajAssignments.map(a => a.course_id))];
  console.log(`  ✓ Prof. Raj assignments returned: ${rajAssignments.length} assignment(s) across courses: [${courseIds.join(', ')}]`);

  // Verify all courseIds belong to teaches(201, course_id)
  const allowedCourses = (await dbAll('SELECT course_id FROM teaches WHERE instructor_id = ?', [rajInstructorId])).map(r => r.course_id);
  const hasUnauthorized = courseIds.some(cid => !allowedCourses.includes(cid));
  if (hasUnauthorized) {
    throw new Error(`Instructor scoping violation! Allowed courses: [${allowedCourses}], but received: [${courseIds}]`);
  }
  console.log(`  ✓ Verified: Assignments are strictly scoped to teaches courses [${allowedCourses.join(', ')}]\n`);

  // TEST 2: Attempt to Give Assignment to Unauthorized Course (Must Fail with 403)
  console.log('[TEST 2] Unauthorized Assignment Creation (Course #302 not taught by Prof. Raj):');
  const reqUnauthorized = {
    query: { role: 'instructor', instructorId: String(rajInstructorId) },
    user: { role: 'instructor', id: rajInstructorId },
    headers: {},
    body: {
      course_id: 302, // Computer Networks (taught by Prof. Priya)
      name: 'Unauthorized Networks Test Assignment',
      marks: 50,
      due_date: '2026-10-30'
    }
  };
  const resUnauthorized = createMockRes();
  await createAssignment(reqUnauthorized, resUnauthorized);

  if (resUnauthorized.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized course assignment, got ${resUnauthorized.statusCode}`);
  }
  console.log(`  ✓ Blocked unauthorized assignment creation: ${resUnauthorized.jsonData.error}\n`);

  // TEST 3: Give Assignment to Authorized Course (Course #301 - DBMS)
  console.log('[TEST 3] Authorized Assignment Creation (Course #301 taught by Prof. Raj):');
  const reqAuthorized = {
    query: { role: 'instructor', instructorId: String(rajInstructorId) },
    user: { role: 'instructor', id: rajInstructorId },
    headers: {},
    body: {
      course_id: 301,
      name: 'Advanced B-Tree Indexing & Performance Tuning',
      marks: 100,
      due_date: '2026-10-25'
    }
  };
  const resAuthorized = createMockRes();
  await createAssignment(reqAuthorized, resAuthorized);

  if (resAuthorized.statusCode !== 200 || !resAuthorized.jsonData.success) {
    throw new Error(`Assignment creation failed: ${JSON.stringify(resAuthorized.jsonData)}`);
  }

  const createdAssign = resAuthorized.jsonData.assignment;
  console.log(`  ✓ Successfully created assignment: "${createdAssign.name}" (Assignment #${createdAssign.assignment_id} on Course #${createdAssign.course_id})`);

  // Verify DB record in assignment table
  const dbAssign = await dbGet('SELECT * FROM assignment WHERE course_id = ? AND assignment_id = ?', [createdAssign.course_id, createdAssign.assignment_id]);
  if (!dbAssign || dbAssign.name !== 'Advanced B-Tree Indexing & Performance Tuning') {
    throw new Error(`Assignment not found in database: ${JSON.stringify(dbAssign)}`);
  }
  console.log(`  ✓ Relational Table assignment: Verified (Marks: ${dbAssign.marks}, Due: ${dbAssign.due_date})`);

  // Verify DB record in audit_log
  const auditRow = await dbGet('SELECT * FROM audit_log WHERE table_name = ? ORDER BY audit_id DESC LIMIT 1', ['assignment']);
  console.log(`  ✓ Relational Table audit_log: ${auditRow.description}\n`);

  // TEST 4: Student Sees the New Assignment and Submits Solution
  console.log('[TEST 4] Student Sees & Submits Newly Created Assignment:');
  const studentId = 101; // Akhil Nair
  const reqStudentSubmit = {
    body: {
      student_id: studentId,
      course_id: createdAssign.course_id,
      assignment_id: createdAssign.assignment_id,
      submission_date: '2026-09-14',
      submission_content: 'CREATE INDEX idx_student_cgpa ON student(cgpa); -- Verified 4x index scan improvement'
    }
  };
  const resStudentSubmit = createMockRes();
  await submitAssignment(reqStudentSubmit, resStudentSubmit);

  if (!resStudentSubmit.jsonData.success) {
    throw new Error(`Student submission failed: ${JSON.stringify(resStudentSubmit.jsonData)}`);
  }

  const dbSub = await dbGet('SELECT * FROM submits WHERE student_id = ? AND course_id = ? AND assignment_id = ?', [studentId, createdAssign.course_id, createdAssign.assignment_id]);
  console.log(`  ✓ Student #101 submitted coursework solution: "${dbSub.submission_content}"`);
  console.log(`  ✓ Status recorded: ${dbSub.status}\n`);

  // TEST 5: Instructor Views Updated Submissions Count
  console.log('[TEST 5] Instructor Views Updated Submissions Count:');
  const resUpdatedAssign = createMockRes();
  await getAssignments(reqRajAssign, resUpdatedAssign);

  const matchedAssign = resUpdatedAssign.jsonData.assignments.find(a => a.course_id === createdAssign.course_id && a.assignment_id === createdAssign.assignment_id);
  console.log(`  ✓ Assignment #${matchedAssign.assignment_id} submissions count: ${matchedAssign.submission_count} submitted, ${matchedAssign.graded_count} graded`);
  if (matchedAssign.submission_count !== 1) {
    throw new Error(`Expected submission_count to be 1, got ${matchedAssign.submission_count}`);
  }
  console.log(`  ✓ Verified: Instructor view dynamically shows live student submission count!\n`);

  console.log('====================================================');
  console.log('🎉 ALL INSTRUCTOR ASSIGNMENT GIVING TESTS PASSED!');
  console.log('====================================================\n');
}

runInstructorAssignmentVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
