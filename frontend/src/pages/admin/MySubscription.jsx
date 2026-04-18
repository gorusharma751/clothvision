import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Crown, CreditCard, Check, Clock, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

export default function MySubscription() {
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payInfo, setPayInfo] = useState({});
  const [showPay, setShowPay] = useState(null);
  const [showCreditReq, setShowCreditReq] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPrev, setScreenshotPrev] = useState(null);
  const [payForm, setPayForm] = useState({payment_method:'upi',transaction_ref:'',notes:''});
  const [creditForm, setCreditForm] = useState({amount:'',credits_requested:'',payment_method:'upi',transaction_ref:'',notes:''});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin-payment/my-subscription').then(r=>setSub(r.data)).catch(()=>{});
    api.get('/admin-payment/plans').then(r=>setPlans(r.data)).catch(()=>{});
    api.get('/admin-payment/my-payments').then(r=>setPayments(r.data)).catch(()=>{});
    api.get('/admin-payment/payment-info').then(r=>setPayInfo(r.data)).catch(()=>{});
  }, []);

  const onDrop = useCallback(f => { if(f[0]){setScreenshotFile(f[0]);setScreenshotPrev(URL.createObjectURL(f[0]));} }, []);
  const {getRootProps,getInputProps,isDragActive} = useDropzone({onDrop,accept:{'image/*':[]},maxFiles:1});

  const submitPlan = async () => {
    if(!showPay) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('plan_slug', showPay.slug);
      fd.append('billing_cycle', 'monthly');
      fd.append('amount', showPay.price_monthly);
      fd.append('payment_method', payForm.payment_method);
      fd.append('transaction_ref', payForm.transaction_ref);
      fd.append('notes', payForm.notes);
      if(screenshotFile) fd.append('screenshot', screenshotFile);
      await api.post('/admin-payment/payment-request', fd, {headers:{'Content-Type':'multipart/form-data'}});
      toast.success('Payment request submitted! Will be activated within 24 hours.');
      setShowPay(null); setScreenshotFile(null); setScreenshotPrev(null);
      api.get('/admin-payment/my-payments').then(r=>setPayments(r.data));
    } catch(err){ toast.error(err.response?.data?.error||'Error'); }
    finally { setLoading(false); }
  };

  const submitCreditReq = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(creditForm).forEach(([k,v]) => v && fd.append(k, v));
      if(screenshotFile) fd.append('screenshot', screenshotFile);
      await api.post('/admin-payment/credit-request', fd, {headers:{'Content-Type':'multipart/form-data'}});
      toast.success('Credit request submitted!');
      setShowCreditReq(false); setScreenshotFile(null); setScreenshotPrev(null);
    } catch(err){ toast.error(err.response?.data?.error||'Error'); }
    finally { setLoading(false); }
  };

  const planFeatures = sub?.features ? (typeof sub.features==='string'?JSON.parse(sub.features):sub.features) : [];
  const daysLeft = sub?.expires_at ? Math.max(0,Math.ceil((new Date(sub.expires_at)-new Date())/86400000)) : null;

  return (
    <Layout title="My Subscription" subtitle="Manage your plan and credits">
      {/* Current Plan */}
      <div style={{background:'linear-gradient(135deg,rgba(124,58,237,.12),rgba(240,180,41,.06))',border:'1px solid rgba(124,58,237,.25)',borderRadius:20,padding:24,marginBottom:20}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <Crown size={20} color="#f0b429"/>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'1.2rem'}}>{sub?.plan_name||'No Active Plan'}</h2>
              {sub&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:8,background:sub.status==='active'?'rgba(34,197,94,.15)':sub.status==='trial'?'rgba(240,180,41,.15)':'rgba(239,68,68,.15)',color:sub.status==='active'?'#4ade80':sub.status==='trial'?'#f0b429':'#f87171',fontWeight:600}}>{sub.status}</span>}
            </div>
            {sub&&<p style={{fontSize:13,color:'rgba(226,226,240,.5)'}}>
              {daysLeft!==null?`${daysLeft} days remaining`:'No expiry set'}
              {sub.status==='trial'&&` · Trial period`}
            </p>}
          </div>
          {daysLeft !== null && daysLeft < 7 && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#f87171',fontSize:12}}>
              <AlertCircle size={14}/>Expiring soon! Renew now.
            </div>
          )}
        </div>
        {planFeatures.length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:14}}>
            {planFeatures.map(f=>(
              <span key={f} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:7,background:'rgba(34,197,94,.08)',color:'#4ade80'}}>
                <Check size={10}/>{ f.replace(/_/g,' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Payment Info for reference */}
      {(payInfo.upi_id||payInfo.bank_name) && (
        <div style={{background:'rgba(240,180,41,.05)',border:'1px solid rgba(240,180,41,.12)',borderRadius:14,padding:16,marginBottom:20}}>
          <p style={{fontSize:11,color:'rgba(240,180,41,.6)',fontFamily:'Syne,sans-serif',fontWeight:600,marginBottom:8}}>💳 Payment Details</p>
          {payInfo.upi_id&&<p style={{fontSize:13,color:'rgba(226,226,240,.7)',marginBottom:4}}>UPI: <strong style={{color:'#f0b429'}}>{payInfo.upi_id}</strong></p>}
          {payInfo.bank_name&&<p style={{fontSize:12,color:'rgba(162,140,250,.5)'}}>Bank: {payInfo.bank_name} · A/C: {payInfo.account_number} · IFSC: {payInfo.ifsc_code}</p>}
          <p style={{fontSize:11,color:'rgba(162,140,250,.35)',marginTop:8}}>After payment, submit request with transaction reference & screenshot below.</p>
        </div>
      )}

      {/* Available Plans */}
      <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:14,fontSize:'1rem'}}>Available Plans</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14,marginBottom:24}}>
        {plans.map(p=>{
          const features=typeof p.features==='string'?JSON.parse(p.features):p.features||[];
          const isCurrent=sub?.slug===p.slug;
          return (
            <div key={p.id} style={{background:'#111118',border:`${isCurrent?'2px':'1px'} solid ${isCurrent?'rgba(124,58,237,.5)':'rgba(124,58,237,.15)'}`,borderRadius:16,padding:20,position:'relative'}}>
              {isCurrent&&<div style={{position:'absolute',top:10,right:10,background:'rgba(34,197,94,.15)',color:'#4ade80',fontSize:10,padding:'2px 8px',borderRadius:8,fontWeight:600}}>CURRENT</div>}
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'1rem',marginBottom:4}}>{p.name}</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.5rem',color:'#f0b429',marginBottom:4}}>₹{parseFloat(p.price_monthly).toLocaleString()}<span style={{fontSize:11,fontWeight:400,color:'rgba(162,140,250,.4)'}}>/mo</span></p>
              <p style={{fontSize:11,color:'rgba(162,140,250,.35)',marginBottom:10}}>₹{parseFloat(p.price_yearly).toLocaleString()}/year</p>
              <div style={{fontSize:11,color:'rgba(226,226,240,.5)',marginBottom:12}}>
                💳 {p.credits_monthly} credits · 👥 {p.max_users} users
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:12}}>
                {features.slice(0,3).map(f=><span key={f} style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'rgba(124,58,237,.1)',color:'rgba(162,140,250,.6)'}}>{f.replace(/_/g,' ')}</span>)}
                {features.length>3&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'rgba(124,58,237,.05)',color:'rgba(162,140,250,.35)'}}>+{features.length-3}</span>}
              </div>
              {!isCurrent&&p.price_monthly>0&&(
                <button onClick={()=>setShowPay(p)} style={{width:'100%',padding:'8px',borderRadius:10,background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.3)',color:'#a78bfa',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <CreditCard size={13}/>Buy / Upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Credit Request button */}
      <div style={{display:'flex',gap:12,marginBottom:24}}>
        <button onClick={()=>setShowCreditReq(true)} className="btn-gold">+ Request More Credits</button>
      </div>

      {/* Payment History */}
      <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
        <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:14,fontSize:'.95rem'}}>Payment History</h3>
        {payments.length===0?<p style={{color:'rgba(162,140,250,.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>No payments yet</p>:(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {payments.map(p=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:10,background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.08)'}}>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:'#fff'}}>{p.description||p.type}</p>
                  <p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>{new Date(p.created_at).toLocaleDateString('en-IN')} · {p.payment_method}</p>
                  {p.transaction_ref&&<p style={{fontSize:10,color:'rgba(162,140,250,.3)'}}>Ref: {p.transaction_ref}</p>}
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:13,fontWeight:700,color:'#f0b429'}}>₹{parseFloat(p.amount).toLocaleString()}</p>
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:6,fontWeight:600,background:p.status==='completed'?'rgba(34,197,94,.1)':p.status==='pending'?'rgba(240,180,41,.1)':'rgba(239,68,68,.1)',color:p.status==='completed'?'#4ade80':p.status==='pending'?'#f0b429':'#f87171'}}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Request Modal */}
      <Modal open={!!showPay} onClose={()=>setShowPay(null)} title={`Upgrade to ${showPay?.name}`} width={480}>
        {showPay&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:'12px',borderRadius:10,background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.12)'}}>
              <p style={{fontSize:13,color:'#fff',fontWeight:600,marginBottom:4}}>{showPay.name} — Monthly</p>
              <p style={{fontSize:'1.4rem',fontWeight:700,color:'#f0b429',fontFamily:'Syne,sans-serif'}}>₹{parseFloat(showPay.price_monthly).toLocaleString()}</p>
            </div>
            {(payInfo.upi_id||payInfo.bank_name)&&(
              <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(240,180,41,.04)',border:'1px solid rgba(240,180,41,.12)'}}>
                <p style={{fontSize:11,color:'rgba(240,180,41,.6)',marginBottom:4,fontWeight:600}}>Pay to:</p>
                {payInfo.upi_id&&<p style={{fontSize:12,color:'rgba(226,226,240,.7)'}}>UPI: {payInfo.upi_id}</p>}
                {payInfo.bank_name&&<p style={{fontSize:11,color:'rgba(162,140,250,.45)',marginTop:3}}>{payInfo.bank_name} · {payInfo.account_number}</p>}
              </div>
            )}
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PAYMENT METHOD</label>
              <select className="cv-input" value={payForm.payment_method} onChange={e=>setPayForm(p=>({...p,payment_method:e.target.value}))} style={{fontSize:12}}>
                {['upi','card','bank','cash'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>TRANSACTION REFERENCE (UTR/Ref No.)</label>
              <input className="cv-input" value={payForm.transaction_ref} onChange={e=>setPayForm(p=>({...p,transaction_ref:e.target.value}))} placeholder="Transaction ID or UTR number" style={{fontSize:12}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PAYMENT SCREENSHOT (optional)</label>
              <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'rgba(124,58,237,.7)':screenshotPrev?'rgba(124,58,237,.4)':'rgba(124,58,237,.2)'}`,borderRadius:12,background:'rgba(17,17,24,.7)',cursor:'pointer',minHeight:80,overflow:'hidden'}}>
                <input {...getInputProps()}/>
                {screenshotPrev ? <img src={screenshotPrev} alt="ss" style={{width:'100%',maxHeight:120,objectFit:'contain'}}/> : <div style={{padding:'16px',textAlign:'center',fontSize:12,color:'rgba(162,140,250,.4)'}}>Drop screenshot or click</div>}
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={()=>setShowPay(null)} className="btn-ghost" style={{flex:1}}>Cancel</button>
              <button onClick={submitPlan} disabled={loading} className="btn-primary" style={{flex:1,justifyContent:'center'}}>
                {loading?'Submitting...':'Submit Payment Request'}
              </button>
            </div>
            <p style={{fontSize:11,color:'rgba(162,140,250,.3)',textAlign:'center'}}>Plan will be activated within 24 hours after verification</p>
          </div>
        )}
      </Modal>

      {/* Credit Request Modal */}
      <Modal open={showCreditReq} onClose={()=>setShowCreditReq(false)} title="Request More Credits" width={460}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {[['AMOUNT (₹)','amount','number','e.g. 499'],['CREDITS REQUESTED','credits_requested','number','e.g. 200'],['TRANSACTION REF','transaction_ref','text','UTR/Ref'],['NOTES','notes','text','Any notes...']].map(([l,k,t,ph])=>(
            <div key={k}>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
              <input className="cv-input" type={t} value={creditForm[k]||''} onChange={e=>setCreditForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:12}}/>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button onClick={()=>setShowCreditReq(false)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button onClick={submitCreditReq} disabled={loading} className="btn-gold" style={{flex:1}}>
              {loading?'Submitting...':'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
