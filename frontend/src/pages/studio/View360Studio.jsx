import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Wand2, Download, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api, { getImageUrl } from '../../utils/api';
import { getJobErrorMessage, getJobProgressImages, resolveJobResponse } from '../../utils/jobs';

const ANGLE_ORDER = ['front', 'left_side', 'back', 'right_side'];
const ANGLE_LABEL = {
  front: 'Front',
  left_side: 'Left',
  back: 'Back',
  right_side: 'Right'
};

function UploadPanel({ preview, onFile, onRemove }) {
  const onDrop = useCallback((files) => {
    if (files[0]) onFile(files[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      style={{
        minHeight: 190,
        borderRadius: 14,
        border: `2px dashed ${isDragActive ? '#06b6d4' : preview ? 'rgba(6,182,212,.6)' : 'rgba(6,182,212,.35)'}`,
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
          <img src={preview} alt="product" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
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
        <div style={{ padding: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Plus size={18} color="#06b6d4" />
          </div>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Upload product image</p>
          <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 11, marginTop: 3 }}>We generate Front, Left, Back, Right views</p>
        </div>
      )}
    </div>
  );
}

export default function View360Studio() {
  const nav = useNavigate();

  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState('idle');
  const generating = isGenerating;
  const setGenerating = setIsGenerating;
  const [result, setResult] = useState(null);
  const [pendingCards, setPendingCards] = useState([]);
  const pollAbortRef = useRef(null);
  const generationRunRef = useRef(0);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const sortedImages = useMemo(() => {
    const images = Array.isArray(result?.images) ? result.images : [];
    return [...images].sort((a, b) => ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle));
  }, [result]);

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

  const onGenerate = async () => {
    if (isGenerating) return;
    if (!productFile) return toast.error('Upload product image first');

    const runId = createPendingCards(ANGLE_ORDER.length);
    const signal = startPollingSignal();

    setGenerating(true);
    setJobStatus('pending');

    try {
      const formData = new FormData();
      formData.append('product_image', productFile);
      formData.append('product_name', productName || 'Product');
      formData.append('product_category', productCategory || 'General');
      formData.append('product_description', productDescription || '');

      const response = await api.post('/studio/view360', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const settled = await resolveJobResponse(response.data, {
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
        toast.error(getJobErrorMessage(settled, '360 view generation failed'));
        return;
      }

      const payload = settled.result || {};
      const images = Array.isArray(payload.images) ? payload.images : [];
      if (!images.length) {
        setJobStatus('failed');
        markPendingFailed(runId);
        toast.error('Generation finished but no 360 images were returned. Please retry.');
        return;
      }

      mergeProgressCards(runId, images);
      setPendingCards([]);
      setResult(payload);
      setJobStatus('completed');
      toast.success(`360 view generated.${payload.credits_used ? ` Used ${payload.credits_used} credits.` : ''}`);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setJobStatus('failed');
      markPendingFailed(runId);
      toast.error(err.response?.data?.error || '360 view generation failed');
    } finally {
      if (pollAbortRef.current?.signal === signal) pollAbortRef.current = null;
      setGenerating(false);
    }
  };

  const onDownload = (rawUrl, suffix) => {
    const url = String(rawUrl || '').startsWith('http') ? rawUrl : getImageUrl(rawUrl);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `view360_${suffix}_${Date.now()}.jpg`;
    a.click();
  };

  const onDownloadAll = () => {
    sortedImages.forEach((img, idx) => {
      setTimeout(() => onDownload(img.image_url || img.url, img.angle || idx + 1), idx * 180);
    });
  };

  return (
    <Layout
      title="360 View Studio"
      subtitle="Generate consistent 4-angle e-commerce shots"
      actions={
        <button
          onClick={() => nav('/owner/studio')}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(6,182,212,.35)', background: 'transparent', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
        </button>
      }
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(6,182,212,.7)' }}>INPUT</p>

          <UploadPanel
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

          <input className="cv-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" />
          <input className="cv-input" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="Product category" />
          <textarea className="cv-input" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Optional description for better context" style={{ resize: 'none', minHeight: 74 }} />

          <button className="btn-primary" onClick={onGenerate} disabled={generating || !productFile} style={{ width: '100%', justifyContent: 'center' }}>
            {generating
              ? (jobStatus === 'pending' ? 'Queued for generation...' : 'Generating...')
              : <><Wand2 size={14} />Generate 360 Views</>}
          </button>
        </div>

        <div style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '.1em', fontSize: 11, color: 'rgba(6,182,212,.7)' }}>OUTPUT</p>
            {sortedImages.length > 0 && (
              <button
                onClick={onDownloadAll}
                style={{ border: '1px solid rgba(6,182,212,.35)', background: 'rgba(6,182,212,.12)', color: '#22d3ee', borderRadius: 9, fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              >
                <Download size={11} />Download all
              </button>
            )}
          </div>

          {pendingCards.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: 'rgba(34,211,238,.85)', fontSize: 12, marginBottom: 8 }}>
                {jobStatus === 'pending' ? 'Generation queued, preparing views...' : 'Generating updated 360 views...'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                {pendingCards.map((card) => (
                  <div key={card.id} style={{ border: '1px solid rgba(6,182,212,.2)', borderRadius: 11, overflow: 'hidden', background: '#0d0d15' }}>
                    {card.status === 'completed' && card.image ? (
                      <img
                        src={String(card.image.image_url || card.image.url || '').startsWith('http') ? (card.image.image_url || card.image.url) : getImageUrl(card.image.image_url || card.image.url)}
                        alt={card.image.angle || 'generated'}
                        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                      />
                    ) : card.status === 'failed' ? (
                      <div style={{ aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 10, textAlign: 'center' }}>
                        <p style={{ color: '#fca5a5', fontSize: 12 }}>View failed</p>
                        <button onClick={onGenerate} className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 11 }}>Retry</button>
                      </div>
                    ) : (
                      <div style={{ aspectRatio: '1 / 1', padding: 10 }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: 8, background: 'linear-gradient(110deg, rgba(6,182,212,0.14) 30%, rgba(34,211,238,0.28) 45%, rgba(6,182,212,0.14) 60%)', backgroundSize: '220% 100%', animation: 'cvShimmer360 1.2s ease-in-out infinite' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedImages.length === 0 && pendingCards.length === 0 && (
            <p style={{ color: 'rgba(226,226,240,.45)', fontSize: 13 }}>
              {generating
                ? (jobStatus === 'pending' ? 'Generation queued. Your 360 output will appear here shortly.' : 'Generating 360 output...')
                : 'Generate to preview 360 output set.'}
            </p>
          )}

          {sortedImages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {sortedImages.map((img) => {
                const raw = img.image_url || img.url;
                const url = String(raw || '').startsWith('http') ? raw : getImageUrl(raw);
                return (
                  <div key={`${img.id || img.angle}-${raw}`} style={{ border: '1px solid rgba(6,182,212,.2)', borderRadius: 11, overflow: 'hidden', background: '#0d0d15' }}>
                    <img src={url} alt={img.angle} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#22d3ee', fontSize: 11, fontWeight: 600 }}>{ANGLE_LABEL[img.angle] || img.angle}</span>
                      <button
                        onClick={() => onDownload(raw, img.angle || 'view')}
                        style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: 'rgba(6,182,212,.15)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {Array.isArray(result?.generation_errors) && result.generation_errors.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid rgba(245,158,11,.3)', background: 'rgba(245,158,11,.08)', borderRadius: 10, padding: 10 }}>
              <p style={{ color: '#fbbf24', fontSize: 11, marginBottom: 4, fontFamily: 'Syne,sans-serif', letterSpacing: '.08em' }}>WARNINGS</p>
              {result.generation_errors.map((line) => (
                <p key={line} style={{ color: 'rgba(226,226,240,.64)', fontSize: 12 }}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes cvShimmer360{0%{background-position:200% 0}100%{background-position:-40% 0}}`}</style>
    </Layout>
  );
}
