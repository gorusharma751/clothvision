import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOwners from './pages/admin/Owners';
import AdminCredits from './pages/admin/Credits';
import AdminSettings from './pages/admin/Settings';
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerProducts from './pages/owner/Products';
import OwnerGeneratedGallery from './pages/owner/GeneratedGallery';
import OwnerCredits from './pages/owner/Credits';
import StudioSelect from './pages/studio/StudioSelect';
import DressStudio from './pages/studio/DressStudio';
import ItemsStudio from './pages/studio/ItemsStudio';

const Loader = () => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0f'}}>
    <div style={{textAlign:'center'}}>
      <div style={{width:44,height:44,border:'3px solid rgba(124,58,237,.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px'}}/>
      <p style={{color:'rgba(124,58,237,.6)',fontSize:'.7rem',letterSpacing:'.15em',fontFamily:'Syne,sans-serif'}}>LOADING</p>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Guard = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (role && user.role !== role) return <Navigate to={user.role==='admin'?'/admin':'/owner'} replace/>;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='admin'?'/admin':'/owner'}/> : <LoginPage/>}/>
      <Route path="/admin" element={<Guard role="admin"><AdminDashboard/></Guard>}/>
      <Route path="/admin/owners" element={<Guard role="admin"><AdminOwners/></Guard>}/>
      <Route path="/admin/credits" element={<Guard role="admin"><AdminCredits/></Guard>}/>
      <Route path="/admin/settings" element={<Guard role="admin"><AdminSettings/></Guard>}/>
      <Route path="/owner" element={<Guard role="owner"><OwnerDashboard/></Guard>}/>
      <Route path="/owner/products" element={<Guard role="owner"><OwnerProducts/></Guard>}/>
      <Route path="/owner/generated" element={<Guard role="owner"><OwnerGeneratedGallery/></Guard>}/>
      <Route path="/owner/credits" element={<Guard role="owner"><OwnerCredits/></Guard>}/>
      <Route path="/owner/studio" element={<Guard role="owner"><StudioSelect/></Guard>}/>
      <Route path="/owner/studio/dress" element={<Guard role="owner"><DressStudio/></Guard>}/>
      <Route path="/owner/studio/items" element={<Guard role="owner"><ItemsStudio/></Guard>}/>
      <Route path="*" element={<Navigate to="/login" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes/></AuthProvider>;
}
