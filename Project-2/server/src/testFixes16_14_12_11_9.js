/**
 * Targeted Test Suite for Issues 16, 14, 12, 11, 9
 * Validates:
 * - Issue 16: CRUD Studio schemas and validation for enrollment_request and instructor_notification
 * - Issue 12: Unified user notifications endpoint (fetch unread/all, mark all read)
 * - Issue 11: Course feedback enrollment requirement & deduplication/upsert
 * - Issue 9: Instructor-Proctor relational alignment, automatic proctor provisioning, and student meeting request flow
 */

import { initDatabase, dbGet, dbAll, dbRun } from './config/db.js';
import { TABLE_SCHEMAS, validateRow } from './controllers/crudController.js';
import {
  getUserNotifications,
  markAllUserNotificationsRead,
  submitCourseFeedback,
  requestProctorMeeting,
  getOrSyncProctorForInstructor
} from './controllers/lmsController.js';
import { register } from './controllers/authController.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

// Mock HTTP helper
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING FIXES FOR ISSUES 16, 12, 11, 9');
  console.log('====================================================\n');

  await initDatabase();

  // ----------------------------------------------------
  // TEST ISSUE 16: CRUD Studio Schema Metadata & Validation
  // ----------------------------------------------------
  console.log('[TEST ISSUE 16] CRUD Studio Schemas for enrollment_request & instructor_notification');
  assert(TABLE_SCHEMAS.enrollment_request !== undefined, 'enrollment_request is registered in TABLE_SCHEMAS');
  assert(TABLE_SCHEMAS.instructor_notification !== undefined, 'instructor_notification is registered in TABLE_SCHEMAS');
  assert(TABLE_SCHEMAS.enrollment_request.primaryKey.includes('request_id'), 'enrollment_request primaryKey includes request_id');
  assert(TABLE_SCHEMAS.instructor_notification.primaryKey.includes('notification_id'), 'instructor_notification primaryKey includes notification_id');

  // Validate row checks
  let caughtError1 = false;
  try {
    validateRow('enrollment_request', { status: 'INVALID_STATUS' });
  } catch (e) {
    caughtError1 = true;
  }
  assert(caughtError1, 'Correctly throws on enrollment_request with invalid status');

  let caughtError2 = false;
  try {
    validateRow('enrollment_request', { admin_approved: 5 });
  } catch (e) {
    caughtError2 = true;
  }
  assert(caughtError2, 'Correctly throws on enrollment_request with invalid admin_approved flag');

  let caughtError3 = false;
  try {
    validateRow('instructor_notification', { is_read: 9 });
  } catch (e) {
    caughtError3 = true;
  }
  assert(caughtError3, 'Correctly throws on instructor_notification with invalid is_read flag');

  let successValid = true;
  try {
    validateRow('enrollment_request', { status: 'PENDING', admin_approved: 0, proctor_approved: 0 });
    validateRow('instructor_notification', { is_read: 1 });
  } catch (e) {
    successValid = false;
  }
  assert(successValid, 'Accepts valid enrollment_request and instructor_notification rows');

  // ----------------------------------------------------
  // TEST ISSUE 12: Unified User Notifications Endpoint
  // ----------------------------------------------------
  console.log('\n[TEST ISSUE 12] User Live Notifications & Mark All Read');
  // Insert test notification for instructor 201
  await dbRun(
    'INSERT INTO instructor_notification (instructor_id, student_id, message, is_read) VALUES (?, ?, ?, 0)',
    [201, 101, 'Test live navbar notification for faculty']
  );

  const reqUserInst = {
    user: { id: 201, role: 'instructor' },
    query: { limit: 10 }
  };
  const resUserInst = createMockRes();
  await getUserNotifications(reqUserInst, resUserInst);

  assert(resUserInst.statusCode === 200, 'getUserNotifications returns 200 for instructor');
  assert(resUserInst.data.success === true, 'Response reports success: true');
  assert(Array.isArray(resUserInst.data.notifications), 'Returns notifications array');
  assert(resUserInst.data.unreadCount >= 1, `Unread count reflects pending notifications: ${resUserInst.data.unreadCount}`);

  // Test markAllUserNotificationsRead
  const resMarkAll = createMockRes();
  await markAllUserNotificationsRead(reqUserInst, resMarkAll);
  assert(resMarkAll.statusCode === 200, 'markAllUserNotificationsRead returns 200');
  assert(resMarkAll.data.success === true, 'markAllUserNotificationsRead reports success: true');

  // Re-fetch to ensure unreadCount is now 0
  const resCheckRead = createMockRes();
  await getUserNotifications(reqUserInst, resCheckRead);
  assert(resCheckRead.data.unreadCount === 0, 'Unread count is 0 after markAllUserNotificationsRead');

  // Clean up test notification so it doesn't pollute the live dashboard
  await dbRun("DELETE FROM instructor_notification WHERE message = 'Test live navbar notification for faculty'");

  // ----------------------------------------------------
  // TEST ISSUE 11: Feedback Enrollment Check & Deduplication
  // ----------------------------------------------------
  console.log('\n[TEST ISSUE 11] Course Feedback Enrollment Enforcement & Upsert');
  // Student 101 is enrolled in course 301. Check a non-enrolled course for student 101:
  // Find a course student 101 is NOT enrolled in:
  const unenrolledCourse = await dbGet(`
    SELECT course_id FROM course 
    WHERE course_id NOT IN (SELECT course_id FROM enrolls WHERE student_id = 101)
    LIMIT 1
  `);

  if (unenrolledCourse) {
    const reqUnenrolled = {
      body: {
        student_id: 101,
        course_id: unenrolledCourse.course_id,
        rating: 5,
        comments: 'Attempting review without enrollment'
      }
    };
    const resUnenrolled = createMockRes();
    await submitCourseFeedback(reqUnenrolled, resUnenrolled);
    assert(resUnenrolled.statusCode === 403, `Blocked review on course #${unenrolledCourse.course_id} for unenrolled student (HTTP 403)`);
    assert(resUnenrolled.data.error.includes('enrolled'), 'Error message specifies student must be enrolled');
  }

  // Student 101 submits feedback on enrolled course 301 (First submission / update)
  const reqFeedback1 = {
    body: {
      student_id: 101,
      course_id: 301,
      instructor_id: 201,
      rating: 4,
      comments: 'First review submission: Solid curriculum.'
    }
  };
  const resFeedback1 = createMockRes();
  await submitCourseFeedback(reqFeedback1, resFeedback1);
  assert(resFeedback1.statusCode === 201 || resFeedback1.statusCode === 200, 'Accepted review on enrolled course 301');

  // Student 101 updates feedback on course 301 (Deduplication / Upsert check)
  const reqFeedback2 = {
    body: {
      student_id: 101,
      course_id: 301,
      instructor_id: 201,
      rating: 5,
      comments: 'Updated review: Outstanding depth on indexing!'
    }
  };
  const resFeedback2 = createMockRes();
  await submitCourseFeedback(reqFeedback2, resFeedback2);
  assert(resFeedback2.statusCode === 200, 'Deduplication update returns HTTP 200');
  assert(resFeedback2.data.updated === true, 'Response confirms review was updated in-place');

  // Verify only one review exists for student 101 in course 301
  const reviewCount = (await dbGet(
    'SELECT COUNT(*) as count FROM course_feedback WHERE student_id = ? AND course_id = ?',
    [101, 301]
  ))?.count;
  assert(reviewCount === 1, `Verified exactly 1 review exists in DB (no duplicates, count: ${reviewCount})`);

  // Verify the updated comment is preserved
  const savedReview = await dbGet(
    'SELECT * FROM course_feedback WHERE student_id = ? AND course_id = ?',
    [101, 301]
  );
  assert(savedReview.rating === 5 && savedReview.comments.includes('Outstanding'), 'DB review reflects updated rating (5) and comments');

  // ----------------------------------------------------
  // TEST ISSUE 9: Proctor Relational Alignment & Meeting Request
  // ----------------------------------------------------
  console.log('\n[TEST ISSUE 9] Instructor-Proctor Relational Alignment & Student Meeting Flow');
  
  // 1. Check getOrSyncProctorForInstructor for instructor 201 (Raj Menon -> Proctor 1)
  const inst201 = await dbGet('SELECT * FROM instructor WHERE instructor_id = 201');
  const proctor201 = await getOrSyncProctorForInstructor(inst201);
  assert(proctor201 !== null && proctor201.proctor_id === 1, `Instructor 201 cleanly resolved to Proctor 1 (${proctor201.first_name} ${proctor201.last_name})`);

  // 2. Test auto-provisioning when registering a new instructor
  const randomSuffix = Math.floor(Math.random() * 900000 + 100000);
  const firstName = `Pooja${randomSuffix}`;
  const lastName = `Sharma${randomSuffix}`;
  const newEmail = `faculty.${randomSuffix}@university.edu`;
  const newCabin = `CB-${randomSuffix % 900 + 100}`;
  const reqRegInst = {
    body: {
      role: 'instructor',
      first_name: firstName,
      last_name: lastName,
      email: newEmail,
      dept_id: 1,
      cabin_no: newCabin,
      phone_no: '9876501234',
      password: 'facultyPassword123'
    }
  };
  const resRegInst = createMockRes();
  await register(reqRegInst, resRegInst);
  assert(resRegInst.statusCode === 201, `Registered new faculty Prof. ${firstName} ${lastName} in ${newCabin} (HTTP 201)`);
  const registeredInstId = resRegInst.data.user.id;
  assert(registeredInstId >= 206, `New instructor ID assigned: ${registeredInstId}`);

  // Verify that a corresponding proctor row was auto-provisioned
  const autoProctor = await dbGet(
    'SELECT * FROM proctor WHERE LOWER(TRIM(first_name)) = LOWER(?) AND LOWER(TRIM(last_name)) = LOWER(?)',
    [firstName, lastName]
  );
  assert(autoProctor !== null, `Auto-provisioned proctor record created: Proctor #${autoProctor?.proctor_id} (Cabin: ${autoProctor?.cabin_no})`);
  assert(autoProctor?.cabin_no === newCabin, `Proctor cabin matches registered faculty cabin (${newCabin})`);

  // Verify phone number in proctor_phone
  const proctorPhone = await dbGet('SELECT phone_no FROM proctor_phone WHERE proctor_id = ?', [autoProctor.proctor_id]);
  assert(proctorPhone?.phone_no === '9876501234', `Proctor phone synced in proctor_phone: ${proctorPhone?.phone_no}`);

  // Verify getOrSyncProctorForInstructor finds this proctor by identity without any modulo math
  const resolvedProctor = await getOrSyncProctorForInstructor(resRegInst.data.user);
  assert(resolvedProctor.proctor_id === autoProctor.proctor_id, `getOrSyncProctorForInstructor accurately resolved to Proctor #${autoProctor.proctor_id}`);

  // 3. Test Student Proctor Meeting Request Flow
  const reqMeeting = {
    body: {
      student_id: 101,
      topic: 'Semester Final Academic Clearance',
      preferred_time: 'Thursday 3:30 PM',
      notes: 'Need signature on graduation course checklist'
    }
  };
  const resMeeting = createMockRes();
  await requestProctorMeeting(reqMeeting, resMeeting);
  assert(resMeeting.statusCode === 200, 'requestProctorMeeting succeeded with HTTP 200');
  assert(resMeeting.data.success === true, 'Response reports success: true');
  assert(resMeeting.data.meeting.status === 'PENDING', 'Meeting status initialized to PENDING');

  // Verify notification created for student's proctor instructor
  const latestNotif = await dbGet(
    'SELECT * FROM instructor_notification WHERE student_id = 101 ORDER BY notification_id DESC LIMIT 1'
  );
  assert(latestNotif !== null, 'Notification created in instructor_notification table');
  assert(latestNotif.message.includes('[PROCTOR_MEET]'), 'Notification payload contains [PROCTOR_MEET] event marker');
  assert(latestNotif.message.includes('Semester Final Academic Clearance'), 'Meeting topic preserved in payload');

  // Cleanup test faculty and auto-provisioned proctor to avoid polluting database
  if (registeredInstId) {
    await dbRun('DELETE FROM instructor_notification WHERE instructor_id = ?', [registeredInstId]);
    await dbRun('DELETE FROM instructor_phone WHERE instructor_id = ?', [registeredInstId]);
    await dbRun('DELETE FROM instructor WHERE instructor_id = ?', [registeredInstId]);
  }
  if (autoProctor?.proctor_id) {
    await dbRun('DELETE FROM proctor_phone WHERE proctor_id = ?', [autoProctor.proctor_id]);
    await dbRun('DELETE FROM proctor WHERE proctor_id = ?', [autoProctor.proctor_id]);
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
