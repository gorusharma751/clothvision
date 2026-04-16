import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, width=520 }) {
  if (!open) return null;
  return (
    <div className="cv-modal-backdrop" style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}>
      <div className="cv-modal-panel" style={{width:'100%',maxWidth:width,background:'#111118',border:'1px solid rgba(124,58,237,.25)',borderRadius:20,overflow:'hidden',animation:'fadeUp .3s ease',maxHeight:'min(90vh,760px)',display:'flex',flexDirection:'column'}}>
        <div className="cv-modal-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(124,58,237,.12)',gap:8}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(162,140,250,.5)',padding:4,borderRadius:6,transition:'color .2s'}} onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(162,140,250,.5)'}><X size={16}/></button>
        </div>
        <div className="cv-modal-body" style={{padding:20,overflowY:'auto'}}>{children}</div>
      </div>
      <style>{`
        .cv-modal-header h3{
          line-height:1.3;
        }

        @media (max-width: 768px){
          .cv-modal-backdrop{
            align-items:flex-end;
            padding:10px;
          }

          .cv-modal-panel{
            max-height:92vh;
            border-radius:16px;
          }

          .cv-modal-header{
            padding:12px 14px;
          }

          .cv-modal-body{
            padding:14px;
          }
        }
      `}</style>
    </div>
  );
}
