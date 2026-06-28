// RegistrationForm.js — DefOex IntraTech
// Aligned to ACTUAL models/member.py column names:
//   corr_address (Text), perm_address (Text), same_as_corr (bool)
//   nominee_address (Text), nominee_same_as_member (bool)
//   adviser_code, member_fees, payment_mode, date_of_joining
//   annual_income / family_income → numeric values

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { memberService } from '../../services/memberService';
import InvestorCredentialsModal, { showInvestorCredentialToasts } from '../../components/InvestorCredentialsModal/InvestorCredentialsModal';
import './RegistrationForm.css';

const SALUTATIONS  = ['Mr','Mrs','Ms','Dr','Prof'];
const GENDERS      = ['Male','Female','Other'];
const MARITAL      = ['Single','Married','Widowed','Divorced'];
const NATIONALITIES= ['Indian','Other'];
const RELATIONSHIPS= ['Mother','Father','Brother','Sister','Spouse','Son','Daughter','Grandfather','Grandmother','Uncle','Aunt','Friend','Other'];
const OCCUPATIONS  = ['Salaried','Self-Employed','Business','Professional','Homemaker','Student','Retired','Farmer','Other'];
const PAY_MODES    = ['Cash','UPI','NEFT','Cheque','DD'];
const STATES       = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'];

const STEPS = [{num:1,label:'Adviser Verify'},{num:2,label:'Personal Info'},{num:3,label:'Address & KYC'},{num:4,label:'Nominee & Bank'},{num:5,label:'Income & Review'}];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const INVESTOR_FEE = 10;

const calcAge = (dob) => {
  if (!dob) return '';
  const t = new Date(), b = new Date(dob);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) a--;
  return a > 0 ? String(a) : '';
};

const INIT = {
  promoter_adviser_id:'', promoter_name:'', promoter_rank:'',
  member_type:'Investor', registration_date: todayISO(),
  member_fees:String(INVESTOR_FEE), payment_mode:'Cash',
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
};

function F({label,req,err,hint,children}){
  return(
    <div className="rf-field">
      <label className="rf-label">{label}{req&&<span className="rf-req"> *</span>}</label>
      {children}
      {err&&<span className="rf-error">{err}</span>}
      {hint&&!err&&<span className="rf-hint">{hint}</span>}
    </div>
  );
}
const I=({value,onChange,placeholder,type='text',maxLength,disabled,cls=''})=>(
  <input className={`rf-input ${cls}`} type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} disabled={disabled}/>
);
const S=({value,onChange,opts,ph})=>(
  <select className="rf-input rf-sel" value={value} onChange={onChange}>
    {ph&&<option value="">{ph}</option>}
    {opts.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);
const StateSelect=({value,onChange,disabled})=>(
  <select className="rf-input rf-sel" value={value} onChange={onChange} disabled={disabled}>
    <option value="">Select State</option>
    {STATES.map(st=><option key={st} value={st}>{st}</option>)}
  </select>
);

function AddrFields({prefix,form,set,errors,disabled}){
  const v=k=>form[`${prefix}_${k}`]||'';
  const sc=k=>e=>set(p=>({...p,[`${prefix}_${k}`]:e.target.value}));
  return(
    <>
      <F label="Address" req={!disabled} err={errors[`${prefix}_address`]}>
        <textarea className="rf-textarea" rows={2} value={v('address')} onChange={sc('address')} placeholder="House No., Street, Area, Locality" disabled={disabled}/>
      </F>
      <div className="rf-g3">
        <F label="City" req={!disabled} err={errors[`${prefix}_city`]}>
          <I value={v('city')} onChange={sc('city')} placeholder="City" disabled={disabled}/>
        </F>
        <F label="State" req={!disabled} err={errors[`${prefix}_state`]}>
          <StateSelect value={v('state')} onChange={sc('state')} disabled={disabled}/>
        </F>
        <F label="Pincode" req={!disabled} err={errors[`${prefix}_pincode`]}>
          <I value={v('pincode')} onChange={e=>set(p=>({...p,[`${prefix}_pincode`]:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="6-digit" maxLength={6} disabled={disabled}/>
        </F>
      </div>
    </>
  );
}

function Step1({form,set,errors}){
  const [busy,setBusy]=useState(false);
  const today = todayISO();
  const verify=async()=>{
    const id=form.promoter_adviser_id.trim();
    if(!id){toast.error('Enter Promoter / Adviser ID');return;}
    setBusy(true);
    try{
      const r=await memberService.checkAdviser(id);
      if(r.data.success){
        const a=r.data.data;
        set(p=>({...p,promoter_name:a.full_name||a.name||'',promoter_rank:a.rank_name||a.rank||'',promoter_adviser_id:a.adviser_code||id}));
        toast.success(`Verified: ${a.full_name||a.name}`);
      }
    }catch(e){toast.error(e.response?.data?.message||'Adviser not found');set(p=>({...p,promoter_name:'',promoter_rank:''}));}
    finally{setBusy(false);}
  };
  return(
    <div className="rf-step">
      <h3 className="rf-step-h">Step 1 — Adviser / Promoter Verification</h3>
      <div className="rf-g2">
        <F label="Member Type" req hint="Investor registration only">
          <I value="Investor" readOnly disabled/>
        </F>
        <F label="Registration Date" req hint="Fixed to today">
          <I type="date" value={today} readOnly disabled/>
        </F>
      </div>
      <F label="Promoter Adviser ID" req err={errors.promoter_adviser_id}>
        <div className="rf-row-btn">
          <input className="rf-input" value={form.promoter_adviser_id} onChange={e=>set(p=>({...p,promoter_adviser_id:e.target.value,promoter_name:'',promoter_rank:''}))} onKeyDown={e=>e.key==='Enter'&&verify()} placeholder="Enter Promoter / Adviser ID"/>
          <button className="rf-btn-verify" onClick={verify} disabled={busy}>{busy?'Verifying…':'Verify'}</button>
        </div>
      </F>
      {form.promoter_name&&(
        <div className="rf-verified">
          <div className="rf-vtick">✓</div>
          <div><div className="rf-vname">{form.promoter_name}</div><div className="rf-vrank">Rank: {form.promoter_rank}</div></div>
        </div>
      )}
      <div className="rf-g2">
        <F label="Member Fees (₹)" req hint="Fixed registration fee">
          <I type="number" value={INVESTOR_FEE} readOnly disabled/>
        </F>
        <F label="Payment Mode" req><S value={form.payment_mode} onChange={e=>set(p=>({...p,payment_mode:e.target.value}))} opts={PAY_MODES}/></F>
      </div>
    </div>
  );
}

function Step2({form,set,errors}){
  return(
    <div className="rf-step">
      <h3 className="rf-step-h">Step 2 — Personal Information</h3>
      <div className="rf-g2">
        <F label="Salutation"><S value={form.salutation} onChange={e=>set(p=>({...p,salutation:e.target.value}))} opts={SALUTATIONS} ph="Select"/></F>
        <F label="Full Name" req err={errors.full_name}><I value={form.full_name} onChange={e=>set(p=>({...p,full_name:e.target.value}))} placeholder="Full name as per Aadhar"/></F>
      </div>
      <F label="Father Name / Spouse Name" req err={errors.father_spouse_name}><I value={form.father_spouse_name} onChange={e=>set(p=>({...p,father_spouse_name:e.target.value}))} placeholder="Father's or Spouse's full name"/></F>
      <div className="rf-g3">
        <F label="Date of Birth" req err={errors.date_of_birth}>
          <I type="date" value={form.date_of_birth} onChange={e=>{const d=e.target.value;set(p=>({...p,date_of_birth:d,age:calcAge(d)}));}}/>
        </F>
        <F label="Age" hint="Auto-calculated">
          <I value={form.age} onChange={e=>set(p=>({...p,age:e.target.value}))} placeholder="Auto" cls={form.date_of_birth?'rf-auto':''}/>
        </F>
        <F label="Gender" req err={errors.gender}><S value={form.gender} onChange={e=>set(p=>({...p,gender:e.target.value}))} opts={GENDERS} ph="Select"/></F>
      </div>
      <div className="rf-g3">
        <F label="Marital Status" req err={errors.marital_status}><S value={form.marital_status} onChange={e=>set(p=>({...p,marital_status:e.target.value}))} opts={MARITAL} ph="Select"/></F>
        <F label="Nationality" req><S value={form.nationality} onChange={e=>set(p=>({...p,nationality:e.target.value}))} opts={NATIONALITIES}/></F>
        <F label="Email"><I type="email" value={form.email} onChange={e=>set(p=>({...p,email:e.target.value}))} placeholder="email@example.com"/></F>
      </div>
      <div className="rf-g2">
        <F label="Mobile Number" req err={errors.mobile} hint="10-digit · unique">
          <I value={form.mobile} onChange={e=>set(p=>({...p,mobile:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="10-digit mobile" maxLength={10}/>
        </F>
        <F label="Phone Number">
          <I value={form.phone_office} onChange={e=>set(p=>({...p,phone_office:e.target.value.replace(/\D/g,'').slice(0,11)}))} placeholder="Landline / alternate"/>
        </F>
      </div>
      <F label="Aadhar Card Number" req err={errors.aadhar_number} hint="12-digit · unique">
        <I value={form.aadhar_number} onChange={e=>set(p=>({...p,aadhar_number:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="12-digit Aadhar" maxLength={12}/>
      </F>
    </div>
  );
}

function Step3({form,set,errors}){
  const sync=(field,val)=>set(p=>({...p,[`corr_${field}`]:val,...(p.same_as_corr?{[`perm_${field}`]:val}:{})}));
  const toggleSame=e=>{
    const c=e.target.checked;
    set(p=>({...p,same_as_corr:c,...(c?{perm_address:p.corr_address,perm_city:p.corr_city,perm_state:p.corr_state,perm_pincode:p.corr_pincode}:{})}));
  };
  return(
    <div className="rf-step">
      <h3 className="rf-step-h">Step 3 — Address & KYC Documents</h3>
      <div className="rf-addr-block">
        <div className="rf-addr-lbl">Correspondence Address</div>
        <F label="Address" req err={errors.corr_address}>
          <textarea className="rf-textarea" rows={2} value={form.corr_address} onChange={e=>sync('address',e.target.value)} placeholder="House No., Street, Area, Locality"/>
        </F>
        <div className="rf-g3">
          <F label="City" req err={errors.corr_city}><I value={form.corr_city} onChange={e=>sync('city',e.target.value)} placeholder="City"/></F>
          <F label="State" req err={errors.corr_state}><StateSelect value={form.corr_state} onChange={e=>sync('state',e.target.value)}/></F>
          <F label="Pincode" req err={errors.corr_pincode}><I value={form.corr_pincode} onChange={e=>sync('pincode',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit" maxLength={6}/></F>
        </div>
      </div>

      <label className="rf-checkbox">
        <input type="checkbox" checked={form.same_as_corr} onChange={toggleSame}/>
        <span>Permanent address same as Correspondence address</span>
        <span className="rf-cb-note">(auto-copies all fields)</span>
      </label>

      <div className={`rf-addr-block ${form.same_as_corr?'rf-disabled':''}`}>
        <div className="rf-addr-lbl">Permanent Address</div>
        <F label="Address" req={!form.same_as_corr} err={errors.perm_address}>
          <textarea className="rf-textarea" rows={2} value={form.perm_address} onChange={e=>set(p=>({...p,perm_address:e.target.value}))} placeholder="House No., Street, Area, Locality" disabled={form.same_as_corr}/>
        </F>
        <div className="rf-g3">
          <F label="City" req={!form.same_as_corr} err={errors.perm_city}><I value={form.perm_city} onChange={e=>set(p=>({...p,perm_city:e.target.value}))} placeholder="City" disabled={form.same_as_corr}/></F>
          <F label="State" req={!form.same_as_corr} err={errors.perm_state}><StateSelect value={form.perm_state} onChange={e=>set(p=>({...p,perm_state:e.target.value}))} disabled={form.same_as_corr}/></F>
          <F label="Pincode" req={!form.same_as_corr} err={errors.perm_pincode}><I value={form.perm_pincode} onChange={e=>set(p=>({...p,perm_pincode:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="6-digit" maxLength={6} disabled={form.same_as_corr}/></F>
        </div>
      </div>
    </div>
  );
}

function Step4({form,set,errors}){
  const toggleNom=e=>{
    const c=e.target.checked;
    set(p=>({...p,nominee_same_as_member:c,...(c?{nominee_address:p.corr_address,nominee_city:p.corr_city,nominee_state:p.corr_state,nominee_pincode:p.corr_pincode}:{})}));
  };
  return(
    <div className="rf-step">
      <h3 className="rf-step-h">Step 4 — Nominee Info & Bank Details</h3>
      <div className="rf-section-lbl">Nominee Information</div>
      <div className="rf-g3">
        <F label="Nominee Name" req err={errors.nominee_name}><I value={form.nominee_name} onChange={e=>set(p=>({...p,nominee_name:e.target.value}))} placeholder="Full name"/></F>
        <F label="Nominee Age" req err={errors.nominee_age}><I type="number" value={form.nominee_age} onChange={e=>set(p=>({...p,nominee_age:e.target.value}))} placeholder="Age"/></F>
        <F label="Relationship" req err={errors.nominee_relationship}><S value={form.nominee_relationship} onChange={e=>set(p=>({...p,nominee_relationship:e.target.value}))} opts={RELATIONSHIPS} ph="Select"/></F>
      </div>
      <label className="rf-checkbox">
        <input type="checkbox" checked={form.nominee_same_as_member} onChange={toggleNom}/>
        <span>Nominee address same as Correspondence address</span>
        <span className="rf-cb-note">(copies address, city, state & pincode)</span>
      </label>
      <div className={`rf-addr-block ${form.nominee_same_as_member?'rf-disabled':''}`}>
        <div className="rf-addr-lbl">Nominee Address</div>
        <F label="Address" req={!form.nominee_same_as_member} err={errors.nominee_address}>
          <textarea className="rf-textarea" rows={2} value={form.nominee_address} onChange={e=>set(p=>({...p,nominee_address:e.target.value}))} placeholder="House No., Street, Area" disabled={form.nominee_same_as_member}/>
        </F>
        <div className="rf-g3">
          <F label="City" req={!form.nominee_same_as_member} err={errors.nominee_city}><I value={form.nominee_city} onChange={e=>set(p=>({...p,nominee_city:e.target.value}))} placeholder="City" disabled={form.nominee_same_as_member}/></F>
          <F label="State" req={!form.nominee_same_as_member} err={errors.nominee_state}><StateSelect value={form.nominee_state} onChange={e=>set(p=>({...p,nominee_state:e.target.value}))} disabled={form.nominee_same_as_member}/></F>
          <F label="Pincode" req={!form.nominee_same_as_member} err={errors.nominee_pincode}><I value={form.nominee_pincode} onChange={e=>set(p=>({...p,nominee_pincode:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="6-digit" maxLength={6} disabled={form.nominee_same_as_member}/></F>
        </div>
      </div>
      <div className="rf-section-lbl">Bank Details</div>
      <div className="rf-g2">
        <F label="Bank Name"><I value={form.bank_name} onChange={e=>set(p=>({...p,bank_name:e.target.value}))} placeholder="e.g. State Bank of India"/></F>
        <F label="Account Number"><I value={form.account_number} onChange={e=>set(p=>({...p,account_number:e.target.value.replace(/\D/g,'')}))} placeholder="Account number"/></F>
      </div>
      <div className="rf-g2">
        <F label="IFSC Code"><I value={form.ifsc_code} onChange={e=>set(p=>({...p,ifsc_code:e.target.value.toUpperCase()}))} placeholder="e.g. SBIN0001234" maxLength={11}/></F>
        <F label="Bank Branch Name"><I value={form.bank_branch_name} onChange={e=>set(p=>({...p,bank_branch_name:e.target.value}))} placeholder="Branch name"/></F>
      </div>
      <div className="rf-g2">
        <F label="PAN Number"><I value={form.pan_number} onChange={e=>set(p=>({...p,pan_number:e.target.value.toUpperCase()}))} placeholder="e.g. ABCDE1234F" maxLength={10}/></F>
        <F label="UPI ID"><I value={form.upi_id} onChange={e=>set(p=>({...p,upi_id:e.target.value}))} placeholder="name@upi"/></F>
      </div>
    </div>
  );
}

const RR=({l,v})=><div className="rf-rr"><span className="rf-rrl">{l}</span><span className="rf-rrv">{v||<em>—</em>}</span></div>;
const RS=({title,children})=><div className="rf-rsec"><div className="rf-rsec-t">{title}</div>{children}</div>;

function Step5({form,set}){
  return(
    <div className="rf-step">
      <h3 className="rf-step-h">Step 5 — Income Info & Review</h3>
      <div className="rf-section-lbl">Income Information</div>
      <div className="rf-g2">
        <F label="Occupation"><S value={form.occupation} onChange={e=>set(p=>({...p,occupation:e.target.value}))} opts={OCCUPATIONS} ph="Select Occupation"/></F>
        <F label="Professional Details"><I value={form.professional_details} onChange={e=>set(p=>({...p,professional_details:e.target.value}))} placeholder="Job title / Designation"/></F>
      </div>
      <div className="rf-g2">
        <F label="Annual Income (₹)" hint="Numeric e.g. 500000"><I type="number" value={form.annual_income} onChange={e=>set(p=>({...p,annual_income:e.target.value}))} placeholder="e.g. 500000"/></F>
        <F label="Family Income (₹)" hint="Numeric e.g. 1200000"><I type="number" value={form.family_income} onChange={e=>set(p=>({...p,family_income:e.target.value}))} placeholder="e.g. 1200000"/></F>
      </div>
      <div className="rf-section-lbl">Review Before Submission</div>
      <div className="rf-rgrid">
        <RS title="Promoter">
          <RR l="Promoter ID"   v={form.promoter_adviser_id}/>
          <RR l="Name"          v={form.promoter_name}/>
          <RR l="Member Type"   v={form.member_type}/>
          <RR l="Fees & Mode"   v={`₹${form.member_fees} · ${form.payment_mode}`}/>
        </RS>
        <RS title="Personal">
          <RR l="Name"           v={`${form.salutation} ${form.full_name}`.trim()}/>
          <RR l="Father/Spouse"  v={form.father_spouse_name}/>
          <RR l="DOB / Age"      v={form.date_of_birth?`${form.date_of_birth} (${form.age} yrs)`:''}/>
          <RR l="Gender"         v={form.gender}/>
          <RR l="Marital Status" v={form.marital_status}/>
          <RR l="Mobile"         v={form.mobile}/>
          <RR l="Aadhar"         v={form.aadhar_number}/>
        </RS>
        <RS title="Correspondence Address">
          <RR l="Address" v={form.corr_address}/>
          <RR l="City"    v={form.corr_city}/>
          <RR l="State"   v={form.corr_state}/>
          <RR l="Pincode" v={form.corr_pincode}/>
        </RS>
        <RS title="Permanent Address">
          <RR l="Address" v={form.same_as_corr?'(Same as Correspondence)':form.perm_address}/>
          <RR l="City"    v={form.perm_city}/>
          <RR l="State"   v={form.perm_state}/>
          <RR l="Pincode" v={form.perm_pincode}/>
        </RS>
        <RS title="Nominee">
          <RR l="Name"         v={form.nominee_name}/>
          <RR l="Age"          v={form.nominee_age}/>
          <RR l="Relationship" v={form.nominee_relationship}/>
          <RR l="City"         v={form.nominee_city}/>
        </RS>
        <RS title="Bank & PAN">
          <RR l="Bank"    v={form.bank_name}/>
          <RR l="Account" v={form.account_number}/>
          <RR l="IFSC"    v={form.ifsc_code}/>
          <RR l="PAN"     v={form.pan_number}/>
          <RR l="UPI"     v={form.upi_id}/>
        </RS>
        <RS title="Income">
          <RR l="Occupation"    v={form.occupation}/>
          <RR l="Annual Income" v={form.annual_income?`₹${Number(form.annual_income).toLocaleString('en-IN')}`:''}/>
          <RR l="Family Income" v={form.family_income?`₹${Number(form.family_income).toLocaleString('en-IN')}`:''}/>
        </RS>
      </div>
    </div>
  );
}

const validators = {
  1: f=>{const e={};if(!f.promoter_adviser_id.trim())e.promoter_adviser_id='Enter Promoter ID';if(!f.promoter_name)e.promoter_adviser_id='Please verify the Promoter ID first';return e;},
  2: f=>{const e={};if(!f.full_name.trim())e.full_name='Full name is required';if(!f.father_spouse_name.trim())e.father_spouse_name='Father / Spouse name is required';if(!f.date_of_birth)e.date_of_birth='Date of birth is required';if(!f.gender)e.gender='Gender is required';if(!f.marital_status)e.marital_status='Marital status is required';if(!f.mobile||f.mobile.length!==10)e.mobile='Valid 10-digit mobile required';if(!f.aadhar_number||f.aadhar_number.length!==12)e.aadhar_number='Valid 12-digit Aadhar required';return e;},
  3: f=>{const e={};if(!f.corr_address.trim())e.corr_address='Address is required';if(!f.corr_city.trim())e.corr_city='City is required';if(!f.corr_state)e.corr_state='State is required';if(!f.corr_pincode||f.corr_pincode.length!==6)e.corr_pincode='Valid 6-digit pincode required';if(!f.same_as_corr){if(!f.perm_address.trim())e.perm_address='Address is required';if(!f.perm_city.trim())e.perm_city='City is required';if(!f.perm_state)e.perm_state='State is required';if(!f.perm_pincode||f.perm_pincode.length!==6)e.perm_pincode='Valid 6-digit pincode required';}return e;},
  4: f=>{const e={};if(!f.nominee_name.trim())e.nominee_name='Nominee name is required';if(!f.nominee_age)e.nominee_age='Age is required';if(!f.nominee_relationship)e.nominee_relationship='Relationship is required';if(!f.nominee_same_as_member){if(!f.nominee_address.trim())e.nominee_address='Address is required';if(!f.nominee_city.trim())e.nominee_city='City is required';if(!f.nominee_state)e.nominee_state='State is required';if(!f.nominee_pincode||f.nominee_pincode.length!==6)e.nominee_pincode='Valid pincode required';}return e;},
  5: ()=>({}),
};

export default function RegistrationForm({onSuccess,memberType='Investor'}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({...INIT,member_type:memberType});
  const [errors,setErrors]=useState({});
  const [loading,setLoading]=useState(false);
  const [credModal,setCredModal]=useState(null);

  const next=()=>{const e=validators[step](form);setErrors(e);if(Object.keys(e).length===0)setStep(s=>Math.min(s+1,5));else toast.error('Please fix the highlighted errors');};
  const back=()=>{setStep(s=>Math.max(s-1,1));setErrors({});};

  const submit=async()=>{
    setLoading(true);
    try{
      const payload={
        adviser_code:        form.promoter_adviser_id,
        member_type:         'Investor',
        date_of_joining:     todayISO(),
        member_fees:         INVESTOR_FEE,
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
        corr_address:        form.corr_address,
        corr_city:           form.corr_city,
        corr_state:          form.corr_state,
        corr_pincode:        form.corr_pincode,
        same_as_corr:        form.same_as_corr,
        perm_address:        form.same_as_corr ? form.corr_address : form.perm_address,
        perm_city:           form.same_as_corr ? form.corr_city : form.perm_city,
        perm_state:          form.same_as_corr ? form.corr_state : form.perm_state,
        perm_pincode:        form.same_as_corr ? form.corr_pincode : form.perm_pincode,
        nominee_name:        form.nominee_name,
        nominee_age:         form.nominee_age ? Number(form.nominee_age) : null,
        nominee_relationship:form.nominee_relationship,
        nominee_same_as_member: form.nominee_same_as_member,
        nominee_address:     form.nominee_same_as_member ? form.corr_address : form.nominee_address,
        nominee_city:        form.nominee_same_as_member ? form.corr_city : form.nominee_city,
        nominee_state:       form.nominee_same_as_member ? form.corr_state : form.nominee_state,
        nominee_pincode:     form.nominee_same_as_member ? form.corr_pincode : form.nominee_pincode,
        bank_name:           form.bank_name,
        account_number:      form.account_number,
        ifsc_code:           form.ifsc_code,
        bank_branch_name:    form.bank_branch_name,
        pan_number:          form.pan_number,
        upi_id:              form.upi_id,
        occupation:          form.occupation,
        professional_details:form.professional_details,
        annual_income:       form.annual_income || null,
        family_income:       form.family_income || null,
      };
      const r=await memberService.register(payload);
      if(r.data.success){
        const creds=r.data.data?.credentials;
        if(creds?.username){setCredModal(creds);showInvestorCredentialToasts(creds);}
        else toast.success(`Investor created! ID: ${r.data.data?.investor_id||''}`);
        if(onSuccess)onSuccess(r.data.data);
        setStep(1);setForm({...INIT,member_type:memberType});
      }
    }catch(e){toast.error(e.response?.data?.message||'Registration failed');}
    finally{setLoading(false);}
  };

  return(
    <>
    <div className="rf-wrap">
      <div className="rf-stepper">
        {STEPS.map((s,i)=>(
          <React.Fragment key={s.num}>
            <div className={`rf-si ${step===s.num?'active':''} ${step>s.num?'done':''}`}>
              <div className="rf-sc">{step>s.num?'✓':s.num}</div>
              <div className="rf-sl">{s.label}</div>
            </div>
            {i<STEPS.length-1&&<div className={`rf-sline ${step>s.num?'done':''}`}/>}
          </React.Fragment>
        ))}
      </div>
      <div className="rf-body">
        {step===1&&<Step1 form={form} set={setForm} errors={errors}/>}
        {step===2&&<Step2 form={form} set={setForm} errors={errors}/>}
        {step===3&&<Step3 form={form} set={setForm} errors={errors}/>}
        {step===4&&<Step4 form={form} set={setForm} errors={errors}/>}
        {step===5&&<Step5 form={form} set={setForm} errors={errors}/>}
      </div>
      <div className="rf-nav">
        {step>1?<button className="rf-btn-back" onClick={back} disabled={loading}>← Back</button>:<div/>}
        {step<5?<button className="rf-btn-next" onClick={next}>Next →</button>:<button className="rf-btn-submit" onClick={submit} disabled={loading}>{loading?'Submitting…':'✓ Submit Registration'}</button>}
      </div>
    </div>
    <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
    </>
  );
}