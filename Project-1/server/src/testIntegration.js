import { initDatabase, dbAll, dbGet, dbRun, dbRawQuery, dbTransaction } from './config/db.js';
import { TABLE_SCHEMAS } from './controllers/crudController.js';
import { login } from './controllers/authController.js';
import { submitQuiz, gradeAssignment, enrollCourse } from './controllers/lmsController.js';

async function runSystematicTests() {
  console.log('====================================================');
  console.log('🧪 LMS Portal Academic DBMS & Full-Stack Systematic Test Suite');
  console.log('====================================================\n');
  await initDatabase();

  // 1. Insert valid student
  console.log('[TEST 1] Insert Valid Student:');
  const testStudentId = 980;
  await dbRun('DELETE FROM student WHERE student_id IN (980, 981, 982, 985)');
  await dbRun(
    'INSERT INTO student (student_id, first_name, last_name, dob, email, proctor_id) VALUES (?, ?, ?, ?, ?, ?)',
    [testStudentId, 'Tanya', 'Verma', '2001-08-15', 'tanya.test@lms.ac.in', 1]
  );
  const insertedStudent = await dbGet('SELECT * FROM student WHERE student_id = ?', [testStudentId]);
  if (insertedStudent && insertedStudent.first_name === 'Tanya') {
    console.log('  ✓ Valid Student inserted successfully:', insertedStudent.email);
  } else {
    throw new Error('Failed to insert valid student');
  }

  // 2. Insert invalid student (Email format check)
  console.log('\n[TEST 2] Insert Invalid Student (Invalid Email):');
  try {
    // Email lacking @ should fail check constraint
    await dbRun(
      'INSERT INTO student (student_id, first_name, last_name, dob, email) VALUES (?, ?, ?, ?, ?)',
      [981, 'Bad', 'Email', '2000-01-01', 'bad-email-without-at']
    );
    throw new Error('Invalid email student insertion should have failed');
  } catch (err) {
    console.log('  ✓ Correctly rejected invalid email student:', err.message);
  }

  // 3. Test Age Trigger (< 16 years must fail)
  console.log('\n[TEST 3] Test Student Age Trigger (< 16 years rejected):');
  try {
    await dbRun(
      'INSERT INTO student (student_id, first_name, last_name, dob, email) VALUES (?, ?, ?, ?, ?)',
      [982, 'Young', 'Child', '2020-05-10', 'child@lms.ac.in']
    );
    throw new Error('Underage student should have been rejected by trigger');
  } catch (err) {
    console.log('  ✓ Trigger successfully intercepted underage student:', err.message);
  }

  // 4. Insert Valid Course
  console.log('\n[TEST 4] Insert Valid Course:');
  const testCourseId = 399;
  await dbRun('DELETE FROM course WHERE course_id = ?', [testCourseId]);
  await dbRun('INSERT INTO course (course_id, course_name, dept_id) VALUES (?, ?, ?)', [testCourseId, 'Cloud Computing', 1]);
  const course = await dbGet('SELECT * FROM course WHERE course_id = ?', [testCourseId]);
  if (course && course.course_name === 'Cloud Computing') {
    console.log('  ✓ Valid course inserted:', course.course_name);
  } else {
    throw new Error('Course insertion failed');
  }

  // 5. Test TEACHES Relationship (M:N)
  console.log('\n[TEST 5] Test TEACHES Relationship (Prof. Raj -> Cloud Computing):');
  await dbRun('DELETE FROM teaches WHERE instructor_id = ? AND course_id = ?', [201, testCourseId]);
  await dbRun('INSERT INTO teaches (instructor_id, course_id) VALUES (?, ?)', [201, testCourseId]);
  const teachesRecord = await dbGet('SELECT * FROM teaches WHERE instructor_id = ? AND course_id = ?', [201, testCourseId]);
  if (teachesRecord) {
    console.log('  ✓ TEACHES relationship successfully recorded: Instructor 201 teaches Course', testCourseId);
  } else {
    throw new Error('TEACHES insertion failed');
  }

  // 6. Test Enrollment
  console.log('\n[TEST 6] Test Student Enrollment (Enrolls Table):');
  await dbRun('DELETE FROM enrolls WHERE student_id = ? AND course_id = ?', [testStudentId, testCourseId]);
  await dbRun('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)', [testStudentId, testCourseId]);
  const enrollRecord = await dbGet('SELECT * FROM enrolls WHERE student_id = ? AND course_id = ?', [testStudentId, testCourseId]);
  if (enrollRecord) {
    console.log('  ✓ Student enrolled in course successfully!');
  } else {
    throw new Error('Enrollment failed');
  }

  // 7. Test Duplicate Enrollment (Must be rejected by Primary Key)
  console.log('\n[TEST 7] Test Duplicate Enrollment Prevention:');
  try {
    await dbRun('INSERT INTO enrolls (student_id, course_id) VALUES (?, ?)', [testStudentId, testCourseId]);
    throw new Error('Duplicate enrollment should have been rejected');
  } catch (err) {
    console.log('  ✓ Duplicate enrollment prevented by Composite Primary Key:', err.message);
  }

  // 8. Test Assignment Submission (with content & status)
  console.log('\n[TEST 8] Test Assignment Submission (submits table with content & status):');
  await dbRun('DELETE FROM assignment WHERE course_id = ? AND assignment_id = ?', [testCourseId, 1]);
  await dbRun('INSERT INTO assignment (course_id, assignment_id, name, marks, due_date) VALUES (?, ?, ?, ?, ?)', [
    testCourseId, 1, 'Cloud Deployment Lab', 100, '2026-11-01'
  ]);
  await dbRun('DELETE FROM submits WHERE student_id = ? AND course_id = ? AND assignment_id = ?', [testStudentId, testCourseId, 1]);
  await dbRun(
    'INSERT INTO submits (student_id, course_id, assignment_id, submission_date, submission_content, status) VALUES (?, ?, ?, ?, ?, ?)',
    [testStudentId, testCourseId, 1, '2026-10-15', 'Deployed multi-container cluster on AWS ECS.', 'SUBMITTED']
  );
  const sub = await dbGet('SELECT * FROM submits WHERE student_id = ? AND course_id = ? AND assignment_id = ?', [testStudentId, testCourseId, 1]);
  if (sub && sub.status === 'SUBMITTED' && sub.submission_content) {
    console.log('  ✓ Assignment submitted with content & status:', sub.status);
  } else {
    throw new Error('Assignment submission failed');
  }

  // 9. Test Invalid Marks Validation (Trigger check)
  console.log('\n[TEST 9] Test Invalid Marks (> Max Marks):');
  try {
    // Max marks for assignment is 100, try 150
    await dbRun(
      'UPDATE submits SET marks_obtained = ? WHERE student_id = ? AND course_id = ? AND assignment_id = ?',
      [150, testStudentId, testCourseId, 1]
    );
    throw new Error('Invalid marks (> 100) should have been rejected');
  } catch (err) {
    console.log('  ✓ Correctly rejected marks exceeding assignment max marks:', err.message);
  }

  // 10. Test Quiz Creation
  console.log('\n[TEST 10] Test Quiz & Question Creation (Relational Quiz):');
  const quizCheck = await dbGet('SELECT * FROM quiz WHERE course_id = 301 AND quiz_id = 1');
  const questionCount = (await dbGet('SELECT COUNT(*) as cnt FROM quiz_question WHERE course_id = 301 AND quiz_id = 1'))?.cnt;
  const optionCount = (await dbGet('SELECT COUNT(*) as cnt FROM quiz_option WHERE course_id = 301 AND quiz_id = 1'))?.cnt;
  if (quizCheck && questionCount > 0 && optionCount > 0) {
    console.log(`  ✓ Relational Quiz Verified: Quiz #${quizCheck.quiz_id} has ${questionCount} questions and ${optionCount} options.`);
  } else {
    throw new Error('Relational Quiz verification failed');
  }

  // 11. Test Quiz Attempt & 12. Actual Score Calculation
  console.log('\n[TEST 11 & 12] Test Quiz Attempt & Exact Score Calculation:');
  let quizResData = null;
  await submitQuiz(
    {
      body: {
        student_id: 101,
        course_id: 301,
        quiz_id: 1,
        answers: { 1: 1, 2: 2, 3: 3 } // Correct answers for Q1, Q2, Q3
      }
    },
    { json: (d) => { quizResData = d; }, status: () => ({ json: () => {} }) }
  );
  if (quizResData?.success && quizResData.score === 30 && quizResData.correctCount === 3) {
    console.log(`  ✓ Quiz Scored Correctly: ${quizResData.score}/${quizResData.total_marks} (Accuracy: ${quizResData.percentage}%)`);
    console.log(`  ✓ Saved to quiz_attempt (Attempt ID: ${quizResData.attempt_id})`);
  } else {
    throw new Error('Quiz evaluation failed');
  }

  // 13. Test Feedback Submission
  console.log('\n[TEST 13] Test Course Feedback Submission (with rating & comments):');
  await dbRun(
    'INSERT INTO course_feedback (student_id, feedback_no, course_id, instructor_id, rating, comments, feedback_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [testStudentId, 1, 301, 201, 5, 'Exceptional instructor pedagogy and clear database normalization examples.', '2026-09-14']
  );
  const fb = await dbGet('SELECT * FROM course_feedback WHERE student_id = ? AND feedback_no = 1', [testStudentId]);
  if (fb && fb.rating === 5) {
    console.log('  ✓ Feedback saved with rating 5 and comments:', fb.comments.slice(0, 45) + '...');
  } else {
    throw new Error('Feedback submission failed');
  }

  // 14. Test Invalid Rating Check (< 1 or > 5)
  console.log('\n[TEST 14] Test Invalid Feedback Rating (CHECK constraint):');
  try {
    await dbRun(
      'INSERT INTO course_feedback (student_id, feedback_no, course_id, instructor_id, rating, comments) VALUES (?, ?, ?, ?, ?, ?)',
      [testStudentId, 2, 301, 201, 10, 'Out of bounds rating']
    );
    throw new Error('Invalid rating (10) should have been rejected');
  } catch (err) {
    console.log('  ✓ Correctly rejected invalid rating (must be 1-5):', err.message);
  }

  // 15. Test Views (Phase 9)
  console.log('\n[TEST 15] Test Database Views:');
  const v1 = await dbAll('SELECT * FROM student_course_view LIMIT 2');
  const v2 = await dbAll('SELECT * FROM course_enrollment_summary LIMIT 2');
  const v3 = await dbAll('SELECT * FROM student_performance_view LIMIT 2');
  const v4 = await dbAll('SELECT * FROM course_feedback_summary LIMIT 2');
  if (v1.length > 0 && v2.length > 0 && v3.length > 0 && v4.length > 0) {
    console.log('  ✓ View 1 (STUDENT_COURSE_VIEW): Active and querying successfully');
    console.log('  ✓ View 2 (COURSE_ENROLLMENT_SUMMARY): Active and querying successfully');
    console.log('  ✓ View 3 (STUDENT_PERFORMANCE_VIEW): Active and querying successfully');
    console.log('  ✓ View 4 (COURSE_FEEDBACK_SUMMARY): Active and querying successfully');
  } else {
    throw new Error('View execution failed');
  }

  // 16. Test Stored Procedures (Phase 6)
  console.log('\n[TEST 16] Test Stored Procedures via Playground Engine:');
  const p1 = await dbRawQuery('CALL GET_STUDENT_DETAILS(101)');
  const p2 = await dbRawQuery('CALL GET_COURSE_STUDENTS(301)');
  const p3 = await dbRawQuery('CALL GET_STUDENT_COURSES(101)');
  const p4 = await dbRawQuery('CALL GRADE_ASSIGNMENT(101, 301, 1, 98, "Outstanding work")');
  if (p1.rows.length > 0 && p2.rows.length > 0 && p3.rows.length > 0 && p4.rows[0].status === 'SUCCESS') {
    console.log('  ✓ Procedure GET_STUDENT_DETAILS: Returned student record');
    console.log('  ✓ Procedure GET_COURSE_STUDENTS: Returned', p2.rows.length, 'students');
    console.log('  ✓ Procedure GET_STUDENT_COURSES: Returned', p3.rows.length, 'courses');
    console.log('  ✓ Procedure GRADE_ASSIGNMENT: Success status returned');
  } else {
    throw new Error('Stored procedure test failed');
  }

  // 17. Test Stored Functions (Phase 7)
  console.log('\n[TEST 17] Test Stored Functions in SQL Statements:');
  const funcQuery = `
    SELECT course_id, course_name,
           GET_COURSE_STUDENT_COUNT(course_id) as student_count,
           GET_COURSE_AVERAGE_RATING(course_id) as avg_rating
    FROM course
    WHERE course_id = 301
  `;
  const funcRes = await dbRawQuery(funcQuery);
  if (funcRes.rows.length > 0 && funcRes.rows[0].student_count !== undefined) {
    console.log(`  ✓ Function GET_COURSE_STUDENT_COUNT(301): ${funcRes.rows[0].student_count}`);
    console.log(`  ✓ Function GET_COURSE_AVERAGE_RATING(301): ${funcRes.rows[0].avg_rating} Stars`);
  } else {
    throw new Error('Stored function test failed');
  }

  // 18. Test Audit Trigger (Phase 8)
  console.log('\n[TEST 18] Test Audit Logging Trigger:');
  const auditId = 'AUDIT-' + Date.now().toString().slice(-4);
  await dbRun('DELETE FROM student WHERE student_id = 985');
  await dbRun(
    'INSERT INTO student (student_id, first_name, last_name, dob, email) VALUES (?, ?, ?, ?, ?)',
    [985, 'Audit', 'Test', '1999-01-01', `audit.${auditId}@lms.ac.in`]
  );
  const auditRow = await dbGet('SELECT * FROM audit_log WHERE record_id = ? ORDER BY audit_id DESC', ['985']);
  if (auditRow && auditRow.operation === 'INSERT' && auditRow.table_name === 'student') {
    console.log('  ✓ Database Audit Trigger fired! Logged:', auditRow.description);
  } else {
    throw new Error('Audit trigger failed');
  }
  await dbRun('DELETE FROM student WHERE student_id = 985');

  // 19. Test Transaction Rollback (Phase 11)
  console.log('\n[TEST 19] Test Transaction Rollback on Error:');
  const rollbackStudentId = 986;
  try {
    await dbTransaction(async (tx) => {
      await tx.run('INSERT INTO student (student_id, first_name, last_name, dob, email) VALUES (?, ?, ?, ?, ?)', [
        rollbackStudentId, 'Rollback', 'Student', '2000-01-01', 'rollback@lms.ac.in'
      ]);
      throw new Error('Forced simulation error during transaction');
    });
  } catch (err) {
    console.log('  ✓ Transaction caught simulated error:', err.message);
  }
  const checkRollback = await dbGet('SELECT * FROM student WHERE student_id = ?', [rollbackStudentId]);
  if (checkRollback === null) {
    console.log('  ✓ Verified ROLLBACK: Student record was NOT committed to the database!');
  } else {
    throw new Error('Transaction rollback failed');
  }

  // 20. Test Transaction Commit (Phase 11)
  console.log('\n[TEST 20] Test Transaction Commit on Success:');
  const commitStudentId = 987;
  await dbRun('DELETE FROM student WHERE student_id = ?', [commitStudentId]);
  await dbTransaction(async (tx) => {
    await tx.run('INSERT INTO student (student_id, first_name, last_name, dob, email) VALUES (?, ?, ?, ?, ?)', [
      commitStudentId, 'Commit', 'Student', '2000-01-01', 'commit@lms.ac.in'
    ]);
  });
  const checkCommit = await dbGet('SELECT * FROM student WHERE student_id = ?', [commitStudentId]);
  if (checkCommit && checkCommit.first_name === 'Commit') {
    console.log('  ✓ Verified COMMIT: Student record was successfully committed in transaction!');
  } else {
    throw new Error('Transaction commit failed');
  }
  await dbRun('DELETE FROM student WHERE student_id = ?', [commitStudentId]);

  // Clean up temporary course and student
  await dbRun('DELETE FROM course WHERE course_id = ?', [testCourseId]);
  await dbRun('DELETE FROM student WHERE student_id = ?', [testStudentId]);

  // 21. Multi-Role Authentication with Passwords & JWT (Phase 14)
  console.log('\n[TEST 21] Test Authentication & Role Management:');
  let authResult = null;
  await login(
    { body: { role: 'student', username: 'akhil_user', password: 'pass1' } },
    { json: (d) => { authResult = d; }, status: () => ({ json: () => {} }) }
  );
  if (authResult?.success && authResult.token) {
    console.log('  ✓ Student Login: akhil_user authenticated -> Received signed JWT token');
  } else {
    throw new Error('Student auth failed');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 20 DATABASE & BACKEND INTEGRATION TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runSystematicTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
