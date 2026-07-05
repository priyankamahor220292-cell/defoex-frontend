import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard/StatCard';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatIST } from '../../utils/dateTime';
import './BranchesPage.css';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh'];

const MAX_TOPUP = 1_000_000_000;
const PAGE_SIZE = 9;

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const fmtShort = n => {
  const num = parseFloat(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
  return fmt(num);
};

export default function BranchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [topupBranch, setTopupBranch] = useState(null);
  const [topupAmt, setTopupAmt] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [topupErr, setTopupErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(null);
  const [form, setForm] = useState({
    branch_code: '', branch_name: '', city: '', state: 'Madhya Pradesh',
    pincode: '', manager_name: '', manager_email: '', manager_mobile: '',
  });

  const load = () => {
    setLoading(true);
    branchService.list()
      .then(r => setBranches(r.data.data || []))
      .catch(() => toast.error('Failed to load branches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search, filter, sortBy]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const summary = useMemo(() => {
    const total = branches.length;
    const active = branches.filter(b => b.is_active).length;
    const totalWallet = branches.reduce((s, b) => s + (parseFloat(b.wallet?.current_balance) || 0), 0);
    const totalBusiness = branches.reduce((s, b) => s + (parseFloat(b.monthly_business) || 0), 0);
    return { total, active, totalWallet, totalBusiness };
  }, [branches]);

  const filtered = useMemo(() => {
    let list = [...branches];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(b =>
        b.branch_name?.toLowerCase().includes(q) ||
        b.branch_code?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.manager_name?.toLowerCase().includes(q)
      );
    }
    if (filter === 'active') list = list.filter(b => b.is_active);
    if (filter === 'inactive') list = list.filter(b => !b.is_active);

    list.sort((a, b) => {
      if (sortBy === 'balance') {
        return (parseFloat(b.wallet?.current_balance) || 0) - (parseFloat(a.wallet?.current_balance) || 0);
      }
      if (sortBy === 'business') {
        return (parseFloat(b.monthly_business) || 0) - (parseFloat(a.monthly_business) || 0);
      }
      return (a.branch_name || '').localeCompare(b.branch_name || '');
    });
    return list;
  }, [branches, search, filter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const createBranch = async () => {
    if (!form.branch_code || !form.branch_name) return toast.error('Branch code and name required');
    setSaving(true);
    try {
      await branchService.create(form);
      toast.success('Branch created successfully!');
      setShowCreate(false);
      setForm({
        branch_code: '', branch_name: '', city: '', state: 'Madhya Pradesh',
        pincode: '', manager_name: '', manager_email: '', manager_mobile: '',
      });
      load();
    } catch (e) {
      if (!e.response) {
        toast.error('Cannot reach the backend. In Terminal 1 run: cd defoex-backend && python app.py');
      } else {
        toast.error(e.response?.data?.message || 'Failed to create branch');
      }
    } finally { setSaving(false); }
  };

  const onTopupAmtChange = (e) => {
    const val = e.target.value;
    if (!val) { setTopupAmt(''); setTopupErr(''); return; }
    const n = parseFloat(val);
    if (n > MAX_TOPUP) {
      setTopupErr(`Maximum per transaction is ${fmt(MAX_TOPUP)}`);
      setTopupAmt(String(MAX_TOPUP));
    } else if (n <= 0) {
      setTopupErr('Amount must be positive');
      setTopupAmt(val);
    } else {
      setTopupErr('');
      setTopupAmt(val);
    }
  };

  const doTopup = async () => {
    const amt = parseFloat(topupAmt);
    if (!topupAmt || amt <= 0) return toast.error('Enter valid amount');
    if (amt > MAX_TOPUP) return toast.error(`Maximum transaction is ${fmt(MAX_TOPUP)}`);
    setSaving(true);
    try {
      const { data: resp } = await branchService.topup(topupBranch.id, { amount: amt, description: topupDesc || 'Admin top-up' });
      const topupAt = resp?.data?.topup_at;
      toast.success(
        topupAt
          ? `${fmt(amt)} added to ${topupBranch.branch_name} at ${formatIST(topupAt)}`
          : `${fmt(amt)} added to ${topupBranch.branch_name}!`
      );
      setShowTopup(false);
      setTopupAmt('');
      setTopupDesc('');
      setTopupErr('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Top-up failed');
    } finally { setSaving(false); }
  };

  const openDetail = async (b) => {
    try {
      const { data } = await branchService.get(b.id);
      setShowDetail(data.data);
    } catch {
      toast.error('Failed to load branch details');
    }
  };

  const openTopup = (b) => {
    setTopupBranch(b);
    setTopupAmt('');
    setTopupDesc('');
    setTopupErr('');
    setShowTopup(true);
    setMenuOpen(null);
  };

  const cycleFilter = () => {
    setFilter(f => (f === 'all' ? 'active' : f === 'active' ? 'inactive' : 'all'));
  };

  const cycleSort = () => {
    setSortBy(s => (s === 'name' ? 'balance' : s === 'balance' ? 'business' : 'name'));
  };

  const sortLabel = { name: 'Name', balance: 'Balance', business: 'Business' }[sortBy];
  const filterLabel = { all: 'All', active: 'Active', inactive: 'Inactive' }[filter];

  return (
    <div className="br-page page-enter">
      <div className="br-page-header">
        <div>
          <h1>Branches</h1>
          <p className="text-muted">Manage all company branches and their wallets</p>
        </div>
      </div>

      <div className="br-toolbar">
        <div className="br-search-wrap">
          <span className="br-search-ico">🔍</span>
          <input
            className="br-search-input"
            placeholder="Search Branch"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="br-tool-btn" onClick={cycleFilter}>
          <span>⚙️</span> Filter{filter !== 'all' ? `: ${filterLabel}` : ''}
        </button>
        <button type="button" className="br-tool-btn" onClick={cycleSort}>
          <span>↕️</span> Sort By: {sortLabel}
        </button>
        {user?.role === 'superadmin' && (
          <button type="button" className="btn btn-primary br-create-btn" onClick={() => setShowCreate(true)}>
            + Create Branch
          </button>
        )}
      </div>

      {!loading && (
        <div className="grid-4 br-summary">
          <StatCard variant="featured" title="Total Branches" value={summary.total} subtitle="All Company Branches" icon="🏢" color="primary" />
          <StatCard variant="featured" title="Active Branches" value={summary.active} subtitle="Currently Active" icon="✅" color="success" />
          <StatCard variant="featured" title="Total Wallet Balance" value={fmt(summary.totalWallet)} subtitle="All Branches Wallet" icon="💳" color="purple" />
          <StatCard variant="featured" title="Total Business (This Month)" value={fmt(summary.totalBusiness)} subtitle="Across All Branches" icon="💰" color="warning" />
        </div>
      )}

      {loading ? <Loading /> : (
        <>
          <div className="branches-grid">
            {paged.map(b => (
              <div key={b.id} className={`branch-card${b.wallet?.is_low_balance ? ' branch-card--low' : ''}`}>
                <div className="branch-card__header">
                  <div className="branch-icon">{b.branch_name?.[0]?.toUpperCase() || 'B'}</div>
                  <div className="branch-card__info">
                    <div className="branch-name">{b.branch_name}</div>
                    <div className="branch-code">{b.branch_code}</div>
                  </div>
                  <span className={`br-status${b.is_active ? ' br-status--active' : ''}`}>
                    <span className="br-status-dot" />
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="branch-card__body">
                  <div className="branch-row"><span className="br-row-ico">📍</span><span>{b.city || '—'}{b.state ? `, ${b.state}` : ''}</span></div>
                  {b.manager_name && <div className="branch-row"><span className="br-row-ico">👤</span><span>{b.manager_name}</span></div>}
                  {b.manager_mobile && <div className="branch-row"><span className="br-row-ico">📞</span><span>{b.manager_mobile}</span></div>}

                  <div className="branch-wallet-row">
                    <div className="bwr-bal">
                      <span className="bwr-bal-label"><span className="bwr-ico">💼</span> Balance</span>
                      <span className={`bwr-bal-val${b.wallet?.is_low_balance ? ' low' : ''}`}>
                        {fmt(b.wallet?.current_balance)}
                      </span>
                    </div>
                    <div className="bwr-bal">
                      <span className="bwr-bal-label"><span className="bwr-ico">💼</span> Cash Wallet</span>
                      <span className="bwr-bal-val">{fmt(b.wallet?.cash_wallet)}</span>
                    </div>
                  </div>

                  <div className="br-metrics">
                    <div className="br-metric">
                      <span className="br-metric-ico">👥</span>
                      <span className="br-metric-label">Total Investors</span>
                      <strong>{b.investor_count ?? '—'}</strong>
                    </div>
                    <div className="br-metric">
                      <span className="br-metric-ico">📋</span>
                      <span className="br-metric-label">Active Plans</span>
                      <strong>{b.active_plans ?? '—'}</strong>
                    </div>
                    <div className="br-metric">
                      <span className="br-metric-ico">💰</span>
                      <span className="br-metric-label">Monthly Business</span>
                      <strong>{b.monthly_business != null ? fmtShort(b.monthly_business) : '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className="branch-card__footer">
                  <button type="button" className="br-action-btn" onClick={() => openDetail(b)}>
                    <span>👁</span> View Details
                  </button>
                  {user?.role === 'superadmin' && (
                    <button type="button" className="br-action-btn" onClick={() => openTopup(b)}>
                      <span>💳</span> Wallet
                    </button>
                  )}
                  <button type="button" className="br-action-btn" onClick={() => openDetail(b)}>
                    <span>✏️</span> Edit
                  </button>
                  <div className="br-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="br-menu-btn"
                      onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                    >
                      ⋮
                    </button>
                    {menuOpen === b.id && (
                      <div className="br-menu">
                        <button type="button" onClick={() => { openDetail(b); setMenuOpen(null); }}>View Details</button>
                        {user?.role === 'superadmin' && (
                          <>
                            <button type="button" onClick={() => openTopup(b)}>Top Up Wallet</button>
                            <button type="button" onClick={() => { navigate('/wallet'); setMenuOpen(null); }}>Admin Wallet</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!filtered.length && (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <div className="empty-title">No branches found</div>
                <p>{search ? 'Try a different search term.' : 'Create your first branch to get started.'}</p>
                {user?.role === 'superadmin' && !search && (
                  <button type="button" className="btn btn-primary mt-2" onClick={() => setShowCreate(true)}>+ Create Branch</button>
                )}
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="br-pagination">
              <span className="br-page-info">
                Showing {rangeStart} to {rangeEnd} of {filtered.length} branch{filtered.length !== 1 ? 'es' : ''}
              </span>
              <div className="br-page-btns">
                <button type="button" className="br-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => (
                    typeof p === 'number' ? (
                      <button
                        key={p}
                        type="button"
                        className={`br-page-btn${page === p ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={`ellipsis-${i}`} className="br-page-ellipsis">…</span>
                    )
                  ))}
                <button type="button" className="br-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Branch" size="lg">
        <div className="reg-form-row">
          <Field label="Branch Code" required>
            <Input value={form.branch_code} onChange={e => set('branch_code', e.target.value.toUpperCase())} placeholder="e.g. BR001" />
          </Field>
          <Field label="Branch Name" required>
            <Input value={form.branch_name} onChange={e => set('branch_name', e.target.value)} placeholder="e.g. Bhopal Main Branch" />
          </Field>
        </div>
        <div className="reg-form-row">
          <Field label="City">
            <Input value={form.city} onChange={e => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <Select value={form.state} onChange={e => set('state', e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Pincode">
            <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} maxLength={6} />
          </Field>
        </div>
        <div className="branch-form-divider">
          <div className="branch-form-divider__title">Branch Manager</div>
          <div className="reg-form-row">
            <Field label="Manager Name">
              <Input value={form.manager_name} onChange={e => set('manager_name', e.target.value)} />
            </Field>
            <Field label="Manager Email">
              <Input type="email" value={form.manager_email} onChange={e => set('manager_email', e.target.value)} />
            </Field>
            <Field label="Manager Mobile">
              <Input
                value={form.manager_mobile}
                onChange={e => set('manager_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                placeholder="Unique 10-digit number"
              />
            </Field>
          </div>
        </div>
        <Alert type="info">After creating the branch, go to Users → create a user with role "branchmanager" and this branch_id.</Alert>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={createBranch} disabled={saving}>{saving ? 'Creating...' : 'Create Branch'}</button>
        </div>
      </Modal>

      <Modal open={showTopup} onClose={() => setShowTopup(false)} title={`Top Up — ${topupBranch?.branch_name}`} size="sm">
        <Field label="Amount (₹)" required error={topupErr}>
          <Input
            type="number"
            value={topupAmt}
            onChange={onTopupAmtChange}
            placeholder="e.g. 500000"
            min="1"
            max={MAX_TOPUP}
            autoFocus
          />
        </Field>
        <Field label="Description" className="mt-1">
          <Input value={topupDesc} onChange={e => setTopupDesc(e.target.value)} placeholder="e.g. June 2026 allocation" />
        </Field>
        <Alert type="warning" className="mt-2">
          Max per transaction: {fmt(MAX_TOPUP)}. This adds to the branch current_balance.
        </Alert>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={() => setShowTopup(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={doTopup} disabled={saving || !!topupErr || !topupAmt}>
            {saving ? 'Processing...' : `Add ${topupAmt ? fmt(topupAmt) : 'Funds'}`}
          </button>
        </div>
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Branch Details" size="md">
        {showDetail && (
          <div>
            <div className="detail-section">
              <div className="detail-section__title">Branch Info</div>
              {[
                ['Branch Code', showDetail.branch_code],
                ['Branch Name', showDetail.branch_name],
                ['City', showDetail.city],
                ['State', showDetail.state],
                ['Pincode', showDetail.pincode],
                ['Status', showDetail.is_active ? 'Active' : 'Inactive'],
              ].map(([k, v]) => v && (
                <div key={k} className="detail-row-item"><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
            {(showDetail.manager_name || showDetail.manager_email) && (
              <div className="detail-section mt-2">
                <div className="detail-section__title">Manager</div>
                {[
                  ['Name', showDetail.manager_name],
                  ['Email', showDetail.manager_email],
                  ['Mobile', showDetail.manager_mobile],
                ].map(([k, v]) => v && (
                  <div key={k} className="detail-row-item"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
            )}
            {showDetail.wallet && (
              <div className="wallet-detail-cards mt-2">
                <div className={`wdc${showDetail.wallet.is_low_balance ? ' low' : ''}`}>
                  <div className="wdc-label">Current Balance</div>
                  <div className="wdc-value">{fmt(showDetail.wallet.current_balance)}</div>
                  {showDetail.wallet.is_low_balance && <div className="wdc-alert">⚠ Low balance</div>}
                </div>
                <div className="wdc accent">
                  <div className="wdc-label">Cash Wallet</div>
                  <div className="wdc-value">{fmt(showDetail.wallet.cash_wallet)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
