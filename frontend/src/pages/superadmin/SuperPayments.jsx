import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { SuperLayout } from './SuperDashboard';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

export default function SuperPayments() {
  const [payments,setPayments]=useState([]);
  const [pending,setPending]=useState([]);
  const [tab,setTab]=useState('pending');
  const [selected,setSelected]=useState(null);
  const [approveData,setApproveData]=useState({credits_to_add:0,activate_plan_slug:'',billing_cycle:'monthly',expires_days:30,notes:''});
  const [plans,setPlans]=useState([]);
  const [search,setSearch]=useState('');
  const [newPayment,setNewPayment]=useState({admin_id:'',type:'subscription',amount:'',payment_method:'manual',transaction_ref:'',description:'',plan_slug:'',credits_added:0,billing_cycle:'monthly',notes:''});
  const [admins,setAdmins]=useState([]);
  const [showAdd,setShowAdd]=useState(false);

  const load=()=>{
    api.get('/superadmin/payment-requests').then(r=>setPending(r.data)).catch(()=>{});
    api.get('/superadmin/payments').then(r=>setPayments(r.data)).catch(()=>{});
  };
  useEffect(()=>{
    load();
    api.get('/superadmin/plans').then(r=>setPlans(r.data)).catch(()=>{});
    api.get('/superadmin/admins').then(r=>setAdmins(r.data)).catch(()=>{});
  },[]);

  const approve=async()=>{
    try{ await api.put(`/superadmin/payment-requests/${selected.id}/approve`,approveData);
      toast.success('Payment approved!');setSelected(null);load(); }
    catch(err){toast.error(err.response?.data?.error||'Error');}
  };
  const reject=async(id)=>{
    try{ await api.put(`/superadmin/payment-requests/${id}/reject`,{reason:'Rejected by admin'});
      toast.success('Rejected');load(); }
    catch(err){toast.error(err.response?.data?.error||'Error');}
  };
  const addPayment=async e=>{e.preventDefault();
    try{ await api.post('/superadmin/payments',newPayment);
      toast.success('Payment recorded!');setShowAdd(false);load(); }
    catch(err){toast.error(err.response?.data?.error||'Error');}
  };

  const statusBadge=(s)=>{
    const m={completed:{bg:'rgba(34,197,94,.12)',c:'#4ade80',icon:<CheckCircle size={11}/>},pending:{bg:'rgba(240,180,41,.12)',c:'#f0b429',icon:<Clock size={11}/>},failed:{bg:'rgba(239,68,68,.12)',c:'#f87171',icon:<XCircle size={11}/>}};
    const b=m[s]||m.pending;
    return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,padding:'2px 8px',borderRadius:8,background:b.bg,color:b.c,fontWeight:600}}>{b.icon}{s}</span>;
  };

  const data = tab==='pending' ? pending : payments.filter(p=>!search||(p.shop_name+p.email+p.name+p.transaction_ref).toLowerCase().includes(search.toLowerCase()));

  return (
    <SuperLayout title="Payment Management" subtitle="Handle subscriptions and credit purchases"
      actions={<button onClick={()=>setShowAdd(true)} style={{padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Record Payment</button>}>

      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {[['pending',`Pending (${pending.length})`],['all','All Transactions']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 18px',borderRadius:10,border:`1px solid ${tab===v?'rgba(240,180,41,.5)':'rgba(240,180,41,.15)'}`,background:tab===v?'rgba(240,180,41,.1)':'transparent',color:tab===v?'#f0b429':'rgba(162,140,250,.4)',fontSize:13,fontWeight:tab===v?600:400,cursor:'pointer'}}>{l}</button>
        ))}
        {tab==='all'&&(
          <div style={{position:'relative',marginLeft:'auto'}}>
            <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'rgba(162,140,250,.4)'}}/>
            <input className="cv-input" style={{paddingLeft:30,width:200,fontSize:12}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        )}
      </div>

      <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e1e2d'}}>
                {['Admin','Type','Amount','Method','Ref','Date','Status','Actions'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'11px 14px',fontSize:10,color:'rgba(162,140,250,.4)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length===0&&<tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'rgba(162,140,250,.3)',fontSize:13}}>No payments found</td></tr>}
              {data.map(p=>(
                <tr key={p.id} style={{borderTop:'1px solid rgba(30,30,45,.5)'}}>
                  <td style={{padding:'11px 14px'}}><p style={{fontSize:12,fontWeight:600,color:'#fff',whiteSpace:'nowrap'}}>{p.shop_name||p.name}</p><p style={{fontSize:10,color:'rgba(162,140,250,.35)'}}>{p.email}</p></td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(124,58,237,.1)',color:'#a78bfa',textTransform:'capitalize'}}>{p.type}</span></td>
                  <td style={{padding:'11px 14px'}}><p style={{fontSize:13,fontWeight:700,color:'#f0b429',whiteSpace:'nowrap'}}>₹{parseFloat(p.amount).toLocaleString()}</p></td>
                  <td style={{padding:'11px 14px'}}><p style={{fontSize:11,color:'rgba(226,226,240,.5)',textTransform:'capitalize'}}>{p.payment_method||'–'}</p></td>
                  <td style={{padding:'11px 14px'}}><p style={{fontSize:11,color:'rgba(162,140,250,.4)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.transaction_ref||'–'}</p></td>
                  <td style={{padding:'11px 14px'}}><p style={{fontSize:11,color:'rgba(162,140,250,.4)',whiteSpace:'nowrap'}}>{new Date(p.created_at).toLocaleDateString('en-IN')}</p></td>
                  <td style={{padding:'11px 14px'}}>{statusBadge(p.status)}</td>
                  <td style={{padding:'11px 14px'}}>
                    {p.status==='pending'&&(
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>{setSelected(p);setApproveData({credits_to_add:p.credits_added||0,activate_plan_slug:p.plan_slug||'',billing_cycle:'monthly',expires_days:30,notes:''});}} style={{padding:'4px 9px',borderRadius:7,background:'rgba(34,197,94,.1)',border:'none',cursor:'pointer',color:'#4ade80',fontSize:11,fontWeight:600}}>Approve</button>
                        <button onClick={()=>reject(p.id)} style={{padding:'4px 9px',borderRadius:7,background:'rgba(239,68,68,.08)',border:'none',cursor:'pointer',color:'#f87171',fontSize:11,fontWeight:600}}>Reject</button>
                      </div>
                    )}
                    {p.screenshot_url&&<a href={p.screenshot_url} target="_blank" rel="noreferrer" style={{fontSize:10,color:'#a78bfa',textDecoration:'none',display:'block',marginTop:3}}>View proof →</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Approve Payment — ${selected?.shop_name}`} width={480}>
        {selected&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:'10px 14px',borderRadius:10,background:'rgba(240,180,41,.06)',border:'1px solid rgba(240,180,41,.15)'}}>
              <p style={{fontSize:11,color:'rgba(240,180,41,.5)',marginBottom:2}}>Payment Amount</p>
              <p style={{fontSize:'1.5rem',fontWeight:700,color:'#f0b429',fontFamily:'Syne,sans-serif'}}>₹{parseFloat(selected.amount).toLocaleString()}</p>
              {selected.description&&<p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginTop:4}}>{selected.description}</p>}
            </div>
            {[['CREDITS TO ADD','credits_to_add','number'],['ACTIVATE PLAN (optional)','activate_plan_slug','select'],['BILLING CYCLE','billing_cycle','select_cycle'],['EXPIRES IN (days)','expires_days','number'],['NOTES','notes','text']].map(([l,k,t])=>(
              <div key={k}>
                <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
                {t==='select'?<select className="cv-input" value={approveData[k]} onChange={e=>setApproveData(p=>({...p,[k]:e.target.value}))} style={{fontSize:12}}>
                  <option value="">Don't change plan</option>
                  {plans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>:t==='select_cycle'?<select className="cv-input" value={approveData[k]} onChange={e=>setApproveData(p=>({...p,[k]:e.target.value}))} style={{fontSize:12}}>
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="yearly">Yearly (365 days)</option>
                </select>:<input className="cv-input" type={t==='number'?'number':'text'} value={approveData[k]} onChange={e=>setApproveData(p=>({...p,[k]:t==='number'?parseInt(e.target.value)||0:e.target.value}))} style={{fontSize:12}}/>}
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={()=>setSelected(null)} className="btn-ghost" style={{flex:1}}>Cancel</button>
              <button onClick={approve} style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#4ade80,#16a34a)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>✅ Approve & Activate</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Record Manual Payment" width={520}>
        <form onSubmit={addPayment} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>ADMIN *</label>
            <select className="cv-input" required value={newPayment.admin_id} onChange={e=>setNewPayment(p=>({...p,admin_id:e.target.value}))} style={{fontSize:12}}>
              <option value="">Select admin...</option>
              {admins.map(a=><option key={a.id} value={a.id}>{a.shop_name||a.name} ({a.email})</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>TYPE</label>
              <select className="cv-input" value={newPayment.type} onChange={e=>setNewPayment(p=>({...p,type:e.target.value}))} style={{fontSize:12}}>
                {['subscription','credits','upgrade','refund'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>AMOUNT (₹) *</label>
              <input className="cv-input" type="number" required value={newPayment.amount} onChange={e=>setNewPayment(p=>({...p,amount:e.target.value}))} placeholder="2499" style={{fontSize:12}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PLAN</label>
              <select className="cv-input" value={newPayment.plan_slug} onChange={e=>setNewPayment(p=>({...p,plan_slug:e.target.value}))} style={{fontSize:12}}>
                <option value="">No plan change</option>
                {plans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>CREDITS ADDED</label>
              <input className="cv-input" type="number" value={newPayment.credits_added} onChange={e=>setNewPayment(p=>({...p,credits_added:parseInt(e.target.value)||0}))} placeholder="0" style={{fontSize:12}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>METHOD</label>
              <select className="cv-input" value={newPayment.payment_method} onChange={e=>setNewPayment(p=>({...p,payment_method:e.target.value}))} style={{fontSize:12}}>
                {['manual','upi','card','bank','cash','razorpay'].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>TXN REF</label>
              <input className="cv-input" value={newPayment.transaction_ref} onChange={e=>setNewPayment(p=>({...p,transaction_ref:e.target.value}))} placeholder="UTR/Ref number" style={{fontSize:12}}/>
            </div>
          </div>
          <div>
            <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>DESCRIPTION</label>
            <input className="cv-input" value={newPayment.description} onChange={e=>setNewPayment(p=>({...p,description:e.target.value}))} placeholder="e.g. Professional plan - monthly" style={{fontSize:12}}/>
          </div>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button type="button" onClick={()=>setShowAdd(false)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button type="submit" style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>Record Payment</button>
          </div>
        </form>
      </Modal>
    </SuperLayout>
  );
}
