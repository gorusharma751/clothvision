import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, CreditCard, Shield, ShieldOff, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { SuperLayout } from './SuperDashboard';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

const ALL_FEATURES = ['fashion_tryon','bg_generator','scene_builder','listing_content','360_view','label_creator','video_studio','marketing_studio','customer_tryon','api_access','priority_support','custom_branding','all_features'];

export default function SuperAdmins() {
  const [admins,setAdmins]=useState([]);
  const [filtered,setFiltered]=useState([]);
  const [search,setSearch]=useState('');
  const [plans,setPlans]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [showEdit,setShowEdit]=useState(null);
  const [showCredits,setShowCredits]=useState(null);
  const [showFeatures,setShowFeatures]=useState(null);
  const [adminFeatures,setAdminFeatures]=useState({});
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({email:'',password:'',name:'',shop_name:'',plan_slug:'starter',billing_cycle:'monthly',initial_credits:0,trial_days:7});
  const [creditAmt,setCreditAmt]=useState('');
  const [creditDesc,setCreditDesc]=useState('');

  const load=()=>{ api.get('/superadmin/admins').then(r=>{setAdmins(r.data);setFiltered(r.data);}).catch(()=>{}); };
  useEffect(()=>{ load(); api.get('/superadmin/plans').then(r=>setPlans(r.data)).catch(()=>{}); },[]);
  useEffect(()=>setFiltered(admins.filter(a=>!search||(a.shop_name+a.email+a.name).toLowerCase().includes(search.toLowerCase()))),[search,admins]);

  const handleAdd=async e=>{ e.preventDefault(); setLoading(true);
    try{ await api.post('/superadmin/admins',form); toast.success('Admin created!'); setShowAdd(false); load(); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); } finally{setLoading(false);}
  };
  const handleEdit=async e=>{ e.preventDefault(); setLoading(true);
    try{ await api.put(`/superadmin/admins/${showEdit.id}`,showEdit); toast.success('Updated!'); setShowEdit(null); load(); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); } finally{setLoading(false);}
  };
  const handleStatus=async(id,status)=>{
    try{ await api.put(`/superadmin/admins/${id}/status`,{status}); toast.success(`Admin ${status}`); load(); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); }
  };
  const handleDelete=async id=>{ if(!confirm('Delete admin? All data will be lost.')) return;
    try{ await api.delete(`/superadmin/admins/${id}`); toast.success('Deleted'); load(); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); }
  };
  const handleCredits=async()=>{
    try{ await api.post(`/superadmin/admins/${showCredits.id}/credits`,{amount:parseInt(creditAmt),description:creditDesc});
      toast.success(`Added ${creditAmt} credits!`); setShowCredits(null); setCreditAmt(''); setCreditDesc(''); load(); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); }
  };
  const loadFeatures=async(admin)=>{ setShowFeatures(admin);
    try{ const r=await api.get(`/superadmin/admins/${admin.id}/features`);
      const m={}; r.data.flags.forEach(f=>m[f.feature_key]=f.enabled); setAdminFeatures(m); }
    catch{}
  };
  const toggleFeature=async(adminId,featureKey,enabled)=>{
    try{ await api.post(`/superadmin/admins/${adminId}/features`,{feature_key:featureKey,enabled});
      setAdminFeatures(p=>({...p,[featureKey]:enabled})); toast.success(`Feature ${enabled?'enabled':'disabled'}`); }
    catch(err){ toast.error(err.response?.data?.error||'Error'); }
  };

  const subStatusBadge=(status)=>{
    const m={active:{bg:'rgba(34,197,94,.12)',c:'#4ade80'},trial:{bg:'rgba(240,180,41,.12)',c:'#f0b429'},suspended:{bg:'rgba(239,68,68,.12)',c:'#f87171'},expired:{bg:'rgba(162,140,250,.12)',c:'#a78bfa'}};
    const s=m[status]||m.trial;
    return <span style={{fontSize:10,padding:'2px 8px',borderRadius:8,background:s.bg,color:s.c,fontWeight:600}}>{status||'trial'}</span>;
  };

  return (
    <SuperLayout title="Admin Management" subtitle={`${admins.length} admins registered`}
      actions={<button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}><Plus size={14}/>New Admin</button>}>

      <div style={{position:'relative',maxWidth:320,marginBottom:18}}>
        <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(162,140,250,.4)'}}/>
        <input className="cv-input" style={{paddingLeft:36}} placeholder="Search admins..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e1e2d'}}>
                {['Shop','Admin','Plan','Credits','Revenue','Status','Actions'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'rgba(162,140,250,.4)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i)=>(
                <tr key={a.id} style={{borderTop:'1px solid rgba(30,30,45,.5)',transition:'background .2s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.015)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#f0b429,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{(a.shop_name||'S')[0].toUpperCase()}</div>
                      <p style={{fontSize:13,fontWeight:600,color:'#fff',whiteSpace:'nowrap'}}>{a.shop_name||'–'}</p>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px'}}><p style={{fontSize:12,color:'#fff'}}>{a.name}</p><p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>{a.email}</p></td>
                  <td style={{padding:'12px 16px'}}><p style={{fontSize:12,color:'#a78bfa',fontWeight:500}}>{a.plan_name||'No plan'}</p></td>
                  <td style={{padding:'12px 16px'}}><p style={{fontSize:13,fontWeight:700,color:'#f0b429'}}>{a.credits}</p><p style={{fontSize:10,color:'rgba(162,140,250,.35)'}}>{a.credits_used} used</p></td>
                  <td style={{padding:'12px 16px'}}><p style={{fontSize:12,fontWeight:600,color:'#4ade80'}}>₹{parseFloat(a.total_paid||0).toLocaleString()}</p></td>
                  <td style={{padding:'12px 16px'}}>{subStatusBadge(a.sub_status)}</td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setShowCredits(a)} title="Add Credits" style={{width:28,height:28,borderRadius:7,background:'rgba(240,180,41,.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#f0b429'}}><CreditCard size={13}/></button>
                      <button onClick={()=>loadFeatures(a)} title="Features" style={{width:28,height:28,borderRadius:7,background:'rgba(124,58,237,.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}><Shield size={13}/></button>
                      <button onClick={()=>setShowEdit({...a})} title="Edit" style={{width:28,height:28,borderRadius:7,background:'rgba(162,140,250,.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(162,140,250,.6)'}}><Edit2 size={13}/></button>
                      {a.sub_status==='suspended'
                        ? <button onClick={()=>handleStatus(a.id,'active')} title="Activate" style={{width:28,height:28,borderRadius:7,background:'rgba(34,197,94,.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#4ade80'}}><Shield size={13}/></button>
                        : <button onClick={()=>handleStatus(a.id,'suspended')} title="Suspend" style={{width:28,height:28,borderRadius:7,background:'rgba(239,68,68,.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(248,113,113,.6)'}}><ShieldOff size={13}/></button>
                      }
                      <button onClick={()=>handleDelete(a.id)} title="Delete" style={{width:28,height:28,borderRadius:7,background:'rgba(239,68,68,.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(248,113,113,.5)'}}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Create New Admin" width={560}>
        <form onSubmit={handleAdd} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['Email *','email','email','admin@shop.com'],['Password *','password','password','Min 6 chars'],['Name','name','text','John Doe'],['Shop Name','shop_name','text','My Fashion Store'],['Initial Credits','initial_credits','number','0'],['Trial Days','trial_days','number','7']].map(([l,k,t,ph])=>(
            <div key={k}>
              <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
              <input className="cv-input" type={t} required={k==='email'||k==='password'} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:12}}/>
            </div>
          ))}
          <div>
            <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PLAN</label>
            <select className="cv-input" value={form.plan_slug} onChange={e=>setForm(p=>({...p,plan_slug:e.target.value}))} style={{fontSize:12}}>
              {plans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>BILLING</label>
            <select className="cv-input" value={form.billing_cycle} onChange={e=>setForm(p=>({...p,billing_cycle:e.target.value}))} style={{fontSize:12}}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div style={{gridColumn:'1/-1',display:'flex',gap:8,marginTop:4}}>
            <button type="button" onClick={()=>setShowAdd(false)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button type="submit" disabled={loading} style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>
              {loading?'Creating...':'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={()=>setShowEdit(null)} title="Edit Admin" width={520}>
        {showEdit&&<form onSubmit={handleEdit} style={{display:'flex',flexDirection:'column',gap:10}}>
          {[['Name','name','John Doe'],['Shop Name','shop_name','My Shop']].map(([l,k,ph])=>(
            <div key={k}>
              <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l.toUpperCase()}</label>
              <input className="cv-input" value={showEdit[k]||''} onChange={e=>setShowEdit(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:12}}/>
            </div>
          ))}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PLAN</label>
              <select className="cv-input" value={showEdit.plan_slug||''} onChange={e=>setShowEdit(p=>({...p,plan_slug:e.target.value}))} style={{fontSize:12}}>
                {plans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>STATUS</label>
              <select className="cv-input" value={showEdit.sub_status||'trial'} onChange={e=>setShowEdit(p=>({...p,sub_status:e.target.value}))} style={{fontSize:12}}>
                {['active','trial','suspended','expired'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>EXPIRES AT</label>
            <input className="cv-input" type="date" value={showEdit.expires_at?showEdit.expires_at.slice(0,10):''} onChange={e=>setShowEdit(p=>({...p,expires_at:e.target.value}))} style={{fontSize:12}}/>
          </div>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button type="button" onClick={()=>setShowEdit(null)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button type="submit" disabled={loading} style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>{loading?'Saving...':'Save'}</button>
          </div>
        </form>}
      </Modal>

      {/* Credits Modal */}
      <Modal open={!!showCredits} onClose={()=>setShowCredits(null)} title={`Add Credits — ${showCredits?.shop_name}`} width={420}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{textAlign:'center',padding:'12px',borderRadius:12,background:'rgba(240,180,41,.06)',border:'1px solid rgba(240,180,41,.15)'}}>
            <p style={{fontSize:11,color:'rgba(240,180,41,.5)',marginBottom:4}}>Current Balance</p>
            <p style={{fontSize:'2rem',fontWeight:700,fontFamily:'Syne,sans-serif',color:'#f0b429'}}>{showCredits?.credits}</p>
          </div>
          <div><label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>CREDITS TO ADD</label>
            <input className="cv-input" type="number" min="1" value={creditAmt} onChange={e=>setCreditAmt(e.target.value)} placeholder="e.g. 200"/></div>
          <div><label style={{fontSize:10,color:'rgba(162,140,250,.45)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>NOTE</label>
            <input className="cv-input" value={creditDesc} onChange={e=>setCreditDesc(e.target.value)} placeholder="e.g. Plan payment received"/></div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowCredits(null)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button onClick={handleCredits} style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>Add Credits</button>
          </div>
        </div>
      </Modal>

      {/* Feature Flags Modal */}
      <Modal open={!!showFeatures} onClose={()=>setShowFeatures(null)} title={`Feature Access — ${showFeatures?.shop_name}`} width={520}>
        {showFeatures&&(
          <div>
            <p style={{fontSize:12,color:'rgba(162,140,250,.4)',marginBottom:14}}>Toggle individual features for this admin (overrides plan defaults)</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {ALL_FEATURES.map(f=>{
                const enabled = adminFeatures[f] !== false;
                return (
                  <div key={f} onClick={()=>toggleFeature(showFeatures.id,f,!enabled)}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:9,border:`1px solid ${enabled?'rgba(34,197,94,.3)':'rgba(30,30,45,.8)'}`,background:enabled?'rgba(34,197,94,.05)':'rgba(17,17,24,.5)',cursor:'pointer',transition:'all .2s'}}>
                    <span style={{fontSize:11,color:enabled?'#4ade80':'rgba(162,140,250,.35)',fontFamily:'Syne,sans-serif',textTransform:'capitalize'}}>{f.replace(/_/g,' ')}</span>
                    <span style={{fontSize:16}}>{enabled?'✅':'❌'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </SuperLayout>
  );
}
