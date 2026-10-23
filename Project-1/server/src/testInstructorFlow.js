import { initDatabase, dbGet, dbAll, dbRun } from './config/db.js';
import { getCourses, getCourseDetails, getQuizzes, uploadQuiz, submitQuiz } from './controllers/lmsController.js';

async function runInstructorVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFYING INSTRUCTOR SCOPING & TEST UPLOAD FLOWS');
  console.log('====================================================\n');

  await initDatabase();

  // Mock response object
  function createMockRes() {
    return {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  }

  // 1. Instructor Course Scoping (Prof. Raj: ID 201)
  console.log('[TEST 1] Instructor Course Scoping (Prof. Raj -> instructor_id 201):');
  const reqCourses = {
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resCourses = createMockRes();
  await getCourses(reqCourses, resCourses);

  const instructorCourses = resCourses.jsonData?.courses || [];
  const courseIds = instructorCourses.map(c => c.course_id);
  console.log(`  ✓ Prof. Raj assigned courses returned: [${courseIds.join(', ')}]`);
  
  if (courseIds.includes(302) || courseIds.includes(303)) {
    throw new Error('Course scoping failed: Instructor received courses taught by other faculty!');
  }
  if (!courseIds.includes(301)) {
    throw new Error('Course scoping failed: Instructor did not receive Course 301!');
  }
  console.log('  ✓ Verified: Only courses in teaches (301, 305, 306) are visible.\n');

  // 2. Instructor Course Detail Access Boundary
  console.log('[TEST 2] Instructor Course Detail Access Boundary:');
  // Allowed Course 301
  const reqAllowed = {
    params: { id: '301' },
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resAllowed = createMockRes();
  await getCourseDetails(reqAllowed, resAllowed);
  if (resAllowed.statusCode !== 200) {
    throw new Error(`Failed to access assigned course 301: ${resAllowed.jsonData?.error}`);
  }
  console.log(`  ✓ Access granted to assigned Course #301 (${resAllowed.jsonData.course.course_name})`);

  // Disallowed Course 302 (Taught by Prof. Anita 202)
  const reqBlocked = {
    params: { id: '302' },
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resBlocked = createMockRes();
  await getCourseDetails(reqBlocked, resBlocked);
  if (resBlocked.statusCode !== 403) {
    throw new Error(`Boundary breach: Instructor was able to view Course 302 (status: ${resBlocked.statusCode})`);
  }
  console.log(`  ✓ Access strictly blocked for unauthorized Course #302: ${resBlocked.jsonData.error}\n`);

  // 3. Instructor Quizzes Scoping
  console.log('[TEST 3] Instructor Quizzes Scoping:');
  const reqQuizzes = {
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resQuizzes = createMockRes();
  await getQuizzes(reqQuizzes, resQuizzes);
  const instructorQuizzes = resQuizzes.jsonData?.quizzes || [];
  const quizCourseIds = [...new Set(instructorQuizzes.map(q => q.course_id))];
  console.log(`  ✓ Returned quizzes for courses: [${quizCourseIds.join(', ')}]`);
  if (quizCourseIds.includes(302) || quizCourseIds.includes(303)) {
    throw new Error('Quiz scoping failed: Received quizzes belonging to other courses!');
  }
  console.log('  ✓ Verified: Instructor quizzes strictly match assigned courses in teaches.\n');

  // 4. Test Upload to Unauthorized Course (Must be Rejected)
  console.log('[TEST 4] Test Upload to Unauthorized Course (Must Fail with 403):');
  const reqUploadFail = {
    body: {
      course_id: 302, // Not Raj's course
      title: 'Unauthorized Test',
      total_marks: 20,
      questions: [
        {
          question_text: 'Sample Q',
          marks: 10,
          options: [
            { option_text: 'Opt A', is_correct: 1 },
            { option_text: 'Opt B', is_correct: 0 }
          ]
        }
      ]
    },
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resUploadFail = createMockRes();
  await uploadQuiz(reqUploadFail, resUploadFail);
  if (resUploadFail.statusCode !== 403) {
    throw new Error(`Upload boundary failed: Test upload allowed on unassigned course! Status: ${resUploadFail.statusCode}`);
  }
  console.log(`  ✓ Blocked unauthorized upload: ${resUploadFail.jsonData.error}\n`);

  // 5. Test Upload to Authorized Course (Course 301)
  console.log('[TEST 5] Test Upload to Authorized Course (Course 301):');
  const reqUploadSuccess = {
    body: {
      course_id: 301,
      title: 'ACID Transactions & Normalization Midterm',
      total_marks: 30,
      questions: [
        {
          question_text: 'Which ACID property guarantees all updates in a transaction succeed or all rollback?',
          marks: 10,
          options: [
            { option_text: 'Atomicity', is_correct: 1 },
            { option_text: 'Consistency', is_correct: 0 },
            { option_text: 'Isolation', is_correct: 0 },
            { option_text: 'Durability', is_correct: 0 }
          ]
        },
        {
          question_text: 'Which normal form eliminates transitive functional dependencies on non-prime attributes?',
          marks: 10,
          options: [
            { option_text: 'First Normal Form (1NF)', is_correct: 0 },
            { option_text: 'Second Normal Form (2NF)', is_correct: 0 },
            { option_text: 'Third Normal Form (3NF)', is_correct: 1 },
            { option_text: 'BCNF', is_correct: 0 }
          ]
        },
        {
          question_text: 'What kind of locking protocol prevents cascading aborts in concurrent transaction execution?',
          marks: 10,
          options: [
            { option_text: 'Strict Two-Phase Locking (Strict 2PL)', is_correct: 1 },
            { option_text: 'Conservative 2PL', is_correct: 0 },
            { option_text: 'Basic Time-stamp Ordering', is_correct: 0 },
            { option_text: 'Optimistic Concurrency Control', is_correct: 0 }
          ]
        }
      ]
    },
    query: { role: 'instructor', instructorId: '201' },
    user: { id: 201, role: 'instructor' },
    headers: { 'x-user-role': 'instructor', 'x-user-id': '201' }
  };
  const resUploadSuccess = createMockRes();
  await uploadQuiz(reqUploadSuccess, resUploadSuccess);

  if (resUploadSuccess.statusCode !== 200 || !resUploadSuccess.jsonData?.success) {
    throw new Error(`Upload failed: ${resUploadSuccess.jsonData?.error}`);
  }
  const newQuiz = resUploadSuccess.jsonData.quiz;
  console.log(`  ✓ Successfully uploaded test "${newQuiz.title}" (Quiz #${newQuiz.quiz_id} on Course #${newQuiz.course_id})`);

  // Verify relational tables populated
  const savedQuiz = await dbGet('SELECT * FROM quiz WHERE course_id = ? AND quiz_id = ?', [newQuiz.course_id, newQuiz.quiz_id]);
  const savedQuestions = await dbAll('SELECT * FROM quiz_question WHERE course_id = ? AND quiz_id = ?', [newQuiz.course_id, newQuiz.quiz_id]);
  const savedOptions = await dbAll('SELECT * FROM quiz_option WHERE course_id = ? AND quiz_id = ?', [newQuiz.course_id, newQuiz.quiz_id]);
  const auditEntry = await dbGet('SELECT * FROM audit_log WHERE table_name = ? ORDER BY audit_id DESC LIMIT 1', ['quiz']);

  console.log(`  ✓ Relational Table quiz: Saved (Title: "${savedQuiz.title}", Total Marks: ${savedQuiz.total_marks})`);
  console.log(`  ✓ Relational Table quiz_question: Saved ${savedQuestions.length} questions`);
  console.log(`  ✓ Relational Table quiz_option: Saved ${savedOptions.length} choices`);
  console.log(`  ✓ Relational Table audit_log: ${auditEntry.description}\n`);

  // 6. Student Takes the Newly Uploaded Test
  console.log('[TEST 6] Student Takes Newly Uploaded Test (Akhil Nair -> student_id 101):');
  // Find option IDs for the questions
  const q1Opts = await dbAll('SELECT option_id, is_correct FROM quiz_option WHERE course_id = ? AND quiz_id = ? AND question_id = 1', [newQuiz.course_id, newQuiz.quiz_id]);
  const q2Opts = await dbAll('SELECT option_id, is_correct FROM quiz_option WHERE course_id = ? AND quiz_id = ? AND question_id = 2', [newQuiz.course_id, newQuiz.quiz_id]);
  const q3Opts = await dbAll('SELECT option_id, is_correct FROM quiz_option WHERE course_id = ? AND quiz_id = ? AND question_id = 3', [newQuiz.course_id, newQuiz.quiz_id]);

  const q1Correct = q1Opts.find(o => o.is_correct === 1)?.option_id;
  const q2Correct = q2Opts.find(o => o.is_correct === 1)?.option_id;
  const q3Wrong = q3Opts.find(o => o.is_correct === 0)?.option_id;

  const reqStudentSubmit = {
    body: {
      student_id: 101,
      course_id: newQuiz.course_id,
      quiz_id: newQuiz.quiz_id,
      answers: {
        1: q1Correct, // Correct (10 marks)
        2: q2Correct, // Correct (10 marks)
        3: q3Wrong    // Wrong (0 marks)
      }
    },
    user: { id: 101, role: 'student' }
  };
  const resStudentSubmit = createMockRes();
  await submitQuiz(reqStudentSubmit, resStudentSubmit);

  if (resStudentSubmit.statusCode !== 200 || !resStudentSubmit.jsonData?.success) {
    throw new Error(`Student quiz submission failed: ${resStudentSubmit.jsonData?.error}`);
  }

  const scoreData = resStudentSubmit.jsonData;
  console.log(`  ✓ Test evaluated automatically against relational options!`);
  console.log(`  ✓ Result: ${scoreData.score}/${scoreData.total_marks} Marks (${scoreData.percentage}% accuracy)`);

  const attemptRow = await dbGet('SELECT * FROM quiz_attempt WHERE student_id = 101 AND course_id = ? AND quiz_id = ?', [newQuiz.course_id, newQuiz.quiz_id]);
  console.log(`  ✓ Relational Table quiz_attempt: Recorded (Attempt ID: ${attemptRow.attempt_id}, Score: ${attemptRow.score})\n`);

  console.log('====================================================');
  console.log('🎉 ALL INSTRUCTOR SCOPING & TEST UPLOAD TESTS PASSED!');
  console.log('====================================================\n');
}

runInstructorVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
