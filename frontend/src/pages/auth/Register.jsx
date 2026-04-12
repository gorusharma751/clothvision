import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Store, User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function Register() {
  const [form, setForm] = useState({ name:'', shop_name:'', email:'', password:'', confirm_password:'' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(form.password !== form.confirm_password) return toast.error('Passwords do not match');
    if(form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created! Please login.');
      nav('/login');
    } catch(err){ toast.error(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
      <div className="animate-orb" style={{position:'absolute',top:'10%',left:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,.15),transparent)',pointerEvents:'none'}}/>
      <div className="animate-orb2" style={{position:'absolute',bottom:'10%',right:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,180,41,.1),transparent)',pointerEvents:'none'}}/>
      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:.5}} style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
            <Sparkles size={26} color="#fff"/>
          </div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',color:'#fff',marginBottom:4}}>
            <span className="shimmer-text">ClothVision</span>
          </h1>
          <p style={{color:'rgba(162,140,250,.4)',fontSize:'.8rem',letterSpacing:'.15em',fontFamily:'Syne,sans-serif'}}>AI FASHION STUDIO</p>
        </div>
        <div className="glass" style={{borderRadius:20,padding:'2rem',border:'1px solid rgba(124,58,237,.2)'}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:6,fontSize:'1.1rem'}}>Create Account</h2>
          <p style={{fontSize:12,color:'rgba(162,140,250,.4)',marginBottom:20}}>Start your AI fashion studio</p>
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {f:'name',l:'YOUR NAME',ph:'Rahul Sharma',icon:User},
              {f:'shop_name',l:'SHOP NAME',ph:'My Fashion Store',icon:Store},
              {f:'email',l:'EMAIL',ph:'you@example.com',icon:Mail,type:'email'},
            ].map(({f,l,ph,icon:Icon,type})=>(
              <div key={f}>
                <label style={{fontSize:10,color:'rgba(162,140,250,.5)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
                <div style={{position:'relative'}}>
                  <Icon size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(124,58,237,.4)'}}/>
                  <input className="cv-input" style={{paddingLeft:36}} type={type||'text'} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={ph} required/>
                </div>
              </div>
            ))}
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.5)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PASSWORD</label>
              <div style={{position:'relative'}}>
                <Lock size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(124,58,237,.4)'}}/>
                <input className="cv-input" style={{paddingLeft:36,paddingRight:40}} type={show?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 characters" required/>
                <button type="button" onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(124,58,237,.4)'}}>
                  {show?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
            </div>
            <div>
              <label style={{fontSize:10,color:'rgba(162,140,250,.5)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>CONFIRM PASSWORD</label>
              <div style={{position:'relative'}}>
                <Lock size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(124,58,237,.4)'}}/>
                <input className="cv-input" style={{paddingLeft:36}} type="password" value={form.confirm_password} onChange={e=>setForm({...form,confirm_password:e.target.value})} placeholder="Repeat password" required/>
              </div>
            </div>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.02}} whileTap={{scale:.98}} className="btn-primary" style={{width:'100%',height:44,marginTop:4,justifyContent:'center'}}>
              {loading ? <div style={{width:18,height:18,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/> : 'Create Account'}
            </motion.button>
          </form>
          <p style={{textAlign:'center',marginTop:16,fontSize:12,color:'rgba(162,140,250,.4)'}}>
            Already have an account?{' '}
            <Link to="/login" style={{color:'#a78bfa',textDecoration:'none',fontWeight:600}}>Sign In</Link>
          </p>
        </div>
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
