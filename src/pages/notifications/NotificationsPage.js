import React, { useEffect, useState } from 'react';
import Panel from '../../components/Panel/Panel';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const [data, setData] = useState({ items: [], unread_count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/api/notifications/').then(r => setData(r.data.data || {})).finally(() => setLoading(false));
  }, []);

  const markRead = async () => {
    await api.post('/api/notifications/mark-read');
    setData(d => ({ ...d, items: d.items.map(n => ({ ...n, is_read: true })), unread_count: 0 }));
    toast.success('All marked as read');
  };

  const icons = { Info: 'ℹ️', Warning: '⚠️', Success: '✅', Error: '❌' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>
            Notifications
            {data.unread_count > 0 && <span className="notif-count">{data.unread_count}</span>}
          </h1>
          <p className="text-muted">Stay updated on approvals, plans, and account activity</p>
        </div>
        {data.unread_count > 0 && (
          <div className="page-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={markRead}>Mark All Read</button>
          </div>
        )}
      </div>
      <Panel title="All Notifications">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-sub">Loading notifications…</div>
          </div>
        ) : (
          <div className="notif-list">
            {data.items?.map(n => (
              <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''} type-${n.notification_type?.toLowerCase()}`}>
                <div className="notif-icon">{icons[n.notification_type] || 'ℹ️'}</div>
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{n.created_at?.split('T')[0]}</div>
                </div>
                {!n.is_read && <div className="notif-dot" />}
              </div>
            ))}
            {!data.items?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">🔔</div>
                <div className="empty-state-title">No notifications</div>
                <div className="empty-state-sub">You're all caught up — new alerts will appear here</div>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
