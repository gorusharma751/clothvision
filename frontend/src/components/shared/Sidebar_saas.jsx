import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Settings, Wand2, Globe,
  Image, ShoppingBag, Sparkles, Crown, LogOut, ChevronLeft,
  ChevronRight, Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ADMIN_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/owners', icon: Users, label: 'Users' },
  { to: '/admin/credits', icon: CreditCard, label: 'Credits' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/prompts', icon: Wand2, label: 'Prompt Settings' },
  { to: '/admin/landing', icon: Globe, label: 'Landing Page' },
  { to: '/admin/subscription', icon: Crown, label: 'Subscription' },
];

const OWNER_NAV = [
  { to: '/owner', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/owner/products', icon: ShoppingBag, label: 'Products' },
  { to: '/owner/studio', icon: Sparkles, label: 'AI Studio' },
  { to: '/owner/generations', icon: Image, label: 'My Generations' },
  { to: '/owner/credits', icon: CreditCard, label: 'Credits' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = user?.role === 'admin' ? ADMIN_NAV : OWNER_NAV;
  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 12px' : '18px 16px', borderBottom: '1px solid rgba(124,58,237,.12)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff', fontSize: '.9rem', lineHeight: 1 }}>ClothVision</p>
              <p style={{ fontSize: 9, color: 'rgba(162,140,250,.4)', textTransform: 'uppercase', letterSpacing: '.12em' }}>{user?.role}</p>
            </div>
          </div>
        )}
        <button onClick={onToggle} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,58,237,.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(162,140,250,.5)', flexShrink: 0 }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f0b429,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user?.shop_name || user?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.shop_name || user?.name}</p>
              <p style={{ fontSize: 10, color: 'rgba(162,140,250,.4)' }}>{user?.plan_name || 'No plan'} · {user?.credits || 0} cr</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {nav.map(item => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px' : '9px 12px', borderRadius: 10, marginBottom: 2, textDecoration: 'none', justifyContent: collapsed ? 'center' : 'flex-start', background: active ? 'rgba(124,58,237,.15)' : 'transparent', color: active ? '#a78bfa' : 'rgba(162,140,250,.45)', transition: 'all .2s', fontWeight: active ? 600 : 400, fontSize: 13 }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(124,58,237,.07)'; e.currentTarget.style.color = 'rgba(162,140,250,.75)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(162,140,250,.45)'; } }}
              title={collapsed ? item.label : ''}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#a78bfa' }} />}
            </Link>
          );
        })}

        {/* Super admin link for admins */}
        {user?.role === 'superadmin' && !collapsed && (
          <Link to="/super" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, marginTop: 8, textDecoration: 'none', background: 'rgba(240,180,41,.08)', border: '1px solid rgba(240,180,41,.15)', color: '#f0b429', fontSize: 12, fontWeight: 600 }}>
            👑 Super Admin Panel
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(124,58,237,.08)' }}>
        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(162,140,250,.35)', fontSize: 13, justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.08)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(162,140,250,.35)'; }}>
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{ width: collapsed ? 56 : 220, flexShrink: 0, background: '#0d0d15', borderRight: '1px solid rgba(124,58,237,.1)', height: '100vh', position: 'sticky', top: 0, transition: 'width .2s', overflow: 'hidden' }} className="hide-mobile">
        {sidebarContent}
      </aside>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(!mobileOpen)} className="show-mobile" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,.4)' }}>
        <Menu size={20} />
      </button>
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,.6)' }} onClick={() => setMobileOpen(false)}>
          <aside style={{ width: 240, height: '100%', background: '#0d0d15', borderRight: '1px solid rgba(124,58,237,.1)' }} onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
