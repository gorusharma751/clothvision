import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LayoutDashboard, Users, CreditCard, Settings, Package, Wand2, UserSquare, Coins, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/owners', icon: Users, label: 'Shop Owners' },
  { to: '/admin/credits', icon: CreditCard, label: 'Credits & Plans' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const ownerNav = [
  { to: '/owner', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/owner/products', icon: Package, label: 'My Products' },
  { to: '/owner/customer-tryon', icon: UserSquare, label: 'Customer Try-On' },
  { to: '/owner/credits', icon: Coins, label: 'Credits' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = user?.role === 'admin' ? adminNav : ownerNav;

  const handleLogout = () => { logout(); nav('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-5 mb-4 ${collapsed?'justify-center':''}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#7c3aed,#4c1d95)'}}>
          <Sparkles size={18} className="text-white" />
        </div>
        {!collapsed && <span className="font-display font-bold text-lg shimmer-text">ClothVision</span>}
      </div>

      {/* User badge */}
      {!collapsed && (
        <div className="mx-3 mb-4 p-3 rounded-xl" style={{background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.15)'}}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-display text-white" style={{background:'linear-gradient(135deg,#7c3aed,#f0b429)'}}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.shop_name || user?.name || user?.email}</p>
              <p className="text-xs text-purple-400/60 capitalize">{user?.role}</p>
            </div>
          </div>
          {user?.role === 'owner' && (
            <div className="mt-2 pt-2 border-t border-purple-500/10 flex items-center justify-between">
              <span className="text-xs text-purple-400/60">Credits</span>
              <span className="text-xs font-bold text-gold-400">{user?.credits ?? '–'}</span>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {items.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${isActive ? 'bg-purple-600/20 text-purple-300 font-semibold' : 'text-purple-200/50 hover:text-purple-200 hover:bg-white/5'} ${collapsed?'justify-center':''}`}>
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-purple-400' : 'text-purple-400/40 group-hover:text-purple-400/70'} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && isActive && <ChevronRight size={14} className="text-purple-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-1">
        <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-purple-200/40 hover:text-purple-200 hover:bg-white/5 transition-all hidden md:flex">
          <Menu size={18} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed?'justify-center':''}`}>
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside animate={{ width: collapsed ? 64 : 220 }} transition={{ duration: 0.3 }}
        className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 overflow-hidden"
        style={{ background: '#0d0d15', borderRight: '1px solid rgba(124,58,237,0.12)' }}>
        <SidebarContent />
      </motion.aside>

      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center glass">
        <Menu size={18} className="text-purple-400" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{x:-280}} animate={{x:0}} exit={{x:-280}} transition={{type:'spring',damping:25}}
              className="fixed left-0 top-0 h-full w-64 z-50 md:hidden"
              style={{ background: '#0d0d15', borderRight: '1px solid rgba(124,58,237,0.2)' }}>
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-purple-400 hover:text-white"><X size={18}/></button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
