import React from 'react';
const colors={purple:{bg:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.2)',icon:'#a78bfa',val:'#fff'},gold:{bg:'rgba(240,180,41,.08)',border:'rgba(240,180,41,.2)',icon:'#f0b429',val:'#f0b429'},green:{bg:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.2)',icon:'#4ade80',val:'#4ade80'},red:{bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.2)',icon:'#f87171',val:'#f87171'}};
export default function StatCard({icon:Icon,label,value,color='purple',index=0}){
  const c=colors[color]||colors.purple;
  return(
    <div className="cv-card animate-fade-up" style={{padding:'1.25rem',borderColor:c.border,animationDelay:`${index*.08}s`}}>
      <div style={{width:40,height:40,borderRadius:12,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
        <Icon size={20} color={c.icon}/>
      </div>
      <p style={{fontSize:'1.6rem',fontWeight:700,fontFamily:'Syne,sans-serif',color:c.val,marginBottom:4}}>{value??'–'}</p>
      <p style={{fontSize:'.8rem',color:'rgba(162,140,250,.5)'}}>{label}</p>
    </div>
  );
}
