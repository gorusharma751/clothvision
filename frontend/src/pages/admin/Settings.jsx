import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Zap, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';

const THEMES = [
  { id:'dark-luxury',        label:'Dark Luxury',     preview:['#0a0a0f','#7c3aed','#f0b429'] },
  { id:'light-minimal',      label:'Light Minimal',   preview:['#f8f8f5','#1a1a2e','#c9a227'] },
  { id:'colorful-bold',      label:'Colorful Bold',   preview:['#1a0533','#e91e8c','#00d4ff'] },
  { id:'professional-clean', label:'Professional',    preview:['#0f1923','#2196f3','#ffffff'] },
];

export default function AdminSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ api.get('/admin/plan-settings').then(r=>setPlans(r.data)).catch(()=>{}); }, []);
  const update = (name, field, val) => setPlans(p=>p.map(x=>x.plan_name===name?{...x,[field]:parseInt(val)||0}:x));

  const save = async () => {
    setLoading(true);
    try { for(const p of plans) await api.put('/admin/plan-settings', p); toast.success('Saved!'); }
    catch { toast.error('Error saving'); } finally { setLoading(false); }
  };

  return (
    <Layout title="Settings" subtitle="Credit costs & platform configuration"
      actions={<button onClick={save} disabled={loading} className="btn btn-purple"><Save size={15}/>{loading?'Saving...':'Save All'}</button>}>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:24}}>
        {plans.map((p,i)=>(
          <motion.div key={p.plan_name} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}
            style={{background:'#111118',border:`1px solid ${p.plan_name==='pro'?'rgba(124,58,237,0.4)':'#1e1e2d'}`,borderRadius:16,padding:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <Zap size={16} color="#f0b429"/>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'1rem',textTransform:'capitalize'}}>{p.plan_name}</h3>
              {p.plan_name==='pro' && <span className="badge badge-purple">Popular</span>}
            </div>
            {[['credits_per_image','Credits / AI Image'],['tryon_credits','Customer Try-On'],['upscale_credits','HD Upscale']].map(([f,l])=>(
              <div key={f} style={{marginBottom:12}}>
                <label className="label">{l}</label>
                <input className="input" type="number" min="1" value={p[f]||1} onChange={e=>update(p.plan_name,f,e.target.value)} style={{padding:'7px 10px',fontSize:'0.85rem'}}/>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Theme preview */}
      <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <Palette size={16} color="#a78bfa"/>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'0.95rem'}}>Available Themes</h3>
          <span style={{fontSize:'0.7rem',color:'#6b6b8a'}}>Assign to owners from Owners page</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
          {THEMES.map(t=>(
            <div key={t.id} style={{borderRadius:12,overflow:'hidden',border:'1px solid #1e1e2d'}}>
              <div style={{height:48,background:t.preview[0],display:'flex',alignItems:'center',gap:6,padding:'0 12px'}}>
                {t.preview.slice(1).map((c,i)=><div key={i} style={{width:16,height:16,borderRadius:'50%',background:c}}/>)}
              </div>
              <div style={{padding:'8px 10px',background:'rgba(255,255,255,0.02)'}}>
                <p style={{fontSize:'0.75rem',fontWeight:600,color:'#c4b5fd'}}>{t.label}</p>
                <p style={{fontSize:'0.65rem',color:'#6b6b8a',marginTop:2,fontFamily:'monospace'}}>{t.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
