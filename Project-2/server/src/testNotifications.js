import { 
  pushNotification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadCount 
} from './services/notificationService.js';
import { initDatabase } from './config/db.js';

async function testNotifications() {
  console.log('====================================================');
  console.log('🔔 Testing Real-Time Push Notification Engine');
  console.log('====================================================');

  await initDatabase();

  // Test 1: Push a notification
  console.log('\n[TEST 1] Pushing student grade notification...');
  const notif = await pushNotification({
    userId: 101,
    role: 'student',
    title: 'Assignment Evaluated! 🎉',
    message: 'Your DBMS query submission received 28/30 marks.',
    type: 'GRADE',
    link: '/submissions?courseId=301'
  });

  console.log('Pushed notification ID:', notif.notification_id);
  if (!notif.notification_id || notif.title !== 'Assignment Evaluated! 🎉') {
    throw new Error('Test 1 failed: notification not created');
  }
  console.log('✅ Test 1 Passed: Notification persisted and dispatched');

  // Test 2: Fetch user notifications
  console.log('\n[TEST 2] Fetching notifications for Student #101...');
  const list = await getUserNotifications(101, 'student');
  console.log(`Found ${list.length} notifications`);
  const found = list.find(n => n.notification_id === notif.notification_id);
  if (!found) {
    throw new Error('Test 2 failed: newly pushed notification not retrieved in list');
  }
  console.log('✅ Test 2 Passed: Found notification in user list');

  // Test 3: Unread count
  console.log('\n[TEST 3] Checking unread count...');
  const unreadBefore = await getUnreadCount(101, 'student');
  console.log(`Unread count: ${unreadBefore}`);
  if (unreadBefore < 1) {
    throw new Error('Test 3 failed: Unread count should be at least 1');
  }
  console.log('✅ Test 3 Passed: Unread counter accurately reflecting new notifications');

  // Test 4: Mark as read
  console.log('\n[TEST 4] Marking notification as read...');
  await markNotificationAsRead(notif.notification_id, 101);
  const updatedList = await getUserNotifications(101, 'student');
  const updated = updatedList.find(n => n.notification_id === notif.notification_id);
  if (updated.is_read !== 1) {
    throw new Error('Test 4 failed: Notification should be marked as read');
  }
  console.log('✅ Test 4 Passed: Notification status toggled to read (is_read: 1)');

  // Test 5: Mark all as read
  console.log('\n[TEST 5] Testing mark all as read...');
  await pushNotification({
    userId: 101,
    role: 'student',
    title: 'New Coursework Available',
    message: 'New assignment posted in Operating Systems',
    type: 'ASSIGNMENT'
  });
  const unreadAfterPush = await getUnreadCount(101, 'student');
  if (unreadAfterPush < 1) throw new Error('Unread count should be > 0');
  
  await markAllNotificationsAsRead(101, 'student');
  const unreadFinal = await getUnreadCount(101, 'student');
  if (unreadFinal !== 0) {
    throw new Error(`Test 5 failed: Expected 0 unread, got ${unreadFinal}`);
  }
  console.log('✅ Test 5 Passed: Mark all read cleared unread counter');

  console.log('\n====================================================');
  console.log('🎉 ALL NOTIFICATION SYSTEM TESTS PASSED!');
  console.log('====================================================\n');
}

testNotifications().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
