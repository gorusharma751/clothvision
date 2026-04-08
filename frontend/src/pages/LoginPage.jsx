import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name || user.email}!`);
      nav(user.role === 'admin' ? '/admin' : '/owner');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-cv-bg flex items-center justify-center relative overflow-hidden">
      {/* Animated orbs */}
      <div className="orb absolute top-20 left-20 w-96 h-96 rounded-full opacity-10" style={{background:'radial-gradient(circle, #7c3aed, transparent)'}} />
      <div className="orb2 absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10" style={{background:'radial-gradient(circle, #f0b429, transparent)'}} />
      <div className="orb3 absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-5" style={{background:'radial-gradient(circle, #a78bfa, transparent)'}} />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)', backgroundSize:'50px 50px'}} />

      <motion.div initial={{opacity:0, y:40, scale:0.95}} animate={{opacity:1, y:0, scale:1}} transition={{duration:0.6, ease:'easeOut'}}
        className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2, type:'spring', stiffness:200}}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 relative"
            style={{background:'linear-gradient(135deg, #7c3aed, #4c1d95)'}}>
            <Sparkles size={36} className="text-white" />
            <div className="absolute inset-0 rounded-2xl animate-glow-pulse" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold mb-1">
            <span className="shimmer-text">ClothVision</span>
          </h1>
          <p className="text-purple-400/60 text-sm tracking-widest font-display">AI FASHION STUDIO</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 neon-border">
          <h2 className="font-display text-xl font-semibold mb-6 text-white">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-purple-300 mb-1.5 font-display tracking-wider">EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-purple-300 mb-1.5 font-display tracking-wider">PASSWORD</label>
              <div className="relative">
                <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required className="input-field pr-11" />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              className="btn-primary w-full flex items-center justify-center gap-2 h-11 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Zap size={16}/> Sign In</>}
            </motion.button>
          </form>
          <p className="text-center text-xs text-purple-400/40 mt-6">ClothVision AI — Powered by Gemini</p>
        </div>
      </motion.div>
    </div>
  );
}
