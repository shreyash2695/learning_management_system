import { dbAll, dbGet, dbRun } from '../config/db.js';

// In-Memory Real-Time SSE Subscriber Registry
const subscribers = new Map();
let nextSubscriberId = 1;

/**
 * 1. Register a new real-time SSE stream subscriber
 */
export function registerSubscriber(req, res, userId = null, role = 'student') {
  // Set headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  const subId = nextSubscriberId++;
  const clientInfo = {
    id: subId,
    res,
    userId: userId ? parseInt(userId, 10) : null,
    role: (role || 'student').toLowerCase()
  };

  subscribers.set(subId, clientInfo);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'CONNECTED', subscriberId: subId, timestamp: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat keepalive to prevent proxy timeouts
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartTimer);
      subscribers.delete(subId);
    }
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    subscribers.delete(subId);
  });
}

/**
 * 2. Push a live real-time notification
 * Persists into table `app_notification` and dispatches immediately to live subscribers
 */
export async function pushNotification({ userId = null, role = 'all', title, message, type = 'INFO', link = null }) {
  if (!title || !message) {
    throw new Error('Title and message are required for notifications.');
  }

  const targetUserId = userId ? parseInt(userId, 10) : null;
  const targetRole = (role || 'all').toLowerCase();

  let insertedId = null;
  const now = new Date().toISOString();

  try {
    const result = await dbRun(`
      INSERT INTO app_notification (user_id, role, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `, [targetUserId, targetRole, title, message, type, link, now]);

    insertedId = result?.lastInsertRowid || Date.now();
  } catch (err) {
    console.error('[NotificationService] Failed to persist notification:', err.message);
    insertedId = Date.now();
  }

  const notificationPayload = {
    notification_id: insertedId,
    user_id: targetUserId,
    role: targetRole,
    title,
    message,
    type,
    link,
    is_read: 0,
    created_at: now
  };

  // Broadcast to all active subscribers who match target
  const sseData = `event: notification\ndata: ${JSON.stringify(notificationPayload)}\n\n`;

  let deliveredCount = 0;
  for (const [subId, sub] of subscribers.entries()) {
    const userMatch = targetUserId === null || sub.userId === targetUserId;
    const roleMatch = targetRole === 'all' || sub.role === targetRole;

    if (userMatch && roleMatch) {
      try {
        sub.res.write(sseData);
        deliveredCount++;
      } catch (writeErr) {
        subscribers.delete(subId);
      }
    }
  }

  return {
    ...notificationPayload,
    deliveredCount
  };
}

/**
 * 3. Retrieve user notifications from DB
 */
export async function getUserNotifications(userId, role, limit = 50) {
  const uId = userId ? parseInt(userId, 10) : null;
  const r = (role || 'student').toLowerCase();

  const rows = await dbAll(`
    SELECT notification_id, user_id, role, title, message, type, link, is_read, created_at
    FROM app_notification
    WHERE (user_id = ? OR (user_id IS NULL AND (role = ? OR role = 'all')))
    ORDER BY notification_id DESC
    LIMIT ?
  `, [uId, r, limit]);

  return rows || [];
}

/**
 * 4. Mark single notification as read
 */
export async function markNotificationAsRead(notificationId, userId = null) {
  const nid = parseInt(notificationId, 10);
  const result = await dbRun(`
    UPDATE app_notification
    SET is_read = 1
    WHERE notification_id = ?
  `, [nid]);

  return { success: true, updated: result?.changes || 1 };
}

/**
 * 5. Mark all user notifications as read
 */
export async function markAllNotificationsAsRead(userId, role) {
  const uId = userId ? parseInt(userId, 10) : null;
  const r = (role || 'student').toLowerCase();

  const result = await dbRun(`
    UPDATE app_notification
    SET is_read = 1
    WHERE (user_id = ? OR (user_id IS NULL AND (role = ? OR role = 'all')))
      AND is_read = 0
  `, [uId, r]);

  return { success: true, updated: result?.changes || 0 };
}

/**
 * 6. Get unread notification count
 */
export async function getUnreadCount(userId, role) {
  const uId = userId ? parseInt(userId, 10) : null;
  const r = (role || 'student').toLowerCase();

  const row = await dbGet(`
    SELECT COUNT(*) AS unread_count
    FROM app_notification
    WHERE (user_id = ? OR (user_id IS NULL AND (role = ? OR role = 'all')))
      AND is_read = 0
  `, [uId, r]);

  return row ? (row.unread_count || 0) : 0;
}
