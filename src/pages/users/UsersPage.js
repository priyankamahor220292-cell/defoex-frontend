import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './UsersPage.css';

const ROLES = ['superadmin', 'branchmanager', 'advisor', 'member'];

export default function UsersPage() {
  const { user } = useAuth();

  // Guard: only superadmin can access this page
  if (user?.role !== 'superadmin') {
    return (
      <div className="page-enter">
        <div className="page-header"><h1>Users</h1></div>
        <div style={{
          textAlign:'center', padding:'60px 20px',
          background:'var(--bg-card)', borderRadius:'var(--border-radius-lg)',
          border:'1px solid var(--border)'
        }}>
          <div style={{fontSize:'3rem', marginBottom:16}}>🔒</div>
          <h2 style={{marginBottom:8, fontFamily:'var(--font-display)'}}>Access Restricted</h2>
          <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>
            Only <strong>Super Admin</strong> can manage users.<br/>
            Your role: <strong>{user?.role}</strong>
          </p>
        </div>
      </div>
    );
  }

  const [users, setUsers]       = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ username:'', email:'', password:'', full_name:'', mobile:'', role:'branchmanager', branch_id:'' });

  const load = () => {
    setLoading(true);
    Promise.allSettled([api.get('/api/users/'), api.get('/api/branches/')])
      .then(([u, b]) => {
        if (u.status === 'fulfilled') setUsers(u.value.data.data || []);
        if (b.status === 'fulfilled') setBranches(b.value.data.data || []);
        if (u.status === 'rejected') toast.error('Could not load users');
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    const req = ['username','email','password','full_name','role'];
    if (req.some(f => !form[f])) return toast.error('Fill all required fields');
    setSaving(true);
    try {
      await api.post('/api/users/', { ...form, branch_id: form.branch_id ? parseInt(form.branch_id) : null });
      toast.success('User created!');
      setShowCreate(false);
      setForm({ username:'', email:'', password:'', full_name:'', mobile:'', role:'branchmanager', branch_id:'' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/api/users/${u.id}`, { is_active: !u.is_active });
      toast.success(`User ${!u.is_active ? 'activated' : 'deactivated'}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const roleColor = { superadmin:'#A32D2D', branchmanager:'#185FA5', advisor:'#854F0B', member:'#3B6D11' };
  const roleBg    = { superadmin:'#FCEBEB', branchmanager:'#E6F1FB', advisor:'#FAEEDA', member:'#EAF3DE' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Users</h1><p className="text-muted">Manage portal access for all roles</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      <Panel title="All Users" subtitle={`${users.length} users`}>
        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Username</th><th>Email</th><th>Mobile</th><th>Role</th><th>Branch</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i+1}</td>
                  <td><strong>{u.full_name}</strong></td>
                  <td><code style={{fontSize:'0.78rem'}}>{u.username}</code></td>
                  <td>{u.email}</td>
                  <td>{u.mobile || '—'}</td>
                  <td>
                    <span style={{background:roleBg[u.role],color:roleColor[u.role],padding:'2px 8px',borderRadius:10,fontSize:'0.72rem',fontWeight:700}}>
                      {u.role}
                    </span>
                  </td>
                  <td>{branches.find(b => b.id === u.branch_id)?.branch_name || '—'}</td>
                  <td><Badge status={u.is_active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={9} className="text-center text-muted" style={{padding:32}}>No users found</td></tr>}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="md">
        <div className="reg-form-row">
          <Field label="Full Name" required><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} /></Field>
          <Field label="Username" required><Input value={form.username} onChange={e => set('username', e.target.value)} /></Field>
        </div>
        <div className="reg-form-row">
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Mobile"><Input value={form.mobile} onChange={e => set('mobile', e.target.value)} maxLength={10} /></Field>
        </div>
        <div className="reg-form-row">
          <Field label="Password" required><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 chars" /></Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        {(form.role === 'branchmanager' || form.role === 'advisor') && (
          <Field label="Branch">
            <Select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
              <option value="">— Select Branch —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
            </Select>
          </Field>
        )}
        <Alert type="info" className="mt-2">The user can login immediately with the username and password you set here.</Alert>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
        </div>
      </Modal>
    </div>
  );
}