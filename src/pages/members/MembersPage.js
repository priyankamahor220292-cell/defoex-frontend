import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../../components/Panel/Panel';
import Stepper from '../../components/Stepper/Stepper';
import Field, { Input, Select } from '../../components/Field/Field';
import Alert from '../../components/Alert/Alert';
import Pagination from '../../components/Pagination/Pagination';
import Badge from '../../components/Badge/Badge';
import Loading from '../../components/Loading/Loading';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';
import './MembersPage.css';

const TABS = ['List Investors', 'New Registration'];
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh'];
const STEPS = ['Adviser Verify', 'Personal Info', 'Address & KYC', 'Nominee & Bank', 'Confirm'];

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Investor Management</h1>
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{t}</button>
          ))}
        </div>
      </div>
      {activeTab === 0 ? <InvestorList /> : <NewRegistration />}
    </div>
  );
}

/* ---- LIST ---- */
function InvestorList() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, pages: 1, current_page: 1 });
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetch = (p = 1) => {
    setLoading(true);
    memberService.list({ ...filters, page: p })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load investors'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(page); }, [page]);

  return (
    <Panel title="List of Investors" subtitle="Filtered by date of joining"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} style={{ width: 140 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
          <Input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} style={{ width: 140 }} />
          <button className="btn btn-primary btn-sm" onClick={() => fetch(1)}>Search</button>
        </div>
      }
    >
      {loading ? <Loading /> : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Investor Name</th>
                <th>Investor ID</th>
                <th>DOJ</th>
                <th>Adviser Code</th>
                <th>Mobile</th>
                <th>City</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((m, i) => (
                <tr key={m.investor_id}>
                  <td>{i + 1}</td>
                  <td><strong>{m.full_name}</strong></td>
                  <td><code>{m.investor_id}</code></td>
                  <td>{m.date_of_joining}</td>
                  <td>{m.adviser_code}</td>
                  <td>{m.mobile}</td>
                  <td>{m.corr_city || m.city || '—'}</td>
                  <td><Badge status={m.status || m.approval_status} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/members/${m.investor_id}`)}>View</button>
                  </td>
                </tr>
              ))}
              {!data.items?.length && (
                <tr><td colSpan={9} className="text-center text-muted" style={{ padding: '32px' }}>No investors found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination currentPage={data.current_page} totalPages={data.pages} onPageChange={p => { setPage(p); fetch(p); }} />
        </>
      )}
    </Panel>
  );
}

/* ---- REGISTRATION ---- */
function NewRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [adviserCode, setAdviserCode] = useState('');
  const [adviser, setAdviser] = useState(null);
  const [adviserErr, setAdviserErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    salutation: 'Mr', full_name: '', father_spouse_name: '', date_of_birth: '', gender: 'Male',
    marital_status: 'Single', nationality: 'Indian', mobile: '', email: '', phone_office: '',
    is_senior_citizen: false, is_special_roi: false,
    corr_address: '', corr_state: 'Madhya Pradesh', corr_city: '', corr_pincode: '',
    perm_address: '', perm_state: 'Madhya Pradesh', perm_city: '', perm_pincode: '', same_as_corr: false,
    aadhar_number: '', pan_number: '', verification_doc_type: 'Aadhar Card',
    nominee_name: '', nominee_age: '', nominee_relationship: 'Son',
    nominee_address: '', nominee_state: 'Madhya Pradesh', nominee_city: '', nominee_pincode: '',
    bank_name: '', account_number: '', ifsc_code: '', bank_branch_name: '', upi_id: '',
    occupation: '', annual_income: '', family_income: '',
    member_type: 'Customer', member_fees: 10, promoter_fees: 0,
    payment_mode: 'Cash', company_account: '',
    date_of_joining: new Date().toISOString().split('T')[0],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const verifyAdviser = async () => {
    setAdviserErr('');
    if (!adviserCode) return setAdviserErr('Enter Adviser ID');
    try {
      const { data } = await memberService.checkAdviser(adviserCode);
      setAdviser(data.data);
      setStep(1);
    } catch (e) {
      setAdviserErr(e.response?.data?.message || 'Adviser not found');
    }
  };

  const handleSameAddress = (checked) => {
    set('same_as_corr', checked);
    if (checked) {
      setForm(f => ({ ...f, same_as_corr: true, perm_address: f.corr_address, perm_state: f.corr_state, perm_city: f.corr_city, perm_pincode: f.corr_pincode }));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form, adviser_code: adviserCode };
      await memberService.register(payload);
      toast.success('Registration submitted for approval!');
      navigate('/approvals');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel title="New Investor Registration">
      <Stepper steps={STEPS} currentStep={step} />

      {/* STEP 0 — Adviser Verify */}
      {step === 0 && (
        <div className="reg-step">
          <h3 className="step-title">Verify Adviser ID</h3>
          <p className="step-desc">Every new investor must be registered under an active Adviser ID.</p>
          <div className="adviser-verify-row">
            <Field label="Enter Promoter ID" required error={adviserErr}>
              <Input value={adviserCode} onChange={e => setAdviserCode(e.target.value)} placeholder="e.g. ADV2026001234" />
            </Field>
            <button className="btn btn-primary" onClick={verifyAdviser}>Verify</button>
          </div>
          <div className="reg-form-row mt-2">
            <Field label="Member Type">
              <Select value={form.member_type} onChange={e => set('member_type', e.target.value)}>
                <option>Customer</option>
                <option>Promoter Member</option>
              </Select>
            </Field>
            <Field label="Member Fees">
              <Input type="number" value={form.member_fees} onChange={e => set('member_fees', e.target.value)} />
            </Field>
            <Field label="Promoter Fees">
              <Input type="number" value={form.promoter_fees} onChange={e => set('promoter_fees', e.target.value)} />
            </Field>
            <Field label="Payment Mode">
              <Select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)}>
                {['Cash','Cheque','DD','UPI','NEFT'].map(m => <option key={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Date of Registration">
            <Input type="date" value={form.date_of_joining} onChange={e => set('date_of_joining', e.target.value)} style={{ maxWidth: 200 }} />
          </Field>
        </div>
      )}

      {/* STEP 1 — Personal Info */}
      {step === 1 && (
        <div className="reg-step">
          <h3 className="step-title">Personal Information</h3>
          {adviser && <Alert type="success">Adviser: <strong>{adviser.full_name}</strong> ({adviser.adviser_code}) — Rank: {adviser.rank_name}</Alert>}
          <div className="reg-form-row">
            <Field label="Salutation">
              <Select value={form.salutation} onChange={e => set('salutation', e.target.value)}>
                {['Mr','Mrs','Ms','Dr'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Full Name" required>
              <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="As per Aadhar" />
            </Field>
            <Field label="Father / Spouse Name" required>
              <Input value={form.father_spouse_name} onChange={e => set('father_spouse_name', e.target.value)} />
            </Field>
          </div>
          <div className="reg-form-row">
            <Field label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </Field>
            <Field label="Age">
              <Input readOnly value={form.date_of_birth ? Math.floor((Date.now() - new Date(form.date_of_birth)) / 3.156e+10) : ''} placeholder="Auto" />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Marital Status">
              <Select value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
                {['Single','Married','Divorced','Widowed'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="reg-form-row">
            <Field label="Mobile" required>
              <Input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Phone (Office)">
              <Input value={form.phone_office} onChange={e => set('phone_office', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_senior_citizen} onChange={e => set('is_senior_citizen', e.target.checked)} />
              Is Senior Citizen
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_special_roi} onChange={e => set('is_special_roi', e.target.checked)} />
              Is Special ROI
            </label>
          </div>
        </div>
      )}

      {/* STEP 2 — Address & KYC */}
      {step === 2 && (
        <div className="reg-step">
          <h3 className="step-title">Address & KYC Documents</h3>
          <div className="reg-section-label">Correspondence Address</div>
          <Field label="Address" required>
            <textarea className="form-input form-textarea" value={form.corr_address} onChange={e => set('corr_address', e.target.value)} />
          </Field>
          <div className="reg-form-row">
            <Field label="State"><Select value={form.corr_state} onChange={e => set('corr_state', e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="City"><Input value={form.corr_city} onChange={e => set('corr_city', e.target.value)} /></Field>
            <Field label="Pincode"><Input value={form.corr_pincode} onChange={e => set('corr_pincode', e.target.value)} maxLength={6} /></Field>
          </div>

          <label className="checkbox-label mt-2">
            <input type="checkbox" checked={form.same_as_corr} onChange={e => handleSameAddress(e.target.checked)} />
            Permanent address same as correspondence address
          </label>

          {!form.same_as_corr && (
            <>
              <div className="reg-section-label mt-2">Permanent Address</div>
              <Field label="Address"><textarea className="form-input form-textarea" value={form.perm_address} onChange={e => set('perm_address', e.target.value)} /></Field>
              <div className="reg-form-row">
                <Field label="State"><Select value={form.perm_state} onChange={e => set('perm_state', e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="City"><Input value={form.perm_city} onChange={e => set('perm_city', e.target.value)} /></Field>
                <Field label="Pincode"><Input value={form.perm_pincode} onChange={e => set('perm_pincode', e.target.value)} maxLength={6} /></Field>
              </div>
            </>
          )}

          <div className="reg-section-label mt-2">KYC Documents</div>
          <div className="reg-form-row">
            <Field label="Aadhar Number" required><Input value={form.aadhar_number} onChange={e => set('aadhar_number', e.target.value)} maxLength={12} /></Field>
            <Field label="PAN Number"><Input value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} maxLength={10} /></Field>
            <Field label="Verification Document">
              <Select value={form.verification_doc_type} onChange={e => set('verification_doc_type', e.target.value)}>
                {["Aadhar Card","Passport","PAN Card","Voter ID Card","Driving License","Govt./Army ID Card","Ration Card","Others"].map(d => <option key={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {/* STEP 3 — Nominee & Bank */}
      {step === 3 && (
        <div className="reg-step">
          <h3 className="step-title">Nominee Details</h3>
          <div className="reg-form-row">
            <Field label="Nominee Name" required><Input value={form.nominee_name} onChange={e => set('nominee_name', e.target.value)} /></Field>
            <Field label="Age" required><Input type="number" value={form.nominee_age} onChange={e => set('nominee_age', e.target.value)} /></Field>
            <Field label="Relationship">
              <Select value={form.nominee_relationship} onChange={e => set('nominee_relationship', e.target.value)}>
                {['Son','Daughter','Spouse','Mother','Father','Brother','Sister','Other'].map(r => <option key={r}>{r}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Nominee Address"><textarea className="form-input form-textarea" value={form.nominee_address} onChange={e => set('nominee_address', e.target.value)} /></Field>
          <div className="reg-form-row">
            <Field label="State"><Select value={form.nominee_state} onChange={e => set('nominee_state', e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="City"><Input value={form.nominee_city} onChange={e => set('nominee_city', e.target.value)} /></Field>
            <Field label="Pincode"><Input value={form.nominee_pincode} onChange={e => set('nominee_pincode', e.target.value)} maxLength={6} /></Field>
          </div>

          <h3 className="step-title mt-3">Bank Details</h3>
          <div className="reg-form-row">
            <Field label="Bank Name"><Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} /></Field>
            <Field label="Account Number"><Input value={form.account_number} onChange={e => set('account_number', e.target.value)} /></Field>
            <Field label="IFSC Code"><Input value={form.ifsc_code} onChange={e => set('ifsc_code', e.target.value.toUpperCase())} /></Field>
            <Field label="Branch Name"><Input value={form.bank_branch_name} onChange={e => set('bank_branch_name', e.target.value)} /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="UPI ID"><Input value={form.upi_id} onChange={e => set('upi_id', e.target.value)} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={e => set('occupation', e.target.value)} /></Field>
            <Field label="Annual Income"><Input type="number" value={form.annual_income} onChange={e => set('annual_income', e.target.value)} /></Field>
            <Field label="Family Income"><Input type="number" value={form.family_income} onChange={e => set('family_income', e.target.value)} /></Field>
          </div>
        </div>
      )}

      {/* STEP 4 — Confirm */}
      {step === 4 && (
        <div className="reg-step">
          <h3 className="step-title">Review & Submit</h3>
          <div className="confirm-grid">
            <div className="confirm-section">
              <div className="confirm-section__title">Personal</div>
              <div className="confirm-row"><span>Name</span><strong>{form.salutation} {form.full_name}</strong></div>
              <div className="confirm-row"><span>Father/Spouse</span><strong>{form.father_spouse_name}</strong></div>
              <div className="confirm-row"><span>Mobile</span><strong>{form.mobile}</strong></div>
              <div className="confirm-row"><span>DOB</span><strong>{form.date_of_birth}</strong></div>
              <div className="confirm-row"><span>Gender</span><strong>{form.gender}</strong></div>
              <div className="confirm-row"><span>Adviser</span><strong>{adviserCode}</strong></div>
            </div>
            <div className="confirm-section">
              <div className="confirm-section__title">Address</div>
              <div className="confirm-row"><span>Corr.</span><strong>{form.corr_city}, {form.corr_state} - {form.corr_pincode}</strong></div>
              <div className="confirm-row"><span>Aadhar</span><strong>{form.aadhar_number}</strong></div>
              <div className="confirm-row"><span>PAN</span><strong>{form.pan_number || '—'}</strong></div>
              <div className="confirm-section__title mt-2">Nominee</div>
              <div className="confirm-row"><span>Name</span><strong>{form.nominee_name}</strong></div>
              <div className="confirm-row"><span>Relation</span><strong>{form.nominee_relationship}</strong></div>
            </div>
          </div>
          <Alert type="info">After submission, the Branch Manager will review and approve this registration.</Alert>
        </div>
      )}

      {/* Navigation */}
      <div className="reg-nav">
        {step > 0 && <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>}
        {step < STEPS.length - 1 && step > 0 && <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>}
        {step === STEPS.length - 1 && (
          <button className="btn btn-success btn-lg" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : '✓ Submit Registration'}
          </button>
        )}
      </div>
    </Panel>
  );
}
