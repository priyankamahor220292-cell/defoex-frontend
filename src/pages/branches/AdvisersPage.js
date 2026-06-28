// AdvisersPage.js — DefOex IntraTech
// Tabs: List Adviser | + New Adviser Registration | Approved Adviser
// New Registration = full 5-step form (same fields as Investor)

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import './AdvisersPage.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

// ── Constants ─────────────────────────────────────────────────────────────────
const SALUTATIONS   = ['Mr','Mrs','Ms','Dr','Prof'];
const GENDERS       = ['Male','Female','Other'];
const MARITAL       = ['Single','Married','Widowed','Divorced'];
const NATIONALITIES = ['Indian','Other'];
const RELATIONSHIPS = ['Mother','Father','Brother','Sister','Spouse','Son','Daughter','Grandfather','Grandmother','Uncle','Aunt','Friend','Other'];
const OCCUPATIONS   = ['Salaried','Self-Employed','Business','Professional','Homemaker','Student','Retired','Farmer','Other'];
const PAY_MODES     = ['Cash','UPI','NEFT','Cheque','DD'];
const RANKS         = ['1. SR','2. BR','3. ABR','4. SBR','5. RBR','6. DBR','7. CBR','8. SCBR','9. NSD','10. SSD','11. SD','12. RSD','13. DSD','14. CSD','15. PSD','16. House 1','17. House 2'];
const STATES        = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'];

const STEPS = [{num:1,label:'Promoter Verify'},{num:2,label:'Personal Info'},{num:3,label:'Address & KYC'},{num:4,label:'Nominee & Bank'},{num:5,label:'Income & Review'}];

const calcAge = dob => {
  if (!dob) return '';
  const t = new Date(), b = new Date(dob);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) a--;
  return a > 0 ? String(a) : '';
};

const blank = () => ({
  promoter_adviser_id:'', promoter_name:'', promoter_rank:'',
  registration_date: new Date().toISOString().slice(0,10),
  rank:'1. SR', member_fees:'650', payment_mode:'Cash',
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

// ── Tiny UI ───────────────────────────────────────────────────────────────────
const F = ({label,req,err,hint,children}) => (
  <div className="af-field">
    <label className="af-label">{label}{req&&<span className="af-req"> *</span>}</label>
    {children}
    {err&&<span className="af-error">{err}</span>}
    {hint&&!err&&<span className="af-hint">{hint}</span>}
  </div>
);
const Inp = ({value,onChange,placeholder,type='text',maxLength,disabled,cls=''}) => (
  <input className={`af-input ${cls}`} type={type} value={value} onChange={onChange}
    placeholder={placeholder} maxLength={maxLength} disabled={disabled}/>
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
  const verify = async () => {
    const id = form.promoter_adviser_id.trim();
    if (!id) { toast.error('Enter Promoter Adviser ID'); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/api/registration/check-adviser`,{adviser_code:id},{headers:auth()});
      if (r.data.success) {
        const a = r.data.data;
        set(p=>({...p,promoter_name:a.full_name||a.name||'',promoter_rank:a.rank_name||a.rank||''}));
        toast.success(`Verified: ${a.full_name||a.name}`);
      }
    } catch(e) {
      toast.error(e.response?.data?.message||'Adviser not found');
      set(p=>({...p,promoter_name:'',promoter_rank:''}));
    } finally { setBusy(false); }
  };

  return (
    <div className="af-step">
      <h3 className="af-step-h">Step 1 — Promoter Adviser Verification</h3>
      <div className="af-g2">
        <F label="Registration Date" req>
          <Inp type="date" value={form.registration_date} onChange={e=>set(p=>({...p,registration_date:e.target.value}))}/>
        </F>
        <F label="Select Rank" req err={errors.rank}>
          <Sel value={form.rank} onChange={e=>set(p=>({...p,rank:e.target.value}))} opts={RANKS} ph="Select Rank"/>
        </F>
      </div>
      <F label="Promoter Adviser ID" req err={errors.promoter_adviser_id}>
        <div className="af-row-btn">
          <input className="af-input" value={form.promoter_adviser_id}
            onChange={e=>set(p=>({...p,promoter_adviser_id:e.target.value,promoter_name:'',promoter_rank:''}))}
            onKeyDown={e=>e.key==='Enter'&&verify()} placeholder="e.g. DEFAD202601"/>
          <button className="af-btn-verify" onClick={verify} disabled={busy}>{busy?'Verifying…':'Verify →'}</button>
        </div>
      </F>
      {form.promoter_name && (
        <div className="af-verified">
          <div className="af-vtick">✓</div>
          <div><div className="af-vname">{form.promoter_name}</div><div className="af-vrank">{form.promoter_rank}</div></div>
        </div>
      )}
      <div className="af-g2">
        <F label="Member Fees (₹)" req>
          <Inp type="number" value={form.member_fees} onChange={e=>set(p=>({...p,member_fees:e.target.value}))} placeholder="650"/>
        </F>
        <F label="Payment Mode" req>
          <Sel value={form.payment_mode} onChange={e=>set(p=>({...p,payment_mode:e.target.value}))} opts={PAY_MODES}/>
        </F>
      </div>
      <div className="af-fee-note">
        ⚠️ Note: Adviser create fee is ₹650, which is deducted from branch panel limit (if adviser successfully created).
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
        <span>Nominee address same as Correspondence address</span>
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
          <RR l="Rank"          v={form.rank}/>
          <RR l="Fees & Mode"   v={`₹${form.member_fees} · ${form.payment_mode}`}/>
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
    if (!f.rank)                       e.rank = 'Select a rank';
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
        adviser_code:        form.promoter_adviser_id,
        member_type:         'Adviser',
        rank:                form.rank,
        registration_date:   form.registration_date,
        member_fees:         Number(form.member_fees),
        payment_mode:        form.payment_mode,
        salutation:          form.salutation,
        full_name:           form.full_name,
        father_spouse_name:  form.father_spouse_name,
        date_of_birth:       form.date_of_birth,
        age:                 form.age ? Number(form.age) : null,
        gender:              form.gender,
        marital_status:      form.marital_status,
        nationality:         form.nationality,
        mobile:              form.mobile,
        phone_office:        form.phone_office,
        email:               form.email,
        aadhar_number:       form.aadhar_number,
        pan_number:          form.pan_number,
        corr_address:        form.corr_address,
        corr_city:           form.corr_city,
        corr_state:          form.corr_state,
        corr_pincode:        form.corr_pincode,
        same_as_corr:        form.same_as_corr,
        perm_address:        form.perm_address,
        perm_city:           form.perm_city,
        perm_state:          form.perm_state,
        perm_pincode:        form.perm_pincode,
        nominee_name:        form.nominee_name,
        nominee_age:         form.nominee_age ? Number(form.nominee_age) : null,
        nominee_relationship:form.nominee_relationship,
        nominee_address:     form.nominee_address,
        nominee_city:        form.nominee_city,
        nominee_state:       form.nominee_state,
        nominee_pincode:     form.nominee_pincode,
        bank_name:           form.bank_name,
        account_number:      form.account_number,
        ifsc_code:           form.ifsc_code,
        bank_branch_name:    form.bank_branch_name,
        upi_id:              form.upi_id,
        occupation:          form.occupation,
        professional_details:form.professional_details,
        annual_income:       form.annual_income || null,
        family_income:       form.family_income || null,
      };
      const r = await axios.post(`${API}/api/registration/new`, payload, { headers: auth() });
      if (r.data.success) {
        toast.success(`Adviser registered! Pending approval.`);
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

// ── List Advisers Tab ─────────────────────────────────────────────────────────
function ListAdvisers({ onApproveTab }) {
  const [advisers, setAdvisers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/advisers/`, { headers: auth() });
      setAdvisers(r.data.data?.items || r.data.data || []);
    } catch { toast.error('Failed to load advisers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = advisers.filter(a =>
    !search ||
    (a.adviser_code||'').toLowerCase().includes(search.toLowerCase()) ||
    (a.full_name||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="af-list-top">
        <input className="af-search" placeholder="Search by Adviser ID or Name…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading ? <div className="af-state">Loading…</div> : filtered.length === 0 ? (
        <div className="af-state">No advisers found</div>
      ) : (
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th>#</th><th>Adviser ID</th><th>Name</th><th>Father Name</th>
                <th>Mobile</th><th>Rank</th><th>Date of Joining</th>
                <th>Promoter ID</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i) => (
                <tr key={a.id}>
                  <td>{i+1}</td>
                  <td className="af-mono">{a.adviser_code}</td>
                  <td>{a.full_name}</td>
                  <td>{a.father_spouse_name||'—'}</td>
                  <td>{a.mobile}</td>
                  <td>{a.rank_name||a.rank||'—'}</td>
                  <td>{a.date_of_joining||a.created_at?.slice(0,10)||'—'}</td>
                  <td className="af-mono">{a.promoter_adviser_id||a.adviser_code||'—'}</td>
                  <td>
                    <span className={`af-badge ${a.is_active?'active':'pending'}`}>
                      {a.is_active ? 'Active' : 'Pending'}
                    </span>
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
    if (!window.confirm('Reject this adviser?')) return;
    try {
      await axios.post(`${API}/api/advisers/${id}/approve`, { action:'reject' }, { headers: auth() });
      toast.success('Adviser rejected');
      load();
    } catch(e) { toast.error('Failed to reject'); }
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
                      <button className="af-btn-approve" onClick={()=>approve(a.id)}>✓ Approve</button>
                      <button className="af-btn-reject"  onClick={()=>reject(a.id)}>✗ Reject</button>
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
        {tab==='list'     && <ListAdvisers onApproveTab={()=>setTab('approved')}/>}
        {tab==='new'      && <NewAdviserForm onSuccess={()=>setTab('approved')} onCancel={()=>setTab('list')}/>}
        {tab==='approved' && <ApprovedAdvisers/>}
      </div>
    </div>
  );
}