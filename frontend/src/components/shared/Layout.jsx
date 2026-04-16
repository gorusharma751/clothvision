import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, title, subtitle, actions, contentPadding = 24, noPad = false }) {
  const hasHeader = Boolean(title || actions);
  const resolvedPadding = noPad
    ? 0
    : typeof contentPadding === 'number'
    ? (contentPadding <= 0 ? 0 : `clamp(14px, 2.4vw, ${contentPadding}px)`)
    : contentPadding;

  return (
    <div className="cv-layout-shell" style={{display:'flex',minHeight:'100vh',background:'#0a0a0f'}}>
      <Sidebar/>
      <main className={`cv-layout-main ${hasHeader ? 'cv-layout-main-header' : 'cv-layout-main-no-header'}`} style={{flex:1,minWidth:0,overflowX:'hidden'}}>
        {hasHeader && (
          <div className="cv-layout-header" style={{position:'sticky',top:0,zIndex:20,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(10,10,15,.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
            <div className="cv-layout-title-wrap">
              {title && <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'clamp(1rem,2.8vw,1.2rem)',color:'#fff'}}>{title}</h1>}
              {subtitle && <p style={{fontSize:'.8rem',color:'rgba(162,140,250,.5)',marginTop:2}}>{subtitle}</p>}
            </div>
            {actions && <div className="cv-layout-actions" style={{display:'flex',alignItems:'center',gap:8}}>{actions}</div>}
          </div>
        )}
        <div className="cv-layout-content" style={{padding:resolvedPadding}}>{children}</div>
      </main>
      <style>{`
        .cv-layout-header{
          gap:12px;
          flex-wrap:wrap;
        }

        .cv-layout-title-wrap{
          min-width:0;
          flex:1 1 220px;
        }

        .cv-layout-actions{
          min-width:0;
          flex:0 1 auto;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        @media (max-width: 768px){
          .cv-layout-header{
            top:0;
            min-height:56px;
            align-items:center;
            flex-wrap:nowrap;
            padding:10px 10px 10px calc(78px + env(safe-area-inset-left));
          }

          .cv-layout-title-wrap{
            flex:1 1 auto;
            overflow:hidden;
          }

          .cv-layout-title-wrap h1{
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            font-size:clamp(.95rem,3.2vw,1.06rem) !important;
          }

          .cv-layout-title-wrap p{
            display:none;
          }

          .cv-layout-actions{
            margin-left:6px;
            width:auto;
            flex:0 0 auto;
            justify-content:flex-end;
            gap:6px;
          }

          .cv-layout-actions > *{
            flex:0 1 auto;
            max-width:100%;
            white-space:nowrap;
          }

          .cv-layout-main-no-header .cv-layout-content{
            padding-top:60px !important;
          }
        }
      `}</style>
    </div>
  );
}
