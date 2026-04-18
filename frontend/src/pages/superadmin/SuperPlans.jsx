import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { SuperLayout } from './SuperDashboard';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

const ALL_FEATURES = ['fashion_tryon','bg_generator','scene_builder','listing_content','360_view','label_creator','video_studio','marketing_studio','customer_tryon','api_access','priority_support','custom_branding','all_features'];

export default function SuperPlans() {
  const [plans,setPlans]=useState([]);
  const [showModal,setShowModal]=useState(false);
  const [editPlan,setEditPlan]=useState(null);
  const [loading,setLoading]=useState(false);
  const empty={name:'',slug:'',description:'',price_monthly:0,price_yearly:0,credits_monthly:200,max_users:5,max_products:100,features:[],sort_order:0,is_active:true};
  const [form,setForm]=useState(empty);

  const load=()=>api.get('/superadmin/plans').then(r=>setPlans(r.data)).catch(()=>{});
  useEffect(()=>{load();},[]);

  const openAdd=()=>{setForm(empty);setEditPlan(null);setShowModal(true);};
  const openEdit=(p)=>{setForm({...p,features:typeof p.features==='string'?JSON.parse(p.features):p.features||[]});setEditPlan(p);setShowModal(true);};

  const toggleFeature=(f)=>setForm(p=>({...p,features:p.features.includes(f)?p.features.filter(x=>x!==f):[...p.features,f]}));

  const save=async e=>{e.preventDefault();setLoading(true);
    try{
      if(editPlan) await api.put(`/superadmin/plans/${editPlan.id}`,form);
      else await api.post('/superadmin/plans',form);
      toast.success(editPlan?'Plan updated!':'Plan created!');
      setShowModal(false);load();
    }catch(err){toast.error(err.response?.data?.error||'Error');}finally{setLoading(false);}
  };

  const deletePlan=async id=>{if(!confirm('Deactivate this plan?'))return;
    try{await api.delete(`/superadmin/plans/${id}`);toast.success('Plan deactivated');load();}
    catch(err){toast.error(err.response?.data?.error||'Error');}
  };

  return (
    <SuperLayout title="Subscription Plans" subtitle="Create and manage SaaS plans"
      actions={<button onClick={openAdd} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}><Plus size={14}/>New Plan</button>}>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {plans.map(p=>{
          const features=typeof p.features==='string'?JSON.parse(p.features):p.features||[];
          return (
            <div key={p.id} style={{background:'#111118',border:'1px solid rgba(240,180,41,.2)',borderRadius:18,padding:20,position:'relative',opacity:p.is_active?1:.5}}>
              {!p.is_active&&<div style={{position:'absolute',top:10,right:10,background:'rgba(239,68,68,.15)',color:'#f87171',fontSize:10,padding:'2px 8px',borderRadius:8,fontWeight:600}}>INACTIVE</div>}
              <div style={{marginBottom:14}}>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.2rem',color:'#f0b429',marginBottom:4}}>{p.name}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:10}}>{p.description}</p>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.6rem',color:'#fff'}}>₹{parseFloat(p.price_monthly).toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:'rgba(162,140,250,.4)'}}>/mo</span></p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.35)'}}>₹{parseFloat(p.price_yearly).toLocaleString()}/year</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                {[['💳',`${p.credits_monthly} credits/mo`],['👥',`${p.max_users} users`],['📦',`${p.max_products} products`]].map(([ic,lb])=>(
                  <div key={lb} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'rgba(226,226,240,.6)'}}><span>{ic}</span>{lb}</div>
                ))}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:14}}>
                {features.slice(0,4).map(f=>(
                  <span key={f} style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:'rgba(34,197,94,.08)',color:'#4ade80',fontWeight:500}}>{f.replace(/_/g,' ')}</span>
                ))}
                {features.length>4&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:'rgba(162,140,250,.08)',color:'rgba(162,140,250,.5)'}}>+{features.length-4} more</span>}
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>openEdit(p)} style={{flex:1,padding:'7px',borderRadius:8,background:'rgba(240,180,41,.1)',border:'1px solid rgba(240,180,41,.2)',color:'#f0b429',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Edit2 size={12}/>Edit</button>
                <button onClick={()=>deletePlan(p.id)} style={{width:32,height:32,borderRadius:8,background:'rgba(239,68,68,.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(248,113,113,.4)'}}><Trash2 size={12}/></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editPlan?'Edit Plan':'Create Plan'} width={600}>
        <form onSubmit={save}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[['Plan Name','name','text','Professional'],['Slug','slug','text','professional'],['Monthly Price (₹)','price_monthly','number','2499'],['Yearly Price (₹)','price_yearly','number','22999'],['Credits/Month','credits_monthly','number','800'],['Max Users','max_users','number','5'],['Max Products','max_products','number','500'],['Sort Order','sort_order','number','2']].map(([l,k,t,ph])=>(
              <div key={k}>
                <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l.toUpperCase()}</label>
                <input className="cv-input" type={t} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:t==='number'?parseFloat(e.target.value)||0:e.target.value}))} placeholder={ph} style={{fontSize:12}}/>
              </div>
            ))}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:10,color:'rgba(162,140,250,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>DESCRIPTION</label>
              <input className="cv-input" value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Plan description" style={{fontSize:12}}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:8,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>FEATURES (click to toggle)</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:6}}>
              {ALL_FEATURES.map(f=>{const sel=form.features?.includes(f); return (
                <div key={f} onClick={()=>toggleFeature(f)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:8,border:`1px solid ${sel?'rgba(34,197,94,.4)':'rgba(30,30,45,.8)'}`,background:sel?'rgba(34,197,94,.06)':'transparent',cursor:'pointer',transition:'all .2s'}}>
                  <span style={{fontSize:14}}>{sel?'✅':'⬜'}</span>
                  <span style={{fontSize:11,color:sel?'#4ade80':'rgba(162,140,250,.35)',textTransform:'capitalize'}}>{f.replace(/_/g,' ')}</span>
                </div>
              );})}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setShowModal(false)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button type="submit" disabled={loading} style={{flex:1,padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#f0b429,#d69e2e)',color:'#000',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>
              {loading?'Saving...':editPlan?'Update Plan':'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </SuperLayout>
  );
}
