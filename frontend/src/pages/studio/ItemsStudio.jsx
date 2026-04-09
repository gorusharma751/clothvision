import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, ArrowRight, X, Plus, Wand2, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const IMG = path => path ? `/uploads/${path.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}` : null;

const ITEM_TYPES = [
  { id:'watch', label:'Watch', emoji:'⌚' },
  { id:'perfume', label:'Perfume', emoji:'🧴' },
  { id:'cap', label:'Cap / Hat', emoji:'🧢' },
  { id:'bag', label:'Bag', emoji:'👜' },
  { id:'shoes', label:'Shoes', emoji:'👟' },
  { id:'belt', label:'Belt', emoji:'🪢' },
  { id:'sunglasses', label:'Sunglasses', emoji:'🕶️' },
  { id:'jewelry', label:'Jewelry', emoji:'💍' },
  { id:'other', label:'Other', emoji:'📦' },
];

const GENDERS_ACC = [
  { id:'men', label:'Men', emoji:'👨' },
  { id:'women', label:'Women', emoji:'👩' },
  { id:'kids', label:'Kids', emoji:'👶' },
  { id:'unisex', label:'Unisex', emoji:'🧑' },
];

const BG_STYLES = ['Studio White','Lifestyle','Gradient','Flat Lay','Outdoor'];
const ANGLES_ACC = [
  { id:'front', label:'Front', emoji:'⬛' },
  { id:'side', label:'Side', emoji:'◀' },
  { id:'top', label:'Top View', emoji:'⬆' },
  { id:'closeup', label:'Close-up', emoji:'🔍' },
  { id:'3_4', label:'3/4 View', emoji:'↗' },
];

function ImageBox({ file, preview, onFile, onRemove, label, sublabel }) {
  const onDrop = useCallback(f => { if(f[0]) onFile(f[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'image/*':[]}, maxFiles:1 });
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'rgba(240,180,41,.7)':preview?'rgba(240,180,41,.4)':'rgba(240,180,41,.2)'}`,borderRadius:14,background:isDragActive?'rgba(240,180,41,.05)':'rgba(17,17,24,.6)',cursor:'pointer',transition:'all .2s',minHeight:120,position:'relative',overflow:'hidden'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="preview" style={{width:'100%',height:'100%',objectFit:'contain',maxHeight:160}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:'rgba(239,68,68,.8)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><X size={11} color="#fff"/></button>
          <p style={{textAlign:'center',fontSize:10,color:'rgba(240,180,41,.4)',padding:'4px 0'}}>Click to change</p>
        </>
      ) : (
        <div style={{padding:'20px 12px',textAlign:'center'}}>
          <div style={{width:36,height:36,borderRadius:10,background:'rgba(240,180,41,.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
            <Plus size={16} color="rgba(240,180,41,.5)"/>
          </div>
          <p style={{fontSize:12,fontWeight:600,color:'rgba(226,226,240,.5)'}}>{label}</p>
          {sublabel && <p style={{fontSize:10,color:'rgba(240,180,41,.35)',marginTop:2}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

export default function ItemsStudio() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [itemType, setItemType] = useState(null);
  const [gender, setGender] = useState(null);
  const [items, setItems] = useState([{ id:1, file:null, preview:null }]);
  const [bgMode, setBgMode] = useState('studio');
  const [bgStyle, setBgStyle] = useState('Studio White');
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedAngles, setSelectedAngles] = useState(['front','side','closeup']);
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [color, setColor] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [listingContent, setListingContent] = useState(null);
  const [listingPlatform, setListingPlatform] = useState('amazon');
  const [copied, setCopied] = useState('');

  const addItem = () => setItems(prev => [...prev, { id: Date.now(), file:null, preview:null }]);
  const setItemFile = (id, file) => setItems(prev => prev.map(x => x.id===id ? {...x, file, preview:URL.createObjectURL(file)} : x));
  const clearItemFile = id => setItems(prev => prev.map(x => x.id===id ? {...x, file:null, preview:null} : x));

  const generate = async () => {
    const productFiles = items.filter(x => x.file);
    if (!productFiles.length) return toast.error('Upload at least one product image');
    setGenerating(true); setResults([]);
    try {
      const fd = new FormData();
      fd.append('name', productName || itemType?.label || 'Product');
      fd.append('category', itemType?.id || 'accessory');
      fd.append('color', color);
      fd.append('description', additionalNotes);
      fd.append('product_image', productFiles[0].file);
      const prodRes = await api.post('/products', fd, { headers:{'Content-Type':'multipart/form-data'} });
      const r = await api.post(`/products/${prodRes.data.id}/generate-bg`, {
        bg_style: bgStyle.toLowerCase().replace(' ', '_')
      });
      if (r.data.image) { setResults([r.data.image]); setStep(2); toast.success('Product image generated!'); }
    } catch(err) {
      if (err.response?.data?.error === 'Insufficient credits') toast.error('Not enough credits!');
      else toast.error(err.response?.data?.error || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const generateListing = async () => {
    try {
      const prodRes = await api.get('/products');
      const latest = prodRes.data[0];
      if (!latest) return;
      const r = await api.post(`/products/${latest.id}/listing-content`, { platform: listingPlatform });
      setListingContent(r.data);
      toast.success('Listing content ready!');
    } catch { toast.error('Listing generation failed'); }
  };

  const download = url => { const a = document.createElement('a'); a.href = IMG(url); a.download = 'clothvision_item.jpg'; a.click(); };
  const copyText = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(''),2000); toast.success('Copied!'); };

  const STEPS = ['Item Type','Upload & Options','Results'];

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
      <div style={{position:'sticky',top:0,zIndex:20,padding:'12px 20px',display:'flex',alignItems:'center',gap:16,background:'rgba(10,10,15,.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(240,180,41,.1)'}}>
        <button onClick={()=>step===0?nav('/owner/studio'):setStep(s=>s-1)} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(240,180,41,.25)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#f0b429'}}>
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'#fff'}}>Items / Accessories Studio</h1>
          <p style={{fontSize:11,color:'rgba(240,180,41,.4)'}}>Watch, Perfume, Cap, Bag & more</p>
        </div>
      </div>
      <div style={{maxWidth:860,margin:'0 auto',padding:'24px 16px'}}>
        {/* Steps */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:28,flexWrap:'wrap'}}>
          {STEPS.map((s,i)=>(
            <React.Fragment key={i}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,fontFamily:'Syne,sans-serif',background:i<step?'rgba(34,197,94,.2)':i===step?'rgba(240,180,41,.2)':'rgba(30,30,45,.5)',color:i<step?'#4ade80':i===step?'#f0b429':'rgba(162,140,250,.3)',border:`1px solid ${i<step?'rgba(34,197,94,.3)':i===step?'rgba(240,180,41,.4)':'rgba(124,58,237,.1)'}`}}>
                  {i<step?'✓':(i+1)}
                </div>
                <span style={{fontSize:12,fontWeight:i===step?600:400,color:i===step?'#f0b429':'rgba(162,140,250,.35)'}}>{s}</span>
              </div>
              {i<STEPS.length-1&&<div style={{flex:1,height:1,background:'rgba(240,180,41,.08)',minWidth:16}}/>}
            </React.Fragment>
          ))}
        </div>

        {step===0 && (
          <div className="animate-fade-up">
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.3rem',color:'#fff',marginBottom:6,textAlign:'center'}}>Select Item Type</h2>
            <p style={{color:'rgba(162,140,250,.4)',textAlign:'center',marginBottom:24,fontSize:'.85rem'}}>What kind of accessory/item is this?</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginBottom:24}}>
              {ITEM_TYPES.map(t=>(
                <div key={t.id} onClick={()=>setItemType(t)} style={{border:`2px solid ${itemType?.id===t.id?'rgba(240,180,41,.6)':'rgba(30,30,45,.8)'}`,borderRadius:14,padding:'16px 8px',textAlign:'center',cursor:'pointer',background:itemType?.id===t.id?'rgba(240,180,41,.08)':'rgba(17,17,24,.8)',transition:'all .25s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(240,180,41,.35)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=itemType?.id===t.id?'rgba(240,180,41,.6)':'rgba(30,30,45,.8)'}>
                  <div style={{fontSize:28,marginBottom:6}}>{t.emoji}</div>
                  <p style={{fontSize:11,fontWeight:itemType?.id===t.id?600:400,color:itemType?.id===t.id?'#f0b429':'rgba(226,226,240,.6)'}}>{t.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p style={{fontSize:12,color:'rgba(162,140,250,.4)',marginBottom:10,fontFamily:'Syne,sans-serif'}}>FOR WHO?</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {GENDERS_ACC.map(g=>(
                  <button key={g.id} onClick={()=>setGender(g.id)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${gender===g.id?'rgba(240,180,41,.5)':'rgba(30,30,45,.8)'}`,background:gender===g.id?'rgba(240,180,41,.1)':'transparent',color:gender===g.id?'#f0b429':'rgba(162,140,250,.4)',fontSize:12,cursor:'pointer',transition:'all .2s'}}>
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step===1 && (
          <div className="animate-fade-up">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <p style={{fontSize:12,color:'rgba(240,180,41,.6)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT PHOTOS</p>
                  <button onClick={addItem} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,border:'1px solid rgba(240,180,41,.2)',background:'transparent',color:'#f0b429',fontSize:11,cursor:'pointer'}}><Plus size={11}/>Add</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginBottom:16}}>
                  {items.map((item,i)=>(
                    <div key={item.id} style={{position:'relative'}}>
                      <p style={{fontSize:10,color:'rgba(162,140,250,.35)',marginBottom:4}}>Photo {i+1}</p>
                      <ImageBox file={item.file} preview={item.preview} onFile={f=>setItemFile(item.id,f)} onRemove={()=>clearItemFile(item.id)} label="Upload" sublabel="JPG/PNG"/>
                      {items.length>1 && <button onClick={()=>setItems(p=>p.filter(x=>x.id!==item.id))} style={{position:'absolute',top:16,right:-4,width:16,height:16,borderRadius:'50%',background:'rgba(239,68,68,.7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={8} color="#fff"/></button>}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[['Product Name',productName,setProductName,'e.g. Luxury Watch'],['Brand',brandName,setBrandName,'Brand name'],['Color',color,setColor,'e.g. Rose Gold'],['Details',additionalNotes,setAdditionalNotes,'Additional info...']].map(([label,val,setter,ph])=>(
                    <div key={label}>
                      <label style={{fontSize:11,color:'rgba(240,180,41,.4)',display:'block',marginBottom:5,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{label.toUpperCase()}</label>
                      <input className="cv-input" value={val} onChange={e=>setter(e.target.value)} placeholder={ph} style={{borderColor:'rgba(240,180,41,.15)'}}/>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:14,padding:16}}>
                  <p style={{fontSize:12,color:'rgba(240,180,41,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>BACKGROUND</p>
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    {[['studio','Studio'],['custom','My Own']].map(([v,l])=>(
                      <button key={v} onClick={()=>setBgMode(v)} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${bgMode===v?'rgba(240,180,41,.5)':'rgba(240,180,41,.1)'}`,background:bgMode===v?'rgba(240,180,41,.1)':'transparent',color:bgMode===v?'#f0b429':'rgba(162,140,250,.3)',fontSize:11,cursor:'pointer'}}>{l}</button>
                    ))}
                  </div>
                  {bgMode==='studio' ? (
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {BG_STYLES.map(s=>(
                        <button key={s} onClick={()=>setBgStyle(s)} style={{padding:'4px 10px',borderRadius:16,border:`1px solid ${bgStyle===s?'rgba(240,180,41,.5)':'rgba(240,180,41,.1)'}`,background:bgStyle===s?'rgba(240,180,41,.1)':'transparent',color:bgStyle===s?'#f0b429':'rgba(162,140,250,.3)',fontSize:11,cursor:'pointer'}}>{s}</button>
                      ))}
                    </div>
                  ) : (
                    <ImageBox file={bgFile} preview={bgPreview} onFile={f=>{setBgFile(f);setBgPreview(URL.createObjectURL(f))}} onRemove={()=>{setBgFile(null);setBgPreview(null)}} label="Your background" sublabel="Any image"/>
                  )}
                </div>
                <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:14,padding:16}}>
                  <p style={{fontSize:12,color:'rgba(240,180,41,.5)',marginBottom:10,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>LOGO (OPTIONAL)</p>
                  <ImageBox file={logoFile} preview={logoPreview} onFile={f=>{setLogoFile(f);setLogoPreview(URL.createObjectURL(f))}} onRemove={()=>{setLogoFile(null);setLogoPreview(null)}} label="Upload logo" sublabel="PNG preferred"/>
                </div>
                <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:14,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <p style={{fontSize:12,color:'rgba(240,180,41,.5)',fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>OUTPUT ANGLES</p>
                    <button onClick={()=>setSelectedAngles(ANGLES_ACC.map(a=>a.id))} style={{fontSize:10,color:'rgba(240,180,41,.4)',background:'none',border:'none',cursor:'pointer'}}>All</button>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {ANGLES_ACC.map(a=>{const s=selectedAngles.includes(a.id);return(
                      <button key={a.id} onClick={()=>setSelectedAngles(p=>s?p.filter(x=>x!==a.id):[...p,a.id])} style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${s?'rgba(240,180,41,.5)':'rgba(30,30,45,.8)'}`,background:s?'rgba(240,180,41,.1)':'transparent',color:s?'#f0b429':'rgba(162,140,250,.3)',fontSize:11,cursor:'pointer',transition:'all .2s'}}>
                        {a.emoji} {a.label}
                      </button>
                    );})}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="animate-fade-up">
            {generating ? (
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <div style={{width:56,height:56,borderRadius:'50%',border:'3px solid rgba(240,180,41,.2)',borderTopColor:'#f0b429',animation:'spin .8s linear infinite',margin:'0 auto 20px'}}/>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:8}}>Generating product images...</p>
                <p style={{color:'rgba(162,140,250,.4)',fontSize:'.85rem'}}>Product details preserved accurately</p>
              </div>
            ) : results.length>0 ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:24}}>
                  {results.map((img,i)=>(
                    <div key={i} style={{borderRadius:14,overflow:'hidden',background:'rgba(240,180,41,.04)',border:'1px solid rgba(240,180,41,.12)'}}>
                      <div style={{aspectRatio:'1/1',overflow:'hidden'}}><img src={IMG(img.image_url||img.url)} alt="result" style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
                      <div style={{padding:'8px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:11,color:'rgba(240,180,41,.5)'}}>{img.image_type||'Product'}</span>
                        <button onClick={()=>download(img.image_url||img.url)} style={{width:24,height:24,borderRadius:6,background:'rgba(240,180,41,.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Download size={11} color="#f0b429"/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',fontSize:'.95rem'}}>📋 Listing Content</h3>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {['amazon','flipkart'].map(p=>(
                        <button key={p} onClick={()=>setListingPlatform(p)} style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${listingPlatform===p?'rgba(240,180,41,.4)':'rgba(124,58,237,.1)'}`,background:listingPlatform===p?'rgba(240,180,41,.1)':'transparent',color:listingPlatform===p?'#f0b429':'rgba(162,140,250,.3)',fontSize:10,cursor:'pointer',textTransform:'capitalize'}}>{p}</button>
                      ))}
                      <button onClick={generateListing} style={{padding:'4px 10px',borderRadius:8,background:'rgba(240,180,41,.15)',border:'1px solid rgba(240,180,41,.3)',color:'#f0b429',fontSize:11,cursor:'pointer',fontWeight:600}}>Generate</button>
                    </div>
                  </div>
                  {listingContent ? (
                    [['Title',listingContent.title],['Description',listingContent.description],['Keywords',listingContent.keywords?.join(', ')]].filter(([,v])=>v).map(([k,v])=>(
                      <div key={k} style={{padding:'10px',borderRadius:10,background:'rgba(240,180,41,.04)',border:'1px solid rgba(240,180,41,.08)',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:10,color:'rgba(240,180,41,.4)'}}>{k.toUpperCase()}</span>
                          <button onClick={()=>copyText(v,k)} style={{background:'none',border:'none',cursor:'pointer',color:copied===k?'#4ade80':'rgba(162,140,250,.4)'}}>{copied===k?<Check size={11}/>:<Copy size={11}/>}</button>
                        </div>
                        <p style={{fontSize:12,color:'rgba(226,226,240,.65)',lineHeight:1.5}}>{v}</p>
                      </div>
                    ))
                  ) : <p style={{color:'rgba(162,140,250,.3)',fontSize:'.85rem',textAlign:'center',padding:'16px 0'}}>Click Generate to create listing content</p>}
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <p style={{color:'rgba(162,140,250,.4)',marginBottom:16}}>Ready to generate</p>
                <button onClick={generate} className="btn-gold"><Wand2 size={16}/>Generate Now</button>
              </div>
            )}
          </div>
        )}

        {step<2 && (
          <div style={{display:'flex',justifyContent:'space-between',marginTop:28,paddingTop:20,borderTop:'1px solid rgba(240,180,41,.08)'}}>
            <button onClick={()=>step===0?nav('/owner/studio'):setStep(s=>s-1)} className="btn-ghost"><ArrowLeft size={14}/>Back</button>
            {step<1 ? (
              <button onClick={()=>setStep(1)} disabled={!itemType} className="btn-gold">Next <ArrowRight size={14}/></button>
            ) : (
              <button onClick={generate} disabled={generating||!items.some(x=>x.file)} className="btn-gold">
                {generating?<><div style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>Generating...</>:<><Wand2 size={14}/>Generate</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
