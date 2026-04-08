import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

export default function AdminCredits() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [approveAmt, setApproveAmt] = useState('');
  const [note, setNote] = useState('');

  const load = () => api.get('/admin/credit-requests').then(r => setRequests(r.data));
  useEffect(() => { load(); }, []);

  const handle = async (status) => {
    try {
      await api.put(`/admin/credit-requests/${selected.id}`, { status, admin_note: note, credits_to_add: status==='approved' ? parseInt(approveAmt||selected.amount_requested) : 0 });
      toast.success(status === 'approved' ? 'Request approved & credits added!' : 'Request rejected');
      setSelected(null); setApproveAmt(''); setNote(''); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const statusBadge = s => {
    const m = { pending: ['rgba(251,191,36,0.1)','#f0b429', Clock], approved: ['rgba(34,197,94,0.1)','#4ade80', CheckCircle], rejected: ['rgba(239,68,68,0.1)','#f87171', XCircle] };
    const [bg, color, Icon] = m[s] || m.pending;
    return <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{background:bg, color}}><Icon size={12}/>{s}</span>;
  };

  return (
    <Layout title="Credit Requests" subtitle="Manage owner credit requests">
      <div className="space-y-3">
        {requests.length === 0 && <div className="text-center py-20 text-purple-400/40">No requests yet</div>}
        {requests.map((r, i) => (
          <motion.div key={r.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
            className="rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
            style={{background:'#111118', border:'1px solid #1e1e2d'}}
            onClick={() => { if(r.status==='pending') { setSelected(r); setApproveAmt(String(r.amount_requested)); }}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white font-display" style={{background:'linear-gradient(135deg,#7c3aed,#f0b429)'}}>
                {(r.shop_name||'S')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{r.shop_name || r.name}</p>
                <p className="text-xs text-purple-400/50">{r.email} · Balance: {r.current_balance} cr</p>
                {r.message && <p className="text-xs text-purple-300/40 mt-0.5 flex items-center gap-1"><MessageSquare size={10}/>{r.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-gold-400 font-display">+{r.amount_requested}</p>
                <p className="text-xs text-purple-400/40">credits</p>
              </div>
              {statusBadge(r.status)}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Approve Request — ${selected?.shop_name}`}>
        {selected && <div className="space-y-4">
          <div className="p-3 rounded-xl" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
            <p className="text-xs text-purple-400/60 mb-1">Requested amount</p>
            <p className="text-2xl font-bold text-gold-400 font-display">+{selected.amount_requested} credits</p>
            {selected.message && <p className="text-xs text-purple-300/60 mt-2">"{selected.message}"</p>}
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">CREDITS TO ADD</label>
            <input className="input-field" type="number" value={approveAmt} onChange={e=>setApproveAmt(e.target.value)} min="1"/>
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">ADMIN NOTE</label>
            <input className="input-field" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note to owner"/>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={()=>handle('rejected')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors" style={{border:'1px solid rgba(239,68,68,0.2)'}}>Reject</button>
            <button onClick={()=>handle('approved')} className="flex-1 btn-gold">Approve & Add</button>
          </div>
        </div>}
      </Modal>
    </Layout>
  );
}
