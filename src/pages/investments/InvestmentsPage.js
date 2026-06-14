import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Badge from '../../components/Badge/Badge';
import Pagination from '../../components/Pagination/Pagination';
import Alert from '../../components/Alert/Alert';
import Loading from '../../components/Loading/Loading';
import { investmentService } from '../../services/investmentService';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';
import './InvestmentsPage.css';

const MIS_TABLE = {
  '3Y': { months: 36, label: '3 Years' },
  '5Y': { months: 60, label: '5 Years' },
  '7Y': { months: 84, label: '7 Years' },
};
const ROI_MAP = { '3Y': 1.1667, '5Y': 1.3333, '7Y': 1.3571 };
const PLAN_DATA = [100,200,500,1000,1500,2000,2500,3000,3500,4000,5000,6000,7500,9000,10000,12000,15000,20000,25000,30000];

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Investment Plans</h1>
        <div className="tabs">
          <button className={`tab-btn ${activeTab===0?'active':''}`} onClick={() => setActiveTab(0)}>All Plans</button>
          <button className={`tab-btn ${activeTab===1?'active':''}`} onClick={() => setActiveTab(1)}>New Plan</button>
          <button className={`tab-btn ${activeTab===2?'active':''}`} onClick={() => setActiveTab(2)}>MIS Chart</button>
        </div>
      </div>
      {activeTab === 0 && <PlanList />}
      {activeTab === 1 && <NewPlan />}
      {activeTab === 2 && <MISChart />}
    </div>
  );
}

/* ---- PLAN LIST ---- */
function PlanList() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1, current_page: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [printIrn, setPrintIrn] = useState(null);
  const [printData, setPrintData] = useState(null);

  const fetch = (p = 1) => {
    setLoading(true);
    investmentService.list({ page: p }).then(r => setData(r.data.data || {})).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(page); }, [page]);

  const showPrint = async (irn) => {
    try {
      const { data } = await investmentService.print(irn);
      setPrintData(data.data);
      setPrintIrn(irn);
    } catch { toast.error('Failed to load record'); }
  };

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <>
      <Panel title="All Investment Plans">
        {loading ? <Loading /> : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>IRN</th><th>Investor ID</th><th>Plan</th><th>Monthly</th>
                  <th>Total Inv.</th><th>Maturity</th><th>Tenure</th><th>Next Due</th>
                  <th>Approval</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map(p => (
                  <tr key={p.id}>
                    <td><code style={{fontSize:'0.75rem'}}>{p.irn}</code></td>
                    <td>{p.investor_id}</td>
                    <td><strong>{p.plan_name}</strong></td>
                    <td>{fmt(p.monthly_amount)}</td>
                    <td>{fmt(p.total_investment_amount)}</td>
                    <td style={{color:'var(--success)',fontWeight:700}}>{fmt(p.total_maturity_amount)}</td>
                    <td>{p.plan_tenure}</td>
                    <td>{p.due_date}</td>
                    <td><Badge status={p.approval_status} /></td>
                    <td><Badge status={p.status} /></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => showPrint(p.irn)}>Print</button>
                    </td>
                  </tr>
                ))}
                {!data.items?.length && (
                  <tr><td colSpan={11} className="text-center text-muted" style={{padding:'32px'}}>No plans found</td></tr>
                )}
              </tbody>
            </table>
            <Pagination currentPage={data.current_page} totalPages={data.pages} onPageChange={p => { setPage(p); fetch(p); }} />
          </>
        )}
      </Panel>

      {/* Print Modal */}
      {printIrn && printData && (
        <div className="print-overlay" onClick={() => setPrintIrn(null)}>
          <div className="print-card" onClick={e => e.stopPropagation()}>
            <div className="print-header">
              <div className="print-logo">D</div>
              <div>
                <div className="print-company">DEFOEX INFRATECH PVT. LTD.</div>
                <div className="print-cin">CIN – U68100MP2026PTC083560</div>
              </div>
              <div className="print-irn">{printData.irn}</div>
            </div>
            <div className="print-body">
              {printData.investor && (
                <div className="print-section">
                  <div className="print-section__title">INVESTOR DETAILS</div>
                  <div className="print-grid">
                    <div><span>Investor Name</span><strong>{printData.investor.full_name}</strong></div>
                    <div><span>Father's Name</span><strong>{printData.investor.father_spouse_name}</strong></div>
                    <div><span>Mobile No.</span><strong>{printData.investor.mobile}</strong></div>
                    <div><span>Date of Birth</span><strong>{printData.investor.date_of_birth}</strong></div>
                    <div><span>City</span><strong>{printData.investor.corr_city}, {printData.investor.corr_state}</strong></div>
                    <div><span>Investor ID</span><strong>{printData.investor.investor_id}</strong></div>
                    <div><span>Adviser ID</span><strong>{printData.investor.adviser_code}</strong></div>
                    <div><span>Nominee</span><strong>{printData.investor.nominee_name} ({printData.investor.nominee_relationship})</strong></div>
                  </div>
                </div>
              )}
              <div className="print-section">
                <div className="print-section__title">INVESTMENT PLAN</div>
                <div className="print-grid">
                  <div><span>Plan Name</span><strong>{printData.investment?.plan_name}</strong></div>
                  <div><span>Investment Term</span><strong>Monthly</strong></div>
                  <div><span>Plan Tenure</span><strong>{printData.investment?.plan_tenure}</strong></div>
                  <div><span>Investment Date</span><strong>{printData.investment?.investment_date}</strong></div>
                  <div><span>Status</span><strong>{printData.status_label}</strong></div>
                  <div><span>Next Due Date</span><strong>{printData.investment?.due_date}</strong></div>
                  <div><span>Monthly Amount</span><strong style={{color:'var(--primary)'}}>{fmt(printData.investment?.monthly_amount)}</strong></div>
                  <div><span>Total Investment</span><strong>{fmt(printData.investment?.total_investment_amount)}</strong></div>
                  <div><span>Maturity Amount</span><strong style={{color:'var(--success)'}}>{fmt(printData.investment?.total_maturity_amount)}</strong></div>
                </div>
              </div>
            </div>
            <div className="print-footer">
              <span className="print-quote">"Defoex : Together We Build, Together We Grow..."</span>
              <div className="print-sign">Sign. Authority</div>
            </div>
            <div style={{textAlign:'center',marginTop:16}}>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print</button>
              <button className="btn btn-outline" onClick={() => setPrintIrn(null)} style={{marginLeft:8}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- NEW PLAN ---- */
function NewPlan() {
  const [form, setForm] = useState({
    investor_id: '', investment_date: new Date().toISOString().split('T')[0],
    plan_tenure: '3Y', monthly_amount: '', payment_mode: 'Cash', company_account: '',
  });
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.monthly_amount && form.plan_tenure) {
      const months = MIS_TABLE[form.plan_tenure].months;
      const total = form.monthly_amount * months;
      const maturity = total * ROI_MAP[form.plan_tenure];
      const dueDate = new Date(form.investment_date || Date.now());
      dueDate.setMonth(dueDate.getMonth() + 1);
      setPreview({
        total_investment: total,
        total_maturity: maturity,
        total_installments: months,
        due_date: dueDate.toISOString().split('T')[0],
        roi_pct: ((ROI_MAP[form.plan_tenure] - 1) * 100).toFixed(2),
      });
    }
  }, [form.monthly_amount, form.plan_tenure, form.investment_date]);

  const submit = async () => {
    if (!form.investor_id || !form.monthly_amount) return toast.error('Investor ID and Amount required');
    setSubmitting(true);
    try {
      await investmentService.create(form);
      toast.success('Investment plan created, pending approval!');
      setForm({ investor_id: '', investment_date: new Date().toISOString().split('T')[0], plan_tenure: '3Y', monthly_amount: '', payment_mode: 'Cash', company_account: '' });
      setPreview(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <Panel title="Create New Investment Plan">
      <div className="new-plan-layout">
        <div className="new-plan-form">
          <div className="reg-form-row">
            <Field label="Investor ID" required>
              <Input value={form.investor_id} onChange={e => set('investor_id', e.target.value)} placeholder="e.g. INV2026001234" />
            </Field>
            <Field label="Investment Date">
              <Input type="date" value={form.investment_date} onChange={e => set('investment_date', e.target.value)} />
            </Field>
          </div>
          <div className="plan-tenure-select">
            {Object.entries(MIS_TABLE).map(([key, val]) => (
              <button key={key} className={`tenure-btn ${form.plan_tenure === key ? 'active' : ''}`} onClick={() => set('plan_tenure', key)}>
                <div className="tenure-key">MIS {key}</div>
                <div className="tenure-label">{val.label}</div>
                <div className="tenure-months">{val.months} Months</div>
              </button>
            ))}
          </div>
          <div className="reg-form-row mt-2">
            <Field label="Monthly Amount (₹)" required>
              <Input type="number" value={form.monthly_amount} onChange={e => set('monthly_amount', e.target.value)} placeholder="100 – 30000" />
            </Field>
            <Field label="Payment Mode">
              <Select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)}>
                {['Cash','Cheque','DD','UPI','NEFT'].map(m => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Company A/C">
              <Input value={form.company_account} onChange={e => set('company_account', e.target.value)} placeholder="Select A/C" />
            </Field>
          </div>
          <button className="btn btn-primary btn-lg btn-full mt-2" onClick={submit} disabled={submitting}>
            {submitting ? 'Creating...' : '✓ Create Plan'}
          </button>
        </div>

        {preview && (
          <div className="plan-preview">
            <div className="preview-title">Plan Preview</div>
            <div className="preview-row"><span>Plan Tenure</span><strong>{MIS_TABLE[form.plan_tenure].label}</strong></div>
            <div className="preview-row"><span>Total Installments</span><strong>{preview.total_installments}</strong></div>
            <div className="preview-row"><span>Monthly Amount</span><strong style={{color:'var(--primary)'}}>{fmt(form.monthly_amount)}</strong></div>
            <div className="preview-row"><span>Total Investment</span><strong>{fmt(preview.total_investment)}</strong></div>
            <div className="preview-row big"><span>Maturity Amount</span><strong style={{color:'var(--success)'}}>{fmt(preview.total_maturity)}</strong></div>
            <div className="preview-row"><span>ROI</span><strong style={{color:'var(--accent)'}}>{preview.roi_pct}%</strong></div>
            <div className="preview-row"><span>First Due Date</span><strong>{preview.due_date}</strong></div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ---- MIS CHART ---- */
function MISChart() {
  const fmt = n => n?.toLocaleString('en-IN');
  const plans = PLAN_DATA.map((amt, i) => ({
    sno: i+1, amt,
    t3_total: amt*36, t3_roi: amt*36*1.1667,
    t5_total: amt*60, t5_roi: amt*60*1.3333,
    t7_total: amt*84, t7_roi: amt*84*1.3571,
  }));

  return (
    <Panel title="MIS Plan Chart" subtitle="Monthly Investment Scheme — ROI Reference">
      <div style={{overflowX:'auto'}}>
        <table className="data-table mis-chart-table">
          <thead>
            <tr>
              <th rowSpan={2}>S.No.</th>
              <th rowSpan={2}>Monthly Amt (₹)</th>
              <th colSpan={2} style={{background:'#1565c0',color:'#fff'}}>3 YEARS</th>
              <th colSpan={2} style={{background:'#2e7d32',color:'#fff'}}>5 YEARS</th>
              <th colSpan={2} style={{background:'#e65100',color:'#fff'}}>7 YEARS</th>
            </tr>
            <tr>
              <th>Total Investment</th><th>ROI (Return)</th>
              <th>Total Investment</th><th>ROI (Return)</th>
              <th>Total Investment</th><th>ROI (Return)</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.sno}>
                <td>{p.sno}</td>
                <td><strong>{fmt(p.amt)}</strong></td>
                <td>{fmt(Math.round(p.t3_total))}</td>
                <td style={{fontWeight:700,color:'#1565c0'}}>{fmt(Math.round(p.t3_roi))}</td>
                <td>{fmt(Math.round(p.t5_total))}</td>
                <td style={{fontWeight:700,color:'#2e7d32'}}>{fmt(Math.round(p.t5_roi))}</td>
                <td>{fmt(Math.round(p.t7_total))}</td>
                <td style={{fontWeight:700,color:'#e65100'}}>{fmt(Math.round(p.t7_roi))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mis-note">"Defoex : Together We Build, Together We Grow..."</div>
    </Panel>
  );
}
