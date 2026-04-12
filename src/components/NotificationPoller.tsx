'use client';

import { useEffect } from 'react';
import { getUnreadNotificationsAction } from '@/actions/notificationAction';

export default function NotificationPoller() {
  useEffect(() => {
    // Request permission once on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const poll = async () => {
      try {
        const notifications = await getUnreadNotificationsAction();
        if (notifications && notifications.length > 0) {
          notifications.forEach(n => {
            // Fire desktop push notification
            if (Notification.permission === 'granted') {
              new Notification(n.title, {
                body: n.message,
                icon: '/favicon.ico' // Default icon fallback
              });
            } else {
              // Fallback to basic browser alert if permission denied 
              // (but only if it's critical, here we just log or ignore)
              console.log("[Notification]", n.title, n.message);
            }
          });
        }
      } catch (e) {
        // user might not be logged in or other error
        console.error("Polling error", e);
      }
    };

    // Poll every 5 seconds
    const intervalId = setInterval(poll, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return null; // Invisible component
}
