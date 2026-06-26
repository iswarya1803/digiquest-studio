import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, Menu } from 'lucide-react';

const PAGE_TITLES = {
  dashboard:             'Overview',
  projects:              'Projects & Checklist',
  customers:             'Customer Database',
  reports:               'Reports & Analytics',
  logs:                  'Audit Logs',
  client_dashboard:      'My Projects',
  client_notifications:  'Activity Logs',
};

export default function Navbar({ user, activeTab, onMenuClick }) {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen]   = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15000);
    return () => clearInterval(id);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch { /* silent */ }
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const icon = (type) => {
    if (type === 'alert')   return <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />;
    if (type === 'warning') return <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />;
    if (type === 'success') return <CheckCircle2  size={15} style={{ color: 'var(--success)' }} />;
    return <Info size={15} style={{ color: 'var(--primary)' }} />;
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {/* Mobile hamburger */}
        <button className="navbar-mobile-btn" onClick={onMenuClick} aria-label="Open sidebar">
          <Menu size={18} />
        </button>
        <h2 className="navbar-page-title">
          {PAGE_TITLES[activeTab] || 'Dashboard'}
        </h2>
      </div>

      <div className="navbar-actions">
        {/* Live status pill */}
        <div className="navbar-status-pill">
          <span className="navbar-status-dot animate-pulse" />
          <span className="navbar-status-label">Live</span>
        </div>

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="notif-bell-btn"
            onClick={() => setDropdownOpen(v => !v)}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {dropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 55 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div className="notif-dropdown glass-panel animate-fade-in" style={{ zIndex: 60 }}>
                <div className="notif-dropdown-header">
                  <h4>Notifications</h4>
                  {unread > 0 && <span>{unread} New</span>}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item${!n.is_read ? ' unread' : ''}`}
                        onClick={() => { markAsRead(n.id); setDropdownOpen(false); }}
                      >
                        <div className="notif-item-icon">{icon(n.type)}</div>
                        <div className="notif-item-body">
                          <p className="notif-item-title">{n.title}</p>
                          <p className="notif-item-desc">{n.message}</p>
                          <span className="notif-item-time">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.is_read && <div className="notif-unread-dot" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
