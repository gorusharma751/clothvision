import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, X, Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getImageUrl } from '../../utils/api';

function DropBox({ preview, onFile, onRemove, label, sublabel }) {
  const onDrop = useCallback(f=>{if(f[0])onFile(f[0]);}, [onFile]);
  const {getRootProps,getInputProps,isDragActive} = useDropzone({onDrop,accept:{'image/*':[]},maxFiles:1});
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'rgba(124,58,237,.7)':preview?'rgba(124,58,237,.4)':'rgba(124,58,237,.2)'}`,borderRadius:14,background:'rgba(17,17,24,.7)',cursor:'pointer',transition:'all .2s',minHeight:130,position:'relative',overflow:'hidden'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="p" style={{width:'100%',maxHeight:180,objectFit:'contain',display:'block'}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:'rgba(239,68,68,.85)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={11} color="#fff"/></button>
          <p style={{textAlign:'center',fontSize:10,color:'rgba(124,58,237,.4)',padding:'3px 0'}}>Click to change</p>
        </>
      ) : (
        <div style={{padding:'22px 12px',textAlign:'center'}}>
          <div style={{width:38,height:38,borderRadius:11,background:'rgba(124,58,237,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}><Plus size={17} color="rgba(124,58,237,.6)"/></div>
          <p style={{fontSize:12,fontWeight:600,color:'rgba(226,226,240,.5)'}}>{label} <span style={{color:'#f87171'}}>*</span></p>
          {sublabel&&<p style={{fontSize:10,color:'rgba(124,58,237,.35)',marginTop:3}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

const STYLES = [
  {id:'modern_minimal',label:'Modern Minimal',emoji:'⬜',desc:'Clean & elegant'},
  {id:'luxury_gold',label:'Luxury Gold',emoji:'✨',desc:'Premium gold accents'},
  {id:'bold_colorful',label:'Bold & Colorful',emoji:'🎨',desc:'Eye-catching'},
  {id:'classic_vintage',label:'Classic Vintage',emoji:'📜',desc:'Retro charm'},
  {id:'eco_natural',label:'Eco Natural',emoji:'🌿',desc:'Organic kraft look'},
  {id:'sportswear',label:'Sportswear',emoji:'⚡',desc:'Athletic dynamic'},
];

const ELEMENTS = ['Brand name','Product name','Care symbols','Barcode','Size','Price','QR code','Country of origin'];

export default function LabelCreator() {
  const nav = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [tagline, setTagline] = useState('');
  const [style, setStyle] = useState('modern_minimal');
  const [colors, setColors] = useState('');
  const [labelSize, setLabelSize] = useState('standard hang tag');
  const [elements, setElements] = useState(['Brand name','Product name','Care symbols','Size']);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const toggleEl = (el) => setElements(p => p.includes(el) ? p.filter(x=>x!==el) : [...p, el]);

  const generate = async () => {
    if(!file) return toast.error('Upload product image');
    if(!brandName) return toast.error('Enter brand name');
    setGenerating(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('product_image', file);
      fd.append('brand_name', brandName);
      fd.append('product_name', productName||brandName);
      fd.append('tagline', tagline);
      fd.append('style', style);
      fd.append('colors', colors);
      fd.append('label_size', labelSize);
      fd.append('include_elements', JSON.stringify(elements));
      const r = await api.post('/label/generate', fd, {headers:{'Content-Type':'multipart/form-data'}});
      setResult(r.data);
      toast.success(`Label created! Used ${r.data.credits_used} credits.`);
    } catch(err){
      if(err.response?.data?.error==='Insufficient credits') toast.error('Need 2 credits for label');
      else toast.error(err.response?.data?.error||'Label generation failed');
    } finally { setGenerating(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
      <div style={{position:'sticky',top:0,zIndex:20,padding:'12px 20px',display:'flex',alignItems:'center',gap:14,background:'rgba(10,10,15,.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(124,58,237,.1)'}}>
        <button onClick={()=>nav('/owner/studio')} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(124,58,237,.25)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'#fff'}}>🏷️ Label Creator</h1>
          <p style={{fontSize:11,color:'rgba(124,58,237,.45)'}}>Create professional product labels & tags</p>
        </div>
      </div>
      <div style={{maxWidth:880,margin:'0 auto',padding:'24px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT IMAGE</p>
              <DropBox preview={preview} onFile={f=>{setFile(f);setPreview(URL.createObjectURL(f));}} onRemove={()=>{setFile(null);setPreview(null);}} label="Upload product" sublabel="Label will be applied to this product"/>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18,display:'flex',flexDirection:'column',gap:10}}>
              {[['BRAND NAME *',brandName,setBrandName,'e.g. FashionBrand'],['PRODUCT NAME',productName,setProductName,'e.g. Premium T-Shirt'],['TAGLINE',tagline,setTagline,'e.g. Premium Quality'],['LABEL COLORS',colors,setColors,'e.g. White & Gold'],['LABEL SIZE',labelSize,setLabelSize,'e.g. Standard hang tag']].map(([l,v,s,ph])=>(
                <div key={l}>
                  <label style={{fontSize:10,color:'rgba(124,58,237,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l}</label>
                  <input className="cv-input" value={v} onChange={e=>s(e.target.value)} placeholder={ph}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>LABEL STYLE</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {STYLES.map(s=>(
                  <div key={s.id} onClick={()=>setStyle(s.id)} style={{padding:'10px 8px',borderRadius:10,border:`1px solid ${style===s.id?'rgba(124,58,237,.5)':'rgba(30,30,45,.8)'}`,background:style===s.id?'rgba(124,58,237,.1)':'transparent',cursor:'pointer',textAlign:'center',transition:'all .2s'}}>
                    <span style={{fontSize:22,display:'block',marginBottom:4}}>{s.emoji}</span>
                    <p style={{fontSize:11,fontWeight:style===s.id?600:400,color:style===s.id?'#a78bfa':'rgba(226,226,240,.5)'}}>{s.label}</p>
                    <p style={{fontSize:10,color:'rgba(162,140,250,.3)'}}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>INCLUDE ON LABEL</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {ELEMENTS.map(el=>{const sel=elements.includes(el); return (
                  <button key={el} onClick={()=>toggleEl(el)} style={{padding:'5px 10px',borderRadius:16,border:`1px solid ${sel?'rgba(124,58,237,.5)':'rgba(124,58,237,.15)'}`,background:sel?'rgba(124,58,237,.15)':'transparent',color:sel?'#a78bfa':'rgba(162,140,250,.35)',fontSize:11,fontWeight:sel?600:400,cursor:'pointer',transition:'all .2s'}}>
                    {el}
                  </button>
                );})}
              </div>
            </div>
            <button onClick={generate} disabled={generating||!file||!brandName} className="btn-primary" style={{width:'100%',height:48,justifyContent:'center',fontSize:'.95rem'}}>
              {generating ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>Creating Label...</> : <><Tag size={16}/>Create Label (2 credits)</>}
            </button>
          </div>
        </div>

        {result?.image_url && (
          <div style={{marginTop:24,background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20,animation:'fadeUp .4s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff'}}>🏷️ Your Label</h3>
              <button onClick={()=>{const a=document.createElement('a');a.href=result.image_url.startsWith('http')?result.image_url:getImageUrl(result.image_url);a.download='label.jpg';a.click();}} className="btn-primary" style={{fontSize:12,padding:'6px 14px'}}>
                <Download size={13}/>Download
              </button>
            </div>
            <div style={{maxWidth:400,margin:'0 auto'}}>
              <img src={result.image_url.startsWith('http')?result.image_url:getImageUrl(result.image_url)} alt="label" style={{width:'100%',borderRadius:12,objectFit:'contain'}}/>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
