import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);

  // Load existing notifications
  const refreshNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await notificationApi.getNotifications(currentUser.id, currentUser.role);
      if (res && res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[Notifications] Could not fetch notifications:', err.message);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Real-time EventSource connection
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refreshNotifications();

    const streamUrl = notificationApi.getStreamUrl(currentUser.id, currentUser.role);
    let eventSource = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('connected', () => {
        // SSE connected
      });

      eventSource.addEventListener('notification', (e) => {
        try {
          const newNotif = JSON.parse(e.data);
          
          // Prepend to notifications list
          setNotifications(prev => [newNotif, ...prev.filter(n => n.notification_id !== newNotif.notification_id)]);
          setUnreadCount(prev => prev + 1);

          // Trigger live toast alert
          setActiveToast(newNotif);
        } catch (err) {
          console.error('[Notifications] Failed to parse SSE event data:', err);
        }
      });

      eventSource.onerror = () => {
        // EventSource will automatically retry connecting
      };
    } catch (err) {
      console.warn('[Notifications] EventSource setup error:', err.message);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentUser?.id, currentUser?.role, refreshNotifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId, currentUser?.id);
      setNotifications(prev =>
        prev.map(n => (n.notification_id === notificationId ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[Notifications] Mark read error:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(currentUser?.id, currentUser?.role);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err);
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        markAsRead,
        markAllAsRead,
        dismissToast,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
