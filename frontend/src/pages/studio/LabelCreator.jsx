import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api, { getImageUrl } from '../../utils/api';

function Box({ label, sublabel, accent, preview, onFile, onRemove, required }) {
  const onDrop = useCallback((files) => {
    if (files[0]) onFile(files[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  return (
    <div>
      <p style={{ fontSize: 11, color: `${accent}aa`, marginBottom: 6, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>
        {label}{required ? ' *' : ''}
      </p>
      <div
        {...getRootProps()}
        style={{
          minHeight: 130,
          borderRadius: 14,
          border: `2px dashed ${isDragActive ? accent : preview ? `${accent}88` : `${accent}44`}`,
          background: '#111118',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <input {...getInputProps()} />
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: '100%', maxHeight: 170, objectFit: 'contain', display: 'block' }} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, border: 'none', borderRadius: '50%', background: 'rgba(239,68,68,.92)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div style={{ padding: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              <Plus size={15} color={accent} />
            </div>
            <p style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{label}</p>
            <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 10, marginTop: 2 }}>{sublabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const STYLES = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'modern', label: 'Modern' },
  { id: 'premium', label: 'Premium' },
  { id: 'sale', label: 'Sale Tag' }
];

export default function LabelCreator() {
  const nav = useNavigate();

  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [style, setStyle] = useState('minimal');
  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [tagline, setTagline] = useState('');
  const [details, setDetails] = useState('');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const onGenerate = async () => {
    if (!productFile) return toast.error('Upload product image first');

    setGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('product_image', productFile);
      if (logoFile) formData.append('logo', logoFile);
      formData.append('label_style', style);
      formData.append('brand_name', brandName);
      formData.append('product_name', productName);
      formData.append('tagline', tagline);
      formData.append('details', details);

      const response = await api.post('/studio/label', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      toast.success(`Label generated. Used ${response.data.credits_used} credits.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Label generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const onDownload = () => {
    const raw = result?.image_url;
    if (!raw) return;
    const url = raw.startsWith('http') ? raw : getImageUrl(raw);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <Layout
      title="Label Creator"
      subtitle="Generate print-ready product label and hang-tag designs"
      actions={
        <button
          onClick={() => nav('/owner/studio')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(139,92,246,.35)', background: 'transparent', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
        </button>
      }
    >
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(139,92,246,.65)' }}>INPUT</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            <Box
              label="Product"
              sublabel="Required"
              accent="#8b5cf6"
              preview={productPreview}
              onFile={(file) => {
                setProductFile(file);
                setProductPreview(URL.createObjectURL(file));
              }}
              onRemove={() => {
                setProductFile(null);
                setProductPreview(null);
              }}
              required
            />
            <Box
              label="Logo"
              sublabel="Optional"
              accent="#06b6d4"
              preview={logoPreview}
              onFile={(file) => {
                setLogoFile(file);
                setLogoPreview(URL.createObjectURL(file));
              }}
              onRemove={() => {
                setLogoFile(null);
                setLogoPreview(null);
              }}
            />
          </div>

          <div>
            <p style={{ fontSize: 11, color: 'rgba(139,92,246,.65)', marginBottom: 8, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>STYLE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STYLES.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setStyle(entry.id)}
                  style={{
                    border: `1px solid ${style === entry.id ? 'rgba(139,92,246,.6)' : 'rgba(124,58,237,.2)'}`,
                    background: style === entry.id ? 'rgba(139,92,246,.12)' : 'transparent',
                    color: style === entry.id ? '#c4b5fd' : 'rgba(226,226,240,.5)',
                    borderRadius: 999,
                    padding: '5px 11px',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <input className="cv-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name" />
          <input className="cv-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" />
          <input className="cv-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline (e.g. Premium Quality)" />
          <textarea className="cv-input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Additional text (material, variant, offer, etc.)" style={{ resize: 'none', minHeight: 74 }} />

          <button className="btn-primary" onClick={onGenerate} disabled={generating || !productFile} style={{ width: '100%', justifyContent: 'center' }}>
            {generating ? 'Generating...' : <><Wand2 size={14} />Generate Label (2 credits)</>}
          </button>
        </div>

        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(139,92,246,.65)', marginBottom: 10 }}>OUTPUT</p>

          {!result?.image_url && (
            <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 13 }}>Generate to preview your label design.</p>
          )}

          {result?.image_url && (
            <div>
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(139,92,246,.2)', marginBottom: 12 }}>
                <img
                  src={String(result.image_url).startsWith('http') ? result.image_url : getImageUrl(result.image_url)}
                  alt="Generated label"
                  style={{ width: '100%', maxHeight: 520, objectFit: 'contain', display: 'block', background: '#0d0d15' }}
                />
              </div>
              <button className="btn-primary" onClick={onDownload} style={{ justifyContent: 'center' }}>
                <Download size={14} />Download Label
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
