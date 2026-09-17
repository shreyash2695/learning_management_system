/**
 * testEnrollmentApproval.js
 * Phase 12: Enrollment Approval Workflow Tests
 */

import { dbRun, dbGet, dbAll, initDatabase } from './config/db.js';
import {
  requestEnrollment,
  getEnrollmentRequests,
  approveEnrollmentRequest,
  getInstructorNotifications,
  markNotificationRead
} from './controllers/lmsController.js';

let pass = 0;
let fail = 0;

function assert(condition, testName) {
  if (condition) { console.log(`  ✓ ${testName}`); pass++; }
  else { console.error(`  ✗ FAIL: ${testName}`); fail++; }
}

function mockReq(body = {}, query = {}, role = 'student', userId = 101) {
  return {
    body: { ...body, role },
    query: { ...query, role, studentId: userId },
    user: { id: userId, role },
    headers: { 'x-user-role': role, 'x-user-id': String(userId) },
    params: {}
  };
}

function mockRes() {
  let _status = 200;
  let _json = null;
  return {
    status(code) { _status = code; return this; },
    json(data) { _json = data; return this; },
    getStatus: () => _status,
    getData: () => _json,
  };
}

async function runTests() {
  console.log('\n=== Phase 12: Enrollment Approval Workflow Tests ===\n');

  const TEST_STUDENT_ID = 110;
  const TEST_COURSE_ID  = 302;

  // Cleanup
  await dbRun('DELETE FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
  await dbRun('DELETE FROM enrolls WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
  await dbRun('DELETE FROM instructor_notification WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);

  // Test 1: Student submits enrollment request
  console.log('Test 1: Student requests enrollment');
  {
    const req = mockReq({ student_id: TEST_STUDENT_ID, course_id: TEST_COURSE_ID }, {}, 'student', TEST_STUDENT_ID);
    const res = mockRes();
    await requestEnrollment(req, res);
    assert(res.getData()?.success === true, 'Request accepted');
    const row = await dbGet('SELECT * FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    assert(row?.status === 'PENDING', 'Status is PENDING');
    assert(row?.admin_approved === 0, 'admin_approved = 0');
  }

  // Test 2: Duplicate request guard
  console.log('\nTest 2: Duplicate request guard');
  {
    const req = mockReq({ student_id: TEST_STUDENT_ID, course_id: TEST_COURSE_ID }, {}, 'student', TEST_STUDENT_ID);
    const res = mockRes();
    await requestEnrollment(req, res);
    assert(res.getStatus() === 400, 'Duplicate → 400');
  }

  // Test 3: Instructor cannot request
  console.log('\nTest 3: Role guard - instructor cannot request');
  {
    const req = mockReq({ student_id: TEST_STUDENT_ID, course_id: TEST_COURSE_ID }, {}, 'instructor', 201);
    const res = mockRes();
    await requestEnrollment(req, res);
    assert(res.getStatus() === 403, 'Instructor → 403');
  }

  // Test 4: Admin approves admin gate
  console.log('\nTest 4: Admin approves admin gate');
  {
    const reqRow = await dbGet('SELECT request_id FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    const req = mockReq({ request_id: reqRow.request_id, action: 'admin_approve' }, {}, 'admin', 1);
    const res = mockRes();
    await approveEnrollmentRequest(req, res);
    assert(res.getData()?.success === true, 'Admin approve success');
    const updated = await dbGet('SELECT * FROM enrollment_request WHERE request_id = ?', [reqRow.request_id]);
    assert(updated?.status === 'ADMIN_APPROVED', 'Status = ADMIN_APPROVED');
    const enrolled = await dbGet('SELECT 1 FROM enrolls WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    assert(!enrolled, 'Not enrolled yet (proctor pending)');
  }

  // Test 5: Student cannot approve
  console.log('\nTest 5: Student cannot approve');
  {
    const reqRow = await dbGet('SELECT request_id FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    const req = mockReq({ request_id: reqRow.request_id, action: 'proctor_approve' }, {}, 'student', TEST_STUDENT_ID);
    const res = mockRes();
    await approveEnrollmentRequest(req, res);
    assert(res.getStatus() === 403, 'Student cannot approve → 403');
  }

  // Test 6: Proctor gate → auto-enrollment + notification
  console.log('\nTest 6: Proctor gate approved → auto-enrolled + notification');
  {
    const reqRow = await dbGet('SELECT request_id FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    const req = mockReq({ request_id: reqRow.request_id, action: 'proctor_approve' }, {}, 'admin', 1);
    const res = mockRes();
    await approveEnrollmentRequest(req, res);
    assert(res.getData()?.success === true, 'Proctor approve success');
    const updated = await dbGet('SELECT status FROM enrollment_request WHERE request_id = ?', [reqRow.request_id]);
    assert(updated?.status === 'APPROVED', 'Status = APPROVED');
    const enrolled = await dbGet('SELECT 1 FROM enrolls WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    assert(!!enrolled, 'Student enrolled in enrolls table');
    const notif = await dbGet('SELECT * FROM instructor_notification WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    assert(!!notif, 'Instructor notification created');
    assert(notif?.is_read === 0, 'Notification unread by default');
  }

  // Test 7: Instructor fetches notifications
  console.log('\nTest 7: Instructor fetches notifications');
  {
    const teaches = await dbGet('SELECT instructor_id FROM teaches WHERE course_id = ?', [TEST_COURSE_ID]);
    const instId = teaches?.instructor_id || 202;
    const req = mockReq({}, { instructorId: instId }, 'instructor', instId);
    const res = mockRes();
    await getInstructorNotifications(req, res);
    assert(res.getData()?.success === true, 'Notifications fetched');
    assert(res.getData()?.unreadCount >= 1, `unreadCount >= 1`);
  }

  // Test 8: Mark notification as read
  console.log('\nTest 8: Mark notification as read');
  {
    const notif = await dbGet('SELECT notification_id FROM instructor_notification WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
    const req = { params: { id: notif.notification_id }, body: {}, query: {}, user: {}, headers: {} };
    const res = mockRes();
    await markNotificationRead(req, res);
    assert(res.getData()?.success === true, 'Mark read success');
    const updated = await dbGet('SELECT is_read FROM instructor_notification WHERE notification_id = ?', [notif.notification_id]);
    assert(updated?.is_read === 1, 'is_read = 1');
  }

  // Test 9: Already enrolled cannot re-request
  console.log('\nTest 9: Already enrolled student cannot re-request');
  {
    const req = mockReq({ student_id: TEST_STUDENT_ID, course_id: TEST_COURSE_ID }, {}, 'student', TEST_STUDENT_ID);
    const res = mockRes();
    await requestEnrollment(req, res);
    assert(res.getStatus() === 400, 'Already enrolled → 400');
  }

  // Test 10: Admin can view all requests
  console.log('\nTest 10: Admin can view all requests');
  {
    const req = mockReq({}, {}, 'admin', 1);
    const res = mockRes();
    await getEnrollmentRequests(req, res);
    assert(res.getData()?.success === true, 'Admin can fetch requests');
    assert(Array.isArray(res.getData()?.requests), 'Returns array');
  }

  // Test 11: Non-instructor cannot fetch notifications
  console.log('\nTest 11: Role guard on notifications');
  {
    const req = mockReq({}, { instructorId: 201 }, 'student', 101);
    const res = mockRes();
    await getInstructorNotifications(req, res);
    assert(res.getStatus() === 403, 'Student → 403 on notifications');
  }

  // Cleanup
  await dbRun('DELETE FROM enrolls WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
  await dbRun('DELETE FROM enrollment_request WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);
  await dbRun('DELETE FROM instructor_notification WHERE student_id = ? AND course_id = ?', [TEST_STUDENT_ID, TEST_COURSE_ID]);

  console.log(`\n${'─'.repeat(48)}`);
  console.log(`✅ Passed: ${pass}   ❌ Failed: ${fail}   Total: ${pass + fail}`);
  console.log('─'.repeat(48));
  if (fail > 0) process.exit(1);
}

initDatabase().then(runTests).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
