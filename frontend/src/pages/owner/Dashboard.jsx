import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, Package, Coins, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [credits, setCredits] = useState({ balance:0, total_used:0 });

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data)).catch(()=>{});
    api.get('/credits/balance').then(r => setCredits(r.data)).catch(()=>{});
  }, []);

  const totalImages = products.reduce((s,p)=>s+parseInt(p.image_count||0),0);

  return (
    <Layout title={user?.shop_name||'My Shop'} subtitle="AI Fashion Studio"
      actions={<Link to="/owner/studio" className="btn-primary"><Wand2 size={14}/>Open Studio</Link>}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:28}}>
        <StatCard icon={Package} label="Products" value={products.length} color="purple" index={0}/>
        <StatCard icon={Wand2} label="Images Generated" value={totalImages} color="green" index={1}/>
        <StatCard icon={Coins} label="Credits Left" value={credits.balance} color="gold" index={2}/>
        <StatCard icon={TrendingUp} label="Credits Used" value={credits.total_used} color="red" index={3}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:28}}>
        {[
          {to:'/owner/studio',emoji:'🎨',title:'AI Studio',desc:'Generate photos with AI',color:'#7c3aed',bg:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.2)'},
          {to:'/owner/products',emoji:'📦',title:'My Products',desc:'View all your products',color:'#a78bfa',bg:'rgba(124,58,237,.05)',border:'rgba(124,58,237,.15)'},
          {to:'/owner/credits',emoji:'💳',title:'Credits',desc:'Request more credits',color:'#f0b429',bg:'rgba(240,180,41,.06)',border:'rgba(240,180,41,.2)'},
        ].map(c=>(
          <Link key={c.to} to={c.to} style={{display:'block',background:c.bg,border:`1px solid ${c.border}`,borderRadius:16,padding:'20px',textDecoration:'none',transition:'all .25s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform=''}}>
            <div style={{fontSize:32,marginBottom:10}}>{c.emoji}</div>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:4}}>{c.title}</p>
            <p style={{fontSize:12,color:'rgba(162,140,250,.5)'}}>{c.desc}</p>
            <ArrowRight size={14} color={c.color} style={{marginTop:10}}/>
          </Link>
        ))}
      </div>
      {products.length>0 && (
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff'}}>Recent Products</h2>
            <Link to="/owner/products" style={{fontSize:12,color:'rgba(124,58,237,.7)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>View all <ArrowRight size={12}/></Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
            {products.slice(0,8).map(p=>(
              <Link key={p.id} to="/owner/studio" style={{textDecoration:'none'}}>
                <div style={{aspectRatio:'3/4',borderRadius:10,overflow:'hidden',background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.1)',marginBottom:6}}>
                  {p.original_image?<img src={`/uploads/${p.original_image.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}`} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>📦</div>}
                </div>
                <p style={{fontSize:11,color:'rgba(226,226,240,.6)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
