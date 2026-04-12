import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, X, Plus, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';

function DropBox({ preview, onFile, onRemove, label, sublabel, accent='#06b6d4' }) {
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
          <div style={{width:38,height:38,borderRadius:11,background:`${accent}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}><Plus size={17} color={`${accent}99`}/></div>
          <p style={{fontSize:12,fontWeight:600,color:'rgba(226,226,240,.5)'}}>{label}</p>
          {sublabel&&<p style={{fontSize:10,color:`${accent}55`,marginTop:3}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

export default function View360Studio() {
  const nav = useNavigate();
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState('');
  const [productColor, setProductColor] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [results, setResults] = useState([]);

  React.useEffect(()=>{
    api.get('/products').then(r=>setProducts(r.data)).catch(()=>{});
  },[]);

  const generate = async () => {
    if(!productFile && !productId) return toast.error('Select a product or upload image');
    setGenerating(true); setResults([]);
    try {
      const fd = new FormData();
      if(productFile) fd.append('product_image', productFile);
      if(modelFile) fd.append('model_image', modelFile);
      fd.append('product_name', productName||'Product');
      fd.append('product_color', productColor||'');
      fd.append('product_category', productCategory||'clothing');
      
      let r;
      if(productId) {
        r = await api.post(`/products/${productId}/generate-360`, fd, {headers:{'Content-Type':'multipart/form-data'}});
        setResults(r.data.images||[]);
      } else {
        // Direct without existing product
        r = await api.post('/products/generate-360-direct', fd, {headers:{'Content-Type':'multipart/form-data'}});
        setResults(r.data.images||[]);
      }
      toast.success(`360° view generated! 4 angles created.`);
    } catch(err){
      if(err.response?.data?.error==='Insufficient credits') toast.error('Not enough credits!');
      else toast.error(err.response?.data?.error||'Generation failed');
    } finally { setGenerating(false); }
  };

  const ANGLES = ['front','left_side','back','right_side'];
  const imgUrl = (img) => {
    const url = img?.image_url || img?.url || '';
    return url.startsWith('http') ? url : getImageUrl(url);
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
      <div style={{position:'sticky',top:0,zIndex:20,padding:'12px 20px',display:'flex',alignItems:'center',gap:14,background:'rgba(10,10,15,.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(6,182,212,.1)'}}>
        <button onClick={()=>nav('/owner/studio')} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(6,182,212,.25)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#06b6d4'}}>
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'#fff'}}>🔄 360° View Generator</h1>
          <p style={{fontSize:11,color:'rgba(6,182,212,.45)'}}>Front · Left · Back · Right — e-commerce 360 viewer</p>
        </div>
      </div>

      <div style={{maxWidth:880,margin:'0 auto',padding:'24px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20,marginBottom:20}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(6,182,212,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT IMAGE *</p>
              <DropBox preview={productPreview} onFile={f=>{setProductFile(f);setProductPreview(URL.createObjectURL(f));}} onRemove={()=>{setProductFile(null);setProductPreview(null);}} label="Upload product" sublabel="Clear clean product photo"/>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(6,182,212,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>MODEL (optional — for clothing)</p>
              <DropBox preview={modelPreview} onFile={f=>{setModelFile(f);setModelPreview(URL.createObjectURL(f));}} onRemove={()=>{setModelFile(null);setModelPreview(null);}} label="Upload model" sublabel="For clothing 360° try-on"/>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18,display:'flex',flexDirection:'column',gap:10}}>
              {[['PRODUCT NAME',productName,setProductName,'e.g. Blue Shirt'],['PRODUCT COLOR',productColor,setProductColor,'e.g. Navy Blue'],['CATEGORY',productCategory,setProductCategory,'e.g. Shirt']].map(([l,v,s,ph])=>(
                <div key={l}>
                  <label style={{fontSize:10,color:'rgba(6,182,212,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
                  <input className="cv-input" value={v} onChange={e=>s(e.target.value)} placeholder={ph} style={{borderColor:'rgba(6,182,212,.2)'}}/>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderRadius:12,background:'rgba(6,182,212,.05)',border:'1px solid rgba(6,182,212,.12)'}}>
              <p style={{fontSize:11,color:'rgba(6,182,212,.6)',fontWeight:600,marginBottom:6}}>🔄 360° = 4 images</p>
              <p style={{fontSize:11,color:'rgba(162,140,250,.5)',lineHeight:1.6}}>Generates: Front → Left Side → Back → Right Side. Upload all 4 to Flipkart/Amazon 360° viewer.</p>
              <p style={{fontSize:11,color:'rgba(240,180,41,.5)',marginTop:6}}>💳 Uses 4 credits (1 per angle)</p>
            </div>
            <button onClick={generate} disabled={generating||(!productFile&&!productId)} className="btn-primary" style={{width:'100%',height:48,justifyContent:'center',background:'linear-gradient(135deg,#0891b2,#0e7490)',fontSize:'.95rem'}}>
              {generating ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>Generating 4 angles...</> : <><RotateCcw size={16}/>Generate 360° View</>}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,animation:'fadeUp .4s ease'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:4}}>🔄 360° View — {results.length} Angles</h3>
            <p style={{fontSize:12,color:'rgba(162,140,250,.4)',marginBottom:16}}>Click angles to preview • Download all for e-commerce</p>
            {/* Big preview */}
            <div style={{aspectRatio:'1/1',maxWidth:320,margin:'0 auto 16px',borderRadius:14,overflow:'hidden',border:'1px solid rgba(6,182,212,.2)'}}>
              <img src={imgUrl(results[currentAngle])} alt="360 view" style={{width:'100%',height:'100%',objectFit:'contain'}}/>
            </div>
            {/* Angle selector */}
            <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:16}}>
              {results.map((img,i)=>(
                <button key={i} onClick={()=>setCurrentAngle(i)} style={{width:60,height:60,borderRadius:10,overflow:'hidden',border:`2px solid ${currentAngle===i?'rgba(6,182,212,.7)':'rgba(30,30,45,.8)'}`,cursor:'pointer',padding:0,background:'#111'}}>
                  <img src={imgUrl(img)} alt={`angle ${i}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                </button>
              ))}
            </div>
            {/* Angle labels */}
            <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:16}}>
              {ANGLES.slice(0,results.length).map((a,i)=>(
                <span key={i} style={{fontSize:10,color:currentAngle===i?'#06b6d4':'rgba(162,140,250,.4)',textTransform:'capitalize',minWidth:60,textAlign:'center'}}>{a.replace('_',' ')}</span>
              ))}
            </div>
            {/* Download all */}
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              {results.map((img,i)=>(
                <button key={i} onClick={()=>{const a=document.createElement('a');a.href=imgUrl(img);a.download=`360_${ANGLES[i]||i}.jpg`;a.click();}} style={{padding:'6px 12px',borderRadius:8,background:'rgba(6,182,212,.1)',border:'1px solid rgba(6,182,212,.2)',color:'#06b6d4',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                  <Download size={11}/>{(ANGLES[i]||`view_${i}`).replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
