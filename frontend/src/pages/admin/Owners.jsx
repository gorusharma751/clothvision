import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, CreditCard, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

const THEMES = ['dark-luxury','light-minimal','colorful-bold','professional-clean'];
const PLANS = ['basic','pro','enterprise'];

export default function AdminOwners() {
  const [owners, setOwners] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCredit, setShowCredit] = useState(null);
  const [editOwner, setEditOwner] = useState(null);
  const [form, setForm] = useState({ email:'', password:'', name:'', shop_name:'', theme:'dark-luxury', plan:'basic', initial_credits:50 });
  const [creditAmt, setCreditAmt] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/admin/owners').then(r => { setOwners(r.data); setFiltered(r.data); });
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setFiltered(owners.filter(o => !search || o.shop_name?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase())));
  }, [search, owners]);

  const handleAdd = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/admin/owners', form);
      toast.success('Owner created!'); setShowAdd(false); setForm({ email:'', password:'', name:'', shop_name:'', theme:'dark-luxury', plan:'basic', initial_credits:50 }); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Error'); } finally { setLoading(false); }
  };

  const handleEdit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/admin/owners/${editOwner.id}`, editOwner);
      toast.success('Updated!'); setEditOwner(null); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Error'); } finally { setLoading(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this owner? All their data will be deleted.')) return;
    try { await api.delete(`/admin/owners/${id}`); toast.success('Deleted'); load(); }
    catch(err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleAddCredit = async () => {
    if (!creditAmt) return;
    try {
      await api.post('/admin/credits/add', { owner_id: showCredit.id, amount: parseInt(creditAmt), description: creditDesc || 'Credits added by admin' });
      toast.success(`Added ${creditAmt} credits!`); setShowCredit(null); setCreditAmt(''); setCreditDesc(''); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const FormFields = ({ data, setData, isEdit }) => (
    <div className="space-y-3">
      {!isEdit && <><div>
        <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">EMAIL *</label>
        <input className="input-field" value={data.email} onChange={e=>setData({...data,email:e.target.value})} required type="email" placeholder="owner@shop.com"/>
      </div>
      <div>
        <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">PASSWORD *</label>
        <input className="input-field" value={data.password} onChange={e=>setData({...data,password:e.target.value})} required type="password" placeholder="Min 6 chars"/>
      </div></>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">OWNER NAME</label>
          <input className="input-field" value={data.name} onChange={e=>setData({...data,name:e.target.value})} placeholder="John Doe"/>
        </div>
        <div>
          <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">SHOP NAME</label>
          <input className="input-field" value={data.shop_name} onChange={e=>setData({...data,shop_name:e.target.value})} placeholder="My Fashion Store"/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">THEME</label>
          <select className="input-field" value={data.theme} onChange={e=>setData({...data,theme:e.target.value})}>
            {THEMES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">PLAN</label>
          <select className="input-field" value={data.plan} onChange={e=>setData({...data,plan:e.target.value})}>
            {PLANS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {!isEdit && <div>
        <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">INITIAL CREDITS</label>
        <input className="input-field" type="number" value={data.initial_credits} onChange={e=>setData({...data,initial_credits:parseInt(e.target.value)})} min="0"/>
      </div>}
    </div>
  );

  return (
    <Layout title="Shop Owners" subtitle={`${owners.length} registered owners`}
      actions={<button onClick={()=>setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/>New Owner</button>}>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400/40"/>
        <input className="input-field pl-9" placeholder="Search owners..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
        <table className="w-full">
          <thead>
            <tr style={{borderBottom:'1px solid #1e1e2d'}}>
              {['Shop','Owner','Plan','Credits','Status','Actions'].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-display tracking-wider text-purple-400/50">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <motion.tr key={o.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                className="border-t transition-colors hover:bg-white/[0.02]" style={{borderColor:'rgba(30,30,45,0.5)'}}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#7c3aed,#f0b429)'}}>
                      {(o.shop_name||'S')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">{o.shop_name||'–'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{o.name||'–'}</p>
                  <p className="text-xs text-purple-400/50">{o.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{background:'rgba(124,58,237,0.1)',color:'#a78bfa'}}>{o.plan}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-gold-400">{o.credits}</span>
                  <span className="text-xs text-purple-400/40 ml-1">/{o.credits_used} used</span>
                </td>
                <td className="px-4 py-3">
                  {o.is_active ? <span className="text-xs text-green-400">Active</span> : <span className="text-xs text-red-400">Suspended</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setShowCredit(o)} className="p-1.5 rounded-lg text-gold-400 hover:bg-yellow-500/10 transition-colors" title="Add Credits"><CreditCard size={15}/></button>
                    <button onClick={()=>setEditOwner({...o})} className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors" title="Edit"><Edit2 size={15}/></button>
                    <button onClick={()=>handleDelete(o.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={15}/></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-16 text-purple-400/40">No owners found</div>}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Create Shop Owner">
        <form onSubmit={handleAdd} className="space-y-4">
          <FormFields data={form} setData={setForm} isEdit={false}/>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={()=>setShowAdd(false)} className="flex-1 py-2 rounded-xl border text-purple-400 text-sm hover:bg-white/5" style={{borderColor:'rgba(124,58,237,0.2)'}}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">{loading ? 'Creating...' : 'Create Owner'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editOwner} onClose={()=>setEditOwner(null)} title="Edit Owner">
        {editOwner && <form onSubmit={handleEdit} className="space-y-4">
          <FormFields data={editOwner} setData={setEditOwner} isEdit={true}/>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
            <span className="text-sm text-purple-300">Active</span>
            <button type="button" onClick={()=>setEditOwner({...editOwner, is_active:!editOwner.is_active})} className="text-purple-400">
              {editOwner.is_active ? <ToggleRight size={24} className="text-green-400"/> : <ToggleLeft size={24}/>}
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={()=>setEditOwner(null)} className="flex-1 py-2 rounded-xl border text-purple-400 text-sm hover:bg-white/5" style={{borderColor:'rgba(124,58,237,0.2)'}}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>}
      </Modal>

      {/* Credit Modal */}
      <Modal open={!!showCredit} onClose={()=>setShowCredit(null)} title={`Add Credits — ${showCredit?.shop_name}`}>
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-center" style={{background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.2)'}}>
            <p className="text-xs text-gold-400/70 mb-1">Current Balance</p>
            <p className="text-3xl font-bold font-display text-gold-400">{showCredit?.credits}</p>
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">CREDITS TO ADD</label>
            <input className="input-field" type="number" value={creditAmt} onChange={e=>setCreditAmt(e.target.value)} min="1" placeholder="e.g. 100"/>
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">NOTE (optional)</label>
            <input className="input-field" value={creditDesc} onChange={e=>setCreditDesc(e.target.value)} placeholder="Reason for adding credits"/>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowCredit(null)} className="flex-1 py-2 rounded-xl border text-purple-400 text-sm hover:bg-white/5" style={{borderColor:'rgba(124,58,237,0.2)'}}>Cancel</button>
            <button onClick={handleAddCredit} className="flex-1 btn-gold">Add Credits</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
