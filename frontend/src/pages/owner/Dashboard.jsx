import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Image, Coins, ArrowRight, Zap, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [credits, setCredits] = useState({ balance: 0, total_used: 0 });
  const [recentImages, setRecentImages] = useState([]);

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data));
    api.get('/credits/balance').then(r => setCredits(r.data));
  }, []);

  const totalImages = products.reduce((s, p) => s + parseInt(p.image_count||0), 0);

  return (
    <Layout title={`${user?.shop_name || 'My Shop'}`} subtitle="AI Fashion Studio Dashboard"
      actions={<Link to="/owner/products" className="btn-primary flex items-center gap-2"><Plus size={16}/>Add Product</Link>}>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Products" value={products.length} color="purple" index={0}/>
        <StatCard icon={Image} label="Images Generated" value={totalImages} color="green" index={1}/>
        <StatCard icon={Coins} label="Credits Left" value={credits.balance} color="gold" index={2}/>
        <StatCard icon={TrendingUp} label="Credits Used" value={credits.total_used} color="red" index={3}/>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { to: '/owner/products', icon: Package, title: 'Upload Product', desc: 'Add new product for AI photography', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
          { to: '/owner/customer-tryon', icon: Zap, title: 'Customer Try-On', desc: 'Show customers how they look in your clothes', color: '#f0b429', bg: 'rgba(240,180,41,0.08)' },
          { to: '/owner/credits', icon: Coins, title: 'Request Credits', desc: 'Request more AI generation credits', color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
        ].map(({ to, icon: Icon, title, desc, color, bg }, i) => (
          <motion.div key={to} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2+i*0.08}}>
            <Link to={to} className="block p-5 rounded-2xl transition-all hover:scale-[1.02] group" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{background:bg}}>
                <Icon size={22} style={{color}}/>
              </div>
              <h3 className="font-display font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-purple-300/50">{desc}</p>
              <ArrowRight size={14} className="mt-3 transition-transform group-hover:translate-x-1" style={{color}}/>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent products */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
        className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white">Recent Products</h2>
          <Link to="/owner/products" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View all <ArrowRight size={12}/></Link>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={36} className="mx-auto text-purple-400/20 mb-3"/>
            <p className="text-purple-400/40 text-sm">No products yet</p>
            <Link to="/owner/products" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"><Plus size={14}/>Add First Product</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.slice(0,6).map(p => (
              <Link key={p.id} to={`/owner/generate/${p.id}`} className="group">
                <div className="aspect-square rounded-xl overflow-hidden mb-2 relative" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
                  {p.original_image ? (
                    <img src={`/uploads/${p.original_image.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}`} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-purple-400/30"/></div>
                  )}
                  <div className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded-md font-bold" style={{background:'rgba(0,0,0,0.7)',color:'#f0b429'}}>{p.image_count}</div>
                </div>
                <p className="text-xs text-purple-200/70 truncate">{p.name}</p>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
