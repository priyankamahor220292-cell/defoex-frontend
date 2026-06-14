import React, { useState } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input } from '../../components/Field/Field';
import Alert from '../../components/Alert/Alert';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const changePassword = async () => {
    setPwError('');
    if (!pwForm.current_password || !pwForm.new_password) return setPwError('All fields required');
    if (pwForm.new_password !== pwForm.confirm_password) return setPwError('New passwords do not match');
    if (pwForm.new_password.length < 6) return setPwError('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully!');
      setPwForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch (e) {
      setPwError(e.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const roleColor = { superadmin:'#A32D2D', branchmanager:'#185FA5', advisor:'#854F0B', member:'#3B6D11' };
  const roleBg    = { superadmin:'#FCEBEB', branchmanager:'#E6F1FB', advisor:'#FAEEDA', member:'#EAF3DE' };

  return (
    <div className="page-enter">
      <div className="page-header"><h1>My Profile</h1></div>

      <div className="profile-layout">
        {/* Profile card */}
        <Panel title="Account Information">
          <div className="profile-avatar-row">
            <div className="profile-avatar">{user?.full_name?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <div className="profile-name">{user?.full_name}</div>
              <span style={{background:roleBg[user?.role],color:roleColor[user?.role],padding:'3px 10px',borderRadius:10,fontSize:'0.72rem',fontWeight:700}}>
                {user?.role}
              </span>
            </div>
          </div>
          <div className="profile-fields">
            {[
              ['Username', user?.username],
              ['Email', user?.email],
              ['Mobile', user?.mobile || '—'],
              ['Branch ID', user?.branch_id || '—'],
            ].map(([k,v]) => (
              <div key={k} className="profile-field-row">
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        </Panel>

        {/* Change password */}
        <Panel title="Change Password">
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {pwError && <Alert type="error" onClose={() => setPwError('')}>{pwError}</Alert>}
            <Field label="Current Password" required>
              <Input type="password" value={pwForm.current_password}
                onChange={e => setPwForm({...pwForm, current_password: e.target.value})}
                placeholder="Enter current password" />
            </Field>
            <Field label="New Password" required>
              <Input type="password" value={pwForm.new_password}
                onChange={e => setPwForm({...pwForm, new_password: e.target.value})}
                placeholder="Min 6 characters" />
            </Field>
            <Field label="Confirm New Password" required>
              <Input type="password" value={pwForm.confirm_password}
                onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})}
                placeholder="Re-enter new password" />
            </Field>
            <button className="btn btn-primary" onClick={changePassword} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
