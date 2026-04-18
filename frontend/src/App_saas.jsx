import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth
import LoginPage from './pages/LoginPage';
import Register from './pages/auth/Register';

// Super Admin
import SuperDashboard from './pages/superadmin/SuperDashboard';
import SuperAdmins from './pages/superadmin/SuperAdmins';
import SuperPlans from './pages/superadmin/SuperPlans';
import SuperPayments from './pages/superadmin/SuperPayments';
import SuperSettings from './pages/superadmin/SuperSettings';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminOwners from './pages/admin/Owners';
import AdminCredits from './pages/admin/Credits';
import AdminSettings from './pages/admin/Settings';
import LandingCMS from './pages/admin/LandingCMS';
import PromptSettings from './pages/admin/PromptSettings';
import MySubscription from './pages/admin/MySubscription';

// Owner
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerProducts from './pages/owner/Products';
import OwnerCredits from './pages/owner/Credits';
import MyGenerations from './pages/owner/MyGenerations';

// Studio
import StudioSelect from './pages/studio/StudioSelect';
import DressStudio from './pages/studio/DressStudio';
import ItemsStudio from './pages/studio/ItemsStudio';
import SceneBuilder from './pages/studio/SceneBuilder';
import VideoStudio from './pages/studio/VideoStudio';
import LabelCreator from './pages/studio/LabelCreator';
import View360Studio from './pages/studio/View360Studio';
import MarketingStudio from './pages/studio/MarketingStudio';

// Landing
import LandingPage from './pages/landing/LandingPage';

const Loader = () => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0f'}}>
    <div style={{textAlign:'center'}}>
      <div style={{width:44,height:44,border:'3px solid rgba(124,58,237,.2)',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px'}}/>
      <p style={{color:'rgba(124,58,237,.5)',fontSize:'.7rem',letterSpacing:'.15em',fontFamily:'Syne,sans-serif'}}>LOADING</p>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Guard = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (role === 'superadmin' && user.role !== 'superadmin') return <Navigate to="/login" replace/>;
  if (role === 'admin' && !['admin','superadmin'].includes(user.role)) return <Navigate to="/owner" replace/>;
  if (role === 'owner' && !['owner','admin','superadmin'].includes(user.role)) return <Navigate to="/login" replace/>;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  const defaultRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'superadmin') return '/super';
    if (user.role === 'admin') return '/admin';
    return '/owner';
  };

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage/>}/>
      <Route path="/login" element={user ? <Navigate to={defaultRedirect()}/> : <LoginPage/>}/>
      <Route path="/register" element={user ? <Navigate to={defaultRedirect()}/> : <Register/>}/>

      {/* Super Admin */}
      <Route path="/super" element={<Guard role="superadmin"><SuperDashboard/></Guard>}/>
      <Route path="/super/admins" element={<Guard role="superadmin"><SuperAdmins/></Guard>}/>
      <Route path="/super/plans" element={<Guard role="superadmin"><SuperPlans/></Guard>}/>
      <Route path="/super/payments" element={<Guard role="superadmin"><SuperPayments/></Guard>}/>
      <Route path="/super/settings" element={<Guard role="superadmin"><SuperSettings/></Guard>}/>

      {/* Admin */}
      <Route path="/admin" element={<Guard role="admin"><AdminDashboard/></Guard>}/>
      <Route path="/admin/owners" element={<Guard role="admin"><AdminOwners/></Guard>}/>
      <Route path="/admin/credits" element={<Guard role="admin"><AdminCredits/></Guard>}/>
      <Route path="/admin/settings" element={<Guard role="admin"><AdminSettings/></Guard>}/>
      <Route path="/admin/landing" element={<Guard role="admin"><LandingCMS/></Guard>}/>
      <Route path="/admin/prompts" element={<Guard role="admin"><PromptSettings/></Guard>}/>
      <Route path="/admin/subscription" element={<Guard role="admin"><MySubscription/></Guard>}/>

      {/* Owner */}
      <Route path="/owner" element={<Guard role="owner"><OwnerDashboard/></Guard>}/>
      <Route path="/owner/products" element={<Guard role="owner"><OwnerProducts/></Guard>}/>
      <Route path="/owner/credits" element={<Guard role="owner"><OwnerCredits/></Guard>}/>
      <Route path="/owner/generations" element={<Guard role="owner"><MyGenerations/></Guard>}/>

      {/* Studio */}
      <Route path="/owner/studio" element={<Guard role="owner"><StudioSelect/></Guard>}/>
      <Route path="/owner/studio/dress" element={<Guard role="owner"><DressStudio/></Guard>}/>
      <Route path="/owner/studio/items" element={<Guard role="owner"><ItemsStudio/></Guard>}/>
      <Route path="/owner/studio/scene" element={<Guard role="owner"><SceneBuilder/></Guard>}/>
      <Route path="/owner/studio/video" element={<Guard role="owner"><VideoStudio/></Guard>}/>
      <Route path="/owner/studio/label" element={<Guard role="owner"><LabelCreator/></Guard>}/>
      <Route path="/owner/studio/360" element={<Guard role="owner"><View360Studio/></Guard>}/>
      <Route path="/owner/studio/marketing" element={<Guard role="owner"><MarketingStudio/></Guard>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes/></AuthProvider>;
}
