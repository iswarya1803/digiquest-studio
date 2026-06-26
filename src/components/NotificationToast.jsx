import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Bell, X, CheckCircle2, AlertTriangle, Info, Package } from 'lucide-react';

const TOAST_DURATION = 5000; // ms

const ICON_MAP = {
  revision_request:  { icon: AlertTriangle, color: '#f59e0b' },
  project_update:    { icon: Package,       color: '#818cf8' },
  approval:          { icon: CheckCircle2,  color: '#22c55e' },
  delivery_ready:    { icon: Package,       color: '#22d3ee' },
  default:           { icon: Info,          color: '#94a3b8' }
};

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(window.location.origin, { transports: ['websocket', 'polling'] });
  }
  return socketInstance;
}

export default function NotificationToast() {
  const [toasts, setToasts]   = useState([]);
  const [panel, setPanel]     = useState(false);
  const [history, setHistory] = useState([]);
  const [unread, setUnread]   = useState(0);

  const addToast = useCallback((notification) => {
    const id = Date.now();
    const entry = { id, ...notification, time: new Date() };
    setToasts(prev => [...prev, entry]);
    setHistory(prev => [entry, ...prev].slice(0, 20));
    setUnread(u => u + 1);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const events = [
      'notification',
      'revision_request',
      'project_update',
      'approval',
      'delivery_ready'
    ];

    events.forEach(ev => {
      socket.on(ev, (data) => {
        addToast({ type: ev, message: data.message || data, ...data });
      });
    });

    // Also fetch existing notifications from API
    const token = localStorage.getItem('token');
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const unreadCount = data.filter(n => !n.is_read).length;
          setUnread(unreadCount);
          setHistory(data.map(n => ({
            id: n.id,
            type: n.type || 'default',
            message: n.message,
            time: new Date(n.created_at),
            is_read: n.is_read
          })));
        }
      })
      .catch(() => {});

    return () => {
      events.forEach(ev => socket.off(ev));
    };
  }, [addToast]);

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  function openPanel() {
    setPanel(true);
    setUnread(0);
    // Mark all as read
    const token = localStorage.getItem('token');
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  }

  return (
    <>
      {/* Toast Stack */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '340px'
      }}>
        {toasts.map(t => {
          const meta = ICON_MAP[t.type] || ICON_MAP.default;
          const IconComp = meta.icon;
          return (
            <div
              key={t.id}
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: `1px solid ${meta.color}44`,
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: '12px',
                padding: '12px 14px',
                backdropFilter: 'blur(16px)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${meta.color}11`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                animation: 'slideInRight 0.3s ease',
                minWidth: '280px'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: `${meta.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconComp size={16} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {t.message}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {t.time instanceof Date ? t.time.toLocaleTimeString() : ''}
                </p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bell Icon Button (attach anywhere via CSS portal) */}
      <button
        id="notification-bell"
        onClick={openPanel}
        style={{
          position: 'fixed',
          bottom: '96px',
          right: '20px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          zIndex: 8000
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--surface-primary)'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Notification History Panel */}
      {panel && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 8500 }}
          onClick={() => setPanel(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '152px',
              right: '20px',
              width: '340px',
              maxHeight: '420px',
              background: 'var(--surface-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={14} /> Notifications
              </span>
              <button onClick={() => setPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Panel Body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {history.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No notifications yet
                </div>
              ) : (
                history.map(n => {
                  const meta = ICON_MAP[n.type] || ICON_MAP.default;
                  const IconComp = meta.icon;
                  return (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)'
                      }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <IconComp size={13} color={meta.color} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {n.time instanceof Date ? n.time.toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </>
  );
}
