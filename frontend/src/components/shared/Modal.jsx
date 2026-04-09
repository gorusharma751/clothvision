import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, width=520 }) {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}>
      <div style={{width:'100%',maxWidth:width,background:'#111118',border:'1px solid rgba(124,58,237,.25)',borderRadius:20,overflow:'hidden',animation:'fadeUp .3s ease'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(124,58,237,.12)'}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(162,140,250,.5)',padding:4,borderRadius:6,transition:'color .2s'}} onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(162,140,250,.5)'}><X size={16}/></button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}
