import React, { useEffect, useState } from 'react';
import { Coins, Plus, TrendingDown, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import api from '../../utils/api';

export default function OwnerCredits() {
  const [balance, setBalance] = useState({balance:0,total_used:0});
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showReq, setShowReq] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const load = () => {
    api.get('/credits/balance').then(r=>setBalance(r.data)).catch(()=>{});
    api.get('/credits/history').then(r=>setHistory(r.data)).catch(()=>{});
    api.get('/credits/my-requests').then(r=>setRequests(r.data)).catch(()=>{});
  };
  useEffect(()=>{load();},[]);
  const handleReq = async e => {
    e.preventDefault();
    if (!amount) return;
    try { await api.post('/credits/request',{amount_requested:parseInt(amount),message}); toast.success('Request sent!'); setShowReq(false); setAmount(''); setMessage(''); load(); }
    catch { toast.error('Error'); }
  };
  const statusIcon = s => s==='approved'?<CheckCircle size={13} color="#4ade80"/>:s==='rejected'?<XCircle size={13} color="#f87171"/>:<Clock size={13} color="#f0b429"/>;
  return (
    <Layout title="Credits" subtitle="AI generation credits"
      actions={<button onClick={()=>setShowReq(true)} className="btn-gold"><Plus size={14}/>Request Credits</button>}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <div style={{background:'rgba(240,180,41,.06)',border:'1px solid rgba(240,180,41,.2)',borderRadius:16,padding:'1.5rem',textAlign:'center'}}>
          <Coins size={28} color="#f0b429" style={{margin:'0 auto 8px'}}/>
          <p style={{fontSize:'clamp(1.6rem,8vw,2.2rem)',fontWeight:700,fontFamily:'Syne,sans-serif',color:'#f0b429'}}>{balance.balance}</p>
          <p style={{fontSize:12,color:'rgba(240,180,41,.5)'}}>Available Credits</p>
        </div>
        <div style={{background:'rgba(124,58,237,.06)',border:'1px solid rgba(124,58,237,.15)',borderRadius:16,padding:'1.5rem',textAlign:'center'}}>
          <TrendingDown size={28} color="#a78bfa" style={{margin:'0 auto 8px'}}/>
          <p style={{fontSize:'clamp(1.6rem,8vw,2.2rem)',fontWeight:700,fontFamily:'Syne,sans-serif',color:'#a78bfa'}}>{balance.total_used}</p>
          <p style={{fontSize:12,color:'rgba(162,140,250,.4)'}}>Total Used</p>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:14,fontSize:'.95rem'}}>My Requests</h3>
          {requests.length===0?<p style={{color:'rgba(162,140,250,.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>No requests yet</p>:(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {requests.map(r=>(
                <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:10,background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.08)',gap:8,flexWrap:'wrap'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {statusIcon(r.status)}
                    <div><p style={{fontSize:13,fontWeight:600,color:'#fff'}}>+{r.amount_requested}</p>{r.message&&<p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>{r.message}</p>}</div>
                  </div>
                  <span style={{fontSize:11,padding:'3px 8px',borderRadius:10,fontWeight:600,background:r.status==='approved'?'rgba(34,197,94,.1)':r.status==='rejected'?'rgba(239,68,68,.1)':'rgba(240,180,41,.1)',color:r.status==='approved'?'#4ade80':r.status==='rejected'?'#f87171':'#f0b429'}}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:14,fontSize:'.95rem'}}>Transaction History</h3>
          {history.length===0?<p style={{color:'rgba(162,140,250,.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>No transactions</p>:(
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:320,overflowY:'auto'}}>
              {history.map(h=>(
                <div key={h.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,transition:'background .2s',gap:8,flexWrap:'wrap'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:h.type==='add'?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'}}>
                      {h.type==='add'?<TrendingUp size={13} color="#4ade80"/>:<TrendingDown size={13} color="#f87171"/>}
                    </div>
                    <div><p style={{fontSize:12,color:'rgba(226,226,240,.8)'}}>{h.description}</p><p style={{fontSize:10,color:'rgba(162,140,250,.35)'}}>{new Date(h.created_at).toLocaleDateString()}</p></div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif',color:h.type==='add'?'#4ade80':'#f87171'}}>{h.type==='add'?'+':'-'}{Math.abs(h.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal open={showReq} onClose={()=>setShowReq(false)} title="Request Credits">
        <form onSubmit={handleReq} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{textAlign:'center',padding:'12px',borderRadius:12,background:'rgba(240,180,41,.06)',border:'1px solid rgba(240,180,41,.15)'}}>
            <p style={{fontSize:12,color:'rgba(240,180,41,.5)',marginBottom:4}}>Current Balance</p>
            <p style={{fontSize:'2rem',fontWeight:700,fontFamily:'Syne,sans-serif',color:'#f0b429'}}>{balance.balance}</p>
          </div>
          <div>
            <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>CREDITS NEEDED *</label>
            <input className="cv-input" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="e.g. 100"/>
          </div>
          <div>
            <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>MESSAGE TO ADMIN</label>
            <textarea className="cv-input" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Why do you need credits..." style={{resize:'none'}}/>
          </div>
          <div style={{display:'flex',gap:8,flexDirection:'column'}}>
            <button type="button" onClick={()=>setShowReq(false)} className="btn-ghost" style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn-gold" style={{flex:1}}>Send Request</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
