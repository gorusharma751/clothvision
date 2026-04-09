import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      nav(user.role === 'admin' ? '/admin' : '/owner');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
      {/* Orbs */}
      <div className="orb" style={{position:'absolute',top:'10%',left:'5%',width:400,height:400,background:'radial-gradient(circle,rgba(124,58,237,0.2),transparent)',pointerEvents:'none'}}/>
      <div className="orb" style={{position:'absolute',bottom:'10%',right:'5%',width:300,height:300,background:'radial-gradient(circle,rgba(240,180,41,0.15),transparent)',animationDelay:'3s',pointerEvents:'none'}}/>
      {/* Grid */}
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(124,58,237,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.06) 1px,transparent 1px)',backgroundSize:'60px 60px',pointerEvents:'none'}}/>

      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
        style={{width:'100%',maxWidth:420,margin:'0 1rem'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2,type:'spring'}}
            style={{width:72,height:72,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 40px rgba(124,58,237,0.4)'}}>
            <Sparkles size={32} color="white"/>
          </motion.div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'2rem',fontWeight:800,marginBottom:4}} className="shimmer-text">ClothVision AI</h1>
          <p style={{color:'#6b6b8a',fontSize:'0.8rem',letterSpacing:'0.12em'}}>FASHION PHOTOGRAPHY STUDIO</p>
        </div>

        <div className="glass" style={{borderRadius:20,padding:'2rem'}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.25rem',marginBottom:'1.5rem',color:'#fff'}}>Sign In</h2>
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@clothvision.com" required/>
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{position:'relative'}}>
                <input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{paddingRight:'2.5rem'}}/>
                <button type="button" onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#6b6b8a'}}>
                  {show?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              className="btn btn-purple" style={{width:'100%',justifyContent:'center',height:44,fontSize:'0.95rem',marginTop:4}}>
              {loading ? <div style={{width:18,height:18,border:'2px solid #ffffff55',borderTopColor:'#fff',borderRadius:'50%'}} className="spin"/> : <><Zap size={16}/>Sign In</>}
            </motion.button>
          </form>
          <p style={{textAlign:'center',fontSize:'0.7rem',color:'#6b6b8a',marginTop:'1.5rem'}}>Powered by Gemini AI</p>
        </div>
      </motion.div>
    </div>
  );
}
