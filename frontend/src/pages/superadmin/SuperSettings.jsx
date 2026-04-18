import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { SuperLayout } from './SuperDashboard';
import api from '../../utils/api';

export default function SuperSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/superadmin/settings').then(r => {
      const s = {};
      r.data.forEach(row => { s[row.key] = row.value || ''; });
      setSettings(s);
    }).catch(()=>{});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/superadmin/settings', settings); toast.success('Settings saved!'); }
    catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const Section = ({ title, emoji, keys }) => (
    <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,marginBottom:16}}>
      <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:16,fontSize:'.95rem'}}>{emoji} {title}</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>
        {keys.map(([k,l,ph,t])=>(
          <div key={k}>
            <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l.toUpperCase()}</label>
            {t==='textarea'
              ? <textarea className="cv-input" rows={2} value={settings[k]||''} onChange={e=>setSettings(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{resize:'none',fontSize:12}}/>
              : <input className="cv-input" type={t||'text'} value={settings[k]||''} onChange={e=>setSettings(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:12}}/>
            }
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SuperLayout title="Platform Settings" subtitle="Configure ClothVision SaaS settings"
      actions={<button onClick={save} disabled={saving} className="btn-primary" style={{background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000'}}><Save size={14}/>{saving?'Saving...':'Save All'}</button>}>

      <div style={{maxWidth:900}}>
        <Section title="Branding" emoji="🎨" keys={[
          ['platform_name','Platform Name','ClothVision AI'],
          ['support_email','Support Email','support@clothvision.ai','email'],
        ]}/>
        <Section title="Trial Settings" emoji="🆓" keys={[
          ['trial_days','Trial Days','7','number'],
          ['trial_credits','Trial Credits','50','number'],
        ]}/>
        <Section title="Payment — UPI" emoji="💳" keys={[
          ['upi_id','UPI ID','yourname@paytm'],
          ['upi_name','UPI Name','Your Name'],
        ]}/>
        <Section title="Payment — Bank Transfer" emoji="🏦" keys={[
          ['bank_name','Bank Name','HDFC Bank'],
          ['account_number','Account Number','1234567890','number'],
          ['ifsc_code','IFSC Code','HDFC0001234'],
          ['account_holder','Account Holder Name','Your Name'],
        ]}/>
        <Section title="Pricing" emoji="💰" keys={[
          ['credit_cost_inr','Credit Cost (₹ per credit)','0.5'],
          ['min_credit_purchase','Min Credits to Purchase','100','number'],
          ['gst_number','GST Number (optional)','22XXXXX1234Z5'],
        ]}/>
        <Section title="Razorpay (optional)" emoji="⚡" keys={[
          ['razorpay_key_id','Razorpay Key ID','rzp_live_...'],
          ['razorpay_key_secret','Razorpay Key Secret','...'],
        ]}/>

        {/* Payment QR Code preview */}
        {settings.upi_id && (
          <div style={{background:'rgba(240,180,41,.05)',border:'1px solid rgba(240,180,41,.15)',borderRadius:16,padding:20,marginBottom:16}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#f0b429',marginBottom:10,fontSize:'.9rem'}}>💡 Payment Info Preview</h3>
            <p style={{fontSize:13,color:'rgba(226,226,240,.7)'}}>UPI: <strong style={{color:'#f0b429'}}>{settings.upi_id}</strong></p>
            {settings.bank_name&&<p style={{fontSize:13,color:'rgba(226,226,240,.7)',marginTop:6}}>Bank: {settings.bank_name} · {settings.account_number} · {settings.ifsc_code}</p>}
            <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginTop:8}}>This info will be shown to admins when they request plan payment.</p>
          </div>
        )}
      </div>
    </SuperLayout>
  );
}
