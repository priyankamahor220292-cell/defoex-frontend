import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { memberService } from '../../services/memberService';
import { todayISOIST } from '../../utils/dateTime';
import './RegistrationForm.css';

const GENDERS       = ['Male', 'Female', 'Other'];
const MARITAL       = ['Single', 'Married', 'Widowed', 'Divorced'];
const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Other'];
const PAY_MODES     = ['Cash', 'UPI', 'NEFT', 'Cheque', 'DD'];
const STATES        = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

const STEPS = [
  { num: 1, label: 'Adviser Verify' },
  { num: 2, label: 'Personal Info' },
  { num: 3, label: 'Address & KYC' },
  { num: 4, label: 'Nominee & Bank' },
  { num: 5, label: 'Confirm' },
];

const INVESTOR_FEE = 10;
const todayISO = todayISOIST;

const REQUIRED_NOTE = 'Required fields (*): Father / Spouse Name, Date of Birth, Email, Address, City, State, Pincode, Nominee Name, Relationship, and Nominee Age.';

const INIT = {
  promoter_adviser_id: '', promoter_name: '', promoter_rank: '',
  member_type: 'Investor', member_fees: String(INVESTOR_FEE), payment_mode: 'Cash',
  date_of_joining: todayISO(),
  salutation: '', full_name: '', father_spouse_name: '',
  date_of_birth: '', gender: 'Male', marital_status: 'Single',
  mobile: '', email: '',
  corr_address: '', corr_city: '', corr_state: '', corr_pincode: '',
  same_as_corr: false,
  perm_address: '', perm_city: '', perm_state: '', perm_pincode: '',
  aadhar_number: '', pan_number: '', voter_id: '', driving_license: '',
  nominee_name: '', nominee_age: '', nominee_relationship: '',
  bank_name: '', account_number: '', ifsc_code: '', upi_id: '',
  occupation: '', annual_income: '',
};

function F({ label, req, err, hint, children }) {
  return (
    <div className="rf-field">
      <label className="rf-label">{label}{req && <span className="rf-req"> *</span>}</label>
      {children}
      {err && <span className="rf-error">{err}</span>}
      {hint && !err && <span className="rf-hint">{hint}</span>}
    </div>
  );
}

const I = ({ value, onChange, placeholder, type = 'text', maxLength, disabled, readOnly }) => (
  <input
    className="rf-input"
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    maxLength={maxLength}
    disabled={disabled}
    readOnly={readOnly}
  />
);

const S = ({ value, onChange, opts, ph, disabled }) => (
  <select className="rf-input rf-sel" value={value} onChange={onChange} disabled={disabled}>
    {ph && <option value="">{ph}</option>}
    {opts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const StateSelect = ({ value, onChange }) => (
  <select className="rf-input rf-sel" value={value} onChange={onChange}>
    <option value="">-- Select State --</option>
    {STATES.map(st => <option key={st} value={st}>{st}</option>)}
  </select>
);

function RequiredAlert() {
  return <div className="rf-alert">{REQUIRED_NOTE}</div>;
}

function Step1({ form, set, errors, advisers }) {
  const [busy, setBusy] = useState(false);
  const verified = !!form.promoter_name;

  const verify = async () => {
    let id = form.promoter_adviser_id.trim();
    if (!id) { toast.error('Enter Adviser ID'); return; }
    if (id.toUpperCase().includes('DFX-IRN') || id.toUpperCase().includes('MISINV')) {
      toast.error('That is an IRN, not an Adviser Code');
      return;
    }
    const upper = id.toUpperCase();
    if (upper.startsWith('DEFIN') && upper.length > 5) {
      id = 'DEFAD' + upper.slice(5);
      set(p => ({ ...p, promoter_adviser_id: id }));
    }
    setBusy(true);
    try {
      const r = await memberService.checkAdviser(id);
      if (r.data.success) {
        const a = r.data.data;
        set(p => ({
          ...p,
          promoter_name: a.full_name || a.name || '',
          promoter_rank: a.rank_name || a.rank || '',
          promoter_adviser_id: a.adviser_code || id,
        }));
        toast.success(`Adviser verified: ${a.full_name || a.name}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Adviser not found');
      set(p => ({ ...p, promoter_name: '', promoter_rank: '' }));
    } finally {
      setBusy(false);
    }
  };

  const selectCode = (code) => {
    set(p => ({ ...p, promoter_adviser_id: code, promoter_name: '', promoter_rank: '' }));
  };

  return (
    <div className="rf-step">
      <RequiredAlert />
      <div className="rf-fee-note">
        <strong>Note:</strong> Investor registration fee is ₹{INVESTOR_FEE} — deducted from branch limit when the registration is approved, not at submit time.
      </div>

      <h3 className="rf-step-h">Enter Adviser ID</h3>
      <p className="rf-step-desc">Every investor must be registered under an active Adviser ID.</p>

      {advisers.length > 0 && (
        <div className="rf-adviser-pills-wrap">
          <div className="rf-adviser-pills-label">Available Adviser Codes — click to select:</div>
          <div className="rf-adviser-pills">
            {advisers.map(a => (
              <button
                key={a.adviser_code}
                type="button"
                className={`rf-adviser-pill ${form.promoter_adviser_id === a.adviser_code ? 'active' : ''}`}
                onClick={() => selectCode(a.adviser_code)}
              >
                {a.adviser_code} — {a.full_name} ({a.rank_name})
              </button>
            ))}
          </div>
        </div>
      )}

      <F label="Adviser ID" req err={errors.promoter_adviser_id}>
        <div className="rf-row-btn">
          <I
            value={form.promoter_adviser_id}
            onChange={e => set(p => ({ ...p, promoter_adviser_id: e.target.value.trim(), promoter_name: '', promoter_rank: '' }))}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="e.g. DEFAD202606 or DFX-2026-000006"
          />
          <button type="button" className="rf-btn-verify" onClick={verify} disabled={busy}>
            {busy ? 'Verifying…' : 'Verify →'}
          </button>
        </div>
      </F>

      {verified && (
        <div className="rf-verified">
          <div className="rf-vtick">✓</div>
          <div>
            <div className="rf-vname">Adviser Verified</div>
            <div className="rf-vrank">
              {form.promoter_adviser_id} — {form.promoter_name} ({form.promoter_rank})
            </div>
          </div>
        </div>
      )}

      <div className="rf-g4">
        <F label="Member Type">
          <I value="Investor" readOnly disabled />
        </F>
        <F label="Member Fees (₹)">
          <I type="number" value={INVESTOR_FEE} readOnly disabled />
        </F>
        <F label="Payment Mode">
          <S value={form.payment_mode} onChange={e => set(p => ({ ...p, payment_mode: e.target.value }))} opts={PAY_MODES} />
        </F>
        <F label="Date of Registration">
          <I type="date" value={form.date_of_joining} readOnly disabled />
        </F>
      </div>
    </div>
  );
}

function Step2({ form, set, errors }) {
  return (
    <div className="rf-step">
      <RequiredAlert />
      <div className="rf-g2">
        <F label="Salutation">
          <S value={form.salutation} onChange={e => set(p => ({ ...p, salutation: e.target.value }))} opts={['Mr.', 'Mrs.', 'Ms.', 'Dr.']} ph="—" />
        </F>
        <F label="Full Name" req err={errors.full_name}>
          <I value={form.full_name} onChange={e => set(p => ({ ...p, full_name: e.target.value }))} placeholder="As per Aadhar" />
        </F>
      </div>
      <F label="Father / Spouse Name" req err={errors.father_spouse_name}>
        <I value={form.father_spouse_name} onChange={e => set(p => ({ ...p, father_spouse_name: e.target.value }))} placeholder="Father's or Spouse's full name" />
      </F>
      <div className="rf-g2">
        <F label="Mobile Number" req err={errors.mobile} hint="10-digit · must be unique">
          <I value={form.mobile} onChange={e => set(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" maxLength={10} />
        </F>
        <F label="Date of Birth" req err={errors.date_of_birth}>
          <I type="date" value={form.date_of_birth} onChange={e => set(p => ({ ...p, date_of_birth: e.target.value }))} />
        </F>
      </div>
      <div className="rf-g2">
        <F label="Gender">
          <S value={form.gender} onChange={e => set(p => ({ ...p, gender: e.target.value }))} opts={GENDERS} />
        </F>
        <F label="Marital Status">
          <S value={form.marital_status} onChange={e => set(p => ({ ...p, marital_status: e.target.value }))} opts={MARITAL} />
        </F>
      </div>
      <F label="Email" req err={errors.email}>
        <I type="email" value={form.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
      </F>
    </div>
  );
}

function Step3({ form, set, errors }) {
  const toggleSame = e => {
    const c = e.target.checked;
    set(p => ({
      ...p,
      same_as_corr: c,
      ...(c ? {
        perm_address: p.corr_address,
        perm_city: p.corr_city,
        perm_state: p.corr_state,
        perm_pincode: p.corr_pincode,
      } : {}),
    }));
  };

  return (
    <div className="rf-step">
      <RequiredAlert />
      <div className="rf-section-lbl">Correspondence Address</div>
      <F label="Address" req err={errors.corr_address}>
        <textarea className="rf-textarea" rows={2} value={form.corr_address} onChange={e => set(p => ({ ...p, corr_address: e.target.value }))} placeholder="House No., Street, Area" />
      </F>
      <div className="rf-g3">
        <F label="City" req err={errors.corr_city}><I value={form.corr_city} onChange={e => set(p => ({ ...p, corr_city: e.target.value }))} placeholder="City" /></F>
        <F label="State" req err={errors.corr_state}><StateSelect value={form.corr_state} onChange={e => set(p => ({ ...p, corr_state: e.target.value }))} /></F>
        <F label="Pincode" req err={errors.corr_pincode}>
          <I value={form.corr_pincode} onChange={e => set(p => ({ ...p, corr_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6-digit" maxLength={6} />
        </F>
      </div>

      <label className="rf-checkbox">
        <input type="checkbox" checked={form.same_as_corr} onChange={toggleSame} />
        <span>Same as Correspondence Address</span>
      </label>

      <div className="rf-section-lbl">KYC Documents</div>
      <div className="rf-g2">
        <F label="Aadhar Number" req err={errors.aadhar_number}>
          <I value={form.aadhar_number} onChange={e => set(p => ({ ...p, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="12-digit" maxLength={12} />
        </F>
        <F label="PAN Number"><I value={form.pan_number} onChange={e => set(p => ({ ...p, pan_number: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} /></F>
      </div>
      <div className="rf-g2">
        <F label="Voter ID"><I value={form.voter_id} onChange={e => set(p => ({ ...p, voter_id: e.target.value }))} /></F>
        <F label="Driving License"><I value={form.driving_license} onChange={e => set(p => ({ ...p, driving_license: e.target.value }))} /></F>
      </div>
    </div>
  );
}

function Step4({ form, set, errors }) {
  return (
    <div className="rf-step">
      <RequiredAlert />
      <div className="rf-section-lbl">Nominee Details</div>
      <div className="rf-g3">
        <F label="Nominee Name" req err={errors.nominee_name}><I value={form.nominee_name} onChange={e => set(p => ({ ...p, nominee_name: e.target.value }))} placeholder="Full name" /></F>
        <F label="Relationship" req err={errors.nominee_relationship}><S value={form.nominee_relationship} onChange={e => set(p => ({ ...p, nominee_relationship: e.target.value }))} opts={RELATIONSHIPS} ph="-- Select --" /></F>
        <F label="Nominee Age" req err={errors.nominee_age}><I type="number" value={form.nominee_age} onChange={e => set(p => ({ ...p, nominee_age: e.target.value }))} placeholder="Age" /></F>
      </div>

      <div className="rf-section-lbl">Bank Details</div>
      <div className="rf-g2">
        <F label="Bank Name"><I value={form.bank_name} onChange={e => set(p => ({ ...p, bank_name: e.target.value }))} /></F>
        <F label="Account Number"><I value={form.account_number} onChange={e => set(p => ({ ...p, account_number: e.target.value.replace(/\D/g, '') }))} /></F>
      </div>
      <div className="rf-g2">
        <F label="IFSC Code"><I value={form.ifsc_code} onChange={e => set(p => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))} placeholder="e.g. SBIN0001234" maxLength={11} /></F>
        <F label="UPI ID"><I value={form.upi_id} onChange={e => set(p => ({ ...p, upi_id: e.target.value }))} placeholder="name@upi" /></F>
      </div>
      <div className="rf-g2">
        <F label="Occupation"><I value={form.occupation} onChange={e => set(p => ({ ...p, occupation: e.target.value }))} /></F>
        <F label="Annual Income"><I type="number" value={form.annual_income} onChange={e => set(p => ({ ...p, annual_income: e.target.value }))} placeholder="e.g. 500000" /></F>
      </div>
    </div>
  );
}

function Step5Confirm({ form }) {
  const maskAadhar = form.aadhar_number ? `XXXX-${form.aadhar_number.slice(-4)}` : '—';
  const left = [
    ['Adviser Code', form.promoter_adviser_id],
    ['Full Name', form.full_name],
    ['Father / Spouse', form.father_spouse_name],
    ['Email', form.email],
    ['Gender', form.gender],
    ['City', form.corr_city],
    ['Pincode', form.corr_pincode],
    ['PAN', form.pan_number || '—'],
    ['Nominee Age', form.nominee_age],
    ['Bank', form.bank_name || '—'],
    ['Payment Mode', form.payment_mode],
  ];
  const right = [
    ['Date of Birth', form.date_of_birth],
    ['Mobile', form.mobile],
    ['Address', form.corr_address],
    ['State', form.corr_state],
    ['Aadhar', maskAadhar],
    ['Nominee Name', form.nominee_name],
    ['Relationship', form.nominee_relationship],
    ['Member Fees', `₹${INVESTOR_FEE}`],
  ];

  return (
    <div className="rf-step">
      <div className="rf-alert">
        Review all details below. After submission the investor stays <strong>Pending</strong> until you approve them in the <strong>Approved Investor</strong> tab or Approvals queue.
      </div>
      <div className="rf-confirm-grid">
        <div className="rf-confirm-col">
          {left.map(([k, v]) => (
            <div key={k} className="rf-confirm-row">
              <span>{k}</span>
              <strong>{v || '—'}</strong>
            </div>
          ))}
        </div>
        <div className="rf-confirm-col">
          {right.map(([k, v]) => (
            <div key={k} className="rf-confirm-row">
              <span>{k}</span>
              <strong>{v || '—'}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const validators = {
  1: f => {
    const e = {};
    if (!f.promoter_adviser_id.trim()) e.promoter_adviser_id = 'Enter Adviser ID';
    if (!f.promoter_name) e.promoter_adviser_id = 'Please verify the Adviser ID first';
    return e;
  },
  2: f => {
    const e = {};
    if (!f.full_name.trim()) e.full_name = 'Full name is required';
    if (!f.father_spouse_name.trim()) e.father_spouse_name = 'Father / Spouse name is required';
    if (!f.date_of_birth) e.date_of_birth = 'Date of birth is required';
    if (!f.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Valid email is required';
    if (!f.mobile || f.mobile.length !== 10) e.mobile = 'Valid 10-digit mobile required';
    return e;
  },
  3: f => {
    const e = {};
    if (!f.corr_address.trim()) e.corr_address = 'Address is required';
    if (!f.corr_city.trim()) e.corr_city = 'City is required';
    if (!f.corr_state) e.corr_state = 'State is required';
    if (!f.corr_pincode || f.corr_pincode.length !== 6) e.corr_pincode = 'Valid 6-digit pincode required';
    if (!f.aadhar_number || f.aadhar_number.length !== 12) e.aadhar_number = 'Valid 12-digit Aadhar required';
    return e;
  },
  4: f => {
    const e = {};
    if (!f.nominee_name.trim()) e.nominee_name = 'Nominee name is required';
    if (f.nominee_age === '' || f.nominee_age == null) e.nominee_age = 'Nominee age is required';
    else if (Number(f.nominee_age) < 0 || Number(f.nominee_age) > 120) e.nominee_age = 'Enter a valid age (0–120)';
    if (!f.nominee_relationship) e.nominee_relationship = 'Relationship is required';
    return e;
  },
  5: () => ({}),
};

export default function RegistrationForm({ onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...INIT, date_of_joining: todayISO() });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [advisers, setAdvisers] = useState([]);

  useEffect(() => {
    api.get('/api/advisers/')
      .then(r => setAdvisers((r.data.data || []).filter(a => a.is_active && !a.is_blacklisted)))
      .catch(() => {});
  }, []);

  const next = () => {
    const e = validators[step](form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(s => Math.min(s + 1, 5));
    else toast.error('Please fix the highlighted errors');
  };

  const back = () => {
    setStep(s => Math.max(s - 1, 1));
    setErrors({});
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        adviser_code: form.promoter_adviser_id,
        member_type: 'Investor',
        date_of_joining: todayISO(),
        member_fees: INVESTOR_FEE,
        payment_mode: form.payment_mode,
        salutation: form.salutation,
        full_name: form.full_name,
        father_spouse_name: form.father_spouse_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        marital_status: form.marital_status,
        mobile: form.mobile,
        email: form.email,
        aadhar_number: form.aadhar_number,
        pan_number: form.pan_number,
        voter_id: form.voter_id,
        driving_license: form.driving_license,
        corr_address: form.corr_address,
        corr_city: form.corr_city,
        corr_state: form.corr_state,
        corr_pincode: form.corr_pincode,
        same_as_corr: form.same_as_corr,
        perm_address: form.same_as_corr ? form.corr_address : form.corr_address,
        perm_city: form.same_as_corr ? form.corr_city : form.corr_city,
        perm_state: form.same_as_corr ? form.corr_state : form.corr_state,
        perm_pincode: form.same_as_corr ? form.corr_pincode : form.corr_pincode,
        nominee_name: form.nominee_name,
        nominee_age: form.nominee_age ? Number(form.nominee_age) : null,
        nominee_relationship: form.nominee_relationship,
        bank_name: form.bank_name,
        account_number: form.account_number,
        ifsc_code: form.ifsc_code,
        upi_id: form.upi_id,
        occupation: form.occupation,
        annual_income: form.annual_income || null,
      };
      const r = await memberService.register(payload);
      if (r.data.success) {
        toast.success(`Registration submitted! Pending approval.`, { duration: 5000 });
        if (onSuccess) onSuccess(r.data.data);
        setStep(1);
        setForm({ ...INIT, date_of_joining: todayISO() });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const nextLabel = step === 1 ? 'Next → Personal Info' : 'Next →';

  return (
    <div className="rf-wrap">
      <div className="rf-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`rf-si ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}>
              <div className="rf-sc">{step > s.num ? '✓' : s.num}</div>
              <div className="rf-sl">{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`rf-sline ${step > s.num ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="rf-body">
        {step === 1 && <Step1 form={form} set={setForm} errors={errors} advisers={advisers} />}
        {step === 2 && <Step2 form={form} set={setForm} errors={errors} />}
        {step === 3 && <Step3 form={form} set={setForm} errors={errors} />}
        {step === 4 && <Step4 form={form} set={setForm} errors={errors} />}
        {step === 5 && <Step5Confirm form={form} />}
      </div>

      <div className="rf-nav">
        {step > 1
          ? <button type="button" className="rf-btn-back" onClick={back} disabled={loading}>← Back</button>
          : <button type="button" className="rf-btn-cancel" onClick={onCancel}>Cancel</button>}
        {step < 5
          ? <button type="button" className="rf-btn-next" onClick={next}>{nextLabel}</button>
          : <button type="button" className="rf-btn-submit" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : '✓ Submit Registration'}</button>}
      </div>
    </div>
  );
}
