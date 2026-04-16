import React from 'react';
const colors={purple:{bg:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.2)',icon:'#a78bfa',val:'#fff'},gold:{bg:'rgba(240,180,41,.08)',border:'rgba(240,180,41,.2)',icon:'#f0b429',val:'#f0b429'},green:{bg:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.2)',icon:'#4ade80',val:'#4ade80'},red:{bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.2)',icon:'#f87171',val:'#f87171'}};
export default function StatCard({icon:Icon,label,value,color='purple',index=0}){
  const c=colors[color]||colors.purple;
  return(
    <div className="cv-card animate-fade-up" style={{padding:'clamp(.9rem,2.2vw,1.25rem)',borderColor:c.border,animationDelay:`${index*.08}s`}}>
      <div style={{width:38,height:38,borderRadius:12,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
        <Icon size={19} color={c.icon}/>
      </div>
      <p style={{fontSize:'clamp(1.15rem,4vw,1.6rem)',fontWeight:700,fontFamily:'Syne,sans-serif',color:c.val,marginBottom:3,lineHeight:1.2}}>{value??'–'}</p>
      <p style={{fontSize:'clamp(.72rem,2.3vw,.8rem)',color:'rgba(162,140,250,.5)'}}>{label}</p>
    </div>
  );
}
