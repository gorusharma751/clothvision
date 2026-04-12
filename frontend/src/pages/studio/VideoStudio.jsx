import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, X, Plus, Play, Film, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';

function DropBox({ preview, onFile, onRemove, label, sublabel, accent='#7c3aed', required }) {
  const onDrop = useCallback(f=>{if(f[0])onFile(f[0]);}, [onFile]);
  const {getRootProps,getInputProps,isDragActive} = useDropzone({onDrop,accept:{'image/*':[]},maxFiles:1});
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?accent:preview?`${accent}88`:`${accent}33`}`,borderRadius:14,background:'rgba(17,17,24,.7)',cursor:'pointer',transition:'all .2s',minHeight:130,position:'relative',overflow:'hidden'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="p" style={{width:'100%',maxHeight:170,objectFit:'contain',display:'block'}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:'rgba(239,68,68,.85)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={11} color="#fff"/></button>
        </>
      ) : (
        <div style={{padding:'22px 12px',textAlign:'center'}}>
          <div style={{width:38,height:38,borderRadius:11,background:`${accent}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
            <Plus size={17} color={`${accent}99`}/>
          </div>
          <p style={{fontSize:12,fontWeight:600,color:'rgba(226,226,240,.5)'}}>{label}{required&&<span style={{color:'#f87171'}}> *</span>}</p>
          {sublabel&&<p style={{fontSize:10,color:`${accent}55`,marginTop:3}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

const VIDEO_TYPES = [
  {id:'showcase',label:'Product Showcase',desc:'Professional 8-sec display',emoji:'🎬'},
  {id:'lifestyle',label:'Lifestyle/Fashion',desc:'Trendy fashion video',emoji:'✨'},
  {id:'how_to_use',label:'How to Use',desc:'Usage demonstration',emoji:'📖'},
  {id:'how_to_assemble',label:'How to Assemble',desc:'Step-by-step assembly',emoji:'🔧'},
  {id:'size_ratio',label:'Size on Body',desc:'Body size comparison',emoji:'📏'},
  {id:'sample_demo',label:'Sample Demo',desc:'Quick animation demo',emoji:'⚡'},
];

export default function VideoStudio() {
  const nav = useNavigate();
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [videoType, setVideoType] = useState('showcase');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productColor, setProductColor] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async () => {
    if(!productFile) return toast.error('Upload product image first');
    setGenerating(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('product_image', productFile);
      if(modelFile) fd.append('model_image', modelFile);
      fd.append('video_type', videoType);
      fd.append('product_name', productName||'Product');
      fd.append('product_category', productCategory||'clothing');
      fd.append('product_color', productColor||'');
      fd.append('description', description||'');
      const r = await api.post('/video/generate-script', fd, {headers:{'Content-Type':'multipart/form-data'}});
      setResult(r.data);
      toast.success('Video script + frames generated!');
    } catch(err){
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const download = (url) => { const a=document.createElement('a'); a.href=url.startsWith('http')?url:getImageUrl(url); a.download='frame.jpg'; a.click(); };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
      <div style={{position:'sticky',top:0,zIndex:20,padding:'12px 20px',display:'flex',alignItems:'center',gap:14,background:'rgba(10,10,15,.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
        <button onClick={()=>nav('/owner/studio')} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(124,58,237,.25)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'#fff'}}>🎬 Video Studio</h1>
          <p style={{fontSize:11,color:'rgba(124,58,237,.45)'}}>AI video script + frames for your product</p>
        </div>
      </div>

      <div style={{maxWidth:920,margin:'0 auto',padding:'24px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20,marginBottom:20}}>
          {/* Left panel */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT IMAGE *</p>
              <DropBox preview={productPreview} onFile={f=>{setProductFile(f);setProductPreview(URL.createObjectURL(f));}} onRemove={()=>{setProductFile(null);setProductPreview(null);}} label="Upload product" sublabel="Main product photo" required/>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>MODEL IMAGE (optional)</p>
              <DropBox preview={modelPreview} onFile={f=>{setModelFile(f);setModelPreview(URL.createObjectURL(f));}} onRemove={()=>{setModelFile(null);setModelPreview(null);}} label="Upload model" sublabel="For clothing try-on frames"/>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18,display:'flex',flexDirection:'column',gap:10}}>
              {[['Product Name',productName,setProductName,'e.g. Blue Denim Jacket'],['Category',productCategory,setProductCategory,'e.g. Jacket'],['Color',productColor,setProductColor,'e.g. Navy Blue']].map(([l,v,s,ph])=>(
                <div key={l}>
                  <label style={{fontSize:10,color:'rgba(124,58,237,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l.toUpperCase()}</label>
                  <input className="cv-input" value={v} onChange={e=>s(e.target.value)} placeholder={ph}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:10,color:'rgba(124,58,237,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>DETAILS</label>
                <textarea className="cv-input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Product details, features..." style={{resize:'none',minHeight:64}}/>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:12,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>VIDEO TYPE</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {VIDEO_TYPES.map(t=>(
                  <div key={t.id} onClick={()=>setVideoType(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1px solid ${videoType===t.id?'rgba(124,58,237,.5)':'rgba(30,30,45,.8)'}`,background:videoType===t.id?'rgba(124,58,237,.1)':'transparent',cursor:'pointer',transition:'all .2s'}}>
                    <span style={{fontSize:20}}>{t.emoji}</span>
                    <div>
                      <p style={{fontSize:12,fontWeight:videoType===t.id?600:400,color:videoType===t.id?'#a78bfa':'rgba(226,226,240,.6)'}}>{t.label}</p>
                      <p style={{fontSize:10,color:'rgba(162,140,250,.35)'}}>{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{padding:12,borderRadius:12,background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.12)'}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',fontWeight:600,marginBottom:6,display:'flex',alignItems:'center',gap:4}}><Info size={12}/>How it works</p>
              <p style={{fontSize:11,color:'rgba(162,140,250,.5)',lineHeight:1.6}}>AI generates a video script + key frames. Use these with <strong style={{color:'#a78bfa'}}>Luma AI, Runway, or Kling AI</strong> to create the actual video.</p>
            </div>
            <button onClick={generate} disabled={generating||!productFile} className="btn-primary" style={{width:'100%',height:48,justifyContent:'center',fontSize:'.95rem'}}>
              {generating ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>Generating...</> : <><Film size={16}/>Generate Video Script & Frames</>}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,animation:'fadeUp .4s ease'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:16}}>🎬 Generated Script + Frames</h3>
            
            {/* Frames */}
            {result.frames?.length > 0 && (
              <div style={{marginBottom:20}}>
                <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>KEY FRAMES</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  {result.frames.map((f,i)=>(
                    <div key={i} style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(124,58,237,.15)',position:'relative'}}>
                      <img src={f.url?.startsWith('http')?f.url:getImageUrl(f.url)} alt={f.angle} style={{width:'100%',aspectRatio:'3/4',objectFit:'cover'}}/>
                      <div style={{padding:'6px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'rgba(162,140,250,.5)',textTransform:'capitalize'}}>{f.angle?.replace('_',' ')}</span>
                        <button onClick={()=>download(f.url)} style={{width:22,height:22,borderRadius:6,background:'rgba(124,58,237,.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Download size={10} color="#a78bfa"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Script */}
            {result.script?.scenes?.length > 0 && (
              <div style={{marginBottom:16}}>
                <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>VIDEO SCRIPT (8 SECONDS)</p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {result.script.scenes.map((s,i)=>(
                    <div key={i} style={{padding:'10px 12px',borderRadius:10,background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.08)',display:'grid',gridTemplateColumns:'80px 1fr',gap:10,alignItems:'start'}}>
                      <div style={{textAlign:'center',padding:'4px 8px',borderRadius:8,background:'rgba(124,58,237,.15)'}}>
                        <p style={{fontSize:11,fontWeight:600,color:'#a78bfa'}}>{s.second}s</p>
                      </div>
                      <div>
                        <p style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:2}}>{s.shot}</p>
                        <p style={{fontSize:11,color:'rgba(162,140,250,.6)'}}>{s.action}</p>
                        {s.text_overlay&&<p style={{fontSize:10,color:'rgba(240,180,41,.6)',marginTop:2}}>"{s.text_overlay}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motion prompt */}
            {result.script?.motion_prompt && (
              <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.15)'}}>
                <p style={{fontSize:11,color:'#4ade80',fontWeight:600,marginBottom:6}}>🎯 Prompt for AI Video Generator (Luma / Runway / Kling)</p>
                <p style={{fontSize:12,color:'rgba(226,226,240,.7)',lineHeight:1.6}}>{result.script.motion_prompt}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
