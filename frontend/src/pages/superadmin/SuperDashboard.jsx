import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, TrendingUp, AlertCircle, ArrowRight, Star } from 'lucide-react';
import api from '../../utils/api';

const SA_NAV = [
  {to:'/super',label:'Dashboard',icon:'📊'},
  {to:'/super/admins',label:'Admins',icon:'👤'},
  {to:'/super/plans',label:'Plans',icon:'⭐'},
  {to:'/super/payments',label:'Payments',icon:'💳'},
  {to:'/super/settings',label:'Settings',icon:'⚙️'},
];

function SuperLayout({children,title,subtitle,actions}) {
  const [open,setOpen] = useState(false);
  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0a0a0f'}}>
      <aside style={{width:220,flexShrink:0,background:'#0d0d15',borderRight:'1px solid rgba(240,180,41,.1)',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh'}} className="hide-mobile">
        <div style={{padding:'18px 16px',borderBottom:'1px solid rgba(240,180,41,.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#f0b429,#d69e2e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👑</div>
            <div>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#f0b429',fontSize:'1rem'}}>Super Admin</p>
              <p style={{fontSize:10,color:'rgba(240,180,41,.45)'}}>ClothVision Platform</p>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:'8px'}}>
          {SA_NAV.map(n=>(
            <Link key={n.to} to={n.to} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:2,textDecoration:'none',fontSize:13,color:'rgba(240,180,41,.5)',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(240,180,41,.08)';e.currentTarget.style.color='#f0b429';}}
              onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='rgba(240,180,41,.5)';}}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div style={{padding:'12px',borderTop:'1px solid rgba(240,180,41,.1)'}}>
          <Link to="/admin" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,textDecoration:'none',fontSize:12,color:'rgba(162,140,250,.4)',border:'1px solid rgba(124,58,237,.15)'}}>
            🔄 Switch to Admin View
          </Link>
        </div>
      </aside>
      <main style={{flex:1,minWidth:0}}>
        {(title||actions)&&(
          <div style={{position:'sticky',top:0,zIndex:20,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(10,10,15,.94)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(240,180,41,.08)'}}>
            <div>
              {title&&<h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.2rem',color:'#fff'}}>{title}</h1>}
              {subtitle&&<p style={{fontSize:'.8rem',color:'rgba(240,180,41,.4)',marginTop:2}}>{subtitle}</p>}
            </div>
            {actions&&<div style={{display:'flex',gap:8}}>{actions}</div>}
          </div>
        )}
        <div style={{padding:24}}>{children}</div>
      </main>
    </div>
  );
}

export { SuperLayout };

export default function SuperDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentAdmins, setRecentAdmins] = useState([]);

  useEffect(() => {
    api.get('/superadmin/stats').then(r=>setStats(r.data)).catch(()=>{});
    api.get('/superadmin/payment-requests').then(r=>setPendingPayments(r.data.slice(0,5))).catch(()=>{});
    api.get('/superadmin/admins').then(r=>setRecentAdmins(r.data.slice(0,5))).catch(()=>{});
  }, []);

  const statCards = [
    {icon:'👤',label:'Total Admins',value:stats?.total_admins??'–',color:'#f0b429',bg:'rgba(240,180,41,.08)',border:'rgba(240,180,41,.2)'},
    {icon:'💰',label:'Total Revenue',value:stats?.total_revenue?`₹${parseFloat(stats.total_revenue).toLocaleString('en-IN')}`:'₹0',color:'#4ade80',bg:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.2)'},
    {icon:'⭐',label:'Active Subscriptions',value:stats?.active_subscriptions??'–',color:'#a78bfa',bg:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.2)'},
    {icon:'⏳',label:'Pending Payments',value:stats?.pending_payments??'–',color:'#f87171',bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.2)'},
  ];

  return (
    <SuperLayout title="Super Admin Dashboard" subtitle="ClothVision Platform Control Center">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:24}}>
        {statCards.map((c,i)=>(
          <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:16,padding:'1.2rem'}}>
            <span style={{fontSize:28,display:'block',marginBottom:10}}>{c.icon}</span>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.6rem',color:c.color,marginBottom:4}}>{c.value}</p>
            <p style={{fontSize:12,color:'rgba(226,226,240,.45)'}}>{c.label}</p>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:16}}>
        {/* Pending Payments */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'.95rem'}}>⏳ Pending Payments</h3>
            <Link to="/super/payments" style={{fontSize:12,color:'rgba(240,180,41,.6)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>View all<ArrowRight size={12}/></Link>
          </div>
          {pendingPayments.length===0 ? (
            <p style={{color:'rgba(162,140,250,.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>No pending payments</p>
          ) : pendingPayments.map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:10,marginBottom:7,background:'rgba(239,68,68,.05)',border:'1px solid rgba(239,68,68,.1)'}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'#fff'}}>{p.shop_name||p.name}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>{p.plan_name||p.type} · {p.payment_method}</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:13,fontWeight:700,color:'#f0b429'}}>₹{parseFloat(p.amount).toLocaleString()}</p>
                <Link to="/super/payments" style={{fontSize:10,color:'#a78bfa',textDecoration:'none'}}>Review →</Link>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Admins */}
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'.95rem'}}>👤 Recent Admins</h3>
            <Link to="/super/admins" style={{fontSize:12,color:'rgba(240,180,41,.6)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>View all<ArrowRight size={12}/></Link>
          </div>
          {recentAdmins.map(a=>(
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(30,30,45,.5)'}}>
              <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#f0b429,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                {(a.shop_name||a.name||'A')[0].toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.shop_name||a.name}</p>
                <p style={{fontSize:10,color:'rgba(162,140,250,.4)'}}>{a.plan_name||'No plan'} · {a.sub_status||'–'}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:11,fontWeight:600,color:'#f0b429'}}>{a.credits} cr</p>
                <p style={{fontSize:10,color:'rgba(162,140,250,.3)'}}>₹{parseFloat(a.total_paid||0).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperLayout>
  );
}
