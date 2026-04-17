import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, ArrowRight, X, Upload, User, Shuffle, Lock, Wand2, Download, Copy, Check, Plus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { buildUploadUrl } from '../../utils/uploads';
import { getJobErrorMessage, getJobProgressImages, resolveJobResponse } from '../../utils/jobs';
import Layout from '../../components/shared/Layout';

/* ── tiny helpers ── */
const IMG = path => buildUploadUrl(path);

const GENDERS = [
  { id:'women', label:'Women', emoji:'👩', subs:['Top','Dress','Jeans','Skirt','Kurti','Saree','Lehenga','Jacket','Other'] },
  { id:'men',   label:'Men',   emoji:'👨', subs:['Shirt','T-Shirt','Jeans','Trousers','Kurta','Blazer','Jacket','Other'] },
  { id:'boy',   label:'Boy',   emoji:'👦', subs:['T-Shirt','Shirt','Shorts','Jeans','Other'] },
  { id:'girl',  label:'Girl',  emoji:'👧', subs:['Frock','Top','Leggings','Kurti','Other'] },
];

const ANGLES = [
  { id:'front',    label:'Front',    emoji:'⬛' },
  { id:'back',     label:'Back',     emoji:'⬜' },
  { id:'walking',  label:'Walking',  emoji:'🚶' },
  { id:'closeup',  label:'Close-up', emoji:'🔍' },
  { id:'side',     label:'Side',     emoji:'◀' },
  { id:'3_4',      label:'3/4 View', emoji:'↗' },
];

const BG_STYLES = ['Studio White','Lifestyle','Gradient','Flat Lay','Outdoor','Custom'];

/* ── ImageBox ── */
function ImageBox({ file, preview, onFile, onRemove, label, sublabel }) {
  const onDrop = useCallback(f => { if(f[0]) onFile(f[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'image/*':[]}, maxFiles:1 });
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'rgba(124,58,237,.7)':preview?'rgba(124,58,237,.4)':'rgba(124,58,237,.2)'}`,borderRadius:14,background:isDragActive?'rgba(124,58,237,.08)':'rgba(17,17,24,.6)',cursor:'pointer',transition:'all .2s',minHeight:120,position:'relative',overflow:'hidden'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="preview" style={{width:'100%',height:'100%',objectFit:'contain',maxHeight:180}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:'rgba(239,68,68,.8)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><X size={11} color="#fff"/></button>
          <p style={{textAlign:'center',fontSize:10,color:'rgba(162,140,250,.4)',padding:'4px 0'}}>Click to change</p>
        </>
      ) : (
        <div style={{padding:'20px 12px',textAlign:'center'}}>
          <div style={{width:36,height:36,borderRadius:10,background:'rgba(124,58,237,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
            {isDragActive ? <Upload size={16} color="#a78bfa"/> : <Plus size={16} color="rgba(124,58,237,.5)"/>}
          </div>
          <p style={{fontSize:12,fontWeight:600,color:'rgba(226,226,240,.5)'}}>{label}</p>
          {sublabel && <p style={{fontSize:10,color:'rgba(124,58,237,.35)',marginTop:2}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

/* ── Step indicator ── */
function Steps({ current, steps }) {
  return (
    <div className="dress-steps-wrap" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:22}}>
      {steps.map((s,i)=>(
        <div key={s} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:0}}>
          <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,fontFamily:'Syne,sans-serif',background:i<current?'rgba(34,197,94,.2)':i===current?'rgba(124,58,237,.3)':'rgba(30,30,45,.5)',color:i<current?'#4ade80':i===current?'#a78bfa':'rgba(162,140,250,.3)',border:`1px solid ${i<current?'rgba(34,197,94,.3)':i===current?'rgba(124,58,237,.5)':'rgba(124,58,237,.1)'}`}}>
            {i<current?'✓':(i+1)}
          </div>
          <span style={{fontSize:11,fontWeight:i===current?600:500,color:i===current?'#a78bfa':'rgba(162,140,250,.42)',lineHeight:1.2,textAlign:'center'}}>{s}</span>
        </div>
      ))}
      <style>{`@media(max-width:520px){.dress-steps-wrap span{font-size:10px!important}}`}</style>
    </div>
  );
}

export default function DressStudio() {
  const nav = useNavigate();
  const [step, setStep] = useState(0); // 0=gender/type, 1=uploads, 2=options, 3=results
  const [gender, setGender] = useState(null);
  const [subType, setSubType] = useState(null);
  const [showSub, setShowSub] = useState(false);

  // Product images — multiple items
  const [items, setItems] = useState([ { id:1, file:null, preview:null } ]); // each item = one clothing piece

  // Model settings
  const [modelMode, setModelMode] = useState('with'); // with | without | random
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [faceLock, setFaceLock] = useState(true);
  const [modelConsistency, setModelConsistency] = useState(true);

  // Background
  const [bgMode, setBgMode] = useState('studio'); // studio | custom
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [bgStyle, setBgStyle] = useState('Studio White');

  // Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Output
  const [selectedAngles, setSelectedAngles] = useState(['front','back','walking','closeup']);
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Product details
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState('idle');
  const generating = isGenerating;
  const setGenerating = setIsGenerating;
  const [results, setResults] = useState([]);
  const [pendingCards, setPendingCards] = useState([]);
  const [listingContent, setListingContent] = useState(null);
  const [listingPlatform, setListingPlatform] = useState('amazon');
  const pollAbortRef = useRef(null);
  const generationRunRef = useRef(0);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const addItem = () => setItems(prev => [...prev, { id: Date.now(), file:null, preview:null }]);
  const removeItem = id => setItems(prev => prev.filter(x => x.id !== id));
  const setItemFile = (id, file) => {
    const preview = URL.createObjectURL(file);
    setItems(prev => prev.map(x => x.id===id ? {...x, file, preview} : x));
  };
  const clearItemFile = id => setItems(prev => prev.map(x => x.id===id ? {...x, file:null, preview:null} : x));

  const canGoNext = () => {
    if (step===0) return !!gender;
    if (step===1) return items.some(x => x.file);
    if (step===2) return selectedAngles.length > 0;
    return false;
  };

  const getAiErrorMessage = (err) => {
    const msg = err?.response?.data?.error || err?.message || '';
    if (/insufficient credits/i.test(msg)) return 'Not enough credits! Request more from Credits page.';
    if (/quota exceeded|active quota|billing|rate-limits|too many requests/i.test(msg)) {
      return 'Gemini quota exceeded. Enable billing or use a project with active quota, then retry.';
    }
    if (/api key is invalid|api key not valid|invalid api key/i.test(msg)) {
      return 'Gemini API key is invalid or restricted. Verify key restrictions in Google Cloud.';
    }
    if (/permission denied|forbidden|service_disabled|not permitted/i.test(msg)) {
      return 'Gemini API is not permitted for this project. Enable Generative Language API and billing.';
    }
    return msg || 'Generation failed. Please try again.';
  };

  const getGeneratingLabel = () => {
    if (jobStatus === 'pending') return 'Queued...';
    if (jobStatus === 'processing') return 'Generating...';
    return 'Generating...';
  };

  const startPollingSignal = () => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    return controller.signal;
  };

  const createPendingCards = (count) => {
    const normalized = Math.max(1, Number(count) || 1);
    generationRunRef.current += 1;
    const runId = generationRunRef.current;
    setPendingCards(Array.from({ length: normalized }, (_, index) => ({
      id: `pending-${runId}-${index}`,
      status: 'loading',
      image: null,
    })));
    return runId;
  };

  const markPendingFailed = (runId) => {
    setPendingCards((prev) => prev.map((card) => (
      card.id.startsWith(`pending-${runId}-`) ? { ...card, status: 'failed' } : card
    )));
  };

  const mergeProgressCards = (runId, incomingImages) => {
    const normalizedImages = Array.isArray(incomingImages) ? incomingImages : [];
    if (!normalizedImages.length || runId !== generationRunRef.current) return;

    setPendingCards((prev) => prev.map((card, cardIndex) => {
      if (!card.id.startsWith(`pending-${runId}-`)) return card;
      const image = normalizedImages[cardIndex];
      if (!image) return card;
      return { ...card, status: 'completed', image };
    }));
  };

  const generate = async () => {
    if (isGenerating) return;
    const productFiles = items.filter(x=>x.file);
    if (!productFiles.length) return toast.error('Upload at least one product image');
    if (selectedAngles.length === 0) return toast.error('Select at least one angle');
    const expectedSlots = modelMode === 'without' ? 1 : Math.max(1, selectedAngles.length);
    const runId = createPendingCards(expectedSlots);
    const signal = startPollingSignal();

    setGenerating(true);
    setJobStatus('pending');
    setStep(3);

    try {
      // First create product
      const fd = new FormData();
      fd.append('name', productName || `${gender?.label||''} ${subType||'Product'}`);
      fd.append('category', subType || gender?.label || 'Clothing');
      fd.append('color', color);
      fd.append('material', material);
      fd.append('description', additionalNotes);
      fd.append('product_image', productFiles[0].file);
      const prodRes = await api.post('/products', fd, { headers:{'Content-Type':'multipart/form-data'} });
      const productId = prodRes.data.id;

      if (modelMode === 'without') {
        // BG only
        const r = await api.post(`/products/${productId}/generate-bg`, { bg_style: bgStyle.toLowerCase().replace(' ','_') });
        const settled = await resolveJobResponse(r.data, {
          onStatusChange: (status, snapshot) => {
            setJobStatus(status);
            mergeProgressCards(runId, getJobProgressImages(snapshot));
          },
          intervalMs: 3000,
          processingIntervalMs: 4500,
          maxPollingRetries: 4,
          signal,
        });

        if (settled.status === 'failed') {
          setJobStatus('failed');
          markPendingFailed(runId);
          toast.error(getJobErrorMessage(settled, 'Background generation failed'));
          return;
        }

        const payload = settled.result || {};
        if (!payload.image?.image_url) {
          setJobStatus('failed');
          markPendingFailed(runId);
          toast.error('Generation finished but no image was returned. Please retry.');
          return;
        }

        const nextResults = [{ angle:'product', url: payload.image.image_url }];
        mergeProgressCards(runId, nextResults);
        setPendingCards([]);
        setResults(nextResults);
      } else {
        // Try-on
        if (!modelFile) {
          setJobStatus('idle');
          markPendingFailed(runId);
          return toast.error('Upload model photo');
        }
        const genFd = new FormData();
        genFd.append('model_image', modelFile);
        genFd.append('angles', JSON.stringify(selectedAngles));
        genFd.append('face_lock', faceLock ? '1' : '0');
        genFd.append('model_consistency', modelConsistency ? '1' : '0');
        if (bgFile) genFd.append('custom_bg', bgFile);
        if (logoFile) genFd.append('logo', logoFile);
        const r = await api.post(`/products/${productId}/generate`, genFd, { headers:{'Content-Type':'multipart/form-data'} });
        const settled = await resolveJobResponse(r.data, {
          onStatusChange: (status, snapshot) => {
            setJobStatus(status);
            mergeProgressCards(runId, getJobProgressImages(snapshot));
          },
          intervalMs: 3000,
          processingIntervalMs: 4500,
          maxPollingRetries: 4,
          signal,
        });

        if (settled.status === 'failed') {
          setJobStatus('failed');
          markPendingFailed(runId);
          toast.error(getJobErrorMessage(settled, 'Image generation failed'));
          return;
        }

        const payload = settled.result || {};
        const images = Array.isArray(payload.images) ? payload.images : [];
        if (!images.length) {
          setJobStatus('failed');
          markPendingFailed(runId);
          toast.error('Generation finished but no images were returned. Please retry.');
          return;
        }

        mergeProgressCards(runId, images);
        setPendingCards([]);
        setResults(images);
      }
      setJobStatus('completed');
      toast.success('Images generated!');
    } catch(err) {
      if (err?.name === 'AbortError') return;
      setJobStatus('failed');
      markPendingFailed(runId);
      toast.error(getAiErrorMessage(err));
    } finally {
      if (pollAbortRef.current?.signal === signal) pollAbortRef.current = null;
      setGenerating(false);
    }
  };

  const generateListing = async () => {
    if (!results.length) return;
    try {
      const prodRes = await api.get('/products');
      const latest = prodRes.data[0];
      if (!latest) return;
      const r = await api.post(`/products/${latest.id}/listing-content`, { platform: listingPlatform });
      setListingContent(r.data);
      toast.success('Listing content ready!');
    } catch { toast.error('Listing generation failed'); }
  };

  const download = url => { const a = document.createElement('a'); a.href = IMG(url); a.download = 'clothvision.jpg'; a.click(); };
  const [copied, setCopied] = useState('');
  const copyText = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(''),2000); toast.success('Copied!'); };

  const STEPS = ['Category','Upload Products','Settings','Results'];
  const genderData = GENDERS.find(g => g.id === gender?.id);

  return (
    <Layout
      title="Dress / Clothing Studio"
      subtitle="AI-powered fashion photography"
      contentPadding={0}
      actions={
        <button onClick={()=> step===0 ? nav('/owner/studio') : setStep(s=>s-1)} className="btn btn-outline" style={{padding:'6px 10px',fontSize:12,borderRadius:8}}>
          <ArrowLeft size={13}/>{step===0 ? 'Studio' : 'Back'}
        </button>
      }
    >
      <div style={{minHeight:'calc(100vh - 84px)',background:'#0a0a0f'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'clamp(14px,2.6vw,24px) 16px'}}>
        <Steps current={step} steps={STEPS}/>

        {/* ── STEP 0: Gender + Category ── */}
        {step===0 && (
          <div className="animate-fade-up">
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.4rem',color:'#fff',marginBottom:6,textAlign:'center'}}>Select Category</h2>
            <p style={{color:'rgba(162,140,250,.45)',textAlign:'center',marginBottom:28,fontSize:'.9rem'}}>Who is this clothing for?</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20,maxWidth:620,margin:'0 auto 20px'}}>
              {GENDERS.map(g=>(
                <div key={g.id} onClick={()=>{setGender(g);setSubType(null);setShowSub(true);}}
                  style={{border:`2px solid ${gender?.id===g.id?'rgba(124,58,237,.6)':'rgba(30,30,45,.8)'}`,borderRadius:14,padding:'14px 8px',textAlign:'center',cursor:'pointer',background:gender?.id===g.id?'rgba(124,58,237,.1)':'rgba(17,17,24,.8)',transition:'all .25s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,58,237,.4)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=gender?.id===g.id?'rgba(124,58,237,.6)':'rgba(30,30,45,.8)'}>
                  <div style={{fontSize:30,marginBottom:8}}>{g.emoji}</div>
                  <p style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:gender?.id===g.id?'#a78bfa':'rgba(226,226,240,.8)',fontSize:'.95rem'}}>{g.label}</p>
                </div>
              ))}
            </div>
            {gender && (
              <div className="animate-fade-up" style={{marginBottom:24}}>
                <p style={{fontSize:12,color:'rgba(162,140,250,.5)',marginBottom:12,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>SUB-CATEGORY (optional)</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {genderData?.subs.map(s=>(
                    <button key={s} onClick={()=>setSubType(s)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${subType===s?'rgba(124,58,237,.6)':'rgba(124,58,237,.15)'}`,background:subType===s?'rgba(124,58,237,.15)':'transparent',color:subType===s?'#a78bfa':'rgba(162,140,250,.45)',fontSize:12,cursor:'pointer',fontWeight:subType===s?600:400,transition:'all .2s'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Upload Products ── */}
        {step===1 && (
          <div className="animate-fade-up">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:10,flexWrap:'wrap'}}>
              <div>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.3rem',color:'#fff'}}>Upload Your Products</h2>
                <p style={{color:'rgba(162,140,250,.4)',fontSize:'.85rem',marginTop:3}}>Add all product photos — they'll be merged with the model</p>
              </div>
              <button onClick={addItem} className="btn-ghost" style={{flexShrink:0}}><Plus size={14}/>Add Item</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
              {items.map((item,i)=>(
                <div key={item.id} style={{position:'relative'}}>
                  <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:6,fontFamily:'Syne,sans-serif'}}>Item {i+1}</p>
                  <ImageBox file={item.file} preview={item.preview} onFile={f=>setItemFile(item.id,f)} onRemove={()=>clearItemFile(item.id)} label="Drop product" sublabel="JPG/PNG/WEBP"/>
                  {items.length>1 && (
                    <button onClick={()=>removeItem(item.id)} style={{position:'absolute',top:18,right:4,width:18,height:18,borderRadius:'50%',background:'rgba(239,68,68,.7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={10} color="#fff"/></button>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
              <div>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT NAME</label>
                <input className="cv-input" value={productName} onChange={e=>setProductName(e.target.value)} placeholder={`${gender?.label||''} ${subType||'Product'}`}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>BRAND NAME</label>
                <input className="cv-input" value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Your brand"/>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>COLOR</label>
                <input className="cv-input" value={color} onChange={e=>setColor(e.target.value)} placeholder="e.g. Navy Blue"/>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>MATERIAL</label>
                <input className="cv-input" value={material} onChange={e=>setMaterial(e.target.value)} placeholder="e.g. 100% Cotton"/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{fontSize:11,color:'rgba(162,140,250,.5)',display:'block',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>ADDITIONAL DETAILS (helps AI generate better)</label>
                <textarea className="cv-input" value={additionalNotes} onChange={e=>setAdditionalNotes(e.target.value)} placeholder="e.g. Regular fit, formal occasion, summer collection..." style={{resize:'none',minHeight:72}}/>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Options ── */}
        {step===2 && (
          <div className="animate-fade-up">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20}}>
              {/* Model settings */}
              <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
                <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:16,fontSize:'1rem'}}>👤 Model Settings</h3>
                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  {[['with','With Model'],['without','No Model'],['random','Random Model']].map(([v,l])=>(
                    <button key={v} onClick={()=>setModelMode(v)} style={{flex:1,padding:'8px 4px',borderRadius:10,border:`1px solid ${modelMode===v?'rgba(124,58,237,.6)':'rgba(124,58,237,.15)'}`,background:modelMode===v?'rgba(124,58,237,.15)':'transparent',color:modelMode===v?'#a78bfa':'rgba(162,140,250,.35)',fontSize:11,fontWeight:modelMode===v?600:400,cursor:'pointer',transition:'all .2s',textAlign:'center'}}>
                      {l}
                    </button>
                  ))}
                </div>
                {modelMode==='with' && (
                  <div style={{marginBottom:14}}>
                    <p style={{fontSize:11,color:'rgba(162,140,250,.5)',marginBottom:8,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>UPLOAD MODEL PHOTO</p>
                    <ImageBox file={modelFile} preview={modelPreview} onFile={f=>{setModelFile(f);setModelPreview(URL.createObjectURL(f));}} onRemove={()=>{setModelFile(null);setModelPreview(null);}} label="Drop model photo" sublabel="Face will be preserved"/>
                  </div>
                )}
                {modelMode!=='without' && (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.1)'}}>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,color:'#fff'}}>🔒 Face Lock</p>
                        <p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>Keep model's face 100% accurate</p>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={faceLock} onChange={e=>setFaceLock(e.target.checked)}/>
                        <div className="toggle-track"/><div className="toggle-thumb"/>
                      </label>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.1)'}}>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,color:'#fff'}}>🎯 Model Consistency</p>
                        <p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>Same model across all angles</p>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={modelConsistency} onChange={e=>setModelConsistency(e.target.checked)}/>
                        <div className="toggle-track"/><div className="toggle-thumb"/>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Background + Logo */}
              <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
                <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:16,fontSize:'1rem'}}>🖼️ Background & Logo</h3>
                <div style={{display:'flex',gap:8,marginBottom:14}}>
                  {[['studio','Studio BG'],['custom','My Own BG']].map(([v,l])=>(
                    <button key={v} onClick={()=>setBgMode(v)} style={{flex:1,padding:'8px',borderRadius:10,border:`1px solid ${bgMode===v?'rgba(124,58,237,.6)':'rgba(124,58,237,.15)'}`,background:bgMode===v?'rgba(124,58,237,.15)':'transparent',color:bgMode===v?'#a78bfa':'rgba(162,140,250,.35)',fontSize:12,fontWeight:bgMode===v?600:400,cursor:'pointer',transition:'all .2s'}}>
                      {l}
                    </button>
                  ))}
                </div>
                {bgMode==='studio' ? (
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
                    {BG_STYLES.filter(s=>s!=='Custom').map(s=>(
                      <button key={s} onClick={()=>setBgStyle(s)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${bgStyle===s?'rgba(124,58,237,.6)':'rgba(124,58,237,.12)'}`,background:bgStyle===s?'rgba(124,58,237,.15)':'transparent',color:bgStyle===s?'#a78bfa':'rgba(162,140,250,.35)',fontSize:11,cursor:'pointer',transition:'all .2s'}}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{marginBottom:14}}>
                    <ImageBox file={bgFile} preview={bgPreview} onFile={f=>{setBgFile(f);setBgPreview(URL.createObjectURL(f));}} onRemove={()=>{setBgFile(null);setBgPreview(null);}} label="Upload your background" sublabel="Any image"/>
                  </div>
                )}
                <div>
                  <p style={{fontSize:11,color:'rgba(162,140,250,.5)',marginBottom:8,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>LOGO (OPTIONAL)</p>
                  <ImageBox file={logoFile} preview={logoPreview} onFile={f=>{setLogoFile(f);setLogoPreview(URL.createObjectURL(f));}} onRemove={()=>{setLogoFile(null);setLogoPreview(null);}} label="Upload logo" sublabel="PNG with transparency preferred"/>
                </div>
              </div>

              {/* Angles */}
              <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,gridColumn:'1/-1'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:8,flexWrap:'wrap'}}>
                  <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>📐 Output Angles</h3>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <button onClick={()=>setSelectedAngles(['front','back','walking','closeup'])} style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(124,58,237,.2)',background:'transparent',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Flipkart</button>
                    <button onClick={()=>setSelectedAngles(['front','back','side','3_4','closeup'])} style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(240,180,41,.2)',background:'transparent',color:'#f0b429',fontSize:11,cursor:'pointer'}}>Amazon</button>
                    <button onClick={()=>setSelectedAngles(ANGLES.map(a=>a.id))} style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(124,58,237,.15)',background:'transparent',color:'rgba(162,140,250,.5)',fontSize:11,cursor:'pointer'}}>All</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8}}>
                  {ANGLES.map(a=>{
                    const sel = selectedAngles.includes(a.id);
                    return (
                      <button key={a.id} onClick={()=>setSelectedAngles(prev=>sel?prev.filter(x=>x!==a.id):[...prev,a.id])} style={{padding:'10px 8px',borderRadius:10,border:`1px solid ${sel?'rgba(124,58,237,.5)':'rgba(30,30,45,.8)'}`,background:sel?'rgba(124,58,237,.12)':'rgba(17,17,24,.6)',cursor:'pointer',transition:'all .2s',textAlign:'center'}}>
                        <span style={{fontSize:18,display:'block',marginBottom:4}}>{a.emoji}</span>
                        <span style={{fontSize:12,fontWeight:sel?600:400,color:sel?'#a78bfa':'rgba(162,140,250,.35)'}}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{fontSize:11,color:'rgba(162,140,250,.35)',marginTop:10,textAlign:'center'}}>{selectedAngles.length} angle{selectedAngles.length!==1?'s':''} selected · ~{selectedAngles.length} credit{selectedAngles.length!==1?'s':''}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Results ── */}
        {step===3 && (
          <div className="animate-fade-up">
            {pendingCards.length > 0 && (
              <div style={{marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,gap:8,flexWrap:'wrap'}}>
                  <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff'}}>
                    {jobStatus === 'pending' ? 'Your job is queued' : 'Generating new images'}
                  </p>
                  <p style={{fontSize:12,color:'#a78bfa'}}>{getGeneratingLabel()}</p>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
                  {pendingCards.map((card) => (
                    <div key={card.id} style={{borderRadius:14,overflow:'hidden',background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.1)'}}>
                      {card.status === 'completed' && card.image ? (
                        <div style={{aspectRatio:'3/4',overflow:'hidden'}}>
                          <img src={IMG(card.image.image_url||card.image.url)} alt={card.image.angle || 'generated'} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        </div>
                      ) : card.status === 'failed' ? (
                        <div style={{aspectRatio:'3/4',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:12,textAlign:'center'}}>
                          <p style={{fontSize:12,color:'#fca5a5'}}>Image generation failed</p>
                          <button onClick={generate} className="btn btn-outline" style={{padding:'5px 10px',fontSize:11}}>Retry</button>
                        </div>
                      ) : (
                        <div style={{aspectRatio:'3/4',padding:10}}>
                          <div style={{width:'100%',height:'100%',borderRadius:8,background:'linear-gradient(110deg, rgba(124,58,237,0.10) 30%, rgba(124,58,237,0.24) 45%, rgba(124,58,237,0.10) 60%)',backgroundSize:'220% 100%',animation:'cvShimmerDress 1.2s ease-in-out infinite'}} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(162,140,250,.4)'}}>
                <p>No results yet</p>
                <button onClick={generate} className="btn-primary" style={{marginTop:16}}><Wand2 size={16}/>Generate Now</button>
              </div>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff'}}>✨ Generated Images ({results.length})</h2>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:24}}>
                  {results.map((img,i)=>(
                    <div key={img.id||i} style={{borderRadius:14,overflow:'hidden',background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.1)',position:'relative'}} className="group">
                      <div style={{aspectRatio:'3/4',overflow:'hidden'}}>
                        <img src={IMG(img.image_url||img.url)} alt={img.angle} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
                      </div>
                      <div style={{padding:'8px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:11,color:'rgba(162,140,250,.5)',textTransform:'capitalize'}}>{(img.angle||'').replace('_',' ')}</span>
                        <button onClick={()=>download(img.image_url||img.url)} style={{width:24,height:24,borderRadius:6,background:'rgba(124,58,237,.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Download size={11} color="#a78bfa"/></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Listing content section */}
                <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'1rem'}}>📋 Listing Content</h3>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{display:'flex',gap:4}}>
                        {['amazon','flipkart'].map(p=>(
                          <button key={p} onClick={()=>setListingPlatform(p)} style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${listingPlatform===p?'rgba(124,58,237,.5)':'rgba(124,58,237,.15)'}`,background:listingPlatform===p?'rgba(124,58,237,.15)':'transparent',color:listingPlatform===p?'#a78bfa':'rgba(162,140,250,.3)',fontSize:11,cursor:'pointer',textTransform:'capitalize'}}>
                            {p}
                          </button>
                        ))}
                      </div>
                      <button onClick={generateListing} className="btn-primary" style={{fontSize:12,padding:'6px 14px'}}>Generate</button>
                    </div>
                  </div>
                  {listingContent ? (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {[['Title',listingContent.title],['Description',listingContent.description],['Keywords',listingContent.keywords?.join(', ')],['Category',listingContent.category_path]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k} style={{padding:'10px 14px',borderRadius:10,background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.08)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                            <span style={{fontSize:10,color:'rgba(162,140,250,.4)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{k.toUpperCase()}</span>
                            <button onClick={()=>copyText(v,k)} style={{background:'none',border:'none',cursor:'pointer',color:copied===k?'#4ade80':'rgba(162,140,250,.5)'}}>{copied===k?<Check size={12}/>:<Copy size={12}/>}</button>
                          </div>
                          <p style={{fontSize:12,color:'rgba(226,226,240,.7)',lineHeight:1.5}}>{v}</p>
                        </div>
                      ))}
                      {listingContent.bullet_points?.length>0 && (
                        <div style={{padding:'10px 14px',borderRadius:10,background:'rgba(124,58,237,.04)',border:'1px solid rgba(124,58,237,.08)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                            <span style={{fontSize:10,color:'rgba(162,140,250,.4)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>KEY FEATURES</span>
                            <button onClick={()=>copyText(listingContent.bullet_points.join('\n'),`bp`)} style={{background:'none',border:'none',cursor:'pointer',color:copied==='bp'?'#4ade80':'rgba(162,140,250,.5)'}}>{copied==='bp'?<Check size={12}/>:<Copy size={12}/>}</button>
                          </div>
                          {listingContent.bullet_points.map((b,i)=><p key={i} style={{fontSize:12,color:'rgba(226,226,240,.7)',lineHeight:1.6}}>• {b}</p>)}
                        </div>
                      )}
                    </div>
                  ) : <p style={{color:'rgba(162,140,250,.35)',fontSize:'.85rem',textAlign:'center',padding:'20px 0'}}>Click Generate to create Amazon/Flipkart listing content</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div style={{display:'flex',justifyContent:'space-between',marginTop:28,paddingTop:20,borderTop:'1px solid rgba(124,58,237,.1)',gap:10,flexWrap:'wrap'}}>
            <button onClick={()=>step===0?nav('/owner/studio'):setStep(s=>s-1)} className="btn-ghost">
              <ArrowLeft size={14}/>Back
            </button>
            {step < 2 ? (
              <button onClick={()=>setStep(s=>s+1)} disabled={!canGoNext()} className="btn-primary">
                Next <ArrowRight size={14}/>
              </button>
            ) : (
              <button onClick={generate} disabled={generating||!canGoNext()} className="btn-primary">
                <><Wand2 size={14}/>Generate ({selectedAngles.length} images)</>
              </button>
            )}
          </div>
        )}
        <style>{`@keyframes cvShimmerDress{0%{background-position:200% 0}100%{background-position:-40% 0}}`}</style>
        </div>
      </div>
    </Layout>
  );
}
