import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  {id:'dress',icon:'👗',label:'Dress / Clothing',desc:'Shirts, T-shirts, Jeans, Kurta, Saree & all clothing',color:'#7c3aed',border:'rgba(124,58,237,.4)',route:'/owner/studio/dress'},
  {id:'items',icon:'⌚',label:'Items / Accessories',desc:'Watch, Perfume, Cap, Bag, Shoes, Belt & more',color:'#f0b429',border:'rgba(240,180,41,.4)',route:'/owner/studio/items'},
  {id:'scene',icon:'🛋️',label:'Scene Builder',desc:'Place product in custom background — car, room, table',color:'#10b981',border:'rgba(16,185,129,.4)',route:'/owner/studio/scene'},
  {id:'video',icon:'🎬',label:'Video Studio',desc:'AI video script + frames for Luma/Runway/Kling',color:'#ef4444',border:'rgba(239,68,68,.4)',route:'/owner/studio/video'},
  {id:'label',icon:'🏷️',label:'Label Creator',desc:'Design product labels & hang tags with your brand',color:'#8b5cf6',border:'rgba(139,92,246,.4)',route:'/owner/studio/label'},
  {id:'360',icon:'🔄',label:'360° View',desc:'Generate front/back/left/right for e-commerce viewers',color:'#06b6d4',border:'rgba(6,182,212,.4)',route:'/owner/studio/360'},
];

export default function StudioSelect() {
  const nav = useNavigate();
  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
      <div className="animate-orb" style={{position:'absolute',top:'10%',left:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,.15),transparent)',pointerEvents:'none'}}/>
      <div className="animate-orb2" style={{position:'absolute',bottom:'10%',right:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,180,41,.1),transparent)',pointerEvents:'none'}}/>
      <div style={{textAlign:'center',marginBottom:40,position:'relative'}}>
        <p style={{fontSize:'.7rem',letterSpacing:'.15em',color:'rgba(162,140,250,.5)',marginBottom:10,fontFamily:'Syne,sans-serif'}}>AI STUDIO</p>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,5vw,3rem)',color:'#fff',lineHeight:1.1,marginBottom:10}}>
          What are you <span className="shimmer-text">creating</span> today?
        </h1>
        <p style={{color:'rgba(162,140,250,.4)',fontSize:'.9rem'}}>Choose your studio type to get started</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,width:'100%',maxWidth:960,position:'relative'}}>
        {CARDS.map((c,i)=>(
          <div key={c.id} onClick={()=>nav(c.route)}
            style={{background:'#111118',border:`2px solid ${c.border}`,borderRadius:20,padding:'1.8rem 1.4rem',textAlign:'center',cursor:'pointer',transition:'all .3s',animationDelay:`${i*.06}s`}}
            className="animate-fade-up"
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.boxShadow=`0 20px 50px ${c.color}22`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
            <div style={{fontSize:44,marginBottom:14}}>{c.icon}</div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.1rem',color:'#fff',marginBottom:6}}>{c.label}</h2>
            <p style={{fontSize:'.82rem',color:'rgba(162,140,250,.5)',lineHeight:1.5}}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
