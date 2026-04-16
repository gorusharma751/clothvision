import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';

const SECTIONS = [
  {key:'hero_title',label:'Hero Title',type:'text',placeholder:'AI Image Generator for'},
  {key:'hero_highlight',label:'Hero Highlight (colored)',type:'text',placeholder:'Fashion & Product Shoots'},
  {key:'hero_subtitle',label:'Hero Subtitle',type:'textarea',placeholder:'Generate studio-quality...'},
  {key:'hero_badge',label:'Hero Badge',type:'text',placeholder:'🔥 Trusted by 50,000+ sellers'},
  {key:'cta_primary',label:'CTA Button Text',type:'text',placeholder:'Start Creating Free'},
  {key:'announcement',label:'Announcement Bar Text',type:'text',placeholder:'🚀 NEW: ...'},
  {key:'show_announcement',label:'Show Announcement Bar',type:'toggle'},
];

export default function LandingCMS() {
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  // Editable arrays
  const [stats, setStats] = useState([]);
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [whyItems, setWhyItems] = useState([]);

  useEffect(()=>{
    api.get('/landing/cms').then(r=>{
      setData(r.data||{});
      if(r.data?.stats) setStats(r.data.stats);
      if(r.data?.features) setFeatures(r.data.features);
      if(r.data?.testimonials) setTestimonials(r.data.testimonials);
      if(r.data?.why_items) setWhyItems(r.data.why_items);
    }).catch(()=>{});
  },[]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        stats, features, testimonials, why_items: whyItems
      };
      await api.put('/landing/cms', payload);
      toast.success('Landing page updated! Changes live immediately.');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const updateArr = (arr, setArr, i, field, val) => {
    setArr(prev => prev.map((item, idx) => idx===i ? {...item, [field]:val} : item));
  };
  const removeArr = (arr, setArr, i) => setArr(prev => prev.filter((_,idx)=>idx!==i));
  const addArr = (setArr, template) => setArr(prev => [...prev, template]);

  return (
    <Layout title="Landing Page Editor" subtitle="Edit your public landing page content"
      actions={
        <div className="page-action-group">
          <Link to="/" target="_blank" style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(124,58,237,.25)',color:'#a78bfa',textDecoration:'none',fontSize:12,fontWeight:600}}>
            <Eye size={13}/>Preview
          </Link>
          <button onClick={save} disabled={saving} className="btn-primary" style={{fontSize:12,padding:'7px 16px'}}>
            <Save size={13}/>{saving?'Saving...':'Save Changes'}
          </button>
        </div>
      }>

      <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:900,width:'100%'}}>
        {/* Basic text fields */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:16,fontSize:'1rem'}}>Hero Section</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
            {SECTIONS.map(s=>(
              <div key={s.key}>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{s.label.toUpperCase()}</label>
                {s.type==='toggle' ? (
                  <label className="toggle">
                    <input type="checkbox" checked={data[s.key]===true||data[s.key]==='true'} onChange={e=>setData(p=>({...p,[s.key]:e.target.checked}))}/>
                    <div className="toggle-track"/><div className="toggle-thumb"/>
                  </label>
                ) : s.type==='textarea' ? (
                  <textarea className="cv-input" value={data[s.key]||''} onChange={e=>setData(p=>({...p,[s.key]:e.target.value}))} placeholder={s.placeholder} style={{resize:'none',minHeight:72,fontSize:13}}/>
                ) : (
                  <input className="cv-input" value={data[s.key]||''} onChange={e=>setData(p=>({...p,[s.key]:e.target.value}))} placeholder={s.placeholder} style={{fontSize:13}}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:10,flexWrap:'wrap'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>Stats (30+, 50K+, etc.)</h3>
            <button onClick={()=>addArr(setStats,{value:'0',label:'New Stat'})} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,border:'1px solid rgba(124,58,237,.25)',background:'transparent',color:'#a78bfa',fontSize:11,cursor:'pointer'}}><Plus size={11}/>Add</button>
          </div>
          {stats.map((s,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center',flexWrap:'wrap'}}>
              <input className="cv-input" value={s.value} onChange={e=>updateArr(stats,setStats,i,'value',e.target.value)} placeholder="30+" style={{fontSize:13,flex:'1 1 110px',minWidth:92}}/>
              <input className="cv-input" value={s.label} onChange={e=>updateArr(stats,setStats,i,'label',e.target.value)} placeholder="Categories" style={{fontSize:13,flex:'3 1 220px'}}/>
              <button onClick={()=>removeArr(stats,setStats,i)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#f87171',borderRadius:7,padding:'6px 8px',cursor:'pointer'}}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:10,flexWrap:'wrap'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>Features</h3>
            <button onClick={()=>addArr(setFeatures,{icon:'⭐',title:'New Feature',desc:'Description'})} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,border:'1px solid rgba(124,58,237,.25)',background:'transparent',color:'#a78bfa',fontSize:11,cursor:'pointer'}}><Plus size={11}/>Add</button>
          </div>
          {features.map((f,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start',flexWrap:'wrap'}}>
              <input className="cv-input" value={f.icon} onChange={e=>updateArr(features,setFeatures,i,'icon',e.target.value)} placeholder="👗" style={{fontSize:18,flex:'0 0 56px',textAlign:'center'}}/>
              <input className="cv-input" value={f.title} onChange={e=>updateArr(features,setFeatures,i,'title',e.target.value)} placeholder="Feature name" style={{fontSize:13,flex:'1 1 180px'}}/>
              <input className="cv-input" value={f.desc} onChange={e=>updateArr(features,setFeatures,i,'desc',e.target.value)} placeholder="Description" style={{fontSize:13,flex:'2 1 260px'}}/>
              <button onClick={()=>removeArr(features,setFeatures,i)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#f87171',borderRadius:7,padding:'6px 8px',cursor:'pointer',flexShrink:0}}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:10,flexWrap:'wrap'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>Testimonials</h3>
            <button onClick={()=>addArr(setTestimonials,{name:'Customer Name',role:'Shop Owner',text:'Great product!',rating:5})} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,border:'1px solid rgba(124,58,237,.25)',background:'transparent',color:'#a78bfa',fontSize:11,cursor:'pointer'}}><Plus size={11}/>Add</button>
          </div>
          {testimonials.map((t,i)=>(
            <div key={i} style={{background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.1)',borderRadius:10,padding:12,marginBottom:10,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <input className="cv-input" value={t.name} onChange={e=>updateArr(testimonials,setTestimonials,i,'name',e.target.value)} placeholder="Customer Name" style={{fontSize:12,flex:1}}/>
                <input className="cv-input" value={t.role} onChange={e=>updateArr(testimonials,setTestimonials,i,'role',e.target.value)} placeholder="Role/Shop" style={{fontSize:12,flex:1}}/>
                <select className="cv-input" value={t.rating} onChange={e=>updateArr(testimonials,setTestimonials,i,'rating',parseInt(e.target.value))} style={{fontSize:12,flex:'0 0 70px'}}>
                  {[5,4,3,2,1].map(r=><option key={r} value={r}>{r}★</option>)}
                </select>
                <button onClick={()=>removeArr(testimonials,setTestimonials,i)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#f87171',borderRadius:7,padding:'6px 8px',cursor:'pointer',flexShrink:0}}><Trash2 size={12}/></button>
              </div>
              <textarea className="cv-input" value={t.text} onChange={e=>updateArr(testimonials,setTestimonials,i,'text',e.target.value)} placeholder="Customer review..." style={{resize:'none',minHeight:56,fontSize:12}}/>
            </div>
          ))}
        </div>

        <button onClick={save} disabled={saving} className="btn-primary" style={{alignSelf:'flex-start',padding:'10px 28px',fontSize:'.9rem',width:'100%',maxWidth:320}}>
          <Save size={14}/>{saving?'Saving...':'Save All Changes'}
        </button>
      </div>
    </Layout>
  );
}
