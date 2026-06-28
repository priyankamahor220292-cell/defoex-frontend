// AdvisersPage.js — DefOex IntraTech
// Tabs: List Adviser | + New Adviser Registration | Approved Adviser
// New Registration = full 5-step form (same fields as Investor)

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AdvisersPage.css';

const API = process.env.REACT_APP_API_URL || '';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

// ── Constants ─────────────────────────────────────────────────────────────────
const SALUTATIONS   = ['Mr','Mrs','Ms','Dr','Prof'];
const GENDERS       = ['Male','Female','Other'];
const MARITAL       = ['Single','Married','Widowed','Divorced'];
const NATIONALITIES = ['Indian','Other'];
const RELATIONSHIPS = ['Mother','Father','Brother','Sister','Spouse','Son','Daughter','Grandfather','Grandmother','Uncle','Aunt','Friend','Other'];
const OCCUPATIONS   = ['Salaried','Self-Employed','Business','Professional','Homemaker','Student','Retired','Farmer','Other'];
const PAY_MODES     = ['Cash','UPI','NEFT','Cheque','DD'];
const RANK_OPTIONS = [
  { id: 1, label: '1. SR' }, { id: 2, label: '2. SO' }, { id: 3, label: '3. SD' },
  { id: 4, label: '4. SI' }, { id: 5, label: '5. DO' }, { id: 6, label: '6. RO' },
  { id: 7, label: '7. ZO' }, { id: 8, label: '8. EM' }, { id: 9, label: '9. EM I' },
  { id: 10, label: '10. EM II' }, { id: 11, label: '11. EM R' }, { id: 12, label: '12. EM C' },
  { id: 13, label: '13. House 1' }, { id: 14, label: '14. House 2' }, { id: 15, label: '15. House 3' },
  { id: 16, label: '16. House 4' }, { id: 17, label: '17. House 5' }, { id: 18, label: '18. House 6' },
  { id: 19, label: '19. House 7' }, { id: 20, label: '20. House 8' },
];
const rankLabel = id => RANK_OPTIONS.find(r => r.id === id)?.label || `${id}`;
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ADVISER_FEE = 500;

/** Promoter rank N → new adviser may pick ranks 1 .. N-1 (flowchart conditions 01–15). */
const computeMaxAllowedRank = (a) => {
  const fromApi = a.max_allowed_rank_id ?? a.allowed_rank_id;
  if (fromApi != null && Number(fromApi) >= 1) return Number(fromApi);
  const promoterRank = Number(a.rank_id ?? a.promoter_rank_id ?? 0);
  return promoterRank > 1 ? promoterRank - 1 : null;
};

const buildRankOptions = (maxRank, allowedRanks) => {
  if (Array.isArray(allowedRanks) && allowedRanks.length) {
    return allowedRanks.map(r => ({
      id: Number(r.id),
      label: r.label || rankLabel(Number(r.id)),
    }));
  }
  if (!maxRank) return [];
  return RANK_OPTIONS.filter(r => r.id >= 1 && r.id <= maxRank);
};

const blank = () => ({
  promoter_adviser_id:'', promoter_name:'', promoter_rank:'', promoter_rank_id:null,
  max_allowed_rank_id:null, rank_options:[],
  registration_date: todayISO(),
  rank_id:null, rank:'', member_fees:String(ADVISER_FEE), payment_mode:'Cash',
  salutation:'', full_name:'', father_spouse_name:'',
  date_of_birth:'', age:'', gender:'', marital_status:'',
  nationality:'Indian', mobile:'', phone_office:'', email:'',
  aadhar_number:'', pan_number:'',
  corr_address:'', corr_city:'', corr_state:'', corr_pincode:'',
  same_as_corr:false,
  perm_address:'', perm_city:'', perm_state:'', perm_pincode:'',
  nominee_name:'', nominee_age:'', nominee_relationship:'',
  nominee_same_as_member:false,
  nominee_address:'', nominee_city:'', nominee_state:'', nominee_pincode:'',
  bank_name:'', account_number:'', ifsc_code:'', bank_branch_name:'', upi_id:'',
  occupation:'', professional_details:'', annual_income:'', family_income:'',
});

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'];

const STEPS = [{num:1,label:'Promoter Verify'},{num:2,label:'Personal Info'},{num:3,label:'Address & KYC'},{num:4,label:'Nominee & Bank'},{num:5,label:'Income & Review'}];

const calcAge = dob => {
  if (!dob) return '';
  const t = new Date(), b = new Date(dob);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) a--;
  return a > 0 ? String(a) : '';
};

const statusClass = s => ({
  Active:'active', 'Not Active':'inactive', Pending:'pending', Blacklisted:'blacklisted',
}[s] || 'pending');

// ── Tiny UI ───────────────────────────────────────────────────────────────────
const F = ({label,req,err,hint,children}) => (
  <div className="af-field">
    <label className="af-label">{label}{req&&<span className="af-req"> *</span>}</label>
    {children}
    {err&&<span className="af-error">{err}</span>}
    {hint&&!err&&<span className="af-hint">{hint}</span>}
  </div>
);
const Inp = ({value,onChange,placeholder,type='text',maxLength,disabled,readOnly,cls='',...rest}) => (
  <input className={`af-input ${cls}`} type={type} value={value} onChange={onChange}
    placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly} {...rest}/>
);
const Sel = ({value,onChange,opts,ph}) => (
  <select className="af-input af-sel" value={value} onChange={onChange}>
    {ph&&<option value="">{ph}</option>}
    {opts.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);
const StateSel = ({value,onChange,disabled}) => (
  <select className="af-input af-sel" value={value} onChange={onChange} disabled={disabled}>
    <option value="">Select State</option>
    {STATES.map(s=><option key={s} value={s}>{s}</option>)}
  </select>
);

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ step }) {
  return (
    <div className="af-stepper">
      {STEPS.map((s,i) => (
        <React.Fragment key={s.num}>
          <div className={`af-si ${step===s.num?'active':''} ${step>s.num?'done':''}`}>
            <div className="af-sc">{step>s.num?'✓':s.num}</div>
            <div className="af-sl">{s.label}</div>
          </div>
          {i<STEPS.length-1 && <div className={`af-sline ${step>s.num?'done':''}`}/>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── STEP 1 ────────────────────────────────────────────────────────────────────
function Step1({form,set,errors}) {
  const [busy,setBusy] = useState(false);
  const today = todayISO();
  const rankOptions = form.rank_options?.length
    ? form.rank_options
    : buildRankOptions(form.max_allowed_rank_id);

  const verify = async () => {
    const id = form.promoter_adviser_id.trim();
    if (!id) { toast.error('Enter Promoter Adviser ID'); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/api/registration/check-adviser`,{adviser_code:id},{headers:auth()});
      if (r.data.success) {
        const a = r.data.data;
        const maxRank = computeMaxAllowedRank(a);
        const options = buildRankOptions(maxRank, a.allowed_ranks);
        if (!maxRank || !options.length) {
          toast.error(a.allowed_rank_error || 'Promoter rank too low to register a downline adviser');
          set(p=>({
            ...p,
            promoter_name:a.full_name||a.name||'',
            promoter_rank:a.rank_display||a.rank_name||a.rank||'',
            promoter_rank_id:a.rank_id||a.promoter_rank_id,
            max_allowed_rank_id:null,
            rank_options:[],
            rank_id:null,
            rank:'',
          }));
          return;
        }
        set(p=>({
          ...p,
          registration_date: today,
          promoter_name:a.full_name||a.name||'',
          promoter_rank:a.rank_display||a.rank_name||a.rank||'',
          promoter_rank_id:a.rank_id||a.promoter_rank_id,
          max_allowed_rank_id:maxRank,
          rank_options:options,
          rank_id:null,
          rank:'',
        }));
        toast.success(`Verified: ${a.full_name||a.name} — select rank 1 to ${maxRank}`);
      }
    } catch(e) {
      toast.error(e.response?.data?.message||'Adviser not found');
      set(p=>({...p,promoter_name:'',promoter_rank:'',promoter_rank_id:null,max_allowed_rank_id:null,rank_options:[],rank_id:null,rank:''}));
    } finally { setBusy(false); }
  };

  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 1 — Promoter Adviser Verification</h3>
      <F label="Promoter Adviser ID" req err={errors.promoter_adviser_id}>
        <div className="af-row-btn">
          <input className="af-input" value={form.promoter_adviser_id}
            onChange={e=>set(p=>({...p,promoter_adviser_id:e.target.value,promoter_name:'',promoter_rank:'',promoter_rank_id:null,max_allowed_rank_id:null,rank_options:[],rank_id:null,rank:''}))}
            onKeyDown={e=>e.key==='Enter'&&verify()} placeholder="Enter Promoter Adviser ID"/>
          <button className="af-btn-verify" onClick={verify} disabled={busy}>{busy?'Verifying…':'Verify →'}</button>
        </div>
      </F>
      {form.promoter_name && (
        <div className="af-verified">
          <div className="af-vtick">✓</div>
          <div>
            <div className="af-vname">{form.promoter_name}</div>
            <div className="af-vrank">
              Rank: {form.promoter_rank}
              {form.max_allowed_rank_id ? ` — assign new adviser ranks 1 to ${form.max_allowed_rank_id}` : ''}
            </div>
          </div>
        </div>
      )}
      <div className="af-g2">
        <F label="Registration Date" req hint="Fixed to today">
          <Inp type="date" value={today} disabled readOnly/>
        </F>
        <F label="New Adviser Rank" req err={errors.rank}
          hint={form.max_allowed_rank_id ? `Select rank 1 to ${form.max_allowed_rank_id}` : 'Verify promoter first'}>
          <select className="af-input af-sel" value={form.rank_id||''} disabled={!form.max_allowed_rank_id || !rankOptions.length}
            onChange={e=>{const id=parseInt(e.target.value,10);set(p=>({...p,rank_id:id,rank:rankLabel(id),registration_date:today}));}}>
            <option value="">{form.max_allowed_rank_id ? 'Select rank' : 'Verify promoter first'}</option>
            {rankOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </F>
      </div>
      <div className="af-g2">
        <F label="Adviser Fee (₹)" req hint="Fixed registration fee">
          <Inp type="number" value={ADVISER_FEE} readOnly disabled/>
        </F>
        <F label="Payment Mode" req>
          <Sel value={form.payment_mode} onChange={e=>set(p=>({...p,payment_mode:e.target.value}))} opts={PAY_MODES}/>
        </F>
      </div>
      <div className="af-fee-note">
        ⚠️ Note: Adviser create fee is ₹500, deducted from branch panel limit when adviser is successfully created.
        After creating → go to <strong>Approved Adviser</strong> tab to approve and generate login credentials.
      </div>
    </div>
  );
}

// ── STEP 2 ────────────────────────────────────────────────────────────────────
function Step2({form,set,errors}) {
  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 2 — Personal Information</h3>
      <div className="af-g2">
        <F label="Salutation"><Sel value={form.salutation} onChange={e=>set(p=>({...p,salutation:e.target.value}))} opts={SALUTATIONS} ph="Select"/></F>
        <F label="Full Name" req err={errors.full_name}><Inp value={form.full_name} onChange={e=>set(p=>({...p,full_name:e.target.value}))} placeholder="Full name as per Aadhar"/></F>
      </div>
      <F label="Father Name / Spouse Name" req err={errors.father_spouse_name}>
        <Inp value={form.father_spouse_name} onChange={e=>set(p=>({...p,father_spouse_name:e.target.value}))} placeholder="Father's or Spouse's full name"/>
      </F>
      <div className="af-g3">
        <F label="Date of Birth" req err={errors.date_of_birth}>
          <Inp type="date" value={form.date_of_birth} onChange={e=>{const d=e.target.value;set(p=>({...p,date_of_birth:d,age:calcAge(d)}));}}/>
        </F>
        <F label="Age" hint="Auto-calculated">
          <Inp value={form.age} onChange={e=>set(p=>({...p,age:e.target.value}))} placeholder="Auto" cls={form.date_of_birth?'af-auto':''}/>
        </F>
        <F label="Gender" req err={errors.gender}>
          <Sel value={form.gender} onChange={e=>set(p=>({...p,gender:e.target.value}))} opts={GENDERS} ph="Select"/>
        </F>
      </div>
      <div className="af-g3">
        <F label="Marital Status" req err={errors.marital_status}>
          <Sel value={form.marital_status} onChange={e=>set(p=>({...p,marital_status:e.target.value}))} opts={MARITAL} ph="Select"/>
        </F>
        <F label="Nationality" req>
          <Sel value={form.nationality} onChange={e=>set(p=>({...p,nationality:e.target.value}))} opts={NATIONALITIES}/>
        </F>
        <F label="Email">
          <Inp type="email" value={form.email} onChange={e=>set(p=>({...p,email:e.target.value}))} placeholder="email@example.com"/>
        </F>
      </div>
      <div className="af-g2">
        <F label="Mobile Number" req err={errors.mobile} hint="10-digit · must be unique">
          <Inp value={form.mobile} onChange={e=>set(p=>({...p,mobile:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="10-digit mobile" maxLength={10}/>
        </F>
        <F label="Phone Number">
          <Inp value={form.phone_office} onChange={e=>set(p=>({...p,phone_office:e.target.value.replace(/\D/g,'').slice(0,11)}))} placeholder="Landline / alternate"/>
        </F>
      </div>
      <F label="Aadhar Card Number" req err={errors.aadhar_number} hint="12-digit · must be unique">
        <Inp value={form.aadhar_number} onChange={e=>set(p=>({...p,aadhar_number:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="12-digit Aadhar" maxLength={12}/>
      </F>
    </div>
  );
}

// ── STEP 3 ────────────────────────────────────────────────────────────────────
function Step3({form,set,errors}) {
  const sync = (field,val) => set(p=>({...p,[`corr_${field}`]:val,...(p.same_as_corr?{[`perm_${field}`]:val}:{})}));
  const toggleSame = e => {
    const c = e.target.checked;
    set(p=>({...p,same_as_corr:c,...(c?{perm_address:p.corr_address,perm_city:p.corr_city,perm_state:p.corr_state,perm_pincode:p.corr_pincode}:{})}));
  };
  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 3 — Address & KYC Documents</h3>

      <div className="af-addr">
        <div className="af-addr-title">Correspondence Address</div>
        <F label="Address" req err={errors.corr_address}>
          <textarea className="af-textarea" rows={2} value={form.corr_address} onChange={e=>sync('address',e.target.value)} placeholder="House No., Street, Area, Locality"/>
        </F>
        <div className="af-g3">
          <F label="City" req err={errors.corr_city}><Inp value={form.corr_city} onChange={e=>sync('city',e.target.value)} placeholder="City"/></F>
          <F label="State" req err={errors.corr_state}><StateSel value={form.corr_state} onChange={e=>sync('state',e.target.value)}/></F>
          <F label="Pincode" req err={errors.corr_pincode}><Inp value={form.corr_pincode} onChange={e=>sync('pincode',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit" maxLength={6}/></F>
        </div>
      </div>

      <label className="af-checkbox">
        <input type="checkbox" checked={form.same_as_corr} onChange={toggleSame}/>
        <span>Permanent address same as Correspondence address</span>
        <span className="af-cb-note">(auto-copies all fields)</span>
      </label>

      <div className={`af-addr ${form.same_as_corr?'af-disabled':''}`}>
        <div className="af-addr-title">Permanent Address</div>
        <F label="Address" req={!form.same_as_corr} err={errors.perm_address}>
          <textarea className="af-textarea" rows={2} value={form.perm_address} onChange={e=>set(p=>({...p,perm_address:e.target.value}))} placeholder="House No., Street, Area, Locality" disabled={form.same_as_corr}/>
        </F>
        <div className="af-g3">
          <F label="City" req={!form.same_as_corr} err={errors.perm_city}><Inp value={form.perm_city} onChange={e=>set(p=>({...p,perm_city:e.target.value}))} placeholder="City" disabled={form.same_as_corr}/></F>
          <F label="State" req={!form.same_as_corr} err={errors.perm_state}><StateSel value={form.perm_state} onChange={e=>set(p=>({...p,perm_state:e.target.value}))} disabled={form.same_as_corr}/></F>
          <F label="Pincode" req={!form.same_as_corr} err={errors.perm_pincode}><Inp value={form.perm_pincode} onChange={e=>set(p=>({...p,perm_pincode:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="6-digit" maxLength={6} disabled={form.same_as_corr}/></F>
        </div>
      </div>
    </div>
  );
}

// ── STEP 4 ────────────────────────────────────────────────────────────────────
function Step4({form,set,errors}) {
  const toggleNom = e => {
    const c = e.target.checked;
    set(p=>({...p,nominee_same_as_member:c,...(c?{nominee_address:p.corr_address,nominee_city:p.corr_city,nominee_state:p.corr_state,nominee_pincode:p.corr_pincode}:{})}));
  };
  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 4 — Nominee Info & Bank Details</h3>

      <div className="af-section-lbl">Nominee Information</div>
      <div className="af-g3">
        <F label="Nominee Name" req err={errors.nominee_name}><Inp value={form.nominee_name} onChange={e=>set(p=>({...p,nominee_name:e.target.value}))} placeholder="Full name"/></F>
        <F label="Nominee Age" req err={errors.nominee_age}><Inp type="number" value={form.nominee_age} onChange={e=>set(p=>({...p,nominee_age:e.target.value}))} placeholder="Age"/></F>
        <F label="Relationship" req err={errors.nominee_relationship}><Sel value={form.nominee_relationship} onChange={e=>set(p=>({...p,nominee_relationship:e.target.value}))} opts={RELATIONSHIPS} ph="Select"/></F>
      </div>

      <label className="af-checkbox">
        <input type="checkbox" checked={form.nominee_same_as_member} onChange={toggleNom}/>
        <span>Nominee address same as guardian (correspondence) address</span>
        <span className="af-cb-note">(copies address, city, state & pincode)</span>
      </label>

      <div className={`af-addr ${form.nominee_same_as_member?'af-disabled':''}`}>
        <div className="af-addr-title">Nominee Address</div>
        <F label="Address" req={!form.nominee_same_as_member} err={errors.nominee_address}>
          <textarea className="af-textarea" rows={2} value={form.nominee_address} onChange={e=>set(p=>({...p,nominee_address:e.target.value}))} placeholder="House No., Street, Area" disabled={form.nominee_same_as_member}/>
        </F>
        <div className="af-g3">
          <F label="City" req={!form.nominee_same_as_member} err={errors.nominee_city}><Inp value={form.nominee_city} onChange={e=>set(p=>({...p,nominee_city:e.target.value}))} placeholder="City" disabled={form.nominee_same_as_member}/></F>
          <F label="State" req={!form.nominee_same_as_member} err={errors.nominee_state}><StateSel value={form.nominee_state} onChange={e=>set(p=>({...p,nominee_state:e.target.value}))} disabled={form.nominee_same_as_member}/></F>
          <F label="Pincode" req={!form.nominee_same_as_member} err={errors.nominee_pincode}><Inp value={form.nominee_pincode} onChange={e=>set(p=>({...p,nominee_pincode:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="6-digit" maxLength={6} disabled={form.nominee_same_as_member}/></F>
        </div>
      </div>

      <div className="af-section-lbl">Bank Details</div>
      <div className="af-g2">
        <F label="Bank Name"><Inp value={form.bank_name} onChange={e=>set(p=>({...p,bank_name:e.target.value}))} placeholder="e.g. State Bank of India"/></F>
        <F label="Account Number"><Inp value={form.account_number} onChange={e=>set(p=>({...p,account_number:e.target.value.replace(/\D/g,'')}))} placeholder="Account number"/></F>
      </div>
      <div className="af-g2">
        <F label="IFSC Code"><Inp value={form.ifsc_code} onChange={e=>set(p=>({...p,ifsc_code:e.target.value.toUpperCase()}))} placeholder="e.g. SBIN0001234" maxLength={11}/></F>
        <F label="Bank Branch Name"><Inp value={form.bank_branch_name} onChange={e=>set(p=>({...p,bank_branch_name:e.target.value}))} placeholder="Branch name"/></F>
      </div>
      <div className="af-g2">
        <F label="PAN Number"><Inp value={form.pan_number} onChange={e=>set(p=>({...p,pan_number:e.target.value.toUpperCase()}))} placeholder="e.g. ABCDE1234F" maxLength={10}/></F>
        <F label="UPI ID"><Inp value={form.upi_id} onChange={e=>set(p=>({...p,upi_id:e.target.value}))} placeholder="name@upi"/></F>
      </div>
    </div>
  );
}

// ── STEP 5 ────────────────────────────────────────────────────────────────────
const RR = ({l,v}) => <div className="af-rr"><span className="af-rrl">{l}</span><span className="af-rrv">{v||<em>—</em>}</span></div>;
const RS = ({title,children}) => <div className="af-rsec"><div className="af-rsec-t">{title}</div>{children}</div>;

function Step5({form,set}) {
  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 5 — Income Info & Review</h3>
      <div className="af-section-lbl">Income Information</div>
      <div className="af-g2">
        <F label="Occupation"><Sel value={form.occupation} onChange={e=>set(p=>({...p,occupation:e.target.value}))} opts={OCCUPATIONS} ph="Select Occupation"/></F>
        <F label="Professional Details"><Inp value={form.professional_details} onChange={e=>set(p=>({...p,professional_details:e.target.value}))} placeholder="Job title / Designation"/></F>
      </div>
      <div className="af-g2">
        <F label="Annual Income (₹)" hint="e.g. 500000"><Inp type="number" value={form.annual_income} onChange={e=>set(p=>({...p,annual_income:e.target.value}))} placeholder="e.g. 500000"/></F>
        <F label="Family Income (₹)" hint="e.g. 1200000"><Inp type="number" value={form.family_income} onChange={e=>set(p=>({...p,family_income:e.target.value}))} placeholder="e.g. 1200000"/></F>
      </div>

      <div className="af-section-lbl">Review Before Submission</div>
      <div className="af-rgrid">
        <RS title="Registration">
          <RR l="Promoter ID"   v={form.promoter_adviser_id}/>
          <RR l="Promoter Name" v={form.promoter_name}/>
          <RR l="Rank"          v={form.rank||rankLabel(form.rank_id)}/>
          <RR l="Fees & Mode"   v={`₹${ADVISER_FEE} · ${form.payment_mode}`}/>
        </RS>
        <RS title="Personal">
          <RR l="Name"          v={`${form.salutation} ${form.full_name}`.trim()}/>
          <RR l="Father/Spouse" v={form.father_spouse_name}/>
          <RR l="DOB / Age"     v={form.date_of_birth?`${form.date_of_birth} (${form.age} yrs)`:''}/>
          <RR l="Gender"        v={form.gender}/>
          <RR l="Marital"       v={form.marital_status}/>
          <RR l="Mobile"        v={form.mobile}/>
          <RR l="Aadhar"        v={form.aadhar_number}/>
        </RS>
        <RS title="Correspondence Address">
          <RR l="Address" v={form.corr_address}/><RR l="City" v={form.corr_city}/><RR l="State" v={form.corr_state}/><RR l="Pincode" v={form.corr_pincode}/>
        </RS>
        <RS title="Permanent Address">
          <RR l="Address" v={form.same_as_corr?'(Same as Correspondence)':form.perm_address}/><RR l="City" v={form.perm_city}/><RR l="State" v={form.perm_state}/><RR l="Pincode" v={form.perm_pincode}/>
        </RS>
        <RS title="Nominee">
          <RR l="Name" v={form.nominee_name}/><RR l="Age" v={form.nominee_age}/><RR l="Relationship" v={form.nominee_relationship}/><RR l="City" v={form.nominee_city}/>
        </RS>
        <RS title="Bank & PAN">
          <RR l="Bank" v={form.bank_name}/><RR l="Account" v={form.account_number}/><RR l="IFSC" v={form.ifsc_code}/><RR l="PAN" v={form.pan_number}/><RR l="UPI" v={form.upi_id}/>
        </RS>
        <RS title="Income">
          <RR l="Occupation" v={form.occupation}/>
          <RR l="Annual Income" v={form.annual_income?`₹${Number(form.annual_income).toLocaleString('en-IN')}`:''}/>
          <RR l="Family Income" v={form.family_income?`₹${Number(form.family_income).toLocaleString('en-IN')}`:''}/>
        </RS>
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
const validators = {
  1: f => {
    const e = {};
    if (!f.promoter_adviser_id.trim()) e.promoter_adviser_id = 'Enter Promoter ID';
    if (!f.promoter_name)              e.promoter_adviser_id = 'Please verify the Promoter ID first';
    if (!f.rank_id)                    e.rank = 'Select new adviser rank';
    else if (f.max_allowed_rank_id && (f.rank_id < 1 || f.rank_id > f.max_allowed_rank_id)) {
      e.rank = `Rank must be between 1 and ${f.max_allowed_rank_id}`;
    }
    return e;
  },
  2: f => {
    const e = {};
    if (!f.full_name.trim())           e.full_name           = 'Full name is required';
    if (!f.father_spouse_name.trim())  e.father_spouse_name  = 'Father / Spouse name is required';
    if (!f.date_of_birth)              e.date_of_birth       = 'Date of birth is required';
    if (!f.gender)                     e.gender              = 'Gender is required';
    if (!f.marital_status)             e.marital_status      = 'Marital status is required';
    if (!f.mobile||f.mobile.length!==10) e.mobile            = 'Valid 10-digit mobile required';
    if (!f.aadhar_number||f.aadhar_number.length!==12) e.aadhar_number = 'Valid 12-digit Aadhar required';
    return e;
  },
  3: f => {
    const e = {};
    if (!f.corr_address.trim()) e.corr_address = 'Address is required';
    if (!f.corr_city.trim())    e.corr_city    = 'City is required';
    if (!f.corr_state)          e.corr_state   = 'State is required';
    if (!f.corr_pincode||f.corr_pincode.length!==6) e.corr_pincode = 'Valid 6-digit pincode required';
    if (!f.same_as_corr) {
      if (!f.perm_address.trim()) e.perm_address = 'Address is required';
      if (!f.perm_city.trim())    e.perm_city    = 'City is required';
      if (!f.perm_state)          e.perm_state   = 'State is required';
      if (!f.perm_pincode||f.perm_pincode.length!==6) e.perm_pincode = 'Valid 6-digit pincode required';
    }
    return e;
  },
  4: f => {
    const e = {};
    if (!f.nominee_name.trim())    e.nominee_name         = 'Nominee name is required';
    if (!f.nominee_age)            e.nominee_age          = 'Age is required';
    if (!f.nominee_relationship)   e.nominee_relationship = 'Relationship is required';
    if (!f.nominee_same_as_member) {
      if (!f.nominee_address.trim()) e.nominee_address = 'Address is required';
      if (!f.nominee_city.trim())    e.nominee_city    = 'City is required';
      if (!f.nominee_state)          e.nominee_state   = 'State is required';
      if (!f.nominee_pincode||f.nominee_pincode.length!==6) e.nominee_pincode = 'Valid pincode required';
    }
    return e;
  },
  5: () => ({}),
};

// ── New Adviser Registration Form ─────────────────────────────────────────────
function NewAdviserForm({ onSuccess, onCancel }) {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState(blank());
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const next = () => {
    const e = validators[step](form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(s => Math.min(s+1, 5));
    else toast.error('Please fix the highlighted errors');
  };
  const back = () => { setStep(s => Math.max(s-1, 1)); setErrors({}); };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        registration_date: todayISO(),
        member_fees: ADVISER_FEE,
        rank_id: form.rank_id,
        parent_adviser_code: form.promoter_adviser_id,
        father_name: form.father_spouse_name,
        date_of_joining: todayISO(),
        ...(form.same_as_corr ? {
          perm_address: form.corr_address,
          perm_city: form.corr_city,
          perm_state: form.corr_state,
          perm_pincode: form.corr_pincode,
        } : {}),
        ...(form.nominee_same_as_member ? {
          nominee_address: form.corr_address,
          nominee_city: form.corr_city,
          nominee_state: form.corr_state,
          nominee_pincode: form.corr_pincode,
        } : {}),
      };
      const r = await axios.post(`${API}/api/advisers/`, payload, { headers: auth() });
      if (r.data.success) {
        const code = r.data.data?.adviser_code;
        toast.success(code
          ? `Adviser registered (${code})! Go to Approved Adviser tab to approve.`
          : 'Adviser registered! Pending approval.');
        setStep(1); setForm(blank());
        if (onSuccess) onSuccess();
      }
    } catch(e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="af-form-wrap">
      <Stepper step={step}/>
      <div className="af-body">
        {step===1 && <Step1 form={form} set={setForm} errors={errors}/>}
        {step===2 && <Step2 form={form} set={setForm} errors={errors}/>}
        {step===3 && <Step3 form={form} set={setForm} errors={errors}/>}
        {step===4 && <Step4 form={form} set={setForm} errors={errors}/>}
        {step===5 && <Step5 form={form} set={setForm} errors={errors}/>}
      </div>
      <div className="af-nav">
        <div>
          {step > 1
            ? <button className="af-btn-back" onClick={back} disabled={loading}>← Back</button>
            : <button className="af-btn-cancel" onClick={onCancel}>Cancel</button>
          }
        </div>
        <div>
          {step < 5
            ? <button className="af-btn-next" onClick={next}>Next →</button>
            : <button className="af-btn-submit" onClick={submit} disabled={loading}>
                {loading ? 'Submitting…' : '✓ Create Adviser'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Adviser Detail Modal ───────────────────────────────────────────────────────
function AdviserDetailModal({ adviserId, onClose, isAdmin, onBlacklist }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adviserId) return;
    setLoading(true);
    axios.get(`${API}/api/advisers/detail/${adviserId}`, { headers: auth() })
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Could not load adviser details'))
      .finally(() => setLoading(false));
  }, [adviserId]);

  if (!adviserId) return null;
  const reg = data?.registration || {};

  return (
    <div className="af-modal-overlay" onClick={onClose}>
      <div className="af-modal af-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="af-modal-title">Adviser Details — {data?.adviser_code || '…'}</div>
        {loading ? <div className="af-state">Loading…</div> : !data ? <div className="af-state">Not found</div> : (
          <>
            <div className="af-detail-grid">
              <RS title="Basic">
                <RR l="Adviser ID" v={data.adviser_code}/>
                <RR l="Name" v={data.full_name}/>
                <RR l="Father/Spouse" v={data.father_spouse_name}/>
                <RR l="Rank" v={data.rank_display || `${data.rank_id}. ${data.rank_name}`}/>
                <RR l="Mobile" v={data.mobile}/>
                <RR l="Status" v={data.status}/>
                <RR l="Date of Joining" v={data.date_of_joining?.slice?.(0,10) || data.date_of_joining}/>
                <RR l="Promoter" v={`${data.promoter_adviser_name||'—'} (${data.promoter_adviser_id||'—'})`}/>
              </RS>
              <RS title="Personal (Registration)">
                <RR l="DOB / Age" v={reg.date_of_birth ? `${reg.date_of_birth} (${reg.age} yrs)` : '—'}/>
                <RR l="Gender" v={reg.gender}/>
                <RR l="Marital Status" v={reg.marital_status}/>
                <RR l="Aadhar" v={reg.aadhar_number}/>
                <RR l="PAN" v={reg.pan_number}/>
              </RS>
              <RS title="Address">
                <RR l="Correspondence" v={[reg.corr_address, reg.corr_city, reg.corr_state, reg.corr_pincode].filter(Boolean).join(', ')}/>
                <RR l="Permanent" v={reg.same_as_corr ? '(Same as correspondence)' : [reg.perm_address, reg.perm_city, reg.perm_state, reg.perm_pincode].filter(Boolean).join(', ')}/>
              </RS>
              <RS title="Nominee">
                <RR l="Name" v={reg.nominee_name}/>
                <RR l="Age / Relation" v={[reg.nominee_age, reg.nominee_relationship].filter(Boolean).join(' · ')}/>
              </RS>
              <RS title="Bank">
                <RR l="Bank" v={reg.bank_name}/>
                <RR l="Account / IFSC" v={[reg.account_number, reg.ifsc_code].filter(Boolean).join(' · ')}/>
                <RR l="UPI" v={reg.upi_id}/>
              </RS>
              <RS title="Income">
                <RR l="Occupation" v={reg.occupation}/>
                <RR l="Annual / Family" v={[reg.annual_income, reg.family_income].filter(Boolean).map(n=>`₹${Number(n).toLocaleString('en-IN')}`).join(' / ')}/>
              </RS>
            </div>

            <div className="af-section-lbl">Investors under this Adviser ({data.investors?.length || 0})</div>
            {(data.investors?.length > 0) ? (
              <div className="af-table-wrap">
                <table className="af-table af-table-sm">
                  <thead><tr><th>#</th><th>Investor ID</th><th>Name</th><th>Mobile</th></tr></thead>
                  <tbody>
                    {data.investors.map((m,i) => (
                      <tr key={m.investor_id}>
                        <td>{i+1}</td>
                        <td className="af-mono">{m.investor_id}</td>
                        <td>{m.full_name}</td>
                        <td>{m.mobile}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="af-state af-state-sm">No investors yet — status: Not Active</div>
            )}

            <div className="af-modal-actions">
              {isAdmin && !data.is_blacklisted && data.is_active && (
                <button className="af-btn-reject" onClick={() => onBlacklist(data.id)}>Blacklist</button>
              )}
              <button className="af-btn-submit" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── List Advisers Tab ─────────────────────────────────────────────────────────
function ListAdvisers({ isAdmin }) {
  const [advisers, setAdvisers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/advisers/?include_blacklisted=1`, { headers: auth() });
      setAdvisers(r.data.data?.items || r.data.data || []);
    } catch { toast.error('Failed to load advisers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const blacklist = async (id) => {
    if (!window.confirm('Blacklist this adviser? They will not be able to create investors.')) return;
    try {
      await axios.post(`${API}/api/advisers/${id}/blacklist`, {}, { headers: auth() });
      toast.success('Adviser blacklisted');
      setDetailId(null);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const filtered = advisers.filter(a =>
    !search ||
    (a.adviser_code||'').toLowerCase().includes(search.toLowerCase()) ||
    (a.full_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (a.mobile||'').includes(search)
  );

  return (
    <div>
      <div className="af-list-top">
        <input className="af-search" placeholder="Search by Adviser ID, Name or Mobile…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading ? <div className="af-state">Loading…</div> : filtered.length === 0 ? (
        <div className="af-state">No advisers found</div>
      ) : (
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th>Sr.</th><th>Adviser ID</th><th>Rank</th><th>Name</th><th>Father Name</th>
                <th>Mobile</th><th>Date of Joining</th><th>Promoter Name</th><th>Promoter ID</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i) => (
                <tr key={a.id}>
                  <td>{i+1}</td>
                  <td className="af-mono">{a.adviser_code}</td>
                  <td>{a.rank_display || a.rank_name || '—'}</td>
                  <td>{a.full_name}</td>
                  <td>{a.father_spouse_name||a.father_name||'—'}</td>
                  <td>{a.mobile}</td>
                  <td>{a.date_of_joining||a.created_at?.slice(0,10)||'—'}</td>
                  <td>{a.promoter_adviser_name||a.parent_adviser_name||'—'}</td>
                  <td className="af-mono">{a.promoter_adviser_id||a.parent_adviser_code||'—'}</td>
                  <td>
                    <span className={`af-badge ${statusClass(a.status)}`}>{a.status || (a.is_active ? 'Active' : 'Pending')}</span>
                  </td>
                  <td>
                    <button className="af-btn-link" onClick={()=>setDetailId(a.id)}>More Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdviserDetailModal adviserId={detailId} onClose={()=>setDetailId(null)} isAdmin={isAdmin} onBlacklist={blacklist}/>
    </div>
  );
}

// ── Approved Adviser Tab ──────────────────────────────────────────────────────
function ApprovedAdvisers() {
  const [advisers, setAdvisers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creds,    setCreds]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/advisers/?pending=true`, { headers: auth() });
      setAdvisers(r.data.data?.items || r.data.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      const r = await axios.post(`${API}/api/advisers/${id}/approve`, { action:'approve' }, { headers: auth() });
      if (r.data.success) {
        const c = r.data.data?.credentials;
        if (c) setCreds(c);
        toast.success('Adviser approved! Credentials generated.');
        load();
      }
    } catch(e) { toast.error(e.response?.data?.message||'Approval failed'); }
  };

  const reject = async (id) => {
    if (!window.confirm('Delete this pending adviser registration?')) return;
    try {
      await axios.post(`${API}/api/advisers/${id}/approve`, { action:'delete' }, { headers: auth() });
      toast.success('Adviser registration deleted');
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  const pending = advisers.filter(a => !a.is_active && !a.is_blacklisted);

  return (
    <div>
      {/* Credentials modal */}
      {creds && (
        <div className="af-modal-overlay" onClick={()=>setCreds(null)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()}>
            <div className="af-modal-title">🎉 Adviser Created Successfully!</div>
            <div className="af-cred-row"><span>Username</span><strong>{creds.username}</strong></div>
            <div className="af-cred-row"><span>Password</span><strong className="af-mono">{creds.password}</strong></div>
            <p className="af-cred-note">Share these credentials with the adviser. Password cannot be recovered.</p>
            <button className="af-btn-submit" style={{width:'100%'}} onClick={()=>setCreds(null)}>Close</button>
          </div>
        </div>
      )}

      {loading ? <div className="af-state">Loading…</div> : pending.length === 0 ? (
        <div className="af-state">No pending advisers for approval</div>
      ) : (
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Mobile</th><th>Rank</th>
                <th>Promoter ID</th><th>Registered</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a,i) => (
                <tr key={a.id}>
                  <td>{i+1}</td>
                  <td>{a.full_name}</td>
                  <td>{a.mobile}</td>
                  <td>{a.rank_name||a.rank||'—'}</td>
                  <td className="af-mono">{a.promoter_adviser_id||'—'}</td>
                  <td>{a.created_at?.slice(0,10)||'—'}</td>
                  <td>
                    <div className="af-action-pair">
                      <button className="af-btn-approve" onClick={()=>approve(a.id)}>✓ Approve Adviser</button>
                      <button className="af-btn-reject"  onClick={()=>reject(a.id)}>✗ Delete Adviser</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdvisersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const [tab,     setTab]     = useState('list');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    // Count pending advisers for badge
    axios.get(`${API}/api/advisers/?pending=true`, { headers: auth() })
      .then(r => {
        const all = r.data.data?.items || r.data.data || [];
        setPending(all.filter(a => !a.is_active && !a.is_blacklisted).length);
      }).catch(() => {});
  }, [tab]);

  return (
    <div className="af-page">
      {/* Tab bar */}
      <div className="af-tabs">
        <button className={`af-tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>
          List Adviser
        </button>
        <button className={`af-tab ${tab==='new'?'active':''}`} onClick={()=>setTab('new')}>
          + New Adviser Registration
        </button>
        <button className={`af-tab ${tab==='approved'?'active':''}`} onClick={()=>setTab('approved')}>
          Approved Adviser
          {pending > 0 && <span className="af-badge-count">{pending}</span>}
        </button>
      </div>

      {/* Tab heading */}
      <div className="af-tab-heading">
        {tab==='list'     && 'List Adviser'}
        {tab==='new'      && 'New Adviser Registration'}
        {tab==='approved' && 'Approved Adviser'}
      </div>

      {/* Content */}
      <div className="af-content">
        {tab==='list'     && <ListAdvisers isAdmin={isAdmin}/>}
        {tab==='new'      && <NewAdviserForm onSuccess={()=>setTab('approved')} onCancel={()=>setTab('list')}/>}
        {tab==='approved' && <ApprovedAdvisers/>}
      </div>
    </div>
  );
}