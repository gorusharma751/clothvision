import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Users, CreditCard, Settings, Package, Wand2, Coins, LogOut, Menu, X, ChevronLeft, ChevronRight, Images, Globe, Megaphone, Home, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const superAdminNav=[{to:'/super',icon:LayoutDashboard,label:'Dashboard',exact:true},{to:'/super/admins',icon:Users,label:'Admins'},{to:'/super/plans',icon:Crown,label:'Plans'},{to:'/super/payments',icon:CreditCard,label:'Payments'},{to:'/super/settings',icon:Settings,label:'Settings'},{to:'/admin',icon:Globe,label:'Admin View'}];
const adminNav=[{to:'/admin',icon:LayoutDashboard,label:'Dashboard',exact:true},{to:'/admin/owners',icon:Users,label:'Shop Owners'},{to:'/admin/credits',icon:CreditCard,label:'Credits'},{to:'/admin/subscription',icon:Crown,label:'Subscription'},{to:'/admin/settings',icon:Settings,label:'Settings'},{to:'/admin/prompts',icon:Wand2,label:'Prompt Settings'},{to:'/admin/landing',icon:Globe,label:'Landing Page'}];
const ownerNav=[{to:'/',icon:Home,label:'Home',exact:true},{to:'/owner',icon:LayoutDashboard,label:'Dashboard',exact:true},{to:'/owner/studio',icon:Wand2,label:'AI Studio'},{to:'/owner/studio/marketing',icon:Megaphone,label:'Marketing Studio'},{to:'/owner/products',icon:Package,label:'Products'},{to:'/owner/generated',icon:Images,label:'Generated Gallery'},{to:'/owner/credits',icon:Coins,label:'Credits'}];
const COLLAPSE_KEY = 'cv_sidebar_collapsed';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const items = user?.role==='superadmin' ? superAdminNav : user?.role==='admin' ? adminNav : ownerNav;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setOpen(false);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleLogout = () => { logout(); nav('/login'); };
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const Content = ({ compact = false, mobile = false }) => {
    const showLabels = !compact || mobile;
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div style={{padding:compact?'16px 10px':'16px 12px',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:showLabels?'space-between':'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0,flex:showLabels?1:'0 1 auto',overflow:'hidden'}}>
              <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Sparkles size={16} color="#fff"/>
              </div>
              {showLabels && (
                <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.02rem',background:'linear-gradient(90deg,#a78bfa,#f0b429)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',whiteSpace:'nowrap',display:'block'}}>ClothVision</span>
              )}
            </div>
            {!mobile && (
              <button
                onClick={toggleCollapsed}
                title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
                style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(124,58,237,.26)',background:'rgba(124,58,237,.12)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#a78bfa',flexShrink:0,position:'relative',zIndex:2}}
              >
                {compact ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
              </button>
            )}
          </div>
        </div>

        {user && (
          <div style={{margin:'12px 10px',padding:showLabels?'10px 12px':'10px 8px',borderRadius:12,background:'rgba(124,58,237,.08)',border:'1px solid rgba(124,58,237,.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:showLabels?'flex-start':'center'}}>
              <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#7c3aed,#f0b429)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                {(user.name||user.email||'U')[0].toUpperCase()}
              </div>
              {showLabels && (
                <div style={{minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.shop_name||user.name||user.email}</p>
                  <p style={{fontSize:11,color:'rgba(162,140,250,.5)',textTransform:'capitalize'}}>{user.role}</p>
                </div>
              )}
            </div>
            {user.role!=='superadmin' && user.credits!=null && (
              <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(124,58,237,.1)',display:'flex',justifyContent:showLabels?'space-between':'center',alignItems:'center',gap:8}}>
                {showLabels && <span style={{fontSize:11,color:'rgba(162,140,250,.5)'}}>Credits</span>}
                <span style={{fontSize:13,fontWeight:700,color:'#f0b429'}}>{user.credits}</span>
              </div>
            )}
          </div>
        )}

        <nav style={{flex:1,padding:'4px 8px',overflowY:'auto'}}>
          {items.map(({to,icon:Icon,label,exact})=>(
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={()=>setOpen(false)}
              title={showLabels ? '' : label}
              style={({isActive})=>({
                display:'flex',
                alignItems:'center',
                justifyContent:showLabels?'flex-start':'center',
                gap:10,
                padding:showLabels?'10px 12px':'10px 8px',
                borderRadius:10,
                marginBottom:2,
                textDecoration:'none',
                fontSize:13,
                fontWeight:isActive?600:400,
                color:isActive?'#a78bfa':'rgba(162,140,250,.45)',
                background:isActive?'rgba(124,58,237,.15)':'transparent',
                transition:'all .2s',
                minHeight:40,
              })}
            >
              {({isActive})=>(
                <>
                  <Icon size={16} color={isActive?'#a78bfa':'rgba(124,58,237,.4)'}/>
                  {showLabels && label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{padding:'8px'}}>
          <button
            onClick={handleLogout}
            title={showLabels ? '' : 'Sign Out'}
            style={{
              width:'100%',
              display:'flex',
              alignItems:'center',
              justifyContent:showLabels?'flex-start':'center',
              gap:10,
              padding:showLabels?'10px 12px':'10px 8px',
              borderRadius:10,
              border:'none',
              background:'transparent',
              color:'rgba(248,113,113,.5)',
              cursor:'pointer',
              fontSize:13,
              transition:'all .2s',
              minHeight:40,
            }}
            onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(248,113,113,.5)'}
          >
            <LogOut size={16}/>{showLabels && 'Sign Out'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside style={{width:collapsed?88:236,transition:'width .25s ease',flexShrink:0,background:'#0d0d15',borderRight:'1px solid rgba(124,58,237,.12)',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100dvh'}} className="hide-mobile">
        <Content compact={collapsed}/>
      </aside>
      <button onClick={()=>setOpen(true)} style={{position:'fixed',top:'calc(env(safe-area-inset-top) + 10px)',left:'calc(env(safe-area-inset-left) + 10px)',zIndex:60,width:36,height:36,borderRadius:11,border:'1px solid rgba(124,58,237,.3)',background:'rgba(17,17,24,.94)',display:'none',alignItems:'center',justifyContent:'center',cursor:'pointer'}} className="show-mobile">
        <Menu size={16} color="#a78bfa"/>
      </button>
      {open && (
        <div style={{position:'fixed',inset:0,zIndex:100}} className="show-mobile">
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)'}} onClick={()=>setOpen(false)}/>
          <aside style={{position:'absolute',left:0,top:0,bottom:0,width:'min(84vw,280px)',background:'#0d0d15',borderRight:'1px solid rgba(124,58,237,.2)'}}>
            <button onClick={()=>setOpen(false)} style={{position:'absolute',top:12,right:12,background:'none',border:'none',cursor:'pointer',color:'#a78bfa'}}><X size={18}/></button>
            <Content mobile/>
          </aside>
        </div>
      )}
      <style>{`
        .show-mobile{display:none!important}
        @media(max-width:768px){
          .hide-mobile{display:none!important}
          .show-mobile{display:flex!important}
        }
      `}</style>
    </>
  );
}
