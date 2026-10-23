import { initDatabase, dbGet, dbAll } from './config/db.js';
import { getDashboardData, updateStudentPassword, submitAssignment } from './controllers/lmsController.js';
import { login, verifyPassword } from './controllers/authController.js';

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

async function runSecurityAndRankVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFYING DYNAMIC RANKING, PASSWORDS & SUBMISSIONS');
  console.log('====================================================\n');

  await initDatabase();

  // TEST 1: Dynamic Leaderboard Rank Derivation
  console.log('[TEST 1] Dynamic Student Leaderboard Rank via DENSE_RANK():');
  const reqDashboard = { query: { role: 'student', userId: '101' }, user: { role: 'student', id: 101 }, headers: {} };
  const resDashboard = createMockRes();
  await getDashboardData(reqDashboard, resDashboard);

  const dashData = resDashboard.jsonData;
  const rank = dashData.analytics?.leaderboard_position;
  console.log(`  ✓ Student #101 CGPA: ${dashData.analytics?.cgpa}, Dynamic Calculated Rank: #${rank}`);

  // Query actual window function from DB to compare
  const dbRank = (await dbGet(`
    WITH ranked AS (
      SELECT s.student_id, DENSE_RANK() OVER (ORDER BY pa.cgpa DESC) as r
      FROM student s
      JOIN progress_analytics pa ON s.student_id = pa.student_id
    )
    SELECT r FROM ranked WHERE student_id = 101
  `))?.r;

  if (rank !== dbRank) {
    throw new Error(`Rank mismatch: dashboard returned #${rank}, SQL DENSE_RANK produced #${dbRank}`);
  }
  console.log(`  ✓ Verified: Dashboard leaderboard position strictly matches SQL DENSE_RANK() (#${dbRank})\n`);

  // TEST 2: Password Update Security with PBKDF2 Hashing
  console.log('[TEST 2] Password Update Security & PBKDF2 Hashing:');
  const studentId = 101;
  const initialAccount = await dbGet('SELECT * FROM account WHERE student_id = ?', [studentId]);
  console.log(`  ✓ Initial Student Account: username="${initialAccount.username}", password starts with: ${initialAccount.password.slice(0, 16)}...`);

  // 2a. Attempt update with wrong old password (must be rejected with 401)
  const reqWrong = { body: { student_id: studentId, old_password: 'incorrect-password', new_password: 'new_secret_pwd_123' } };
  const resWrong = createMockRes();
  await updateStudentPassword(reqWrong, resWrong);

  if (resWrong.statusCode !== 401) {
    throw new Error(`Expected 401 for wrong current password, got ${resWrong.statusCode}`);
  }
  console.log(`  ✓ Correctly rejected update with invalid current password: ${resWrong.jsonData.error}`);

  // 2b. Attempt update with correct password
  // Student 101 initial seed password is 'pass1'
  const reqValid = { body: { student_id: studentId, old_password: 'pass1', new_password: 'secureNewPassword!99' } };
  const resValid = createMockRes();
  await updateStudentPassword(reqValid, resValid);

  if (resValid.statusCode !== 200 || !resValid.jsonData.success) {
    throw new Error(`Valid password update failed: ${JSON.stringify(resValid.jsonData)}`);
  }
  console.log(`  ✓ Password update returned success: ${resValid.jsonData.message}`);

  // 2c. Verify in database that password is NOT plaintext and is properly PBKDF2 hashed
  const updatedAccount = await dbGet('SELECT * FROM account WHERE student_id = ?', [studentId]);
  if (!updatedAccount.password.startsWith('pbkdf2$10000$')) {
    throw new Error(`Security Violation: Password was saved in plaintext or non-PBKDF2 format: ${updatedAccount.password}`);
  }
  console.log(`  ✓ Database Verified: Password stored as cryptographic PBKDF2 hash: ${updatedAccount.password.slice(0, 30)}...`);

  // 2d. Verify login with the new password
  const reqLogin = { body: { role: 'student', username: 'akhil_user', password: 'secureNewPassword!99' } };
  const resLogin = createMockRes();
  await login(reqLogin, resLogin);

  if (!resLogin.jsonData.success || !resLogin.jsonData.token) {
    throw new Error(`Login with updated PBKDF2 password failed: ${JSON.stringify(resLogin.jsonData)}`);
  }
  console.log(`  ✓ Authenticated with new password: JWT token issued successfully`);

  // 2e. Restore original password 'pass1' for test idempotency
  const reqRestore = { body: { student_id: studentId, old_password: 'secureNewPassword!99', new_password: 'pass1' } };
  const resRestore = createMockRes();
  await updateStudentPassword(reqRestore, resRestore);
  console.log(`  ✓ Restored baseline test account password cleanly\n`);

  // TEST 3: Assignment Submission Content in submits Table
  console.log('[TEST 3] Coursework Submission with Content in submits:');
  const reqSubmit = {
    body: {
      student_id: 101,
      course_id: 301,
      assignment_id: 1,
      submission_date: '2026-09-14',
      submission_content: 'SELECT * FROM student WHERE cgpa > 9.0; -- verified functional dependency BCNF decomposition'
    }
  };
  const resSubmit = createMockRes();
  await submitAssignment(reqSubmit, resSubmit);

  const savedSub = await dbGet('SELECT * FROM submits WHERE student_id = ? AND course_id = ? AND assignment_id = ?', [101, 301, 1]);
  if (!savedSub || !savedSub.submission_content.includes('BCNF decomposition')) {
    throw new Error(`Submission content not stored correctly in database: ${JSON.stringify(savedSub)}`);
  }
  console.log(`  ✓ Verified submission content in submits table: "${savedSub.submission_content}"`);
  console.log(`  ✓ Submission status: ${savedSub.status}\n`);

  console.log('====================================================');
  console.log('🎉 ALL SECURITY, DYNAMIC RANKING & SUBMISSION TESTS PASSED!');
  console.log('====================================================\n');
}

runSecurityAndRankVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
