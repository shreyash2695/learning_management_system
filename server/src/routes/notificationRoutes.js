import express from 'express';
import {
  registerSubscriber,
  pushNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} from '../services/notificationService.js';

const router = express.Router();

/**
 * 1. SSE Real-Time Event Stream
 * GET /api/notifications/stream?userId=101&role=student
 */
router.get('/stream', (req, res) => {
  const userId = req.query.userId || req.headers['x-user-id'] || null;
  const role = req.query.role || req.headers['x-user-role'] || 'student';
  registerSubscriber(req, res, userId, role);
});

/**
 * 2. Get User Notifications & Unread Count
 * GET /api/notifications?userId=101&role=student
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || null;
    const role = req.query.role || req.headers['x-user-role'] || 'student';
    const limit = parseInt(req.query.limit || '50', 10);

    const notifications = await getUserNotifications(userId, role, limit);
    const unreadCount = await getUnreadCount(userId, role);

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Mark Single Notification as Read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.query.userId || req.headers['x-user-id'] || null;
    const result = await markNotificationAsRead(notificationId, userId);
    res.json(result);
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Mark All Notifications as Read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || req.headers['x-user-id'] || null;
    const role = req.body.role || req.query.role || req.headers['x-user-role'] || 'student';
    const result = await markAllNotificationsAsRead(userId, role);
    res.json(result);
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Test Push Notification
 * POST /api/notifications/push
 */
router.post('/push', async (req, res) => {
  try {
    const callerRole = (req.user?.role || req.headers?.['x-user-role'] || req.query?.role || req.body?.callerRole || '').toLowerCase();
    if (callerRole && callerRole !== 'admin' && callerRole !== 'instructor') {
      return res.status(403).json({ success: false, error: 'Access Denied: Only administrators or faculty can broadcast push notifications.' });
    }

    const { userId, role, title, message, type, link } = req.body;
    const notification = await pushNotification({
      userId,
      role,
      title: title || 'System Announcement',
      message: message || 'This is a live real-time notification push test.',
      type: type || 'INFO',
      link: link || null
    });
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error testing push notification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
