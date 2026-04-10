import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Watch, Video } from 'lucide-react';
import Layout from '../../components/shared/Layout';

export default function StudioSelect() {
  const nav = useNavigate();
  const cards = [
    { id:'dress', icon:'👗', label:'Dress / Clothing', desc:'Shirts, T-shirts, Jeans, Kurta, Saree & all clothing', color:'#7c3aed', border:'rgba(124,58,237,.4)', route:'/owner/studio/dress' },
    { id:'items', icon:'⌚', label:'Items / Accessories', desc:'Watch, Perfume, Cap, Bag, Shoes, Belt & more', color:'#f0b429', border:'rgba(240,180,41,.4)', route:'/owner/studio/items' },
    { id:'ugc', icon:'🎬', label:'UGC Photo / Video', desc:'Coming Soon — User-generated content ads', color:'rgba(162,140,250,.3)', border:'rgba(124,58,237,.15)', disabled:true },
  ];
  return (
    <Layout title="AI Studio" subtitle="Choose your product type to get started" contentPadding={0}>
      <div style={{minHeight:'calc(100vh - 84px)',background:'#0a0a0f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
        <div className="animate-orb" style={{position:'absolute',top:'10%',left:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,.15),transparent)',pointerEvents:'none'}}/>
        <div className="animate-orb2" style={{position:'absolute',bottom:'10%',right:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,180,41,.1),transparent)',pointerEvents:'none'}}/>
        <div style={{textAlign:'center',marginBottom:48,position:'relative'}}>
          <p style={{fontSize:'.75rem',letterSpacing:'.15em',color:'rgba(162,140,250,.5)',marginBottom:12,fontFamily:'Syne,sans-serif'}}>AI STUDIO</p>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(2rem,5vw,3.5rem)',color:'#fff',lineHeight:1.1,marginBottom:12}}>
            What are you <span className="shimmer-text">creating</span> today?
          </h1>
          <p style={{color:'rgba(162,140,250,.5)',fontSize:'1rem'}}>Choose your product type to get started</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,width:'100%',maxWidth:900,position:'relative'}}>
          {cards.map((c,i)=>(
            <div key={c.id} onClick={()=>!c.disabled&&nav(c.route)}
              className="animate-fade-up"
              style={{animationDelay:`${i*.1}s`,background:'#111118',border:`2px solid ${c.disabled?'rgba(30,30,45,.5)':c.border}`,borderRadius:20,padding:'2rem 1.5rem',textAlign:'center',cursor:c.disabled?'default':'pointer',opacity:c.disabled?.5:1,transition:'all .3s',position:'relative',overflow:'hidden'}}
              onMouseEnter={e=>{if(!c.disabled){e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.boxShadow=`0 20px 60px ${c.color}33`}}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
              {c.disabled&&<div style={{position:'absolute',top:12,right:12,background:'rgba(124,58,237,.15)',color:'rgba(162,140,250,.6)',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>COMING SOON</div>}
              <div style={{fontSize:52,marginBottom:16}}>{c.icon}</div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.3rem',color:c.disabled?'rgba(162,140,250,.3)':'#fff',marginBottom:8}}>{c.label}</h2>
              <p style={{fontSize:'.85rem',color:c.disabled?'rgba(162,140,250,.2)':'rgba(162,140,250,.55)',lineHeight:1.5}}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
