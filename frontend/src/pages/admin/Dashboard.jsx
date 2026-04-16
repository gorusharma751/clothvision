import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Package, Image, CreditCard, TrendingUp, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/credit-requests').then(r => setRequests(r.data.filter(x=>x.status==='pending').slice(0,5)));
    api.get('/admin/owners').then(r => setOwners(r.data.slice(0,5)));
  }, []);

  return (
    <Layout title="Admin Dashboard" subtitle="ClothVision Control Center"
      actions={<Link to="/admin/owners" className="btn-primary flex items-center gap-2 whitespace-nowrap"><Plus size={16}/>Add Owner</Link>}>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard icon={Users} label="Shop Owners" value={stats?.total_owners ?? '–'} color="purple" index={0} />
        <StatCard icon={Package} label="Total Products" value={stats?.total_products ?? '–'} color="gold" index={1} />
        <StatCard icon={Image} label="Images Generated" value={stats?.total_images ?? '–'} color="green" index={2} />
        <StatCard icon={AlertCircle} label="Pending Requests" value={stats?.pending_credit_requests ?? '–'} color="red" index={3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending credit requests */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white flex items-center gap-2"><CreditCard size={18} className="text-gold-400"/>Credit Requests</h2>
            <Link to="/admin/credits" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View all <ArrowRight size={12}/></Link>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-purple-400/40 text-sm">No pending requests</div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl gap-2" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
                  <div>
                    <p className="text-sm font-semibold text-white">{r.shop_name || r.name}</p>
                    <p className="text-xs text-purple-400/60">{r.message?.slice(0,40) || 'No message'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-gold-400">+{r.amount_requested}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(251,191,36,0.1)',color:'#f0b429'}}>pending</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent owners */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
          className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white flex items-center gap-2"><Users size={18} className="text-purple-400"/>Recent Owners</h2>
            <Link to="/admin/owners" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View all <ArrowRight size={12}/></Link>
          </div>
          {owners.length === 0 ? (
            <div className="text-center py-8 text-purple-400/40 text-sm">No owners yet</div>
          ) : (
            <div className="space-y-2">
              {owners.map(o => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-display text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#7c3aed,#f0b429)'}}>
                    {(o.shop_name||o.name||'S')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{o.shop_name || o.name}</p>
                    <p className="text-xs text-purple-400/50 truncate">{o.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gold-400">{o.credits} cr</p>
                    <p className="text-xs text-purple-400/40">{o.plan}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
