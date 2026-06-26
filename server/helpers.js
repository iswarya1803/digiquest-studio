import { dbData, saveDB } from './db.js';

/**
 * Log an audit event to the database.
 */
export function logAudit(userId, actionType, description, ip = '127.0.0.1') {
  try {
    const newLog = {
      id: dbData.audit_logs.length > 0 ? Math.max(...dbData.audit_logs.map(l => l.id)) + 1 : 1,
      user_id: userId,
      action_type: actionType,
      description,
      ip_address: ip,
      created_at: new Date().toISOString()
    };
    dbData.audit_logs.unshift(newLog);
    saveDB();
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

/**
 * Create an in-app notification for a user.
 */
export function createNotification(userId, title, message, type = 'info') {
  try {
    const newNotif = {
      id: dbData.notifications.length > 0 ? Math.max(...dbData.notifications.map(n => n.id)) + 1 : 1,
      user_id: userId,
      title,
      message,
      is_read: 0,
      type,
      created_at: new Date().toISOString()
    };
    dbData.notifications.push(newNotif);
    saveDB();
    return newNotif;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
