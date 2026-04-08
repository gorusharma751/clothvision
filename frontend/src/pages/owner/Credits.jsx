import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Plus, Clock, CheckCircle, XCircle, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

export default function OwnerCredits() {
  const [balance, setBalance] = useState({ balance: 0, total_used: 0 });
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/credits/balance').then(r => setBalance(r.data));
    api.get('/credits/history').then(r => setHistory(r.data));
    api.get('/credits/my-requests').then(r => setRequests(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleRequest = async e => {
    e.preventDefault();
    if (!amount) return;
    try {
      await api.post('/credits/request', { amount_requested: parseInt(amount), message });
      toast.success('Request sent to admin!');
      setShowRequest(false); setAmount(''); setMessage(''); load();
    } catch { toast.error('Error sending request'); }
  };

  const statusIcon = s => s==='approved' ? <CheckCircle size={13} className="text-green-400"/> : s==='rejected' ? <XCircle size={13} className="text-red-400"/> : <Clock size={13} className="text-gold-400"/>;

  return (
    <Layout title="Credits" subtitle="Manage your AI generation credits"
      actions={<button onClick={()=>setShowRequest(true)} className="btn-gold flex items-center gap-2"><Plus size={16}/>Request Credits</button>}>

      {/* Balance */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
          className="rounded-2xl p-6 text-center" style={{background:'linear-gradient(135deg, rgba(240,180,41,0.12), rgba(240,180,41,0.04))', border:'1px solid rgba(240,180,41,0.25)'}}>
          <Coins size={28} className="mx-auto mb-2 text-gold-400"/>
          <p className="text-4xl font-bold font-display text-gold-400 mb-1">{balance.balance}</p>
          <p className="text-xs text-gold-400/60">Available Credits</p>
        </motion.div>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:0.1}}
          className="rounded-2xl p-6 text-center" style={{background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)'}}>
          <TrendingDown size={28} className="mx-auto mb-2 text-purple-400"/>
          <p className="text-4xl font-bold font-display text-purple-300 mb-1">{balance.total_used}</p>
          <p className="text-xs text-purple-400/60">Total Used</p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My requests */}
        <div className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
          <h3 className="font-display font-semibold text-white mb-4">My Requests</h3>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-purple-400/40 text-sm">No requests yet</div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:'rgba(124,58,237,0.04)', border:'1px solid rgba(124,58,237,0.08)'}}>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">{statusIcon(r.status)}<span className="text-sm font-bold text-white">+{r.amount_requested}</span></div>
                    {r.message && <p className="text-xs text-purple-400/50">{r.message}</p>}
                    {r.admin_note && <p className="text-xs text-green-400/70 mt-0.5">Admin: {r.admin_note}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${r.status==='approved'?'text-green-400 bg-green-500/10':r.status==='rejected'?'text-red-400 bg-red-500/10':'text-gold-400 bg-yellow-500/10'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
          <h3 className="font-display font-semibold text-white mb-4">Transaction History</h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-purple-400/40 text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${h.type==='add' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {h.type==='add' ? <TrendingUp size={13} className="text-green-400"/> : <TrendingDown size={13} className="text-red-400"/>}
                    </div>
                    <div>
                      <p className="text-xs text-white">{h.description}</p>
                      <p className="text-xs text-purple-400/40">{new Date(h.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-display ${h.type==='add' ? 'text-green-400' : 'text-red-400'}`}>
                    {h.type==='add' ? '+' : '-'}{Math.abs(h.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showRequest} onClose={()=>setShowRequest(false)} title="Request Credits from Admin">
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="p-3 rounded-xl text-center" style={{background:'rgba(240,180,41,0.06)', border:'1px solid rgba(240,180,41,0.15)'}}>
            <p className="text-xs text-gold-400/60 mb-1">Current Balance</p>
            <p className="text-3xl font-bold font-display text-gold-400">{balance.balance}</p>
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">CREDITS NEEDED *</label>
            <input className="input-field" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="e.g. 100"/>
          </div>
          <div>
            <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">MESSAGE TO ADMIN</label>
            <textarea className="input-field resize-none" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell admin why you need credits..."/>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>setShowRequest(false)} className="flex-1 py-2.5 rounded-xl border text-purple-400 text-sm hover:bg-white/5" style={{borderColor:'rgba(124,58,237,0.2)'}}>Cancel</button>
            <button type="submit" className="flex-1 btn-gold">Send Request</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
