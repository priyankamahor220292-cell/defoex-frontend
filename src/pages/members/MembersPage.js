import React, { useState, useEffect, useCallback } from 'react';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import RegistrationForm from './RegistrationForm';
import InvestorCredentialsModal from '../../components/InvestorCredentialsModal/InvestorCredentialsModal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './MembersPage.css';

const formatJoinDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function MembersPage() {
  const [view, setView] = useState('list');
  return (
    <div className="ip-page page-enter">
      <div className="ip-page-header">
        <div>
          <h1>Investor Management</h1>
          <p className="text-muted">Manage investor registrations and approvals</p>
        </div>
        <div className="ip-header-actions">
          <button type="button" className={`ip-header-btn${view === 'list' ? ' primary' : ''}`} onClick={() => setView('list')}>
            📋 List Investors
          </button>
          <button type="button" className={`ip-header-btn outline${view === 'create' ? ' active' : ''}`} onClick={() => setView('create')}>
            + New Registration
          </button>
          <button type="button" className={`ip-header-btn outline${view === 'approved' ? ' active' : ''}`} onClick={() => setView('approved')}>
            ✓ Approved Investor
          </button>
        </div>
      </div>
      {view === 'list' && <ListInvestors />}
      {view === 'create' && <NewRegistration onDone={() => setView('approved')} onCancel={() => setView('list')} />}
      {view === 'approved' && <ApprovedInvestors />}
    </div>
  );
}

function ListInvestors() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1, summary: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [menuOpen, setMenuOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';

  const load = useCallback((pg = page) => {
    setLoading(true);
    api.get('/api/registration/list', { params: { page: pg, date_from: dateFrom, date_to: dateTo } })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load investors'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, page]);

  useEffect(() => { load(page); }, [load, page]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const searchResult = search
    ? (data.items || []).filter(m =>
        m.investor_id?.toLowerCase().includes(search.toLowerCase()) ||
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.mobile?.includes(search))
    : (data.items || []);

  const summary = data.summary || {};
  const totalRecords = data.total || 0;
  const totalPages = Math.max(1, data.pages || 1);
  const rangeStart = totalRecords ? (page - 1) * 20 + 1 : 0;
  const rangeEnd = Math.min(page * 20, totalRecords);

  const blacklist = async (m) => {
    if (!isAdmin) return toast.error('Only Admin can blacklist');
    if (!window.confirm(`Blacklist ${m.full_name}?`)) return;
    try {
      await api.post(`/api/registration/${m.id}/blacklist`);
      toast.success(`${m.full_name} blacklisted`);
      setMenuOpen(null);
      load(page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const statusClass = (m) => {
    if (m.is_blacklisted || m.status === 'Blacklisted') return 'blacklist';
    if (m.status === 'Active') return 'active';
    return 'inactive';
  };

  const displayStatus = (m) => {
    if (m.is_blacklisted || m.status === 'Blacklisted') return 'Blacklisted';
    return m.status || 'Not Active';
  };

  return (
    <>
      {!loading && (
        <div className="grid-4 ip-summary">
          <div className="ip-stat-card">
            <div className="ip-stat-icon ip-stat-icon--blue">👥</div>
            <div>
              <div className="ip-stat-label">Total Investors</div>
              <div className="ip-stat-value">{summary.total ?? totalRecords}</div>
              <div className="ip-stat-sub">All Registered Investors</div>
            </div>
          </div>
          <div className="ip-stat-card">
            <div className="ip-stat-icon ip-stat-icon--green">✅</div>
            <div>
              <div className="ip-stat-label">Active Investors</div>
              <div className="ip-stat-value">{summary.active ?? 0}</div>
              <div className="ip-stat-sub">Currently Active</div>
            </div>
          </div>
          <div className="ip-stat-card">
            <div className="ip-stat-icon ip-stat-icon--orange">⏳</div>
            <div>
              <div className="ip-stat-label">Pending Approval</div>
              <div className="ip-stat-value">{summary.pending ?? 0}</div>
              <div className="ip-stat-sub">Awaiting Approval</div>
            </div>
          </div>
          <div className="ip-stat-card">
            <div className="ip-stat-icon ip-stat-icon--red">🚫</div>
            <div>
              <div className="ip-stat-label">Blacklisted Investors</div>
              <div className="ip-stat-value">{summary.blacklisted ?? 0}</div>
              <div className="ip-stat-sub">Blacklisted Accounts</div>
            </div>
          </div>
        </div>
      )}

      <div className="ip-table-wrap">
        <div className="ip-toolbar">
          <div className="ip-search-wrap">
            <span className="ip-search-ico">🔍</span>
            <input
              className="ip-search-input"
              placeholder="Search by Investor ID, Name or Mobile"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="ip-date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="ip-date-sep">to</span>
          <input
            type="date"
            className="ip-date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          <button type="button" className="btn btn-primary ip-search-btn" onClick={() => { setPage(1); load(1); }}>
            Search
          </button>
        </div>

        {loading ? <Loading /> : (
          <div className="ip-table-scroll">
            <table className="ip-table">
              <thead>
                <tr>
                  <th>Sr. No</th>
                  <th>Investor ID</th>
                  <th>Investor Name</th>
                  <th>Father Name</th>
                  <th>Mobile</th>
                  <th>Date of Joining</th>
                  <th>Adviser Name</th>
                  <th>Adviser ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchResult.map((m, i) => (
                  <tr key={m.id}>
                    <td className="ip-td-num">{rangeStart + i}</td>
                    <td><span className="ip-id-chip">{m.investor_id}</span></td>
                    <td><strong>{m.full_name}</strong></td>
                    <td>{m.father_spouse_name || '—'}</td>
                    <td>{m.mobile || '—'}</td>
                    <td className="ip-td-date">{formatJoinDate(m.date_of_joining)}</td>
                    <td>{m.adviser_name || '—'}</td>
                    <td><span className="ip-id-chip">{m.adviser_code || '—'}</span></td>
                    <td>
                      <span className={`ip-status-pill ${statusClass(m)}`}>{displayStatus(m)}</span>
                    </td>
                    <td>
                      <div className="ip-actions" onClick={e => e.stopPropagation()}>
                        <button type="button" className="ip-action-btn ip-action-btn--view" onClick={() => setDetail(m)}>
                          👁 View
                        </button>
                        <div className="ip-menu-wrap">
                          <button
                            type="button"
                            className="ip-icon-btn"
                            onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                          >
                            ⋯
                          </button>
                          {menuOpen === m.id && (
                            <div className="ip-menu">
                              <button type="button" onClick={() => { setDetail(m); setMenuOpen(null); }}>View Details</button>
                              {isAdmin && !m.is_blacklisted && (
                                <button type="button" className="danger" onClick={() => blacklist(m)}>Blacklist</button>
                              )}
                            </div>
                          )}
                        </div>
                        {isAdmin && !m.is_blacklisted && (
                          <button type="button" className="ip-action-btn ip-action-btn--blacklist" onClick={() => blacklist(m)}>
                            Blacklist
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!searchResult.length && (
                  <tr><td colSpan={10} className="ip-empty">{search ? `No results for "${search}"` : 'No investors found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalRecords > 0 && (
          <div className="ip-pagination">
            <span className="ip-page-info">
              Showing {rangeStart} to {rangeEnd} of {totalRecords} investor{totalRecords !== 1 ? 's' : ''}
            </span>
            <div className="ip-page-right">
              <div className="ip-page-btns">
                <button type="button" className="ip-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => (
                    typeof p === 'number' ? (
                      <button key={p} type="button" className={`ip-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                    ) : (
                      <span key={`e-${idx}`} className="ip-page-ellipsis">…</span>
                    )
                  ))}
                <button type="button" className="ip-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
              <select className="ip-page-size" value={pageSize} disabled>
                <option value={10}>10 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Investor Details" size="lg">
        {detail && <InvestorDetail investor={detail} onClose={() => setDetail(null)} />}
      </Modal>
    </>
  );
}

function InvestorDetail({ investor: m, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    api.get('/api/investment-plans/list', { params: { investor_id: m.investor_id } })
      .then(r => setPlans(r.data.data?.items || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [m.investor_id]);

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div>
      <div className="ip-detail-grid">
        {[
          ['Investor ID', m.investor_id], ['Full Name', m.full_name],
          ['Father Name', m.father_spouse_name || '—'], ['Mobile', m.mobile],
          ['Email', m.email || '—'], ['Date of Birth', m.date_of_birth || '—'],
          ['Date of Joining', formatJoinDate(m.date_of_joining)], ['City', m.corr_city || '—'],
          ['State', m.corr_state || '—'], ['Aadhar No.', m.aadhar_number ? `XXXX-${m.aadhar_number.slice(-4)}` : '—'],
          ['PAN No.', m.pan_number || '—'], ['Adviser ID', m.adviser_code],
          ['Nominee Name', m.nominee_name || '—'], ['Relation', m.nominee_relationship || '—'],
          ['Bank', m.bank_name || '—'], ['Account No.', m.account_number || '—'],
          ['Member Type', m.member_type || 'Investor'], ['Member Fees', fmt(m.member_fees || 650)],
          ['Payment Mode', m.payment_mode || '—'], ['Status', m.status || m.approval_status],
        ].map(([k, v]) => (
          <div key={k} className="ip-detail-row">
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <div className="ip-plans-title">Investment Plans</div>
      {loadingPlans ? <Loading /> : plans.length === 0 ? (
        <div className="ip-empty">No plans yet</div>
      ) : (
        <div className="ip-table-scroll">
          <table className="ip-table">
            <thead><tr><th>IRN</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Return On Invest</th><th>ROI</th><th>Status</th></tr></thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td><span className="ip-id-chip">{p.irn}</span></td>
                  <td><strong>{p.plan_name}</strong></td>
                  <td><strong>{fmt(p.monthly_amount)}</strong></td>
                  <td>{fmt(p.total_investment_amount)}</td>
                  <td><strong>{fmt(p.total_maturity_amount)}</strong></td>
                  <td>{p.roi_display}</td>
                  <td><span className={`ip-status-pill ${p.approval_status === 'Approved' ? 'active' : 'inactive'}`}>{p.approval_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="ip-detail-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function NewRegistration({ onDone, onCancel }) {
  return (
    <div className="ip-reg-wrap">
      <RegistrationForm onSuccess={onDone} onCancel={onCancel} />
    </div>
  );
}

function ApprovedInvestors() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credModal, setCredModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/api/registration/pending'),
      api.get('/api/registration/list'),
    ]).then(([p, a]) => {
      if (p.status === 'fulfilled') setPending(p.value.data.data?.items || []);
      if (a.status === 'fulfilled') setApproved(a.value.data.data?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (member, action) => {
    try {
      const { data } = await api.post(`/api/registration/approve/${member.id}`, { action });
      if (action === 'approve') {
        toast.success(`Approved: ${member.full_name}`);
        const creds = data?.data?.credentials;
        if (creds?.username) {
          setCredModal({
            ...creds,
            full_name: creds.full_name || member.full_name,
            investor_id: creds.investor_id || member.investor_id,
          });
        }
      } else {
        toast.success(`Rejected: ${member.full_name}`);
      }
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="ip-approved-wrap">
      {pending.length > 0 && (
        <div className="ip-approved-panel">
          <div className="ip-approved-panel__head">
            <h3>Pending Approval ({pending.length})</h3>
            <p>Click Approve to generate Username & Password (DEFIN format)</p>
          </div>
          <div className="ip-table-scroll">
            <table className="ip-table">
              <thead>
                <tr><th>#</th><th>Investor ID</th><th>Full Name</th><th>Mobile</th><th>Adviser</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((m, i) => (
                  <tr key={m.id}>
                    <td className="ip-td-num">{i + 1}</td>
                    <td><span className="ip-id-chip">{m.investor_id}</span></td>
                    <td><strong>{m.full_name}</strong></td>
                    <td>{m.mobile}</td>
                    <td><span className="ip-id-chip">{m.adviser_code}</span></td>
                    <td className="ip-td-date">{formatJoinDate(m.date_of_joining)}</td>
                    <td>
                      <div className="ip-actions">
                        <button type="button" className="ip-action-btn ip-action-btn--approve" onClick={() => approve(m, 'approve')}>✓ Approve</button>
                        <button type="button" className="ip-action-btn ip-action-btn--blacklist" onClick={() => approve(m, 'reject')}>✕ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ip-approved-panel">
        <div className="ip-approved-panel__head">
          <h3>Approved Investors ({approved.length})</h3>
        </div>
        <div className="ip-table-scroll">
          <table className="ip-table">
            <thead>
              <tr><th>#</th><th>Investor ID</th><th>Name</th><th>Mobile</th><th>Adviser</th><th>DOJ</th><th>Status</th></tr>
            </thead>
            <tbody>
              {approved.map((m, i) => (
                <tr key={m.id || i}>
                  <td className="ip-td-num">{i + 1}</td>
                  <td><span className="ip-id-chip">{m.investor_id}</span></td>
                  <td><strong>{m.full_name || m.investor_name}</strong></td>
                  <td>{m.mobile}</td>
                  <td><span className="ip-id-chip">{m.adviser_code}</span></td>
                  <td className="ip-td-date">{formatJoinDate(m.date_of_joining)}</td>
                  <td>
                    <span className={`ip-status-pill ${m.status === 'Active' ? 'active' : 'inactive'}`}>
                      {m.status || 'Not Active'}
                    </span>
                  </td>
                </tr>
              ))}
              {!approved.length && (
                <tr><td colSpan={7} className="ip-empty">No approved investors yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
    </div>
  );
}
