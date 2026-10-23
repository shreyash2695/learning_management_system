import assert from 'assert';
import { login } from './controllers/authController.js';
import { 
  getQuizQuestions, 
  submitAssignment, 
  uploadSubmissionFile, 
  dropCourse, 
  updateStudentPhone, 
  updateStudentPassword 
} from './controllers/lmsController.js';
import { initDatabase, dbRun, dbGet } from './config/db.js';

function mockReq(body = {}, query = {}, user = null, headers = {}) {
  return { body, query, user, headers };
}

function mockRes() {
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
  return res;
}

async function runSecurityAuditTests() {
  console.log('====================================================');
  console.log('🛡️ VERIFYING SECURITY AUDIT FIXES & PERMISSION BOUNDARIES');
  console.log('====================================================');

  await initDatabase();

  // TEST 1: Instructor Backdoor Password Fix
  console.log('\n[TEST 1] Instructor Password Verification:');
  {
    // A. Seed instructor with default password 'prof123' must succeed
    const req1 = mockReq({ role: 'instructor', username: 'raj@gmail.com', password: 'prof123' });
    const res1 = mockRes();
    await login(req1, res1);
    assert.strictEqual(res1.getStatusCode(), 200, 'Seed instructor logs in with valid prof123');
    assert.strictEqual(res1.getData()?.success, true, 'Login reports success');
    console.log('  ✓ Seed instructor authenticated with valid password');

    // B. Invalid password must be rejected
    const req2 = mockReq({ role: 'instructor', username: 'raj@gmail.com', password: 'wrongpassword' });
    const res2 = mockRes();
    await login(req2, res2);
    assert.strictEqual(res2.getStatusCode(), 401, 'Bad password rejected with 401');
    assert.strictEqual(res2.getData()?.success, false, 'Reports failure');
    console.log('  ✓ Wrong instructor password safely rejected');
  }

  // TEST 2: Quiz Answer Key Leakage Protection
  console.log('\n[TEST 2] Quiz Answer Key Confidentiality:');
  {
    // A. Student querying quiz with showAnswers=true MUST NOT receive is_correct
    const reqStudent = mockReq({}, { courseId: '301', showAnswers: 'true' }, { role: 'student', id: 101 }, { 'x-user-role': 'student' });
    reqStudent.params = { id: '1' };
    const resStudent = mockRes();
    await getQuizQuestions(reqStudent, resStudent);
    assert.strictEqual(resStudent.getStatusCode(), 200, 'Quiz questions fetched');
    const dataStudent = resStudent.getData();
    assert.strictEqual(dataStudent.isAnswerKeyVisible, false, 'isAnswerKeyVisible must be false for student');
    for (const q of dataStudent.questions) {
      for (const opt of q.options) {
        assert.strictEqual(opt.is_correct, undefined, 'Student payload must not contain is_correct option field');
      }
    }
    console.log('  ✓ Verified: Students cannot inspect quiz answer key even with showAnswers=true query param');

    // B. Instructor querying quiz receives answer key
    const reqInst = mockReq({}, { courseId: '301', showAnswers: 'true' }, { role: 'instructor', id: 201 }, { 'x-user-role': 'instructor' });
    reqInst.params = { id: '1' };
    const resInst = mockRes();
    await getQuizQuestions(reqInst, resInst);
    assert.strictEqual(resInst.getStatusCode(), 200, 'Quiz questions fetched');
    const dataInst = resInst.getData();
    assert.strictEqual(dataInst.isAnswerKeyVisible, true, 'isAnswerKeyVisible is true for faculty');
    assert(dataInst.questions[0].options[0].is_correct !== undefined, 'Instructor options contain is_correct');
    console.log('  ✓ Faculty successfully inspects authorized quiz answer keys');
  }

  // TEST 3: Assignment Submission Auto-Enrollment Bypass Prevention
  console.log('\n[TEST 3] Coursework Submission Enrollment Enforcement:');
  {
    // Student 102 submitting for Course 303 where not enrolled
    await dbRun('DELETE FROM enrolls WHERE student_id = 102 AND course_id = 303');
    const reqUnenrolled = mockReq({
      student_id: 102,
      course_id: 303,
      assignment_id: 1,
      submission_content: 'Unauthorized submission attempt'
    }, {}, { id: 102, role: 'student' });
    const resUnenrolled = mockRes();
    await submitAssignment(reqUnenrolled, resUnenrolled);
    assert.strictEqual(resUnenrolled.getStatusCode(), 403, 'Submitting to unenrolled course returns 403');
    assert(resUnenrolled.getData()?.error.includes('Access Denied'), 'Access denied error returned');
    console.log('  ✓ Verified: Unenrolled student assignment submission strictly blocked with HTTP 403');
  }

  // TEST 4: Submission Identity Spoofing Protection (IDOR)
  console.log('\n[TEST 4] Submission Identity Verification:');
  {
    // Student 101 attempting to submit on behalf of Student 102
    const reqSpoof = mockReq({
      student_id: 102,
      course_id: 301,
      assignment_id: 1,
      submission_content: 'Spoofed submission'
    }, {}, { id: 101, role: 'student' });
    const resSpoof = mockRes();
    await submitAssignment(reqSpoof, resSpoof);
    assert.strictEqual(resSpoof.getStatusCode(), 403, 'Cross-user submission blocked with 403');
    console.log('  ✓ Verified: Student cannot submit assignment under another student ID');
  }

  // TEST 5: File Upload Extension Hardening
  console.log('\n[TEST 5] File Upload Whitelist & Malicious Extension Blocking:');
  {
    // A. Dangerous HTML script upload blocked
    const reqHtml = mockReq({
      filename: 'exploit.html',
      fileData: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='
    });
    const resHtml = mockRes();
    await uploadSubmissionFile(reqHtml, resHtml);
    assert.strictEqual(resHtml.getStatusCode(), 400, 'HTML upload rejected');
    assert(resHtml.getData()?.error.includes('not allowed'), 'Error message warns about dangerous file format');

    // B. Dangerous SVG upload blocked
    const reqSvg = mockReq({
      filename: 'xss.svg',
      fileData: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    });
    const resSvg = mockRes();
    await uploadSubmissionFile(reqSvg, resSvg);
    assert.strictEqual(resSvg.getStatusCode(), 400, 'SVG upload rejected');

    // C. Legitimate academic file (.sql) allowed
    const reqSql = mockReq({
      filename: 'queries.sql',
      fileData: 'data:text/plain;base64,U0VMRUNUICogRlJPTSBzdHVkZW50Ow=='
    });
    const resSql = mockRes();
    await uploadSubmissionFile(reqSql, resSql);
    assert.strictEqual(resSql.getStatusCode(), 200, 'SQL script upload accepted');
    assert.strictEqual(resSql.getData()?.success, true, 'Returns success');
    console.log('  ✓ Verified: Executable/web script extensions blocked, academic formats permitted');
  }

  // TEST 6: Student Profile IDOR Protection
  console.log('\n[TEST 6] Student Profile & Record IDOR Protection:');
  {
    // A. Drop course for another student blocked
    const reqDrop = mockReq({ student_id: 102, course_id: 301 }, {}, { id: 101, role: 'student' });
    const resDrop = mockRes();
    await dropCourse(reqDrop, resDrop);
    assert.strictEqual(resDrop.getStatusCode(), 403, 'Dropping another student course blocked');

    // B. Update phone for another student blocked
    const reqPhone = mockReq({ student_id: 102, phone_no: '9876543210' }, {}, { id: 101, role: 'student' });
    const resPhone = mockRes();
    await updateStudentPhone(reqPhone, resPhone);
    assert.strictEqual(resPhone.getStatusCode(), 403, 'Updating another student phone blocked');

    // C. Update password for another student blocked
    const reqPwd = mockReq({ student_id: 102, old_password: 'pass2', new_password: 'newpass123' }, {}, { id: 101, role: 'student' });
    const resPwd = mockRes();
    await updateStudentPassword(reqPwd, resPwd);
    assert.strictEqual(resPwd.getStatusCode(), 403, 'Updating another student password blocked');

    console.log('  ✓ Verified: IDOR boundaries enforced across course dropping, phone, and password updates');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL SECURITY AUDIT FIXES VERIFIED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runSecurityAuditTests().catch(err => {
  console.error('\n❌ Security verification failed:', err);
  process.exit(1);
});
