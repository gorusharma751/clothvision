import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, RefreshCw, Plus, Trash2, Wand2, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';
import { getJobErrorMessage, resolveJobResponse } from '../../utils/jobs';

const PROMPT_SECTIONS = [
  {
    key: 'tryon_extra',
    label: 'Try-On Extra Instructions',
    desc: 'Added to every try-on image generation prompt',
    placeholder: 'e.g. Add "Premium Quality" gold text at bottom. Show product with slight sparkle effect.',
    type: 'textarea',
    category: 'ai_prompts',
  },
  {
    key: 'bg_extra',
    label: 'Background Generation Extra',
    desc: 'Extra instructions for product background generation',
    placeholder: 'e.g. Always add 5 gold stars rating badge. Premium quality text in gold.',
    type: 'textarea',
    category: 'ai_prompts',
  },
  {
    key: 'strict_rules_extra',
    label: 'Additional Strict Rules',
    desc: 'Extra rules added to every image generation (preservation rules)',
    placeholder: 'e.g. Always maintain brand logo visibility. Never blur product details.',
    type: 'textarea',
    category: 'ai_prompts',
  },
  {
    key: 'video_extra',
    label: 'Video Style Extra',
    desc: 'Custom style/tone for video script generation',
    placeholder: 'e.g. Energetic and premium feel. Show product features in slow motion.',
    type: 'textarea',
    category: 'ai_prompts',
  },
  {
    key: 'marketing_poster_extra',
    label: 'Marketing Poster Extra',
    desc: 'Extra instructions for marketing poster generation',
    placeholder: 'e.g. Always include brand watermark. Use warm golden tones.',
    type: 'textarea',
    category: 'ai_prompts',
  },
];

const PRESET_PROMPTS = [
  { label: 'Premium Quality Badge', value: 'Add "Premium Quality" text in gold calligraphy script at the bottom of the image, with 5 gold star ratings below it.' },
  { label: '5 Star + Stars Overlay', value: 'Add 5 gold star rating symbols and "5 STAR RATED" text badge with dark background at the bottom of the image.' },
  { label: 'Brand Watermark', value: 'Add subtle brand name watermark in bottom right corner with 30% opacity.' },
  { label: 'Pack of 2 Badge', value: 'Add "Pack of 2" badge in gold 3D text style in the top right area of the image.' },
  { label: 'New Arrival Tag', value: 'Add a "NEW ARRIVAL" ribbon badge in the top left corner in bold red and gold.' },
  { label: 'No Overlay', value: '' },
];

function DropBox({ preview, onFile, onRemove, label }) {
  const onDrop = useCallback(f => { if(f[0]) onFile(f[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*':[]}, maxFiles: 1 });
  return (
    <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'rgba(124,58,237,.7)':preview?'rgba(124,58,237,.4)':'rgba(124,58,237,.2)'}`,borderRadius:12,background:'rgba(17,17,24,.7)',cursor:'pointer',minHeight:100,position:'relative',overflow:'hidden',transition:'all .2s'}}>
      <input {...getInputProps()}/>
      {preview ? (
        <>
          <img src={preview} alt="product" style={{width:'100%',maxHeight:140,objectFit:'contain',display:'block'}}/>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{position:'absolute',top:5,right:5,width:20,height:20,borderRadius:'50%',background:'rgba(239,68,68,.85)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>✕</button>
        </>
      ) : (
        <div style={{padding:'18px',textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:6}}>📦</div>
          <p style={{fontSize:12,color:'rgba(162,140,250,.45)'}}>{label}</p>
        </div>
      )}
    </div>
  );
}

export default function PromptSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState('idle');
  const generating = isGenerating;
  const setGenerating = setIsGenerating;
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [promptType, setPromptType] = useState('tryon');
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [productDetails, setProductDetails] = useState({ name:'', category:'', color:'', description:'' });
  const pollAbortRef = useRef(null);

  useEffect(() => {
    api.get('/admin/prompt-settings/ai_prompts').then(r => {
      const s = {};
      (r.data||[]).forEach(row => { s[row.key] = row.value; });
      setSettings(s);
    }).catch(()=>{});
  }, []);

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

  const save = async () => {
    setSaving(true);
    try {
      for(const section of PROMPT_SECTIONS) {
        await api.put('/admin/prompt-settings', {
          category: section.category,
          key: section.key,
          value: settings[section.key] || '',
          description: section.label,
        });
      }
      toast.success('Prompt settings saved! Will apply to all new generations.');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const generateSuggestion = async () => {
    if (isGenerating) return;
    if(!productFile) return toast.error('Upload a product image first');
    if(!productDetails.name) return toast.error('Enter product name');
    const signal = startPollingSignal();

    setGenerating(true); setJobStatus('pending');
    try {
      const fd = new FormData();
      fd.append('product_image', productFile);
      fd.append('prompt_type', promptType);
      Object.entries(productDetails).forEach(([k,v]) => v && fd.append(k, v));
      // Use the direct generate-prompt endpoint with temporary product
      const r = await api.post('/products/generate-prompt-direct', fd, {headers:{'Content-Type':'multipart/form-data'}});

      const settled = await resolveJobResponse(r.data, {
        onStatusChange: (status) => setJobStatus(status),
        intervalMs: 3000,
        processingIntervalMs: 4500,
        maxPollingRetries: 4,
        signal,
      });

      if (settled.status === 'failed') {
        setJobStatus('failed');
        toast.error(getJobErrorMessage(settled, 'Generation failed'));
        return;
      }

      const payload = settled.result || {};
      if (!payload.main_prompt) {
        setJobStatus('failed');
        toast.error('Generation finished but no prompt was returned. Please retry.');
        return;
      }

      setGeneratedPrompt(payload);
      setJobStatus('completed');
      toast.success('AI prompt generated!');
    } catch(err) {
      if (err?.name === 'AbortError') return;
      setJobStatus('failed');
      toast.error(err.response?.data?.error||'Generation failed');
    }
    finally {
      if (pollAbortRef.current?.signal === signal) pollAbortRef.current = null;
      setGenerating(false);
    }
  };

  const applyToSection = (promptText, sectionKey) => {
    setSettings(p => ({...p, [sectionKey]: (p[sectionKey]?p[sectionKey]+' ':'')+promptText}));
    toast.success(`Applied to ${sectionKey.replace('_',' ')}`);
  };

  return (
    <Layout title="Prompt Settings" subtitle="Customize AI generation prompts for all users">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,maxWidth:1200}}>

        {/* Left: Prompt customization */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <Info size={14} color="#a78bfa"/>
              <p style={{fontSize:12,color:'rgba(162,140,250,.6)',lineHeight:1.6}}>These prompts are added to every AI generation. Use them to add branding, overlays, or quality markers to all images.</p>
            </div>
          </div>

          {PROMPT_SECTIONS.map(section => (
            <div key={section.key} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:18}}>
              <div style={{marginBottom:12}}>
                <p style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:3}}>{section.label}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)'}}>{section.desc}</p>
              </div>
              {/* Preset chips */}
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                {PRESET_PROMPTS.map(p => (
                  <button key={p.label} onClick={()=>{setSettings(prev=>({...prev,[section.key]:p.value}));}} style={{padding:'4px 10px',borderRadius:16,border:'1px solid rgba(124,58,237,.2)',background:'transparent',color:'rgba(162,140,250,.5)',fontSize:11,cursor:'pointer',transition:'all .2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,58,237,.5)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(124,58,237,.2)'}>
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                className="cv-input"
                rows={3}
                value={settings[section.key] || ''}
                onChange={e => setSettings(p=>({...p,[section.key]:e.target.value}))}
                placeholder={section.placeholder}
                style={{resize:'vertical',fontSize:12}}
              />
            </div>
          ))}

          <button onClick={save} disabled={saving} className="btn-primary" style={{alignSelf:'flex-start',padding:'10px 24px',width:'100%',maxWidth:320}}>
            <Save size={14}/>{saving?'Saving...':'Save All Prompts'}
          </button>
        </div>

        {/* Right: AI Prompt Generator */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#111118',border:'1px solid rgba(124,58,237,.3)',borderRadius:16,padding:20}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:4,display:'flex',alignItems:'center',gap:8,fontSize:'1rem'}}>
              <Wand2 size={16} color="#a78bfa"/>AI Prompt Generator
            </h3>
            <p style={{fontSize:12,color:'rgba(162,140,250,.4)',marginBottom:16}}>Upload a product image and let AI generate the perfect prompt for your use case.</p>

            <div style={{marginBottom:14}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:8,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PRODUCT IMAGE</p>
              <DropBox preview={productPreview} onFile={f=>{setProductFile(f);setProductPreview(URL.createObjectURL(f));}} onRemove={()=>{setProductFile(null);setProductPreview(null);}} label="Upload product photo"/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:14}}>
              {[['name','Product Name','e.g. Polo T-Shirt'],['category','Category','e.g. T-Shirt'],['color','Color','e.g. Navy Blue'],['description','Details','e.g. Striped pattern']].map(([k,l,ph])=>(
                <div key={k}>
                  <label style={{fontSize:10,color:'rgba(124,58,237,.4)',display:'block',marginBottom:4,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>{l.toUpperCase()}</label>
                  <input className="cv-input" value={productDetails[k]||''} onChange={e=>setProductDetails(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{fontSize:12,padding:'.5rem .85rem'}}/>
                </div>
              ))}
            </div>

            <div style={{marginBottom:14}}>
              <p style={{fontSize:11,color:'rgba(124,58,237,.5)',marginBottom:8,fontFamily:'Syne,sans-serif',letterSpacing:'.1em'}}>PROMPT TYPE</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['tryon','Try-On'],['scene','Scene'],['marketing','Marketing'],['video','Video']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPromptType(v)} style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${promptType===v?'rgba(124,58,237,.5)':'rgba(124,58,237,.15)'}`,background:promptType===v?'rgba(124,58,237,.15)':'transparent',color:promptType===v?'#a78bfa':'rgba(162,140,250,.4)',fontSize:11,fontWeight:promptType===v?600:400,cursor:'pointer'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateSuggestion} disabled={generating||!productFile} className="btn-primary" style={{width:'100%',height:42,justifyContent:'center'}}>
              {generating
                ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>{jobStatus === 'pending' ? 'Queued for generation...' : 'Analyzing product...'}</>
                : <><Wand2 size={14}/>Generate AI Prompt</>}
            </button>
          </div>

          {/* Generated prompt result */}
          {generatedPrompt && (
            <div style={{background:'#111118',border:'1px solid rgba(34,197,94,.25)',borderRadius:16,padding:20,animation:'fadeUp .3s ease'}}>
              <h4 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#4ade80',marginBottom:14,fontSize:'.9rem'}}>✅ AI Generated Prompt</h4>

              <div style={{marginBottom:12}}>
                <p style={{fontSize:10,color:'rgba(162,140,250,.4)',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>MAIN PROMPT</p>
                <div style={{background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.15)',borderRadius:10,padding:'10px 12px',fontSize:12,color:'rgba(226,226,240,.75)',lineHeight:1.65}}>
                  {generatedPrompt.main_prompt}
                </div>
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  {PROMPT_SECTIONS.map(s=>(
                    <button key={s.key} onClick={()=>applyToSection(generatedPrompt.main_prompt, s.key)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid rgba(34,197,94,.3)',background:'rgba(34,197,94,.08)',color:'#4ade80',fontSize:10,cursor:'pointer'}}>
                      → Apply to {s.label.replace(' Extra','').replace(' Generation','')}
                    </button>
                  ))}
                </div>
              </div>

              {generatedPrompt.pose_suggestions?.length>0 && (
                <div style={{marginBottom:10}}>
                  <p style={{fontSize:10,color:'rgba(162,140,250,.4)',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>POSE SUGGESTIONS</p>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {generatedPrompt.pose_suggestions.map((p,i)=>(
                      <div key={i} style={{fontSize:12,color:'rgba(226,226,240,.6)',padding:'5px 10px',background:'rgba(124,58,237,.05)',borderRadius:7,border:'1px solid rgba(124,58,237,.1)'}}>{p}</div>
                    ))}
                  </div>
                </div>
              )}

              {generatedPrompt.platform_specific && (
                <div>
                  <p style={{fontSize:10,color:'rgba(162,140,250,.4)',marginBottom:6,fontFamily:'Syne,sans-serif',letterSpacing:'.08em'}}>PLATFORM TIPS</p>
                  {Object.entries(generatedPrompt.platform_specific).map(([platform,tip])=>(
                    <div key={platform} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,fontWeight:600,color:'#f0b429',minWidth:56,textTransform:'capitalize'}}>{platform}:</span>
                      <span style={{fontSize:11,color:'rgba(162,140,250,.55)'}}>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}
