import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, title, subtitle, actions, contentPadding = 24 }) {
  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0a0a0f'}}>
      <Sidebar/>
      <main style={{flex:1,minWidth:0,overflowX:'hidden'}}>
        {(title||actions) && (
          <div style={{position:'sticky',top:0,zIndex:20,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(10,10,15,.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
            <div>
              {title && <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.2rem',color:'#fff'}}>{title}</h1>}
              {subtitle && <p style={{fontSize:'.8rem',color:'rgba(162,140,250,.5)',marginTop:2}}>{subtitle}</p>}
            </div>
            {actions && <div style={{display:'flex',alignItems:'center',gap:8}}>{actions}</div>}
          </div>
        )}
        <div style={{padding:contentPadding}}>{children}</div>
      </main>
    </div>
  );
}
