import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, Copy, Check, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api, { getImageUrl } from '../../utils/api';

function UploadBox({ preview, onFile, onRemove }) {
  const onDrop = useCallback((files) => {
    if (files[0]) onFile(files[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  if (preview) {
    return (
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(239,68,68,.2)', background: '#111118' }}>
        <img src={preview} alt="product" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
        <button
          type="button"
          onClick={onRemove}
          style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={12} color="#fff" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? '#ef4444' : 'rgba(239,68,68,.32)'}`,
        borderRadius: 14,
        background: isDragActive ? 'rgba(239,68,68,.06)' : '#111118',
        cursor: 'pointer',
        minHeight: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 20
      }}
    >
      <input {...getInputProps()} />
      <div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <Plus size={18} color="#ef4444" />
        </div>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Upload product image</p>
        <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 11, marginTop: 4 }}>Used to build script + cinematic keyframes</p>
      </div>
    </div>
  );
}

export default function VideoStudio() {
  const nav = useNavigate();

  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);

  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState('instagram_reel');
  const [duration, setDuration] = useState(15);
  const [tone, setTone] = useState('premium');
  const [objective, setObjective] = useState('sales');
  const [cta, setCta] = useState('Shop now');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  const orderedScenes = useMemo(() => {
    const storyboard = result?.script?.storyboard;
    if (!Array.isArray(storyboard)) return [];
    return storyboard;
  }, [result]);

  const onGenerate = async () => {
    if (!productFile) return toast.error('Upload product image first');

    setGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('product_image', productFile);
      formData.append('brand_name', brandName);
      formData.append('product_name', productName);
      formData.append('platform', platform);
      formData.append('duration', String(duration));
      formData.append('tone', tone);
      formData.append('objective', objective);
      formData.append('cta', cta);

      const response = await api.post('/studio/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      toast.success(`Video plan ready. Used ${response.data.credits_used} credits.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Video generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const copyCaption = async () => {
    const text = result?.script?.caption;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1600);
    toast.success('Caption copied');
  };

  const downloadImage = (rawUrl) => {
    const url = String(rawUrl || '').startsWith('http') ? rawUrl : getImageUrl(rawUrl);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_frame_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <Layout
      title="Video Studio"
      subtitle="Generate short-video script + keyframes for Luma, Runway, or Kling"
      actions={
        <button
          onClick={() => nav('/owner/studio')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(239,68,68,.35)', background: 'transparent', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
        </button>
      }
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(239,68,68,.6)' }}>INPUT</p>
          <UploadBox
            preview={productPreview}
            onFile={(file) => {
              setProductFile(file);
              setProductPreview(URL.createObjectURL(file));
            }}
            onRemove={() => {
              setProductFile(null);
              setProductPreview(null);
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="cv-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name" />
            <input className="cv-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="cv-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="instagram_reel">Instagram Reel</option>
              <option value="youtube_short">YouTube Short</option>
              <option value="facebook_reel">Facebook Reel</option>
              <option value="tiktok">TikTok</option>
            </select>
            <select className="cv-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={10}>10 sec</option>
              <option value={15}>15 sec</option>
              <option value={20}>20 sec</option>
              <option value={30}>30 sec</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="cv-input" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="premium">Premium</option>
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
              <option value="playful">Playful</option>
            </select>
            <select className="cv-input" value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="sales">Drive Sales</option>
              <option value="awareness">Brand Awareness</option>
              <option value="launch">New Launch</option>
            </select>
          </div>

          <input className="cv-input" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Call to action" />

          <button className="btn-primary" onClick={onGenerate} disabled={generating || !productFile} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {generating ? 'Generating...' : <><Wand2 size={14} />Generate Script + Keyframes (5 credits)</>}
          </button>
        </div>

        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(239,68,68,.6)', marginBottom: 10 }}>OUTPUT</p>

          {!result && (
            <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 13 }}>Generate to see storyboard, caption, hashtags, and keyframes.</p>
          )}

          {result?.script && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.22)' }}>
                <p style={{ fontSize: 11, color: 'rgba(239,68,68,.7)', marginBottom: 4, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>HOOK</p>
                <p style={{ fontSize: 13, color: '#fff' }}>{result.script.hook}</p>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'rgba(162,140,250,.65)', fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>CAPTION</p>
                  <button
                    onClick={copyCaption}
                    style={{ border: '1px solid rgba(124,58,237,.25)', background: 'transparent', color: captionCopied ? '#4ade80' : '#a78bfa', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', cursor: 'pointer' }}
                  >
                    {captionCopied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
                  </button>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(226,226,240,.7)', lineHeight: 1.6 }}>{result.script.caption}</p>
              </div>

              <div>
                <p style={{ fontSize: 11, color: 'rgba(162,140,250,.65)', marginBottom: 6, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>STORYBOARD</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderedScenes.map((scene, idx) => (
                    <div key={`${scene.scene}-${idx}`} style={{ border: '1px solid rgba(124,58,237,.16)', borderRadius: 10, padding: 10, background: 'rgba(124,58,237,.03)' }}>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{idx + 1}. {scene.scene}</p>
                      <p style={{ color: 'rgba(226,226,240,.62)', fontSize: 12, marginTop: 4 }}><strong style={{ color: '#a78bfa' }}>Visual:</strong> {scene.visual}</p>
                      <p style={{ color: 'rgba(226,226,240,.62)', fontSize: 12, marginTop: 2 }}><strong style={{ color: '#a78bfa' }}>Overlay:</strong> {scene.text_overlay}</p>
                      <p style={{ color: 'rgba(226,226,240,.62)', fontSize: 12, marginTop: 2 }}><strong style={{ color: '#a78bfa' }}>Voice:</strong> {scene.voiceover}</p>
                    </div>
                  ))}
                </div>
              </div>

              {Array.isArray(result.script.hashtags) && result.script.hashtags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {result.script.hashtags.map((tag) => (
                    <span key={tag} style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,.3)', background: 'rgba(16,185,129,.1)', color: '#34d399', fontSize: 11 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {Array.isArray(result.frames) && result.frames.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(162,140,250,.65)', marginBottom: 8, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>KEYFRAMES</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
                    {result.frames.map((frame) => {
                      const url = String(frame.url || '').startsWith('http') ? frame.url : getImageUrl(frame.url);
                      return (
                        <div key={`${frame.scene}-${frame.index}`} style={{ border: '1px solid rgba(124,58,237,.16)', borderRadius: 10, overflow: 'hidden', background: '#0d0d15' }}>
                          <img src={url} alt={frame.scene} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                          <div style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <p style={{ color: 'rgba(226,226,240,.65)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{frame.scene}</p>
                            <button
                              onClick={() => downloadImage(frame.url)}
                              style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: 'rgba(124,58,237,.18)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
