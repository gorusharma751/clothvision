import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, Wand2, Download, RefreshCw, Trash2, Copy, Check, User, Package, Shuffle, Lock, Unlock, Image as Img, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';

// ─── Constants ────────────────────────────────────────────────
const CATEGORIES = {
  fashion: {
    label: 'Fashion', icon: '👗',
    sub: {
      women: { label:'Women', icon:'👩', types:['Dress','Kurti','Saree','Lehenga','Top','Jeans','Skirt','Jacket','Suit'] },
      men:   { label:'Men',   icon:'👨', types:['Shirt','T-Shirt','Jeans','Kurta','Blazer','Jacket','Suit','Hoodie','Shorts'] },
      boys:  { label:'Boys',  icon:'👦', types:['T-Shirt','Shirt','Jeans','Shorts','Jacket','Kurta'] },
      girls: { label:'Girls', icon:'👧', types:['Dress','Top','Lehenga','Frock','Skirt','Jacket'] },
    }
  },
  accessories: {
    label: 'Accessories', icon: '⌚',
    sub: {
      men:   { label:'Men Acc.',   icon:'👔', types:['Watch','Belt','Wallet','Sunglasses','Cap','Tie','Bag'] },
      women: { label:'Women Acc.', icon:'👛', types:['Handbag','Jewellery','Sunglasses','Watch','Scarf','Hair Accessory'] },
      other: { label:'Other',      icon:'📦', types:['Shoes','Sneakers','Sandals','Heels','Boots','Perfume','Other'] },
    }
  },
};

const ANGLES_LIST = [
  { id:'front',      label:'Front View',   icon:'⬆️' },
  { id:'back',       label:'Back View',    icon:'⬇️' },
  { id:'walking',    label:'Walking',      icon:'🚶' },
  { id:'closeup',    label:'Close-Up',     icon:'🔍' },
  { id:'left_side',  label:'Left Side',    icon:'◀️' },
  { id:'right_side', label:'Right Side',   icon:'▶️' },
  { id:'3_4_front',  label:'3/4 Front',    icon:'↗️' },
  { id:'sitting',    label:'Sitting',      icon:'🪑' },
];

const OUTPUT_PRESETS = {
  flipkart: ['front','back','left_side','right_side'],
  amazon:   ['front','back','3_4_front','closeup'],
  custom:   ['front','back','walking','closeup'],
};

const THEMES = [
  { id:'dark-luxury',        label:'Dark Luxury',     colors:['#0a0a0f','#7c3aed','#f0b429'] },
  { id:'light-minimal',      label:'Light Minimal',   colors:['#f8f8f5','#1a1a2e','#c9a227'] },
  { id:'colorful-bold',      label:'Colorful Bold',   colors:['#1a0533','#e91e8c','#00d4ff'] },
  { id:'professional-clean', label:'Professional',    colors:['#0f1923','#2196f3','#ffffff'] },
];

const BG_OPTIONS = [
  { id:'studio_white',  label:'Studio White' },
  { id:'studio_grey',   label:'Studio Grey' },
  { id:'lifestyle',     label:'Lifestyle' },
  { id:'gradient',      label:'Gradient' },
  { id:'flat_lay',      label:'Flat Lay' },
  { id:'custom',        label:'My Background' },
];

// ─── Small reusable uploader ──────────────────────────────────
function MiniDrop({ label, sublabel, file, preview, onFile, onRemove, aspectRatio='1' }) {
  const onDrop = useCallback(f=>{ if(f[0]) onFile(f[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'image/*':[]}, maxFiles:1 });

  if (preview) return (
    <div style={{position:'relative',aspectRatio,borderRadius:14,overflow:'hidden',border:'1px solid rgba(124,58,237,0.3)'}}>
      <img src={preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      <div {...getRootProps()} style={{position:'absolute',inset:0,cursor:'pointer'}}><input {...getInputProps()}/></div>
      {onRemove && <button onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:6,right:6,width:24,height:24,background:'rgba(0,0,0,0.75)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',zIndex:2}}>
        <Trash2 size={11}/>
      </button>}
    </div>
  );

  return (
    <div {...getRootProps()} style={{aspectRatio,border:`2px dashed ${isDragActive?'#a78bfa':'rgba(124,58,237,0.2)'}`,borderRadius:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',padding:'1rem',background:isDragActive?'rgba(124,58,237,0.05)':'transparent',transition:'all 0.2s',textAlign:'center'}}>
      <input {...getInputProps()}/>
      <Upload size={20} color={isDragActive?'#a78bfa':'#4a4a6a'}/>
      <p style={{fontSize:'0.75rem',fontWeight:600,color:isDragActive?'#a78bfa':'#6b6b8a'}}>{label}</p>
      {sublabel && <p style={{fontSize:'0.65rem',color:'#4a4a6a'}}>{sublabel}</p>}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function StudioPhoto() {
  const nav = useNavigate();

  // Step: 1=category, 2=type, 3=upload+config, 4=output
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState(null);         // 'fashion' | 'accessories'
  const [subCat, setSubCat] = useState(null);   // 'women' | 'men' etc
  const [prodType, setProdType] = useState(null);

  // Product uploads (multiple)
  const [productFiles, setProductFiles] = useState([]);    // [{file, preview}]
  const [productPreviews, setProductPreviews] = useState([]);

  // Model
  const [useModel, setUseModel] = useState(true);
  const [modelMode, setModelMode] = useState('random'); // 'random' | 'consistent' | 'custom'
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);

  // Customer try-on
  const [customerFile, setCustomerFile] = useState(null);
  const [customerPreview, setCustomerPreview] = useState(null);

  // BG
  const [bgOption, setBgOption] = useState('studio_white');
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);

  // Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showLogo, setShowLogo] = useState(false);

  // Angles
  const [selectedAngles, setSelectedAngles] = useState(['front','back','walking','closeup']);
  const [platform, setPlatform] = useState('custom');

  // Product details
  const [details, setDetails] = useState({ name:'', color:'', material:'', size_range:'', brand:'', description:'' });

  // Output
  const [generating, setGenerating] = useState(false);
  const [outputImages, setOutputImages] = useState([]);
  const [listingContent, setListingContent] = useState(null);
  const [listingPlatform, setListingPlatform] = useState('amazon');
  const [copied, setCopied] = useState('');

  // Theme (from admin)
  const [theme, setTheme] = useState('dark-luxury');
  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('cv_user')); if(u?.theme) setTheme(u.theme); } catch{}
  }, []);

  // Product file handlers
  const addProductFile = useCallback(f => {
    setProductFiles(prev => [...prev, f]);
    setProductPreviews(prev => [...prev, URL.createObjectURL(f)]);
  }, []);
  const removeProductFile = (i) => {
    setProductFiles(prev => prev.filter((_,idx)=>idx!==i));
    setProductPreviews(prev => prev.filter((_,idx)=>idx!==i));
  };

  const onDropProducts = useCallback(files => { files.forEach(f=>addProductFile(f)); }, [addProductFile]);
  const { getRootProps: getProdRootProps, getInputProps: getProdInputProps, isDragActive: prodDragActive } = useDropzone({
    onDrop: onDropProducts, accept:{'image/*':[]}, multiple:true
  });

  const toggleAngle = a => {
    setSelectedAngles(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]);
    setPlatform('custom');
  };
  const applyPreset = p => { setSelectedAngles(OUTPUT_PRESETS[p]); setPlatform(p); };

  const creditCost = selectedAngles.length * (modelMode==='consistent'?2:1);

  const getAiErrorMessage = (err) => {
    const msg = err?.response?.data?.error || err?.message || '';
    if (/insufficient credits/i.test(msg)) return 'Not enough credits! Request more from admin.';
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

  // ── Generate ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!productFiles.length) return toast.error('Please upload at least one product photo');
    if (!selectedAngles.length) return toast.error('Select at least one angle');
    if (useModel && modelMode==='custom' && !modelFile) return toast.error('Please upload model photo');

    setGenerating(true);
    setStep(4);
    setOutputImages([]);

    try {
      // Save product first
      const fd = new FormData();
      fd.append('name', details.name || prodType || 'Product');
      fd.append('category', prodType || subCat || cat || 'Other');
      fd.append('color', details.color);
      fd.append('material', details.material);
      fd.append('size_range', details.size_range);
      fd.append('brand', details.brand);
      fd.append('description', details.description);
      fd.append('product_image', productFiles[0]);
      const prodRes = await api.post('/products', fd, { headers:{'Content-Type':'multipart/form-data'} });
      const productId = prodRes.data.id;

      // Generate images
      if (useModel) {
        const genFd = new FormData();
        if (modelMode === 'custom' && modelFile) genFd.append('model_image', modelFile);
        else {
          // Create a placeholder for random model — backend handles it
          genFd.append('model_mode', modelMode);
        }
        genFd.append('angles', JSON.stringify(selectedAngles));
        genFd.append('platform', platform);
        if (modelMode === 'consistent') genFd.append('face_lock', 'true');

        const r = await api.post(`/products/${productId}/generate`, genFd, { headers:{'Content-Type':'multipart/form-data'} });
        setOutputImages(r.data.images || []);
        toast.success(`Generated ${r.data.images?.length || 0} images! Used ${r.data.credits_used} credits.`);
      } else {
        // No model — product BG
        const r = await api.post(`/products/${productId}/generate-bg`, {
          bg_style: bgOption === 'custom' && bgFile ? 'custom' : bgOption
        });
        if (r.data.image) setOutputImages([r.data.image]);
        toast.success('Product photo generated!');
      }
    } catch(err) {
      toast.error(getAiErrorMessage(err));
      setStep(3);
    } finally { setGenerating(false); }
  };

  const handleCustomerTryOn = async () => {
    if (!customerFile || !productFiles[0]) return toast.error('Upload customer & product photos');
    setGenerating(true); setStep(4); setOutputImages([]);
    try {
      const fd = new FormData();
      fd.append('customer_photo', customerFile);
      fd.append('product_photo', productFiles[0]);
      fd.append('product_name', details.name || prodType);
      fd.append('product_category', prodType);
      fd.append('product_color', details.color);
      const r = await api.post('/products/customer-tryon', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setOutputImages(r.data.images?.map(x=>({image_url:x.url, angle:x.angle})) || []);
      toast.success('Customer try-on generated!');
    } catch(err) {
      toast.error(err.response?.data?.error || 'Try-on failed');
      setStep(3);
    } finally { setGenerating(false); }
  };

  const genListing = async () => {
    if (!outputImages.length) return;
    try {
      const prods = await api.get('/products');
      const latest = prods.data[0];
      if (!latest) return;
      const r = await api.post(`/products/${latest.id}/listing-content`, { platform: listingPlatform });
      setListingContent(r.data);
      toast.success('Listing content generated!');
    } catch { toast.error('Failed to generate listing'); }
  };

  const upscaleImg = async (imgId) => {
    try {
      await api.post(`/products/images/${imgId}/upscale`);
      toast.success('Upscaled to HD!');
    } catch(err) { toast.error(err.response?.data?.error || 'Upscale failed'); }
  };

  const downloadImg = url => {
    const a = document.createElement('a');
    a.href = `${url}?token=${localStorage.getItem('cv_token')}`;
    a.download = 'clothvision_output.jpg'; a.click();
  };
  const imgUrl = path => path ? `/uploads/${path.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}` : null;
  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(''),2000); toast.success('Copied!'); };

  // ── Render helpers ────────────────────────────────────────
  const StepDots = () => (
    <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:'2rem'}}>
      {[1,2,3,4].map(s=>(
        <div key={s} className={`step-dot ${s===step?'active':s<step?'done':''}`}/>
      ))}
    </div>
  );

  // ── STEP 1: Category ──────────────────────────────────────
  if (step === 1) return (
    <Layout noPad>
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem 1rem',position:'relative',overflow:'hidden'}}>
        <div className="orb" style={{position:'absolute',top:'10%',left:'5%',width:300,height:300,background:'radial-gradient(circle,rgba(124,58,237,0.1),transparent)',pointerEvents:'none'}}/>
        <div className="orb" style={{position:'absolute',bottom:'10%',right:'5%',width:250,height:250,background:'radial-gradient(circle,rgba(240,180,41,0.07),transparent)',animationDelay:'3s',pointerEvents:'none'}}/>

        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} style={{textAlign:'center',marginBottom:'2.5rem'}}>
          <button onClick={()=>nav('/owner/studio')} style={{display:'inline-flex',alignItems:'center',gap:6,color:'#6b6b8a',background:'none',border:'none',cursor:'pointer',fontSize:'0.85rem',marginBottom:'1.5rem'}}>
            <ArrowLeft size={15}/>Back to Studio
          </button>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(1.8rem,4vw,2.5rem)',fontWeight:800,color:'#fff',marginBottom:8}}>
            Select a <span style={{color:'#f0b429'}}>Category</span>
          </h1>
          <p style={{color:'#6b6b8a'}}>What are you creating for?</p>
        </motion.div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,width:'100%',maxWidth:600}}>
          {Object.entries(CATEGORIES).map(([key,{label,icon}],i)=>(
            <motion.div key={key} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
              className="cat-card" onClick={()=>{setCat(key);setStep(2);}}>
              <div style={{fontSize:'3rem',marginBottom:'1rem'}}>{icon}</div>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.2rem',color:'#fff'}}>{label}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );

  // ── STEP 2: Sub-category + type ───────────────────────────
  if (step === 2) {
    const subs = CATEGORIES[cat]?.sub || {};
    return (
      <Layout noPad>
        <div style={{minHeight:'100vh',padding:'2rem 1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}}>
          <div className="orb" style={{position:'absolute',top:'5%',right:'5%',width:250,height:250,background:'radial-gradient(circle,rgba(124,58,237,0.08),transparent)',pointerEvents:'none'}}/>

          <button onClick={()=>setStep(1)} style={{display:'flex',alignItems:'center',gap:6,color:'#6b6b8a',background:'none',border:'none',cursor:'pointer',fontSize:'0.85rem',marginBottom:'1.5rem',alignSelf:'flex-start',maxWidth:700,width:'100%',margin:'0 auto 1.5rem'}}>
            <ArrowLeft size={15}/>Back
          </button>

          <div style={{width:'100%',maxWidth:700}}>
            <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} style={{textAlign:'center',marginBottom:'2rem'}}>
              <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(1.6rem,3vw,2rem)',fontWeight:800,color:'#fff',marginBottom:6}}>
                {CATEGORIES[cat]?.label} <span style={{color:'#f0b429'}}>Selection</span>
              </h1>
              <p style={{color:'#6b6b8a',fontSize:'0.875rem'}}>Select a sub-category</p>
            </motion.div>

            {/* Sub-cats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:'1.5rem'}}>
              {Object.entries(subs).map(([key,{label,icon}],i)=>(
                <motion.div key={key} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.07}}
                  className={`cat-card ${subCat===key?'selected':''}`} style={{padding:'1.5rem 1rem'}}
                  onClick={()=>setSubCat(key)}>
                  <div style={{fontSize:'2rem',marginBottom:8}}>{icon}</div>
                  <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'0.95rem',color:'#fff'}}>{label}</h3>
                </motion.div>
              ))}
            </div>

            {/* Product types */}
            {subCat && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                <p style={{fontSize:'0.75rem',color:'#a78bfa',fontWeight:600,letterSpacing:'0.08em',marginBottom:10}}>PRODUCT TYPE</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {(subs[subCat]?.types||[]).map(t=>(
                    <button key={t} onClick={()=>setProdType(t)}
                      style={{padding:'8px 16px',borderRadius:20,border:`1px solid ${prodType===t?'#f0b429':'rgba(124,58,237,0.2)'}`,background:prodType===t?'rgba(240,180,41,0.1)':'transparent',color:prodType===t?'#f0b429':'#6b6b8a',fontSize:'0.8rem',cursor:'pointer',transition:'all 0.15s',fontWeight:prodType===t?600:400}}>
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {subCat && prodType && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginTop:'1.5rem',display:'flex',justifyContent:'flex-end'}}>
                <button onClick={()=>setStep(3)} className="btn btn-gold" style={{padding:'10px 28px',fontSize:'0.95rem'}}>
                  Next <ArrowRight size={16}/>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── STEP 3: Upload + Config ───────────────────────────────
  if (step === 3) return (
    <Layout title="Configure Your Shoot" subtitle={`${CATEGORIES[cat]?.label} → ${subCat} → ${prodType}`}
      actions={<button onClick={()=>setStep(2)} className="btn btn-outline"><ChevronLeft size={15}/>Back</button>}>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:1100}} className="responsive-grid">
        {/* LEFT: Uploads */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Product photos — multi upload */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',marginBottom:4,fontSize:'0.9rem'}}>Product Photos</p>
            <p style={{fontSize:'0.7rem',color:'#6b6b8a',marginBottom:12}}>Upload front, back, detail shots — all merged for best AI result</p>

            {/* Existing files grid */}
            {productPreviews.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                {productPreviews.map((prev,i)=>(
                  <div key={i} style={{position:'relative',aspectRatio:'1',borderRadius:10,overflow:'hidden',border:'1px solid rgba(124,58,237,0.3)'}}>
                    <img src={prev} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    <button onClick={()=>removeProductFile(i)} style={{position:'absolute',top:4,right:4,width:20,height:20,background:'rgba(0,0,0,0.8)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
                      <Trash2 size={10}/>
                    </button>
                  </div>
                ))}
                {/* Add more slot */}
                <div {...getProdRootProps()} style={{aspectRatio:'1',border:'2px dashed rgba(124,58,237,0.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <input {...getProdInputProps()}/>
                  <span style={{fontSize:'1.5rem',color:'#4a4a6a'}}>+</span>
                </div>
              </div>
            )}

            {/* Big drop zone if no files */}
            {productPreviews.length === 0 && (
              <div {...getProdRootProps()} style={{border:`2px dashed ${prodDragActive?'#a78bfa':'rgba(124,58,237,0.2)'}`,borderRadius:14,padding:'2rem',textAlign:'center',cursor:'pointer',background:prodDragActive?'rgba(124,58,237,0.05)':'transparent',transition:'all 0.2s'}}>
                <input {...getProdInputProps()}/>
                <Upload size={28} color={prodDragActive?'#a78bfa':'#4a4a6a'} style={{margin:'0 auto 10px'}}/>
                <p style={{fontSize:'0.85rem',fontWeight:600,color:'#a78bfa'}}>Drop product photos here</p>
                <p style={{fontSize:'0.7rem',color:'#4a4a6a',marginTop:4}}>Multiple files supported — shirt, jeans, jacket etc.</p>
              </div>
            )}
          </div>

          {/* Model toggle */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'0.9rem'}}>Show on Model</p>
                <p style={{fontSize:'0.7rem',color:'#6b6b8a',marginTop:2}}>Toggle off to show product-only with background</p>
              </div>
              <div className={`toggle ${useModel?'on':''}`} onClick={()=>setUseModel(!useModel)}/>
            </div>

            {useModel && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} style={{overflow:'hidden'}}>
                {/* Model mode */}
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  {[['random','🎲 Random'],['consistent','🔒 Consistent'],['custom','📷 My Model']].map(([m,l])=>(
                    <button key={m} onClick={()=>setModelMode(m)}
                      style={{flex:1,padding:'7px 4px',borderRadius:10,border:`1px solid ${modelMode===m?'#f0b429':'rgba(124,58,237,0.2)'}`,background:modelMode===m?'rgba(240,180,41,0.1)':'transparent',color:modelMode===m?'#f0b429':'#6b6b8a',fontSize:'0.7rem',cursor:'pointer',fontWeight:modelMode===m?600:400,transition:'all 0.15s'}}>
                      {l}
                    </button>
                  ))}
                </div>

                {modelMode==='consistent' && (
                  <div style={{padding:'8px 10px',background:'rgba(124,58,237,0.06)',borderRadius:10,fontSize:'0.7rem',color:'#a78bfa',marginBottom:10}}>
                    🔒 Same AI model will be used across all angles — costs 2 credits/image
                  </div>
                )}

                {modelMode==='custom' && (
                  <MiniDrop label="Upload Model Photo" sublabel="Face will be preserved exactly" file={modelFile} preview={modelPreview}
                    onFile={f=>{setModelFile(f);setModelPreview(URL.createObjectURL(f));}}
                    onRemove={()=>{setModelFile(null);setModelPreview(null);}}/>
                )}
              </motion.div>
            )}

            {!useModel && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                <p style={{fontSize:'0.75rem',color:'#a78bfa',fontWeight:600,letterSpacing:'0.05em',marginBottom:8}}>BACKGROUND</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:bgOption==='custom'?10:0}}>
                  {BG_OPTIONS.map(b=>(
                    <button key={b.id} onClick={()=>setBgOption(b.id)}
                      style={{padding:'6px 12px',borderRadius:20,border:`1px solid ${bgOption===b.id?'#f0b429':'rgba(124,58,237,0.2)'}`,background:bgOption===b.id?'rgba(240,180,41,0.1)':'transparent',color:bgOption===b.id?'#f0b429':'#6b6b8a',fontSize:'0.72rem',cursor:'pointer',fontWeight:bgOption===b.id?600:400,transition:'all 0.15s'}}>
                      {b.label}
                    </button>
                  ))}
                </div>
                {bgOption==='custom' && (
                  <MiniDrop label="Upload Your Background" file={bgFile} preview={bgPreview}
                    onFile={f=>{setBgFile(f);setBgPreview(URL.createObjectURL(f));}}
                    onRemove={()=>{setBgFile(null);setBgPreview(null);}}/>
                )}
              </motion.div>
            )}
          </div>

          {/* Customer try-on section */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',marginBottom:4,fontSize:'0.9rem'}}>Customer Try-On <span className="badge badge-purple" style={{marginLeft:6}}>BETA</span></p>
            <p style={{fontSize:'0.7rem',color:'#6b6b8a',marginBottom:12}}>Show a customer wearing your product</p>
            <MiniDrop label="Upload Customer Photo" sublabel="Face will be preserved accurately" file={customerFile} preview={customerPreview}
              onFile={f=>{setCustomerFile(f);setCustomerPreview(URL.createObjectURL(f));}}
              onRemove={()=>{setCustomerFile(null);setCustomerPreview(null);}}/>
            {customerFile && productFiles.length>0 && (
              <button onClick={handleCustomerTryOn} disabled={generating} className="btn btn-gold" style={{width:'100%',justifyContent:'center',marginTop:10}}>
                <Wand2 size={15}/>Generate Customer Try-On
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Config */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Product details */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',marginBottom:12,fontSize:'0.9rem'}}>Product Details</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['name','Product Name','e.g. Premium Cotton Shirt'],['color','Color','e.g. Navy Blue'],['material','Material','e.g. 100% Cotton'],['size_range','Size Range','e.g. XS-3XL'],['brand','Brand','e.g. Zara'],].map(([k,l,ph])=>(
                <div key={k} className={k==='name'?'col-span-2':''} style={k==='name'?{gridColumn:'span 2'}:{}}>
                  <label className="label">{l}</label>
                  <input className="input" value={details[k]} onChange={e=>setDetails(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:'0.8rem',padding:'8px 10px'}}/>
                </div>
              ))}
              <div style={{gridColumn:'span 2'}}>
                <label className="label">Extra Details (helps AI)</label>
                <textarea className="input" rows={2} value={details.description} onChange={e=>setDetails(p=>({...p,description:e.target.value}))} placeholder="e.g. Regular fit, spread collar, suitable for formal wear" style={{resize:'none',fontSize:'0.8rem',padding:'8px 10px'}}/>
              </div>
            </div>
          </div>

          {/* Output angles */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'0.9rem'}}>Output Angles</p>
              <div style={{display:'flex',gap:6}}>
                {Object.keys(OUTPUT_PRESETS).map(p=>(
                  <button key={p} onClick={()=>applyPreset(p)} style={{padding:'3px 10px',borderRadius:20,border:`1px solid ${platform===p?'#f0b429':'rgba(124,58,237,0.2)'}`,background:platform===p?'rgba(240,180,41,0.1)':'transparent',color:platform===p?'#f0b429':'#6b6b8a',fontSize:'0.65rem',cursor:'pointer',fontWeight:platform===p?700:400,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {ANGLES_LIST.map(a=>(
                <button key={a.id} onClick={()=>toggleAngle(a.id)}
                  style={{padding:'7px 4px',borderRadius:10,border:`1px solid ${selectedAngles.includes(a.id)?'rgba(124,58,237,0.5)':'rgba(124,58,237,0.12)'}`,background:selectedAngles.includes(a.id)?'rgba(124,58,237,0.15)':'transparent',color:selectedAngles.includes(a.id)?'#c4b5fd':'#4a4a6a',fontSize:'0.65rem',cursor:'pointer',textAlign:'center',transition:'all 0.15s',fontWeight:selectedAngles.includes(a.id)?600:400}}>
                  <div style={{fontSize:'1rem',marginBottom:2}}>{a.icon}</div>
                  {a.label}
                </button>
              ))}
            </div>
            <p style={{fontSize:'0.7rem',color:'#6b6b8a',marginTop:8,textAlign:'center'}}>{selectedAngles.length} angle{selectedAngles.length!==1?'s':''} · ~{creditCost} credit{creditCost!==1?'s':''}</p>
          </div>

          {/* Logo */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showLogo?12:0}}>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'0.9rem'}}>Add Logo</p>
              <div className={`toggle ${showLogo?'on':''}`} onClick={()=>setShowLogo(!showLogo)}/>
            </div>
            {showLogo && (
              <MiniDrop label="Upload Logo" sublabel="PNG with transparency works best" file={logoFile} preview={logoPreview}
                onFile={f=>{setLogoFile(f);setLogoPreview(URL.createObjectURL(f));}}
                onRemove={()=>{setLogoFile(null);setLogoPreview(null);}}/>
            )}
          </div>

          {/* Generate button */}
          <motion.button onClick={handleGenerate} disabled={generating||!productFiles.length||!selectedAngles.length}
            whileHover={{scale:1.02}} whileTap={{scale:0.97}}
            className="btn btn-purple" style={{width:'100%',justifyContent:'center',height:50,fontSize:'1rem',borderRadius:14}}>
            <Wand2 size={18}/>Generate {selectedAngles.length} Photo{selectedAngles.length!==1?'s':''} · {creditCost} Credit{creditCost!==1?'s':''}
          </motion.button>
        </div>
      </div>

      <style>{`@media(max-width:768px){.responsive-grid{grid-template-columns:1fr!important}}`}</style>
    </Layout>
  );

  // ── STEP 4: Output ────────────────────────────────────────
  return (
    <Layout title="Your Generated Photos" subtitle={`${CATEGORIES[cat]?.label} → ${prodType}`}
      actions={<button onClick={()=>setStep(3)} className="btn btn-outline"><ChevronLeft size={15}/>Back</button>}>

      {generating && (
        <div style={{textAlign:'center',padding:'4rem 0'}}>
          <div style={{position:'relative',width:80,height:80,margin:'0 auto 20px'}}>
            <div style={{position:'absolute',inset:0,border:'4px solid rgba(124,58,237,0.15)',borderRadius:'50%'}}/>
            <div style={{position:'absolute',inset:0,border:'4px solid #7c3aed',borderTopColor:'transparent',borderRadius:'50%'}} className="spin"/>
            <div style={{position:'absolute',inset:8,border:'3px solid rgba(240,180,41,0.2)',borderRadius:'50%'}}/>
            <div style={{position:'absolute',inset:8,border:'3px solid #f0b429',borderBottomColor:'transparent',borderRadius:'50%',animationDirection:'reverse'}} className="spin"/>
            <Wand2 size={22} color="#a78bfa" style={{position:'absolute',inset:0,margin:'auto'}}/>
          </div>
          <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.1rem',color:'#fff',marginBottom:6}}>AI is generating your photos</p>
          <p style={{color:'#6b6b8a',fontSize:'0.8rem'}}>Face & product preserved accurately • Please wait...</p>
        </div>
      )}

      {!generating && outputImages.length > 0 && (
        <div className="slide-up">
          {/* Image grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:24}}>
            {outputImages.map((img,i)=>(
              <motion.div key={img.id||i} initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} transition={{delay:i*0.07}} className="output-img">
                <img src={imgUrl(img.upscaled_url||img.image_url||img.url)} alt={img.angle} onError={e=>e.target.style.display='none'}/>
                <div className="img-overlay">
                  <p style={{color:'#fff',fontSize:'0.75rem',fontWeight:600,marginBottom:6,textTransform:'capitalize'}}>{(img.angle||'').replace(/_/g,' ')}</p>
                  <div style={{display:'flex',gap:6}}>
                    {img.id && !img.is_upscaled && (
                      <button onClick={()=>upscaleImg(img.id)} style={{flex:1,padding:'4px',background:'rgba(124,58,237,0.8)',border:'none',borderRadius:6,color:'#fff',fontSize:'0.65rem',cursor:'pointer'}}>HD Upscale</button>
                    )}
                    <button onClick={()=>downloadImg(img.upscaled_url||img.image_url||img.url)} style={{flex:1,padding:'4px',background:'rgba(0,0,0,0.7)',border:'none',borderRadius:6,color:'#fff',fontSize:'0.65rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                      <Download size={11}/>Save
                    </button>
                  </div>
                </div>
                {img.is_upscaled && <span style={{position:'absolute',top:8,left:8,fontSize:'0.6rem',background:'rgba(34,197,94,0.85)',color:'#fff',padding:'2px 6px',borderRadius:4,fontWeight:700}}>HD</span>}
              </motion.div>
            ))}
          </div>

          {/* Listing content generator */}
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'1.25rem',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:listingContent?16:0}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'0.9rem'}}>Generate Listing Content</h3>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {['amazon','flipkart','meesho'].map(p=>(
                  <button key={p} onClick={()=>setListingPlatform(p)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${listingPlatform===p?'#f0b429':'rgba(124,58,237,0.2)'}`,background:listingPlatform===p?'rgba(240,180,41,0.1)':'transparent',color:listingPlatform===p?'#f0b429':'#6b6b8a',fontSize:'0.72rem',cursor:'pointer',fontWeight:listingPlatform===p?700:400,textTransform:'capitalize'}}>
                    {p}
                  </button>
                ))}
                <button onClick={genListing} className="btn btn-purple" style={{padding:'6px 14px',fontSize:'0.8rem'}}>Generate</button>
              </div>
            </div>

            {listingContent && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[['title','Title',listingContent.title],['description','Description',listingContent.description],['bullets','Key Features',listingContent.bullet_points?.map((b,i)=>`${i+1}. ${b}`).join('\n')],['keywords','Keywords',listingContent.keywords?.join(', ')]].filter(([,,v])=>v).map(([key,label,val])=>(
                  <div key={key} style={{padding:'10px 12px',background:'rgba(124,58,237,0.04)',border:'1px solid rgba(124,58,237,0.08)',borderRadius:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <p style={{fontSize:'0.65rem',color:'#a78bfa',fontWeight:600,letterSpacing:'0.08em'}}>{label.toUpperCase()}</p>
                      <button onClick={()=>copy(val,key)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b6b8a',padding:0}}>
                        {copied===key?<Check size={13} color="#4ade80"/>:<Copy size={13}/>}
                      </button>
                    </div>
                    <p style={{fontSize:'0.78rem',color:'#c4b5fd',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regenerate */}
          <button onClick={()=>{setOutputImages([]);setStep(3);}} className="btn btn-outline" style={{width:'100%',justifyContent:'center'}}>
            <RefreshCw size={15}/>Generate Again with Different Settings
          </button>
        </div>
      )}

      {!generating && outputImages.length === 0 && (
        <div style={{textAlign:'center',padding:'4rem 0',color:'#6b6b8a'}}>
          <Img size={48} style={{margin:'0 auto 12px',opacity:0.2}}/>
          <p>No images yet</p>
          <button onClick={()=>setStep(3)} className="btn btn-purple" style={{marginTop:16}}>Back to Configure</button>
        </div>
      )}
    </Layout>
  );
}
