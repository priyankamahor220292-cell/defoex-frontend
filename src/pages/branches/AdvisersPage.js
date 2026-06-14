import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RANKS = [
  [1,'SR — Senior Representative'],[2,'SO — Sales Officer'],[3,'SD — Sales Director'],
  [4,'SI — Sales Incharge'],[5,'DO — District Officer'],[6,'RO — Regional Officer'],
  [7,'ZO — Zonal Officer'],[8,'EM'],[9,'EM I'],[10,'EM II'],[11,'EM R'],[12,'EM C'],
  [13,'House 1'],[14,'House 2'],[15,'House 3'],[16,'House 4'],
  [17,'House 5'],[18,'House 6'],[19,'House 7'],[20,'House 8 (Owner)'],
];

export default function AdvisersPage() {
  const [advisers, setAdvisers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ full_name:'', mobile:'', email:'', rank_id:1, branch_id:'', parent_adviser_code:'' });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/api/advisers/'), api.get('/api/branches/')])
      .then(([a,b]) => { setAdvisers(a.data.data||[]); setBranches(b.data.data||[]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const create = async () => {
    if (!form.full_name || !form.mobile) return toast.error('Name and mobile required');
    setSaving(true);
    try {
      const { data } = await api.post('/api/advisers/', { ...form, branch_id: form.branch_id ? parseInt(form.branch_id) : null });
      toast.success(`Adviser created! Code: ${data.data.adviser_code}`);
      setShowCreate(false);
      setForm({ full_name:'', mobile:'', email:'', rank_id:1, branch_id:'', parent_adviser_code:'' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Advisers</h1><p className="text-muted">Manage adviser codes and rank hierarchy</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Adviser</button>
      </div>

      <Panel title="All Advisers" subtitle={`${advisers.length} advisers`}>
        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Adviser Code</th><th>Name</th><th>Mobile</th><th>Rank</th><th>Branch</th><th>Status</th></tr>
            </thead>
            <tbody>
              {advisers.map((a,i) => (
                <tr key={a.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontSize:'0.78rem',background:'var(--bg-table-head)',padding:'2px 6px',borderRadius:4}}>{a.adviser_code}</code></td>
                  <td><strong>{a.full_name}</strong>{a.is_company_owner && <span style={{marginLeft:6,fontSize:'0.7rem',color:'var(--warning)'}}>Owner</span>}</td>
                  <td>{a.mobile}</td>
                  <td><span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>{a.rank_name}</span></td>
                  <td>{branches.find(b=>b.id===a.branch_id)?.branch_name || '—'}</td>
                  <td><Badge status={a.is_active?'Active':'Inactive'} /></td>
                </tr>
              ))}
              {!advisers.length && <tr><td colSpan={7} className="text-center text-muted" style={{padding:32}}>No advisers yet</td></tr>}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Adviser" size="md">
        <div className="reg-form-row">
          <Field label="Full Name" required><Input value={form.full_name} onChange={e => set('full_name',e.target.value)} /></Field>
          <Field label="Mobile" required><Input value={form.mobile} onChange={e => set('mobile',e.target.value)} maxLength={10} /></Field>
        </div>
        <div className="reg-form-row">
          <Field label="Email"><Input type="email" value={form.email} onChange={e => set('email',e.target.value)} /></Field>
          <Field label="Rank">
            <Select value={form.rank_id} onChange={e => set('rank_id', parseInt(e.target.value))}>
              {RANKS.map(([id,name]) => <option key={id} value={id}>{id}. {name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="reg-form-row">
          <Field label="Branch">
            <Select value={form.branch_id} onChange={e => set('branch_id',e.target.value)}>
              <option value="">— Select —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </Select>
          </Field>
          <Field label="Parent Adviser Code (Upline)">
            <Input value={form.parent_adviser_code} onChange={e => set('parent_adviser_code',e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving?'Creating...':'Create Adviser'}</button>
        </div>
      </Modal>
    </div>
  );
}
