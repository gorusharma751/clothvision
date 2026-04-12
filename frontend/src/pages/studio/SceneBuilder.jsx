import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, Plus, X, Sparkles, RefreshCw, Copy, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { buildUploadUrl } from '../../utils/uploads';
import Layout from '../../components/shared/Layout';

/* ── ImageBox ── */
function ImageBox({ preview, onFile, onRemove, label, sublabel, accent = '#7c3aed', required }) {
  const onDrop = useCallback(f => { if (f[0]) onFile(f[0]); }, [onFile]);       
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });
  const c = isDragActive ? `${accent}` : preview ? `${accent}66` : `${accent}33`;
  return (
    <div {...getRootProps()} style={{ border: `2px dashed ${c}`, borderRadius: 14, background: preview ? 'rgba(17,17,24,.8)' : `${accent}08`, cursor: 'pointer', transition: 'all .2s', minHeight: 130, position: 'relative', overflow: 'hidden' }}>
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, display: 'block' }} />
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} color="#fff" /></button>
          <p style={{ textAlign: 'center', fontSize: 10, color: `${accent}88`, padding: '3px 0' }}>Click to change</p>
        </>
      ) : (
        <div style={{ padding: '20px 12px', textAlign: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Plus size={17} color={`${accent}99`} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(226,226,240,.55)' }}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</p>    
          {sublabel && <p style={{ fontSize: 10, color: `${accent}55`, marginTop: 3 }}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

/* ── Toggle chip ── */
function Chip({ label, emoji, selected, onClick, color = '#7c3aed' }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${selected ? color : 'rgba(124,58,237,.15)'}`, background: selected ? `${color}18` : 'transparent', color: selected ? '#e2e2f0' : 'rgba(162,140,250,.4)', fontSize: 12, fontWeight: selected ? 600 : 400, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 5 }}>
      {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}{label}
    </button>
  );
}

export default function SceneBuilder() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [presets, setPresets] = useState(null);

  // Images
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);

  // Config
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [surfaceType, setSurfaceType] = useState('table');
  const [surfaceDesc, setSurfaceDesc] = useState('');
  const [selectedProps, setSelectedProps] = useState([]);
  const [outputFormat, setOutputFormat] = useState('flipkart_square');
  const [lightingStyle, setLightingStyle] = useState('soft_natural');
  const [productPosition, setProductPosition] = useState('center');
  const [showShadow, setShowShadow] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [platform, setPlatform] = useState('flipkart');

  // Output
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/scene/presets').then(r => setPresets(r.data)).catch(() => {});    
  }, []);

  const getAiSuggestion = async () => {
    if (!productName) return toast.error('Enter product name first');
    setLoadingSuggestion(true);
    try {
      const r = await api.post('/scene/suggest', { product_name: productName, product_category: productCategory, bg_description: bgPreview ? 'custom background provided' : 'no background' });
      setAiSuggestion(r.data);
      if (r.data.suggested_surface) setSurfaceType(r.data.suggested_surface);   
      if (r.data.suggested_lighting) setLightingStyle(r.data.suggested_lighting);
      if (r.data.suggested_props) setSelectedProps(r.data.suggested_props.slice(0, 3));
      if (r.data.custom_prompt) setCustomPrompt(r.data.custom_prompt);
      toast.success('AI suggestions applied!');
    } catch { toast.error('Suggestion failed'); }
    finally { setLoadingSuggestion(false); }
  };

  const toggleProp = (id) => setSelectedProps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const generate = async () => {
    if (!productFile) return toast.error('Upload product image first');
    setGenerating(true); setResults([]);
    try {
      const fd = new FormData();
      fd.append('product_image', productFile);
      if (bgFile) fd.append('background_image', bgFile);
      fd.append('product_name', productName || 'Product');
      fd.append('product_category', productCategory || 'item');
      fd.append('surface_type', surfaceType);
      fd.append('surface_description', surfaceDesc);
      fd.append('selected_props', JSON.stringify(selectedProps));
      fd.append('output_format', outputFormat);
      fd.append('lighting_style', lightingStyle);
      fd.append('product_position', productPosition);
      fd.append('show_shadow', showShadow ? 'true' : 'false');
      fd.append('custom_prompt', customPrompt);
      fd.append('platform', platform);
      const r = await api.post('/scene/generate', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResults(r.data.images || []);
      setStep(3);
      toast.success(`Scene generated! Used ${r.data.credits_used} credits.`);   
    } catch (err) {
      if (err.response?.data?.error === 'Insufficient credits') toast.error('Not enough credits! Request more.');
      else toast.error(err.response?.data?.error || 'Generation failed');       
    } finally { setGenerating(false); }
  };

  const download = (url) => {
    const a = document.createElement('a');
    a.href = buildUploadUrl(url);
    a.download = `scene_${Date.now()}.jpg`;
    a.click();
  };

  const STEPS = ['Upload', 'Scene Setup', 'Settings', 'Results'];
  const lightingOptions = [
    { id: 'soft_natural', label: 'Soft Natural', emoji: '☀️' },
    { id: 'studio_white', label: 'Studio White', emoji: '💡' },
    { id: 'golden_hour', label: 'Golden Hour', emoji: '🌅' },
    { id: 'dramatic', label: 'Dramatic', emoji: '🎭' },
    { id: 'flat', label: 'Flat Light', emoji: '⬜' },
  ];

  return (
    <Layout contentPadding={0}>
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(10,10,15,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(240,180,41,.1)' }}>
        <button onClick={() => step === 0 ? nav('/owner/studio') : setStep(s => s - 1)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(240,180,41,.25)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0b429' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
            🛋️ Scene Builder
          </h1>
          <p style={{ fontSize: 11, color: 'rgba(240,180,41,.45)' }}>Place product in any background — Flipkart ready</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['flipkart', 'amazon'].map(p => (
            <button key={p} onClick={() => { setPlatform(p); setOutputFormat(p === 'flipkart' ? 'flipkart_square' : 'amazon_rect'); }}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${platform === p ? 'rgba(240,180,41,.5)' : 'rgba(124,58,237,.15)'}`, background: platform === p ? 'rgba(240,180,41,.1)' : 'transparent', color: platform === p ? '#f0b429' : 'rgba(162,140,250,.4)', fontSize: 11, fontWeight: platform === p ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>   
        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: i < step ? 'pointer' : 'default' }} onClick={() => i < step && setStep(i)}>  
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i < step ? 'rgba(34,197,94,.2)' : i === step ? 'rgba(240,180,41,.2)' : 'rgba(30,30,45,.5)', color: i < step ? '#4ade80' : i === step ? '#f0b429' : 'rgba(162,140,250,.3)', border: `1px solid ${i < step ? 'rgba(34,197,94,.3)' : i === step ? 'rgba(240,180,41,.4)' : 'rgba(124,58,237,.1)'}` }}>        
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? '#f0b429' : 'rgba(162,140,250,.35)' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(240,180,41,.08)', minWidth: 16 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 0 — Upload */}
        {step === 0 && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff', marginBottom: 6, textAlign: 'center', fontSize: '1.3rem' }}>Upload Images</h2>
            <p style={{ color: 'rgba(162,140,250,.4)', textAlign: 'center', marginBottom: 24, fontSize: '.85rem' }}>Upload your product + optional background photo</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 20, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(240,180,41,.6)', marginBottom: 8, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>PRODUCT IMAGE <span style={{ color: '#f87171' }}>*</span></p>
                <ImageBox preview={productPreview} onFile={f => { setProductFile(f); setProductPreview(URL.createObjectURL(f)); }} onRemove={() => { setProductFile(null); setProductPreview(null); }} label="Upload product photo" sublabel="Watch, perfume, car seat cover, any product" accent="#f0b429" required />
                <p style={{ fontSize: 10, color: 'rgba(240,180,41,.35)', marginTop: 6 }}>💡 Use clean product photo for best results</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(124,58,237,.6)', marginBottom: 8, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>BACKGROUND IMAGE (optional)</p>
                <ImageBox preview={bgPreview} onFile={f => { setBgFile(f); setBgPreview(URL.createObjectURL(f)); }} onRemove={() => { setBgFile(null); setBgPreview(null); }} label="Upload your background" sublabel="Car interior, room, table, any scene" accent="#7c3aed" />
                <p style={{ fontSize: 10, color: 'rgba(124,58,237,.35)', marginTop: 6 }}>💡 Leave empty for AI-generated background</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', display: 'block', marginBottom: 6, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>PRODUCT NAME</label>
                <input className="cv-input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Leather Car Seat Cover" style={{ borderColor: 'rgba(240,180,41,.2)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', display: 'block', marginBottom: 6, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>CATEGORY</label>
                <input className="cv-input" value={productCategory} onChange={e => setProductCategory(e.target.value)} placeholder="e.g. Car Accessories" style={{ borderColor: 'rgba(240,180,41,.2)' }} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Scene Setup */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff', fontSize: '1.2rem' }}>Scene Setup</h2>
                <p style={{ color: 'rgba(162,140,250,.4)', fontSize: '.85rem' }}>Where should the product be placed?</p>
              </div>
              <button onClick={getAiSuggestion} disabled={loadingSuggestion} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(124,58,237,.3)', background: 'rgba(124,58,237,.1)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>  
                {loadingSuggestion ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                AI Suggest
              </button>
            </div>

            {aiSuggestion && (
              <div style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>✨ AI Suggestion</p>
                <p style={{ fontSize: 12, color: 'rgba(162,140,250,.7)' }}>{aiSuggestion.scene_description}</p>
                {aiSuggestion.platform_tip && <p style={{ fontSize: 11, color: 'rgba(240,180,41,.6)', marginTop: 4 }}>💡 {aiSuggestion.platform_tip}</p>}       
              </div>
            )}

            {/* Surface type */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 10, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>PLACEMENT SURFACE</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                {(presets?.surface_types || []).map(s => (
                  <div key={s.id} onClick={() => setSurfaceType(s.id)} style={{ border: `2px solid ${surfaceType === s.id ? 'rgba(240,180,41,.6)' : 'rgba(30,30,45,.8)'}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', background: surfaceType === s.id ? 'rgba(240,180,41,.08)' : 'rgba(17,17,24,.7)', transition: 'all .2s' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{s.emoji}</div>
                    <p style={{ fontSize: 11, fontWeight: surfaceType === s.id ? 600 : 400, color: surfaceType === s.id ? '#f0b429' : 'rgba(226,226,240,.5)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom surface description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', display: 'block', marginBottom: 6, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>
                SCENE DESCRIPTION {surfaceType === 'custom' ? <span style={{ color: '#f87171' }}>*</span> : '(optional)'}
              </label>
              <textarea className="cv-input" value={surfaceDesc} onChange={e => setSurfaceDesc(e.target.value)} placeholder={surfaceType === 'car_dashboard' ? 'e.g. Black leather dashboard, steering wheel visible, luxury car interior' : surfaceType === 'table' ? 'e.g. White marble table, minimalist setup, morning light' : 'Describe the scene in detail...'} style={{ resize: 'none', minHeight: 72, borderColor: 'rgba(240,180,41,.15)' }} />
            </div>

            {/* Props */}
            <div>
              <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 10, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>ADD PROPS (optional)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>       
                {(presets?.prop_items || []).map(p => (
                  <Chip key={p.id} label={p.label} emoji={p.emoji} selected={selectedProps.includes(p.id)} onClick={() => toggleProp(p.id)} color="#f0b429" />  
                ))}
              </div>
              {selectedProps.length > 0 && <p style={{ fontSize: 11, color: 'rgba(240,180,41,.4)', marginTop: 8 }}>{selectedProps.length} prop{selectedProps.length !== 1 ? 's' : ''} selected</p>}
            </div>
          </div>
        )}

        {/* STEP 2 — Output Settings */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff', marginBottom: 20, fontSize: '1.2rem' }}>Output Settings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
              {/* Output format */}
              <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 12, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>OUTPUT FORMAT</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(presets?.output_formats || []).map(f => (
                    <div key={f.id} onClick={() => setOutputFormat(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: `1px solid ${outputFormat === f.id ? 'rgba(240,180,41,.5)' : 'rgba(30,30,45,.8)'}`, background: outputFormat === f.id ? 'rgba(240,180,41,.08)' : 'rgba(17,17,24,.5)', cursor: 'pointer', transition: 'all .2s' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: outputFormat === f.id ? 600 : 400, color: outputFormat === f.id ? '#f0b429' : 'rgba(226,226,240,.6)' }}>{f.label}</p>
                        <p style={{ fontSize: 10, color: 'rgba(162,140,250,.35)' }}>{f.desc}</p>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: 'rgba(124,58,237,.1)', color: '#a78bfa' }}>{f.size}</span>  
                    </div>
                  ))}
                </div>
              </div>

              {/* Lighting + Position + Shadow */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 18 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 10, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>LIGHTING</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>   
                    {lightingOptions.map(l => (
                      <Chip key={l.id} label={l.label} emoji={l.emoji} selected={lightingStyle === l.id} onClick={() => setLightingStyle(l.id)} color="#f0b429" />
                    ))}
                  </div>
                </div>

                <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 18 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 10, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>PRODUCT POSITION</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['left', '◀ Left'], ['center', '● Center'], ['right', 'Right ▶']].map(([v, l]) => (
                      <button key={v} onClick={() => setProductPosition(v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${productPosition === v ? 'rgba(240,180,41,.5)' : 'rgba(30,30,45,.8)'}`, background: productPosition === v ? 'rgba(240,180,41,.1)' : 'transparent', color: productPosition === v ? '#f0b429' : 'rgba(162,140,250,.35)', fontSize: 11, fontWeight: productPosition === v ? 600 : 400, cursor: 'pointer' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Drop Shadow</p>
                      <p style={{ fontSize: 11, color: 'rgba(162,140,250,.4)' }}>Realistic shadow under product</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={showShadow} onChange={e => setShowShadow(e.target.checked)} />
                      <div className="toggle-track" /><div className="toggle-thumb" />
                    </label>
                  </div>
                </div>

                <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 18 }}>
                  <p style={{ fontSize: 11, color: 'rgba(240,180,41,.5)', marginBottom: 8, fontFamily: 'Syne,sans-serif', letterSpacing: '.1em' }}>EXTRA INSTRUCTIONS</p>
                  <textarea className="cv-input" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. Make it look premium luxury, add bokeh effect, warm tones..." style={{ resize: 'none', minHeight: 72, borderColor: 'rgba(240,180,41,.15)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Results */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            {generating ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>       
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(240,180,41,.2)', borderTopColor: '#f0b429', animation: 'spin .8s linear infinite', margin: '0 auto 20px' }} />
                <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 600, color: '#fff', fontSize: '1.1rem', marginBottom: 8 }}>Building your product scene...</p>
                <p style={{ color: 'rgba(162,140,250,.4)', fontSize: '.85rem' }}>Product details preserved exactly</p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff' }}>✨ Your Scenes ({results.length})</h2>
                  <button onClick={() => { setResults([]); setStep(0); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(240,180,41,.25)', background: 'transparent', color: '#f0b429', fontSize: 12, cursor: 'pointer' }}>
                    New Scene
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                  {results.map((img, i) => {
                    const imgUrl = buildUploadUrl(img.url);
                    return (
                      <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(240,180,41,.04)', border: '1px solid rgba(240,180,41,.12)' }}>
                        <div style={{ aspectRatio: outputFormat === 'story' ? '9/16' : outputFormat === 'banner' ? '16/9' : '1/1', overflow: 'hidden', background: '#111' }}>
                          <img src={imgUrl} alt={`scene ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                        </div>
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 11, color: 'rgba(240,180,41,.6)', textTransform: 'capitalize' }}>{img.format?.replace('_', ' ')}</p>
                            <p style={{ fontSize: 10, color: 'rgba(162,140,250,.35)' }}>{platform}</p>
                          </div>
                          <button onClick={() => download(img.url)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(240,180,41,.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Download size={13} color="#f0b429" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>      
                  <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>✅ Ready for {platform.charAt(0).toUpperCase() + platform.slice(1)} listing!</p>
                  <p style={{ fontSize: 11, color: 'rgba(162,140,250,.5)' }}>Download images and upload directly to your {platform} product listing.</p>        
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>       
                <p style={{ color: 'rgba(162,140,250,.4)', marginBottom: 16 }}>Ready to generate</p>
                <button onClick={generate} className="btn-gold"><Wand2 size={16} />Generate Scene</button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(240,180,41,.08)' }}>        
            <button onClick={() => step === 0 ? nav('/owner/studio') : setStep(s => s - 1)} className="btn-ghost">
              <ArrowLeft size={14} />Back
            </button>
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !productFile} className="btn-gold">
                Next <span style={{ marginLeft: 4 }}>→</span>
              </button>
            ) : (
              <button onClick={generate} disabled={generating || !productFile} className="btn-gold">
                {generating
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />Building...</>
                  : <><Wand2 size={14} />Build Scene (2 credits)</>}
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
    </Layout>
  );
}