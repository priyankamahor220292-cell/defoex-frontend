import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../../components/Modal/Modal';
import Loading from '../../components/Loading/Loading';
import AdviserRegistrationForm from './AdviserRegistrationForm';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AdvisersPage.css';

const formatJoinDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function AdvisersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const [view, setView] = useState('list');
  const [advisers, setAdvisers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuOpen, setMenuOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [credModal, setCredModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/api/advisers/', { params: { include_blacklisted: '1' } }),
      api.get('/api/branches/'),
    ])
      .then(([a, b]) => {
        if (a.status === 'fulfilled') setAdvisers(a.value.data.data || []);
        if (b.status === 'fulfilled') setBranches(b.value.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, view, pageSize]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const getStatus = (a) => {
    if (a.is_blacklisted) return 'Blacklisted';
    if (!a.is_active) return 'Not Active';
    return a.investor_count > 0 ? 'Active' : 'Not Active';
  };

  const stats = useMemo(() => {
    const nonBlacklisted = advisers.filter(a => !a.is_blacklisted);
    return {
      total: nonBlacklisted.length,
      active: nonBlacklisted.filter(a => a.is_active && a.investor_count > 0).length,
      pending: advisers.filter(a => !a.is_active && !a.is_blacklisted).length,
      blacklisted: advisers.filter(a => a.is_blacklisted).length,
    };
  }, [advisers]);

  const listSource = useMemo(() => advisers.filter(a => !a.is_blacklisted), [advisers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listSource;
    return listSource.filter(a =>
      a.adviser_code?.toLowerCase().includes(q) ||
      a.full_name?.toLowerCase().includes(q) ||
      a.mobile?.includes(q) ||
      a.father_name?.toLowerCase().includes(q)
    );
  }, [listSource, search]);

  const pending = advisers.filter(a => !a.is_active && !a.is_blacklisted);
  const approved = advisers.filter(a => a.is_active && !a.is_blacklisted);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  const approveAdviser = async (adviser) => {
    try {
      const { data } = await api.post(`/api/advisers/${adviser.id}/approve`, { action: 'approve' });
      const creds = data.data?.credentials;
      toast.success('Adviser approved!');
      if (creds) {
        setTimeout(() => {
          toast((t) => (
            <div>
              <div style={{ fontWeight: 700, color: '#00c853', marginBottom: 6 }}>🎉 Congratulations Adviser Created!</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 2 }}>
                <div>Username: <strong>{creds.username}</strong></div>
                <div>Password: <strong>{creds.password}</strong></div>
              </div>
            </div>
          ), { duration: 15000, style: { minWidth: 260 } });
        }, 400);
        setCredModal(creds);
      }
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const blacklistAdviser = async (adviser) => {
    if (!window.confirm(`Blacklist ${adviser.full_name}? They will not be able to create investors.`)) return;
    try {
      await api.post(`/api/advisers/${adviser.id}/blacklist`);
      toast.success(`${adviser.full_name} blacklisted`);
      setMenuOpen(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const deleteAdviser = async (adviser) => {
    if (!window.confirm(`Delete ${adviser.full_name}?`)) return;
    try {
      await api.delete(`/api/advisers/${adviser.id}`);
      toast.success('Adviser deleted');
      setMenuOpen(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const exportCsv = () => {
    const headers = ['Adviser ID', 'Rank', 'Name', 'Father Name', 'Mobile', 'Date of Joining', 'Promoter Name', 'Promoter ID', 'Status'];
    const rows = filtered.map(a => [
      a.adviser_code,
      `${a.rank_name} (Rank ${a.rank_id})`,
      a.full_name,
      a.father_name || '',
      a.mobile || '',
      formatJoinDate(a.created_at),
      a.parent_adviser_name || '',
      a.parent_adviser_code || '',
      getStatus(a),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advisers.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported advisers.csv');
  };

  const statusClass = (status) => {
    if (status === 'Active') return 'active';
    if (status === 'Blacklisted') return 'blacklist';
    return 'inactive';
  };

  return (
    <div className="ap-page page-enter">
      <div className="ap-page-header">
        <div>
          <h1>Advisers</h1>
          <p className="text-muted">Manage adviser registrations, approvals and status</p>
        </div>
        <div className="ap-header-actions">
          <button type="button" className={`ap-header-btn${view === 'list' ? ' primary' : ''}`} onClick={() => setView('list')}>
            📋 List Adviser
          </button>
          <button type="button" className={`ap-header-btn outline${view === 'create' ? ' active' : ''}`} onClick={() => setView('create')}>
            + New Adviser Registration
          </button>
          <button type="button" className={`ap-header-btn outline${view === 'approved' ? ' active' : ''}`} onClick={() => setView('approved')}>
            ✓ Approved Adviser
            {pending.length > 0 && <span className="ap-header-badge">{pending.length}</span>}
          </button>
        </div>
      </div>

      {view === 'list' && (
        <>
          {!loading && (
            <div className="grid-4 ap-summary">
              <div className="ap-stat-card">
                <div className="ap-stat-icon ap-stat-icon--blue">👥</div>
                <div>
                  <div className="ap-stat-label">Total Advisers</div>
                  <div className="ap-stat-value">{stats.total}</div>
                  <div className="ap-stat-sub">All Registered Advisers</div>
                </div>
              </div>
              <div className="ap-stat-card">
                <div className="ap-stat-icon ap-stat-icon--green">✅</div>
                <div>
                  <div className="ap-stat-label">Active Advisers</div>
                  <div className="ap-stat-value">{stats.active}</div>
                  <div className="ap-stat-sub">Currently Active</div>
                </div>
              </div>
              <div className="ap-stat-card">
                <div className="ap-stat-icon ap-stat-icon--orange">⏳</div>
                <div>
                  <div className="ap-stat-label">Pending Approval</div>
                  <div className="ap-stat-value">{stats.pending}</div>
                  <div className="ap-stat-sub">Awaiting Approval</div>
                </div>
              </div>
              <div className="ap-stat-card">
                <div className="ap-stat-icon ap-stat-icon--red">🚫</div>
                <div>
                  <div className="ap-stat-label">Blacklisted</div>
                  <div className="ap-stat-value">{stats.blacklisted}</div>
                  <div className="ap-stat-sub">Blacklisted Advisers</div>
                </div>
              </div>
            </div>
          )}

          <div className="ap-table-wrap">
            <div className="ap-toolbar">
              <div className="ap-search-wrap">
                <span className="ap-search-ico">🔍</span>
                <input
                  className="ap-search-input"
                  placeholder="Search by Adviser ID, Name, Mobile or Father Name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="ap-tool-btn"><span>🔽</span> Filter</button>
              <button type="button" className="ap-tool-btn" onClick={exportCsv}><span>⬇️</span> Export</button>
            </div>

            {loading ? <Loading /> : (
              <div className="ap-table-scroll">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Sr. No</th>
                      <th>Adviser ID</th>
                      <th>Rank Name & Number</th>
                      <th>Adviser Name</th>
                      <th>Father Name</th>
                      <th>Mobile Number</th>
                      <th>Date of Joining</th>
                      <th>Promoter Adviser Name</th>
                      <th>Promoter Adviser ID</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((a, i) => {
                      const status = getStatus(a);
                      return (
                        <tr key={a.id}>
                          <td className="ap-td-num">{rangeStart + i}</td>
                          <td><span className="ap-id-chip">{a.adviser_code}</span></td>
                          <td>
                            <span className="ap-rank-name">{a.rank_name}</span>
                            <span className="ap-rank-num"> (Rank {a.rank_id})</span>
                          </td>
                          <td>
                            <span className="ap-name-cell">
                              {a.is_active && <span className="ap-verified" title="Approved">✓</span>}
                              <strong>{a.full_name}</strong>
                            </span>
                          </td>
                          <td>{a.father_name || '—'}</td>
                          <td>
                            <span className="ap-mobile-cell">
                              <span className="ap-phone-ico">📞</span>
                              {a.mobile || '—'}
                            </span>
                          </td>
                          <td className="ap-td-date">{formatJoinDate(a.created_at)}</td>
                          <td>{a.parent_adviser_name || '—'}</td>
                          <td><span className="ap-promoter-id">{a.parent_adviser_code || '—'}</span></td>
                          <td>
                            <span className={`ap-status-pill ${statusClass(status)}`}>{status}</span>
                          </td>
                          <td>
                            <div className="ap-actions" onClick={e => e.stopPropagation()}>
                              <button type="button" className="ap-action-btn ap-action-btn--view" onClick={() => setDetail(a)}>
                                👁 View
                              </button>
                              <div className="ap-menu-wrap">
                                <button
                                  type="button"
                                  className="ap-icon-btn"
                                  onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)}
                                >
                                  ⋯
                                </button>
                                {menuOpen === a.id && (
                                  <div className="ap-menu">
                                    {!a.is_active && (
                                      <button type="button" onClick={() => { approveAdviser(a); setMenuOpen(null); }}>Approve</button>
                                    )}
                                    <button type="button" onClick={() => { setDetail(a); setMenuOpen(null); }}>View Details</button>
                                    {isAdmin && status !== 'Blacklisted' && (
                                      <button type="button" className="danger" onClick={() => blacklistAdviser(a)}>Blacklist</button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isAdmin && status !== 'Blacklisted' && (
                                <button type="button" className="ap-action-btn ap-action-btn--blacklist" onClick={() => blacklistAdviser(a)}>
                                  Blacklist
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr><td colSpan={11} className="ap-empty">No advisers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="ap-pagination">
                <span className="ap-page-info">
                  Showing {rangeStart} to {rangeEnd} of {filtered.length} adviser{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="ap-page-right">
                  <div className="ap-page-btns">
                    <button type="button" className="ap-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) => (
                        typeof p === 'number' ? (
                          <button key={p} type="button" className={`ap-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                        ) : (
                          <span key={`e-${idx}`} className="ap-page-ellipsis">…</span>
                        )
                      ))}
                    <button type="button" className="ap-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  </div>
                  <select className="ap-page-size" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'create' && (
        <AdviserRegistrationForm
          branches={branches}
          defaultBranchId={user?.branch_id || (branches.length === 1 ? branches[0].id : '')}
          onCancel={() => setView('list')}
          onSuccess={() => { load(); setView('approved'); }}
        />
      )}

      {view === 'approved' && (
        <div className="ap-approved-wrap">
          {pending.length > 0 && (
            <div className="ap-approved-panel">
              <div className="ap-approved-panel__head">
                <h3>Pending Approval ({pending.length})</h3>
                <p>Click Approve to generate Username & Password</p>
              </div>
              <div className="ap-table-scroll">
                <table className="ap-table">
                  <thead>
                    <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Promoter</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {pending.map((a, i) => (
                      <tr key={a.id}>
                        <td className="ap-td-num">{i + 1}</td>
                        <td><span className="ap-id-chip">{a.adviser_code}</span></td>
                        <td><strong>{a.full_name}</strong></td>
                        <td>{a.rank_name}</td>
                        <td>{a.mobile}</td>
                        <td><span className="ap-promoter-id">{a.parent_adviser_code || '—'}</span></td>
                        <td>
                          <div className="ap-actions">
                            <button type="button" className="ap-action-btn ap-action-btn--approve" onClick={() => approveAdviser(a)}>✓ Approve</button>
                            <button type="button" className="ap-action-btn ap-action-btn--blacklist" onClick={() => deleteAdviser(a)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="ap-approved-panel">
            <div className="ap-approved-panel__head">
              <h3>Approved Advisers ({approved.length})</h3>
            </div>
            <div className="ap-table-scroll">
              <table className="ap-table">
                <thead>
                  <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {approved.map((a, i) => (
                    <tr key={a.id}>
                      <td className="ap-td-num">{i + 1}</td>
                      <td><span className="ap-id-chip">{a.adviser_code}</span></td>
                      <td><strong>{a.full_name}</strong></td>
                      <td>{a.rank_name}</td>
                      <td>{a.mobile}</td>
                      <td><span className="ap-status-pill active">Active</span></td>
                      <td>
                        <div className="ap-actions">
                          <button type="button" className="ap-action-btn ap-action-btn--view" onClick={() => setDetail(a)}>👁 View</button>
                          {isAdmin && (
                            <button type="button" className="ap-action-btn ap-action-btn--blacklist" onClick={() => blacklistAdviser(a)}>Blacklist</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!approved.length && (
                    <tr><td colSpan={7} className="ap-empty">No approved advisers yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Adviser Details" size="md">
        {detail && (
          <div>
            <div className="ap-detail-grid">
              {[
                ['Adviser ID', detail.adviser_code],
                ['Full Name', detail.full_name],
                ['Father Name', detail.father_name || '—'],
                ['Mobile', detail.mobile],
                ['Email', detail.email || '—'],
                ['Rank', `${detail.rank_name} (Rank ${detail.rank_id})`],
                ['Date Joined', formatJoinDate(detail.created_at)],
                ['Promoter ID', detail.parent_adviser_code || '—'],
                ['Promoter Name', detail.parent_adviser_name || '—'],
                ['Branch', detail.branch_id ? `Branch #${detail.branch_id}` : '—'],
                ['Status', getStatus(detail)],
              ].map(([k, v]) => (
                <div key={k} className="ap-detail-row">
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="ap-detail-note">
              <div className="ap-detail-note__title">Status Logic</div>
              <div>• <strong>Active</strong> — Has at least 1 investor</div>
              <div>• <strong>Not Active</strong> — Has no investors yet</div>
              <div>• <strong>Blacklisted</strong> — Admin only · Cannot create investors</div>
            </div>
            <div className="ap-detail-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!credModal} onClose={() => setCredModal(null)} title="🎉 Adviser Account Created!" size="sm">
        {credModal && (
          <div className="ap-cred-modal">
            <div className="ap-cred-icon">🎊</div>
            <div className="ap-cred-title">Congratulations Adviser Created!</div>
            <div className="ap-cred-box">
              <div>Username: <strong>{credModal.username}</strong></div>
              <div>Password: <strong>{credModal.password}</strong></div>
            </div>
            <p className="ap-cred-hint">10-digit hexadecimal password · Share with adviser</p>
            <div className="ap-cred-actions">
              <button type="button" className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
                toast.success('Credentials copied!');
              }}>Copy Credentials</button>
              <button type="button" className="btn btn-outline" onClick={() => setCredModal(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
