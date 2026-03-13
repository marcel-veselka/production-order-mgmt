import React from 'react';
import { useNotification } from '../context/NotificationContext';

export default function Notification() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container" role="status" aria-live="polite">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification notification-${notif.type}`}
          role="alert"
        >
          <span className="notification-icon">
            {notif.type === 'success' && '\u2713'}
            {notif.type === 'error' && '\u2717'}
            {notif.type === 'info' && '\u2139'}
          </span>
          <span className="notification-message">{notif.message}</span>
          <button
            className="notification-close"
            onClick={() => removeNotification(notif.id)}
            aria-label="Dismiss notification"
          >
            \u00d7
          </button>
        </div>
      ))}
    </div>
  );
}
