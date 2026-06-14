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
        <h1>Notifications {data.unread_count > 0 && <span className="notif-count">{data.unread_count}</span>}</h1>
        {data.unread_count > 0 && <button className="btn btn-outline btn-sm" onClick={markRead}>Mark All Read</button>}
      </div>
      <Panel title="All Notifications">
        {loading ? <div style={{padding:'32px',textAlign:'center',color:'var(--text-muted)'}}>Loading...</div> : (
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
            {!data.items?.length && <div className="text-center text-muted" style={{padding:'32px'}}>No notifications</div>}
          </div>
        )}
      </Panel>
    </div>
  );
}
