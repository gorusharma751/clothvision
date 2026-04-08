import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, title, subtitle, actions }) {
  return (
    <div className="flex min-h-screen bg-cv-bg">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {(title || actions) && (
          <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{background:'rgba(10,10,15,0.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(124,58,237,0.1)'}}>
            <div>
              {title && <h1 className="font-display font-bold text-xl text-white">{title}</h1>}
              {subtitle && <p className="text-sm text-purple-300/50 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
