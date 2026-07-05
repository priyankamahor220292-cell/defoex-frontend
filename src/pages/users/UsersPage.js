import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatLocal } from '../../utils/dateTime';
import './UsersPage.css';

const ROLES = ['superadmin', 'branchmanager', 'advisor', 'member'];
const PORTAL_CRUD_ROLES = ['branchmanager', 'advisor', 'member'];

const emptyForm = (role = 'branchmanager') => ({
  username: '',
  email: '',
  password: '',
  full_name: '',
  mobile: '',
  role,
  branch_id: '',
  is_active: true,
});

const roleLabel = { branchmanager: 'Branch Manager', advisor: 'Adviser', member: 'Investor', superadmin: 'Super Admin' };

const roleDisplay = {
  superadmin: 'SUPERADMIN',
  branchmanager: 'BRANCH MANAGER',
  advisor: 'ADVISOR',
  member: 'INVESTOR',
};

const roleColor = { superadmin: '#A32D2D', branchmanager: '#185FA5', advisor: '#854F0B', member: '#3B6D11' };
const roleBg = { superadmin: '#FCEBEB', branchmanager: '#E6F1FB', advisor: '#FAEEDA', member: '#EAF3DE' };

const AVATAR_COLORS = ['#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#c62828'];

const userInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm('advisor'));
  const [editSaving, setEditSaving] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [credModal, setCredModal] = useState(null);

  const showCreds = (data, title = 'Login Credentials') => {
    if (!data?.password) return;
    setCredModal({ title, username: data.username, password: data.password, full_name: data.full_name, role: data.role });
  };

  const copyCreds = () => {
    if (!credModal) return;
    navigator.clipboard.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
    toast.success('Copied to clipboard');
  };

  const load = () => {
    setLoading(true);
    const params = roleFilter === 'all' ? {} : { role: roleFilter };
    Promise.allSettled([api.get('/api/users/', { params }), branchService.list()])
      .then(([u, b]) => {
        if (u.status === 'fulfilled') setUsers(u.value.data.data || []);
        if (b.status === 'fulfilled') setBranches(b.value.data.data || []);
        if (u.status === 'rejected') toast.error('Could not load users');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [roleFilter]);
  useEffect(() => { setPage(1); }, [roleFilter, search, pageSize]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const branchName = (branchId) => branches.find(b => b.id === branchId)?.branch_name || '—';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobile?.includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    inactive: users.filter(u => u.is_active === false).length,
  }), [users]);

  const tabStatsLabel = {
    all: 'All Users',
    branchmanager: 'Branch Managers',
    advisor: 'Advisers',
    member: 'Investors',
  }[roleFilter] || 'All Users';

  const openCreate = () => {
    const role = ['branchmanager', 'advisor', 'member'].includes(roleFilter) ? roleFilter : 'branchmanager';
    setForm(emptyForm(role));
    setShowCreate(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      username: u.username || '',
      email: u.email || '',
      full_name: u.full_name || '',
      mobile: u.mobile || '',
      role: u.role,
      branch_id: u.branch_id ? String(u.branch_id) : '',
      is_active: u.is_active !== false,
    });
    setMenuOpen(null);
  };

  const create = async () => {
    const req = ['username', 'email', 'password', 'full_name', 'role'];
    if (req.some(f => !form[f])) return toast.error('Fill all required fields');
    if (form.role === 'branchmanager' && !form.branch_id) {
      return toast.error('Select a branch for the branch manager');
    }
    if (form.role === 'branchmanager' && !/^\d{10}$/.test((form.mobile || '').replace(/\D/g, ''))) {
      return toast.error('Enter a unique 10-digit mobile number for the branch manager');
    }
    setSaving(true);
    try {
      const r = await api.post('/api/users/', { ...form, branch_id: form.branch_id ? parseInt(form.branch_id) : null });
      toast.success('User created!');
      showCreds(r.data.data, 'New User Credentials');
      setShowCreate(false);
      setForm(emptyForm(['branchmanager', 'advisor', 'member'].includes(roleFilter) ? roleFilter : 'branchmanager'));
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const req = ['username', 'email', 'full_name'];
    if (req.some(f => !editForm[f]?.trim())) return toast.error('Fill all required fields');
    if (editUser.role === 'branchmanager' && !editForm.branch_id) {
      return toast.error('Select a branch for the branch manager');
    }
    if (editUser.role === 'branchmanager' && !/^\d{10}$/.test((editForm.mobile || '').replace(/\D/g, ''))) {
      return toast.error('Enter a unique 10-digit mobile number for the branch manager');
    }
    setEditSaving(true);
    try {
      await api.put(`/api/users/${editUser.id}`, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        full_name: editForm.full_name.trim(),
        mobile: editForm.mobile || null,
        branch_id: editForm.branch_id ? parseInt(editForm.branch_id, 10) : null,
        is_active: editForm.is_active,
      });
      toast.success(`${editForm.full_name} updated`);
      setEditUser(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update user');
    } finally { setEditSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/api/users/${u.id}`, { is_active: !u.is_active });
      toast.success(`User ${!u.is_active ? 'activated' : 'deactivated'}`);
      setMenuOpen(null);
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async (u) => {
    const label = roleLabel[u.role] || u.role;
    if (!window.confirm(`Delete ${u.full_name}? This removes their portal login (${label} account only).`)) return;
    try {
      await api.delete(`/api/users/${u.id}`);
      toast.success(`${u.full_name} deleted`);
      setMenuOpen(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const canManage = (u) => PORTAL_CRUD_ROLES.includes(u.role);

  const resetPassword = async () => {
    if (!resetUser) return;
    setResetting(true);
    try {
      const r = await api.post(`/api/users/${resetUser.id}/reset-password`, {
        password: resetPw.trim() || undefined,
      });
      toast.success('Password reset successfully');
      showCreds(r.data.data, 'Password Reset');
      setResetUser(null);
      setResetPw('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reset password');
    } finally { setResetting(false); }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setResetPw(pw);
  };

  const exportCsv = () => {
    const headers = ['Name', 'Username', 'Email', 'Mobile', 'Role', 'Branch', 'Status', 'Created'];
    const rows = filtered.map(u => [
      u.full_name,
      u.username,
      u.email,
      u.mobile || '',
      roleDisplay[u.role] || u.role,
      branchName(u.branch_id),
      u.is_active !== false ? 'Active' : 'Inactive',
      formatLocal(u.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported users.csv');
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="users-page page-enter">
        <div className="up-page-header"><h1>Users</h1></div>
        <div className="up-restricted">
          <div className="up-restricted-icon">🔒</div>
          <h2>Access Restricted</h2>
          <p>Only <strong>Super Admin</strong> can manage users.<br />Your role: <strong>{user?.role}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page page-enter">
      <div className="up-page-header">
        <div>
          <h1>Users</h1>
          <p className="text-muted">Manage portal access for advisers, investors, and staff</p>
        </div>
        <button type="button" className="btn btn-primary up-create-btn" onClick={openCreate}>+ Create User</button>
      </div>

      <div className="up-tabs">
        {[
          ['all', 'All Users'],
          ['branchmanager', 'Branch Managers'],
          ['advisor', 'Advisers'],
          ['member', 'Investors'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`up-tab${roleFilter === value ? ' active' : ''}`}
            onClick={() => setRoleFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {!loading && (
        <div className="up-summary">
          <div className="up-summary-main">
            <div className="up-summary-icon">👥</div>
            <div>
              <div className="up-summary-title">{tabStatsLabel}</div>
              <div className="up-summary-count">{stats.total} User{stats.total !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="up-summary-stat">
            <span className="up-stat-ico">📋</span>
            <div>
              <div className="up-stat-label">Total Users</div>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className="up-summary-stat">
            <span className="up-stat-ico up-stat-ico--green">✅</span>
            <div>
              <div className="up-stat-label">Active Users</div>
              <strong>{stats.active}</strong>
            </div>
          </div>
          <div className="up-summary-stat">
            <span className="up-stat-ico up-stat-ico--red">🚫</span>
            <div>
              <div className="up-stat-label">Inactive Users</div>
              <strong>{stats.inactive}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="up-table-wrap">
        <div className="up-toolbar">
          <div className="up-search-wrap">
            <span className="up-search-ico">🔍</span>
            <input
              className="up-search-input"
              placeholder="Search by name, email or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="up-tool-btn"><span>🔽</span> Filter</button>
          <button type="button" className="up-tool-btn" onClick={exportCsv}><span>⬇️</span> Export</button>
        </div>

        {loading ? <Loading /> : (
          <div className="up-table-scroll">
            <table className="up-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u, i) => (
                  <tr key={u.id}>
                    <td className="up-td-num">{rangeStart + i}</td>
                    <td>
                      <div className="up-name-cell">
                        <span className="up-avatar" style={{ background: avatarColor(u.full_name) }}>
                          {userInitials(u.full_name)}
                        </span>
                        <strong>{u.full_name}</strong>
                      </div>
                    </td>
                    <td><span className="up-username">{u.username}</span></td>
                    <td>{u.email}</td>
                    <td>{u.mobile || '—'}</td>
                    <td>
                      <span
                        className="up-role-pill"
                        style={{ background: roleBg[u.role], color: roleColor[u.role] }}
                      >
                        {roleDisplay[u.role] || u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td>{branchName(u.branch_id)}</td>
                    <td className="up-td-date">{formatLocal(u.created_at)}</td>
                    <td>
                      <span className={`up-status-pill${u.is_active !== false ? ' active' : ' inactive'}`}>
                        {u.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="up-actions" onClick={e => e.stopPropagation()}>
                        <div className="up-menu-wrap">
                          <button
                            type="button"
                            className="up-icon-btn"
                            onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                          >
                            ⋯
                          </button>
                          {menuOpen === u.id && (
                            <div className="up-menu">
                              <button type="button" onClick={() => { setResetUser(u); setResetPw(''); setMenuOpen(null); }}>
                                Reset Password
                              </button>
                              <button type="button" onClick={() => toggleActive(u)}>
                                {u.is_active !== false ? 'Deactivate' : 'Activate'}
                              </button>
                              {canManage(u) && (
                                <button type="button" className="danger" onClick={() => deleteUser(u)}>Delete</button>
                              )}
                            </div>
                          )}
                        </div>
                        {u.role === 'superadmin' ? (
                          <button
                            type="button"
                            className="up-action-btn up-action-btn--edit"
                            onClick={() => { setResetUser(u); setResetPw(''); }}
                          >
                            ✏️ Reset Password
                          </button>
                        ) : canManage(u) ? (
                          <button type="button" className="up-action-btn up-action-btn--edit" onClick={() => openEdit(u)}>
                            ✏️ Edit
                          </button>
                        ) : null}
                        {canManage(u) && (
                          <button type="button" className="up-action-btn up-action-btn--delete" onClick={() => deleteUser(u)} title="Delete">
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={10} className="up-empty">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="up-pagination">
            <span className="up-page-info">
              Showing {rangeStart} to {rangeEnd} of {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="up-page-right">
              <div className="up-page-btns">
                <button type="button" className="up-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => (
                    typeof p === 'number' ? (
                      <button
                        key={p}
                        type="button"
                        className={`up-page-btn${page === p ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={`e-${idx}`} className="up-page-ellipsis">…</span>
                    )
                  ))}
                <button type="button" className="up-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
              <select className="up-page-size" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="md">
        <div className="reg-form-row">
          <Field label="Full Name" required><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} /></Field>
          <Field label="Username" required><Input value={form.username} onChange={e => set('username', e.target.value)} /></Field>
        </div>
        <div className="reg-form-row">
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Mobile" required={form.role === 'branchmanager'}>
            <Input
              value={form.mobile}
              onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              placeholder={form.role === 'branchmanager' ? 'Unique 10-digit number' : ''}
            />
          </Field>
        </div>
        <div className="reg-form-row">
          <Field label="Password" required><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 chars" /></Field>
          {roleFilter === 'all' ? (
            <Field label="Role" required>
              <Select value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{roleLabel[r] || r}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Role">
              <Input value={roleLabel[roleFilter] || roleFilter} disabled />
            </Field>
          )}
        </div>
        {(form.role === 'branchmanager' || form.role === 'advisor' || form.role === 'member') && (
          <Field label={form.role === 'branchmanager' ? 'Branch *' : 'Branch'}>
            <Select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
              <option value="">— Select Branch —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
            </Select>
          </Field>
        )}
        <Alert type="info" className="mt-2">The user can login immediately. Save the password shown after creation — only Super Admin can view or reset passwords.</Alert>
        <div className="reset-pw-actions">
          <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
        </div>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit ${roleLabel[editUser?.role] || 'User'}`} size="md">
        {editUser && (
          <>
            <div className="reg-form-row">
              <Field label="Full Name" required><Input value={editForm.full_name} onChange={e => setEdit('full_name', e.target.value)} /></Field>
              <Field label="Username" required><Input value={editForm.username} onChange={e => setEdit('username', e.target.value)} /></Field>
            </div>
            <div className="reg-form-row">
              <Field label="Email" required><Input type="email" value={editForm.email} onChange={e => setEdit('email', e.target.value)} /></Field>
              <Field label="Mobile" required={editUser.role === 'branchmanager'}>
                <Input
                  value={editForm.mobile}
                  onChange={e => setEdit('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  placeholder={editUser.role === 'branchmanager' ? 'Unique 10-digit number' : ''}
                />
              </Field>
            </div>
            <Field label={editUser.role === 'branchmanager' ? 'Branch *' : 'Branch'}>
              <Select value={editForm.branch_id} onChange={e => setEdit('branch_id', e.target.value)}>
                <option value="">— Select Branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editForm.is_active ? 'active' : 'inactive'} onChange={e => setEdit('is_active', e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            {(editUser.role === 'advisor' || editUser.role === 'member') && (
              <Alert type="info" className="mt-2">
                Updates here also sync to the linked {editUser.role === 'member' ? 'investor' : 'adviser'} profile when a match is found.
              </Alert>
            )}
            <div className="reset-pw-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title="Reset User Password" size="sm">
        {resetUser && (
          <div className="reset-pw-modal">
            <div className="reset-pw-user">
              <div className="reset-pw-avatar">{userInitials(resetUser.full_name)}</div>
              <div className="reset-pw-user-info">
                <div className="reset-pw-name">{resetUser.full_name}</div>
                <div className="reset-pw-meta">
                  <code>@{resetUser.username}</code>
                  {resetUser.email && <span>{resetUser.email}</span>}
                </div>
                <span className="reset-pw-role" style={{ background: roleBg[resetUser.role], color: roleColor[resetUser.role] }}>
                  {resetUser.role}
                </span>
              </div>
            </div>
            <div className="reset-pw-section">
              <label className="reset-pw-label">New Password</label>
              <div className="reset-pw-input-row">
                <Input type="text" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Leave blank to auto-generate" className="reset-pw-input" />
                <button type="button" className="btn btn-outline btn-sm reset-pw-gen" onClick={generatePassword}>Generate</button>
              </div>
              <p className="reset-pw-hint">Optional — leave empty for a secure auto-generated password</p>
            </div>
            <div className="reset-pw-notice">
              <span className="reset-pw-notice-icon">🔐</span>
              <div>
                <strong>One-time display</strong>
                <p>The new password is shown once after reset. Copy and share it securely with the user.</p>
              </div>
            </div>
            <div className="reset-pw-actions">
              <button type="button" className="btn btn-outline" onClick={() => setResetUser(null)} disabled={resetting}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={resetPassword} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!credModal} onClose={() => setCredModal(null)} title={credModal?.title || 'Login Credentials'} size="sm">
        {credModal && (
          <div className="cred-modal">
            <div className="cred-modal-user">
              <div className="reset-pw-avatar">{userInitials(credModal.full_name)}</div>
              <div>
                <div className="reset-pw-name">{credModal.full_name}</div>
                <span className="reset-pw-role" style={{ background: roleBg[credModal.role], color: roleColor[credModal.role] }}>
                  {credModal.role}
                </span>
              </div>
            </div>
            <div className="cred-box">
              <div className="cred-row"><span>Username</span><strong>{credModal.username}</strong></div>
              <div className="cred-row cred-row--password"><span>Password</span><strong>{credModal.password}</strong></div>
            </div>
            <div className="reset-pw-notice">
              <span className="reset-pw-notice-icon">⚠️</span>
              <div>
                <strong>Save now</strong>
                <p>Passwords cannot be viewed again after closing this dialog.</p>
              </div>
            </div>
            <div className="reset-pw-actions">
              <button type="button" className="btn btn-outline" onClick={copyCreds}>Copy Credentials</button>
              <button type="button" className="btn btn-primary" onClick={() => setCredModal(null)}>Done</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
