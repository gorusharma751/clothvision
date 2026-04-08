import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';

export default function AdminSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/admin/plan-settings').then(r=>setPlans(r.data)); }, []);

  const update = (name, field, val) => setPlans(p => p.map(x => x.plan_name===name ? {...x,[field]:parseInt(val)||0} : x));

  const save = async () => {
    setLoading(true);
    try {
      for (const p of plans) await api.put('/admin/plan-settings', p);
      toast.success('Settings saved!');
    } catch { toast.error('Error saving'); } finally { setLoading(false); }
  };

  return (
    <Layout title="Plan Settings" subtitle="Configure credit costs per action"
      actions={<button onClick={save} disabled={loading} className="btn-primary flex items-center gap-2"><Save size={16}/>{loading?'Saving...':'Save All'}</button>}>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p, i) => (
          <motion.div key={p.plan_name} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
            className="rounded-2xl p-5" style={{background:'#111118', border:`1px solid ${p.plan_name==='pro' ? 'rgba(124,58,237,0.4)' : '#1e1e2d'}`}}>
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} className="text-gold-400"/>
              <h3 className="font-display font-bold text-white capitalize text-lg">{p.plan_name}</h3>
              {p.plan_name==='pro' && <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(124,58,237,0.15)',color:'#a78bfa'}}>Popular</span>}
            </div>
            {[
              ['credits_per_image', 'Credits per AI Image'],
              ['tryon_credits', 'Customer Try-On Credits'],
              ['upscale_credits', 'Upscale Credits'],
            ].map(([field, label]) => (
              <div key={field} className="mb-4">
                <label className="text-xs text-purple-300/60 block mb-1.5">{label}</label>
                <input className="input-field" type="number" min="1" value={p[field]||1} onChange={e=>update(p.plan_name, field, e.target.value)}/>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
