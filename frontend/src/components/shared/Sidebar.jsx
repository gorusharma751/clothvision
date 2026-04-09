import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Users, CreditCard, Settings, Package, Wand2, UserSquare, Coins, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const adminNav=[{to:'/admin',icon:LayoutDashboard,label:'Dashboard',exact:true},{to:'/admin/owners',icon:Users,label:'Shop Owners'},{to:'/admin/credits',icon:CreditCard,label:'Credits'},{to:'/admin/settings',icon:Settings,label:'Settings'}];
const ownerNav=[{to:'/owner',icon:LayoutDashboard,label:'Dashboard',exact:true},{to:'/owner/studio',icon:Wand2,label:'AI Studio'},{to:'/owner/products',icon:Package,label:'Products'},{to:'/owner/credits',icon:Coins,label:'Credits'}];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = user?.role==='admin' ? adminNav : ownerNav;

  const handleLogout = () => { logout(); nav('/login'); };

  const Content = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'20px 16px 12px',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Sparkles size={16} color="#fff"/>
          </div>
          <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',background:'linear-gradient(90deg,#a78bfa,#f0b429)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ClothVision</span>
        </div>
      </div>
      {user && (
        <div style={{margin:'12px',padding:'10px 12px',borderRadius:12,background:'rgba(124,58,237,.08)',border:'1px solid rgba(124,58,237,.15)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#7c3aed,#f0b429)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
              {(user.name||user.email||'U')[0].toUpperCase()}
            </div>
            <div style={{minWidth:0}}>
              <p style={{fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.shop_name||user.name||user.email}</p>
              <p style={{fontSize:11,color:'rgba(162,140,250,.5)',textTransform:'capitalize'}}>{user.role}</p>
            </div>
          </div>
          {user.role==='owner' && user.credits!=null && (
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(124,58,237,.1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'rgba(162,140,250,.5)'}}>Credits</span>
              <span style={{fontSize:13,fontWeight:700,color:'#f0b429'}}>{user.credits}</span>
            </div>
          )}
        </div>
      )}
      <nav style={{flex:1,padding:'4px 8px',overflowY:'auto'}}>
        {items.map(({to,icon:Icon,label,exact})=>(
          <NavLink key={to} to={to} end={exact} onClick={()=>setOpen(false)}
            style={({isActive})=>({display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:2,textDecoration:'none',fontSize:13,fontWeight:isActive?600:400,color:isActive?'#a78bfa':'rgba(162,140,250,.45)',background:isActive?'rgba(124,58,237,.15)':'transparent',transition:'all .2s'})}>
            {({isActive})=><><Icon size={16} color={isActive?'#a78bfa':'rgba(124,58,237,.4)'}/>{label}</>}
          </NavLink>
        ))}
      </nav>
      <div style={{padding:'8px'}}>
        <button onClick={handleLogout} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',background:'transparent',color:'rgba(248,113,113,.5)',cursor:'pointer',fontSize:13,transition:'all .2s'}}
          onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(248,113,113,.5)'}>
          <LogOut size={16}/> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside style={{width:220,flexShrink:0,background:'#0d0d15',borderRight:'1px solid rgba(124,58,237,.12)',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh'}} className="hide-mobile">
        <Content/>
      </aside>
      <button onClick={()=>setOpen(true)} style={{position:'fixed',top:12,left:12,zIndex:50,width:36,height:36,borderRadius:10,border:'1px solid rgba(124,58,237,.3)',background:'rgba(17,17,24,.9)',display:'none',alignItems:'center',justifyContent:'center',cursor:'pointer'}} className="show-mobile">
        <Menu size={16} color="#a78bfa"/>
      </button>
      {open && (
        <div style={{position:'fixed',inset:0,zIndex:100}} className="show-mobile">
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)'}} onClick={()=>setOpen(false)}/>
          <aside style={{position:'absolute',left:0,top:0,bottom:0,width:240,background:'#0d0d15',borderRight:'1px solid rgba(124,58,237,.2)'}}>
            <button onClick={()=>setOpen(false)} style={{position:'absolute',top:12,right:12,background:'none',border:'none',cursor:'pointer',color:'#a78bfa'}}><X size={18}/></button>
            <Content/>
          </aside>
        </div>
      )}
      <style>{`.show-mobile{display:none!important} @media(max-width:768px){.hide-mobile{display:none!important}.show-mobile{display:flex!important}}`}</style>
    </>
  );
}
