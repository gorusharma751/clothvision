import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, sub, color = 'purple', index = 0 }) {
  const colors = {
    purple: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', icon: '#a78bfa', val: '#fff' },
    gold: { bg: 'rgba(240,180,41,0.08)', border: 'rgba(240,180,41,0.2)', icon: '#f0b429', val: '#f0b429' },
    green: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: '#4ade80', val: '#4ade80' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: '#f87171', val: '#f87171' },
  };
  const c = colors[color];
  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:index*0.08}}
      className="stat-card" style={{borderColor:c.border}}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:c.bg}}>
          <Icon size={20} style={{color:c.icon}} />
        </div>
      </div>
      <p className="text-2xl font-bold font-display mb-1" style={{color:c.val}}>{value}</p>
      <p className="text-sm text-purple-200/50">{label}</p>
      {sub && <p className="text-xs text-purple-400/40 mt-1">{sub}</p>}
    </motion.div>
  );
}
