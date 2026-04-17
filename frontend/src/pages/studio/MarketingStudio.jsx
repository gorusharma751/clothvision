import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, X, Plus, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';
import { getJobErrorMessage, resolveJobResponse } from '../../utils/jobs';
import Layout from '../../components/shared/Layout';

function DropBox({ preview, onFile, onRemove, label, sublabel, accent='#7c3aed', required }) {
  const onDrop = useCallback(f=>{if(f[0])onFile(f[0]);}, [onFile]);
  const {getRootProps,getInputProps,isDragActive} = useDropzone({onDrop,accept:{'image/*':[]},maxFiles:1});
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?accent:preview?`${accent}88`:`${accent}28`}`,borderRadius:14,background:'rgba(17,17,24,.7)',cursor:'pointer',transition:'all .2s',minHeight:110,position:'relative',overflow:'hidden'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="p" style={{width:'100%',maxHeight:160,objectFit:'contain',display:'block'}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:5,right:5,width:20,height:20,borderRadius:'50%',background:'rgba(239,68,68,.85)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={10} color="#fff"/></button>
        </>
      ) : (
        <div style={{padding:'18px 10px',textAlign:'center'}}>
          <div style={{width:34,height:34,borderRadius:9,background:`${accent}10`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Plus size={15} color={`${accent}70`}/></div>
          <p style={{fontSize:11,fontWeight:600,color:'rgba(226,226,240,.42)'}}>{label}{required&&<span style={{color:'#f87171'}}> *</span>}</p>
          {sublabel&&<p style={{fontSize:10,color:`${accent}40`,marginTop:2}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

const STYLES=[
  {id:'modern_bold',label:'Modern Bold',emoji:'💥',desc:'Strong contrast'},
  {id:'minimalist',label:'Minimalist',emoji:'⬜',desc:'Clean & elegant'},
  {id:'luxury',label:'Luxury',emoji:'✨',desc:'Gold & premium'},
  {id:'colorful_vibrant',label:'Vibrant',emoji:'🎨',desc:'Social media ready'},
  {id:'editorial',label:'Editorial',emoji:'📰',desc:'Magazine-style'},
  {id:'sale_promo',label:'Sale/Promo',emoji:'🏷️',desc:'Discount highlights'},
];
const SIZES=[
  {id:'instagram_post',label:'Instagram Post',size:'1:1',desc:'1080×1080px'},
  {id:'instagram_story',label:'Instagram Story',size:'9:16',desc:'1080×1920px'},
  {id:'facebook_post',label:'Facebook Post',size:'4:3',desc:'1200×900px'},
  {id:'flipkart_banner',label:'Flipkart Banner',size:'16:9',desc:'1920×1080px'},
  {id:'whatsapp_status',label:'WhatsApp Status',size:'9:16',desc:'Status format'},
];

export default function MarketingStudio() {
  const nav = useNavigate();
  const [pFile,setPFile]=useState(null); const [pPrev,setPPrev]=useState(null);
  const [lFile,setLFile]=useState(null); const [lPrev,setLPrev]=useState(null);
  const [style,setStyle]=useState('modern_bold');
  const [size,setSize]=useState('instagram_post');
  const [brand,setBrand]=useState(''); const [tagline,setTagline]=useState('');
  const [extra,setExtra]=useState(''); const [pName,setPName]=useState('');
  const [price,setPrice]=useState(''); const [dPrice,setDPrice]=useState('');
  const [cta,setCta]=useState('Shop Now');
  const [isGenerating,setIsGenerating]=useState(false); const [jobStatus,setJobStatus]=useState('idle'); const gen=isGenerating; const setGen=setIsGenerating; const [result,setResult]=useState(null);
  const [caption,setCaption]=useState(null); const [copied,setCopied]=useState(false);
  const pollAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const startPollingSignal = () => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    return controller.signal;
  };

  const generate = async () => {
    if (isGenerating) return;
    if(!pFile) return toast.error('Upload product image');
    const signal = startPollingSignal();

    setGen(true); setJobStatus('pending');
    try {
      const fd=new FormData();
      fd.append('product_image',pFile);
      if(lFile) fd.append('logo',lFile);
      fd.append('poster_style',style); fd.append('poster_size',size);
      fd.append('brand_name',brand); fd.append('tagline',tagline);
      fd.append('extra_details',extra); fd.append('product_name',pName);
      fd.append('price',price); fd.append('discount_price',dPrice);
      fd.append('call_to_action',cta);
      const r=await api.post('/marketing/generate-poster',fd,{headers:{'Content-Type':'multipart/form-data'}});
      const settled = await resolveJobResponse(r.data, {
        onStatusChange: (status) => setJobStatus(status),
        intervalMs: 3000,
        processingIntervalMs: 4500,
        maxPollingRetries: 4,
        signal,
      });

      if (settled.status === 'failed') {
        setJobStatus('failed');
        toast.error(getJobErrorMessage(settled, 'Poster generation failed'));
        return;
      }

      const payload = settled.result || {};
      if (!payload.image_url) {
        setJobStatus('failed');
        toast.error('Generation finished but no poster image was returned. Please retry.');
        return;
      }

      setResult(payload);
      setJobStatus('completed');
      if(payload.instagram_caption) setCaption(payload.instagram_caption);
      toast.success(`Poster ready!${payload.credits_used ? ` Used ${payload.credits_used} credits.` : ''}`);
    } catch(err){
      if (err?.name === 'AbortError') return;
      setJobStatus('failed');
      if(err.response?.data?.error==='Insufficient credits') toast.error('Need 3 credits for poster');
      else toast.error(err.response?.data?.error||'Generation failed');
    } finally{
      if (pollAbortRef.current?.signal === signal) pollAbortRef.current = null;
      setGen(false);
    }
  };

  const download=()=>{if(!result?.image_url)return;const url=result.image_url.startsWith('http')?result.image_url:getImageUrl(result.image_url);const a=document.createElement('a');a.href=url;a.download=`poster_${size}_${Date.now()}.jpg`;a.click();};
  const copyCaption=()=>{if(!caption)return;navigator.clipboard.writeText(caption);setCopied(true);setTimeout(()=>setCopied(false),2000);toast.success('Caption copied!');};
  const imgUrl=(p)=>p?.startsWith('http')?p:getImageUrl(p);

  return (
    <Layout
      title="Marketing Studio"
      subtitle="Create Instagram, Facebook & e-commerce ad posters"
      contentPadding={0}
      actions={
        <button onClick={()=>nav('/owner/studio')} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(124,58,237,.25)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
          <ArrowLeft size={16}/>
        </button>
      }
    >
      <div style={{maxWidth:980,margin:'0 auto',padding:'clamp(14px,2.8vw,24px) 16px',minHeight:'calc(100vh - 84px)',background:'#0a0a0f'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
          {/* Left */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:12,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>1. UPLOAD IMAGES</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                <div>
                  <p style={{fontSize:10,color:'rgba(124,58,237,.4)',marginBottom:5}}>PRODUCT *</p>
                  <DropBox preview={pPrev} onFile={f=>{setPFile(f);setPPrev(URL.createObjectURL(f));}} onRemove={()=>{setPFile(null);setPPrev(null);}} label="Product photo" sublabel="Main product" required/>
                </div>
                <div>
                  <p style={{fontSize:10,color:'rgba(124,58,237,.4)',marginBottom:5}}>LOGO (optional)</p>
                  <DropBox preview={lPrev} onFile={f=>{setLFile(f);setLPrev(URL.createObjectURL(f));}} onRemove={()=>{setLFile(null);setLPrev(null);}} label="Brand logo" sublabel="PNG preferred"/>
                </div>
              </div>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18,display:'flex',flexDirection:'column',gap:9}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em',marginBottom:2}}>2. BRAND & PRODUCT</p>
              {[['BRAND NAME',brand,setBrand,'e.g. FashionBrand'],['PRODUCT NAME',pName,setPName,'e.g. Cotton Shirt'],['TAGLINE',tagline,setTagline,'e.g. Premium Quality'],['PRICE',price,setPrice,'e.g. ₹999'],['SALE PRICE',dPrice,setDPrice,'e.g. ₹599'],['CALL TO ACTION',cta,setCta,'e.g. Shop Now']].map(([l,v,s,ph])=>(
                <div key={l}>
                  <label style={{fontSize:10,color:'rgba(124,58,237,.38)',display:'block',marginBottom:3,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>{l}</label>
                  <input className="cv-input" value={v} onChange={e=>s(e.target.value)} placeholder={ph} style={{fontSize:12,padding:'.55rem .9rem'}}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:10,color:'rgba(124,58,237,.38)',display:'block',marginBottom:3,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>EXTRA DETAILS</label>
                <textarea className="cv-input" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="e.g. Summer Sale, 20% off, New Arrival, Free Shipping" style={{resize:'none',minHeight:56,fontSize:12}}/>
              </div>
            </div>
          </div>
          {/* Right */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:12,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>3. POSTER STYLE</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
                {STYLES.map(s=>(
                  <div key={s.id} onClick={()=>setStyle(s.id)} style={{padding:'9px 7px',borderRadius:9,border:`1px solid ${style===s.id?'rgba(124,58,237,.5)':'rgba(30,30,45,.8)'}`,background:style===s.id?'rgba(124,58,237,.1)':'transparent',cursor:'pointer',textAlign:'center',transition:'all .2s'}}>
                    <span style={{fontSize:18,display:'block',marginBottom:3}}>{s.emoji}</span>
                    <p style={{fontSize:11,fontWeight:style===s.id?600:400,color:style===s.id?'#a78bfa':'rgba(226,226,240,.4)'}}>{s.label}</p>
                    <p style={{fontSize:9,color:'rgba(162,140,250,.28)'}}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>4. OUTPUT SIZE</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {SIZES.map(s=>(
                  <div key={s.id} onClick={()=>setSize(s.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:9,border:`1px solid ${size===s.id?'rgba(124,58,237,.45)':'rgba(30,30,45,.8)'}`,background:size===s.id?'rgba(124,58,237,.07)':'transparent',cursor:'pointer',transition:'all .2s'}}>
                    <div>
                      <p style={{fontSize:12,fontWeight:size===s.id?600:400,color:size===s.id?'#a78bfa':'rgba(226,226,240,.5)'}}>{s.label}</p>
                      <p style={{fontSize:10,color:'rgba(162,140,250,.28)'}}>{s.desc}</p>
                    </div>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:5,background:'rgba(124,58,237,.1)',color:'#a78bfa'}}>{s.size}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={generate} disabled={gen||!pFile} className="btn-primary" style={{width:'100%',height:46,justifyContent:'center'}}>
              {gen
                ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>{jobStatus === 'pending' ? 'Queued for generation...' : 'Generating...'}</>
                : <><Wand2 size={14}/>Create Poster (3 credits)</>}
            </button>
          </div>
        </div>
        {result?.image_url && (
          <div style={{marginTop:24,background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,animation:'fadeUp .4s ease'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:10,flexWrap:'wrap'}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff'}}>📱 Your Poster</h3>
              <button onClick={download} className="btn-primary" style={{fontSize:12,padding:'7px 14px'}}><Download size={12}/>Download</button>
            </div>
            <div style={{maxWidth:380,margin:'0 auto 16px'}}>
              <img src={imgUrl(result.image_url)} alt="poster" style={{width:'100%',borderRadius:12,objectFit:'contain'}}/>
            </div>
            {caption && (
              <div style={{padding:'12px 14px',borderRadius:11,background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.14)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7,gap:8,flexWrap:'wrap'}}>
                  <p style={{fontSize:12,fontWeight:600,color:'#a78bfa'}}>📝 Instagram Caption</p>
                  <button onClick={copyCaption} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px solid rgba(124,58,237,.22)',background:'transparent',color:copied?'#4ade80':'#a78bfa',fontSize:11,cursor:'pointer',fontWeight:600}}>
                    {copied?<><Check size={10}/>Copied!</>:<><Copy size={10}/>Copy</>}
                  </button>
                </div>
                <p style={{fontSize:12,color:'rgba(226,226,240,.62)',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{caption}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
