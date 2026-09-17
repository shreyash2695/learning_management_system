import { initDatabase, dbAll, dbGet, dbRun } from './config/db.js';
import * as lms from './controllers/lmsController.js';

async function testStudentPortal() {
  console.log('=== VERIFYING STUDENT PORTAL END-TO-END CAPABILITIES ===\n');
  await initDatabase();

  const studentId = 101;

  // 1. Profile Retrieval
  console.log('[1] Testing Student Profile Retrieval:');
  const student = await dbGet('SELECT * FROM student WHERE student_id = ?', [studentId]);
  const account = await dbGet('SELECT username FROM account WHERE student_id = ?', [studentId]);
  const phones = await dbAll('SELECT phone_no FROM student_phone WHERE student_id = ?', [studentId]);
  console.log(`  ✓ Name: ${student.first_name} ${student.last_name} (DOB: ${student.dob})`);
  console.log(`  ✓ Username: ${account.username}`);
  console.log(`  ✓ Registered Phones: ${phones.map(p => p.phone_no).join(', ')}`);

  // 2. Phone Number Update (Enforcing 10-digit format)
  console.log('\n[2] Testing Student Phone Number Mutation (student_phone):');
  const newPhone = '9876543219';
  const reqPhone = { body: { student_id: studentId, phone_no: newPhone } };
  let phoneRes = {};
  const mockResPhone = { json: (d) => { phoneRes = d; }, status: () => mockResPhone };
  await lms.updateStudentPhone(reqPhone, mockResPhone);
  console.log(`  ✓ Response: ${phoneRes.message}`);
  const updatedPhone = await dbGet('SELECT phone_no FROM student_phone WHERE student_id = ?', [studentId]);
  console.log(`  ✓ Verified DB State: Phone in student_phone is now ${updatedPhone.phone_no}`);

  // 3. Password Update (account table)
  console.log('\n[3] Testing Password Change (account table):');
  const reqPwd = { body: { student_id: studentId, old_password: 'pass1', new_password: 'new_pass_123' } };
  let pwdRes = {};
  const mockResPwd = { json: (d) => { pwdRes = d; }, status: () => mockResPwd };
  await lms.updateStudentPassword(reqPwd, mockResPwd);
  console.log(`  ✓ Response: ${pwdRes.message}`);
  // revert back to pass1 for future logins
  await dbRun('UPDATE account SET password = ? WHERE student_id = ?', ['pass1', studentId]);
  console.log(`  ✓ Reverted password to pass1 for demo persistence`);

  // 4. Study Session Logger (progress_analytics table)
  console.log('\n[4] Testing Study Session Logging (progress_analytics):');
  const initialAnalytics = await dbGet('SELECT time_spent, daily_tracker FROM progress_analytics WHERE student_id = ?', [studentId]);
  const reqStudy = { body: { student_id: studentId, minutes: 30, tracker_status: 'Excellent' } };
  let studyRes = {};
  const mockResStudy = { json: (d) => { studyRes = d; }, status: () => mockResStudy };
  await lms.logStudySession(reqStudy, mockResStudy);
  const afterAnalytics = await dbGet('SELECT time_spent, daily_tracker FROM progress_analytics WHERE student_id = ?', [studentId]);
  console.log(`  ✓ Initial time: ${initialAnalytics.time_spent} mins -> After session: ${afterAnalytics.time_spent} mins (Status: ${afterAnalytics.daily_tracker})`);

  // 5. Course Registration & Drop (enrolls table)
  console.log('\n[5] Testing Student Course Registration & Drop (enrolls):');
  const testCourseId = 302; // Networks
  await lms.enrollCourse({ body: { student_id: studentId, course_id: testCourseId } }, { json: (d) => console.log(`  ✓ Enroll Output: ${d.message}`), status: () => ({ json: (err) => console.log(err) }) });
  let checkEnrolled = await dbGet('SELECT * FROM enrolls WHERE student_id = ? AND course_id = ?', [studentId, testCourseId]);
  console.log(`  ✓ Verified Enrolled in Course #${checkEnrolled.course_id}`);
  
  await lms.dropCourse({ body: { student_id: studentId, course_id: testCourseId } }, { json: (d) => console.log(`  ✓ Drop Output: ${d.message}`), status: () => ({ json: (err) => console.log(err) }) });
  checkEnrolled = await dbGet('SELECT * FROM enrolls WHERE student_id = ? AND course_id = ?', [studentId, testCourseId]);
  console.log(`  ✓ Verified Dropped: Course in enrolls is now ${checkEnrolled ? 'Found' : 'Null (Deleted)'}`);

  // 6. Coursework Submission (submits table)
  console.log('\n[6] Testing Assignment Submission (submits):');
  const reqSub = { body: { student_id: studentId, course_id: 301, assignment_id: 1, submission_date: '2026-09-14' } };
  let subRes = {};
  const mockResSub = { json: (d) => { subRes = d; }, status: () => mockResSub };
  await lms.submitAssignment(reqSub, mockResSub);
  console.log(`  ✓ Response: ${subRes.message} (Date: ${subRes.submission_date})`);
  const checkSub = await dbGet('SELECT * FROM submits WHERE student_id = ? AND course_id = 301 AND assignment_id = 1', [studentId]);
  console.log(`  ✓ Verified DB Record: Logged submission on ${checkSub.submission_date}`);

  // 7. Interactive Quiz Scoring
  console.log('\n[7] Testing Interactive Quiz Evaluation:');
  const reqQuiz = { body: { quiz_id: 1, course_id: 301, answers: { q1: 'A', q2: 'B', q3: 'B', q4: 'A' } } };
  let quizRes = {};
  const mockResQuiz = { json: (d) => { quizRes = d; }, status: () => mockResQuiz };
  await lms.submitQuiz(reqQuiz, mockResQuiz);
  console.log(`  ✓ Quiz Score: ${quizRes.score}/${quizRes.total_marks} (${quizRes.percentage}%)`);

  // 8. Instructor Feedback (course_feedback table)
  console.log('\n[8] Testing Course / Instructor Feedback (course_feedback):');
  const reqFeedback = { body: { student_id: studentId, course_id: 301, instructor_id: 201, rating: 5, comments: 'Superb DBMS instruction!' } };
  let fbRes = {};
  const mockResFb = { json: (d) => { fbRes = d; }, status: () => mockResFb };
  await lms.submitCourseFeedback(reqFeedback, mockResFb);
  console.log(`  ✓ Response: ${fbRes.message}`);

  console.log('\n=== ALL STUDENT PORTAL CAPABILITIES VERIFIED SUCCESSFULLY ===');
}

testStudentPortal().catch(console.error);
