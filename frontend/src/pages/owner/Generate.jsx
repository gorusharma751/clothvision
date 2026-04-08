import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Download, Zap, ChevronLeft, User, ImageIcon, FileText, RotateCcw, ArrowUpCircle, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import DropZone from '../../components/shared/DropZone';
import api from '../../utils/api';

const ANGLES = [
  { id: 'front', label: 'Front', desc: 'Facing forward' },
  { id: 'back', label: 'Back', desc: 'Back view' },
  { id: 'left_side', label: 'Left Side', desc: '90° left' },
  { id: 'right_side', label: 'Right Side', desc: '90° right' },
  { id: '3_4_front', label: '3/4 Front', desc: '45° front-left' },
];

const FLIPKART_ANGLES = ['front','back','left_side','right_side'];
const AMAZON_ANGLES = ['front','back','left_side','3_4_front'];

export default function OwnerGenerate() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [tab, setTab] = useState('model'); // model | nobg | listing
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [selectedAngles, setSelectedAngles] = useState(['front','back','left_side','right_side']);
  const [platform, setPlatform] = useState('flipkart');
  const [bgStyle, setBgStyle] = useState('studio');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [listing, setListing] = useState(null);
  const [listingPlatform, setListingPlatform] = useState('amazon');
  const [copied, setCopied] = useState('');
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    api.get('/products').then(r => { const p = r.data.find(x => x.id === id); if(p) setProduct(p); else nav('/owner/products'); });
    api.get(`/products/${id}/images`).then(r => setImages(r.data));
  }, [id]);

  const analyze = async () => {
    try {
      const r = await api.post(`/products/${id}/analyze`);
      setAnalysis(r.data);
      if (r.data.flipkart_angles) setSelectedAngles(r.data.flipkart_angles);
      toast.success('Product analyzed! Angles auto-selected.');
    } catch { toast.error('Analysis failed'); }
  };

  const toggleAngle = a => setSelectedAngles(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]);

  const generateWithModel = async () => {
    if (!modelFile) return toast.error('Please upload model photo');
    if (!selectedAngles.length) return toast.error('Select at least one angle');
    setGenerating(true); setProgress({ current:0, total:selectedAngles.length });
    try {
      const fd = new FormData();
      fd.append('model_image', modelFile);
      fd.append('angles', JSON.stringify(selectedAngles));
      fd.append('platform', platform);
      const r = await api.post(`/products/${id}/generate`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      toast.success(`Generated ${r.data.images.length} images! Used ${r.data.credits_used} credits.`);
      api.get(`/products/${id}/images`).then(r2 => setImages(r2.data));
    } catch(err) {
      const msg = err.response?.data?.error;
      if (msg === 'Insufficient credits') toast.error('Not enough credits! Please request more.');
      else toast.error(msg || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const generateBG = async () => {
    setGenerating(true);
    try {
      const r = await api.post(`/products/${id}/generate-bg`, { bg_style: bgStyle });
      toast.success('Product image generated!');
      api.get(`/products/${id}/images`).then(r2 => setImages(r2.data));
    } catch(err) {
      if (err.response?.data?.error === 'Insufficient credits') toast.error('Not enough credits!');
      else toast.error('Generation failed');
    } finally { setGenerating(false); }
  };

  const generateListing = async () => {
    setGenerating(true);
    try {
      const r = await api.post(`/products/${id}/listing-content`, { platform: listingPlatform });
      setListing(r.data);
      toast.success('Listing content generated!');
    } catch { toast.error('Failed to generate listing'); } finally { setGenerating(false); }
  };

  const upscale = async (imgId) => {
    try {
      await api.post(`/products/images/${imgId}/upscale`);
      toast.success('Image upscaled!');
      api.get(`/products/${id}/images`).then(r => setImages(r.data));
    } catch(err) {
      if (err.response?.data?.error === 'Insufficient credits') toast.error('Not enough credits!');
      else toast.error('Upscale failed');
    }
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(''), 2000); toast.success('Copied!'); };

  const downloadImg = (url) => {
    const a = document.createElement('a'); a.href = url + `?token=${localStorage.getItem('cv_token')}`; a.download = 'clothvision_image.jpg'; a.click();
  };

  if (!product) return <Layout title="Loading..."><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/></div></Layout>;

  const imgUrl = (path) => path ? `/uploads/${path.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}` : null;

  return (
    <Layout title={product.name} subtitle={`${product.category}${product.color ? ` · ${product.color}` : ''}`}
      actions={<button onClick={()=>nav('/owner/products')} className="flex items-center gap-1 text-sm text-purple-400 hover:text-white transition-colors"><ChevronLeft size={16}/>Back</button>}>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Product + Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product card */}
          <div className="rounded-2xl overflow-hidden" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
            <div className="aspect-video relative overflow-hidden" style={{background:'rgba(124,58,237,0.05)'}}>
              {product.original_image ? (
                <img src={imgUrl(product.original_image)} alt={product.name} className="w-full h-full object-contain"/>
              ) : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={40} className="text-purple-400/30"/></div>}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['Category', product.category], ['Color', product.color], ['Material', product.material], ['Price', product.price ? `₹${product.price}` : null]].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} className="p-2 rounded-lg" style={{background:'rgba(124,58,237,0.05)'}}>
                    <p className="text-purple-400/50 mb-0.5">{k}</p>
                    <p className="text-white font-semibold">{v}</p>
                  </div>
                ))}
              </div>
              {analysis && (
                <div className="mt-3 p-2 rounded-lg text-xs" style={{background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.1)'}}>
                  <p className="text-green-400 font-semibold mb-1">AI Analysis</p>
                  <p className="text-green-300/60">{analysis.styling_notes}</p>
                </div>
              )}
              <button onClick={analyze} className="mt-3 w-full py-1.5 rounded-xl text-xs text-purple-400 transition-colors hover:bg-purple-500/10" style={{border:'1px solid rgba(124,58,237,0.2)'}}>
                <Zap size={12} className="inline mr-1"/>Auto-analyze product
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="rounded-2xl overflow-hidden" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
            <div className="flex border-b" style={{borderColor:'#1e1e2d'}}>
              {[['model','With Model',User], ['nobg','No Model',ImageIcon], ['listing','Listing',FileText]].map(([t,l,Icon])=>(
                <button key={t} onClick={()=>setTab(t)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-display font-semibold transition-all ${tab===t ? 'text-purple-400 border-b-2 border-purple-500' : 'text-purple-400/40'}`}>
                  <Icon size={13}/>{l}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'model' && (
                <div className="space-y-4">
                  <DropZone onFile={f=>{setModelFile(f);setModelPreview(URL.createObjectURL(f))}} preview={modelPreview} label="Upload Model Photo"/>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-purple-300 font-display tracking-wider">SELECT ANGLES</p>
                      <div className="flex gap-1.5">
                        <button onClick={()=>setSelectedAngles(FLIPKART_ANGLES)} className="text-xs px-2 py-0.5 rounded-md" style={{background:'rgba(124,58,237,0.1)',color:'#a78bfa'}}>Flipkart</button>
                        <button onClick={()=>setSelectedAngles(AMAZON_ANGLES)} className="text-xs px-2 py-0.5 rounded-md" style={{background:'rgba(240,180,41,0.1)',color:'#f0b429'}}>Amazon</button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {ANGLES.map(a => (
                        <button key={a.id} onClick={()=>toggleAngle(a.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm transition-all ${selectedAngles.includes(a.id) ? 'text-purple-300' : 'text-purple-400/40 hover:text-purple-400/70'}`}
                          style={{background: selectedAngles.includes(a.id) ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)', border:`1px solid ${selectedAngles.includes(a.id) ? 'rgba(124,58,237,0.3)' : 'transparent'}`}}>
                          <span className="font-semibold">{a.label}</span>
                          <span className="text-xs opacity-60">{a.desc}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-purple-400/40 mt-2 text-center">{selectedAngles.length} angle{selectedAngles.length!==1?'s':''} selected · ~{selectedAngles.length} credit{selectedAngles.length!==1?'s':''}</p>
                  </div>
                  <button onClick={generateWithModel} disabled={generating || !modelFile} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                    {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating...</> : <><Wand2 size={16}/>Generate Try-On Photos</>}
                  </button>
                </div>
              )}

              {tab === 'nobg' && (
                <div className="space-y-4">
                  <p className="text-xs text-purple-300/60">Generate product photos with professional backgrounds — no model needed.</p>
                  <div>
                    <p className="text-xs text-purple-300 font-display tracking-wider mb-2">BACKGROUND STYLE</p>
                    {[['studio','Studio White','Clean white background'],['lifestyle','Lifestyle','Modern lifestyle context'],['gradient','Gradient','Elegant gradient bg'],['flat_lay','Flat Lay','Top-down flat lay']].map(([v,l,d])=>(
                      <button key={v} onClick={()=>setBgStyle(v)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm mb-1.5 transition-all ${bgStyle===v ? 'text-purple-300' : 'text-purple-400/40 hover:text-purple-400/70'}`}
                        style={{background: bgStyle===v ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)', border:`1px solid ${bgStyle===v ? 'rgba(124,58,237,0.3)' : 'transparent'}`}}>
                        <span className="font-semibold">{l}</span>
                        <span className="text-xs opacity-60">{d}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={generateBG} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                    {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating...</> : <><ImageIcon size={16}/>Generate Product Photo</>}
                  </button>
                </div>
              )}

              {tab === 'listing' && (
                <div className="space-y-4">
                  <p className="text-xs text-purple-300/60">Auto-generate Amazon/Flipkart listing content from your product details.</p>
                  <div className="flex gap-2">
                    {['amazon','flipkart'].map(p=>(
                      <button key={p} onClick={()=>setListingPlatform(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${listingPlatform===p ? 'bg-purple-600/30 text-purple-300 border-purple-500/40' : 'text-purple-400/40 border-purple-500/10'}`}
                        style={{border:'1px solid'}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={generateListing} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                    {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating...</> : <><FileText size={16}/>Generate Listing</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="lg:col-span-3 space-y-4">
          {/* Listing content */}
          {tab === 'listing' && listing && (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
              <h3 className="font-display font-semibold text-white mb-4 capitalize">{listingPlatform} Listing Content</h3>
              {[
                ['title', 'Product Title', listing.title],
                ['description', 'Description', listing.description],
                ['bullet_points', 'Key Features', listing.bullet_points?.join('\n• ')],
                ['keywords', 'Keywords', listing.keywords?.join(', ')],
                ['category_path', 'Category Path', listing.category_path],
              ].map(([key, label, val]) => val && (
                <div key={key} className="mb-4 p-3 rounded-xl" style={{background:'rgba(124,58,237,0.04)', border:'1px solid rgba(124,58,237,0.08)'}}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-purple-400/60 font-display tracking-wider">{label.toUpperCase()}</p>
                    <button onClick={()=>copy(val, key)} className="text-purple-400 hover:text-purple-300">
                      {copied===key ? <Check size={13} className="text-green-400"/> : <Copy size={13}/>}
                    </button>
                  </div>
                  <p className="text-sm text-purple-100/80 whitespace-pre-wrap leading-relaxed">{typeof val==='string' ? val : JSON.stringify(val)}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Generated images */}
          <div className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">Generated Images ({images.length})</h3>
              {images.length > 0 && <button onClick={()=>api.get(`/products/${id}/images`).then(r=>setImages(r.data))} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><RotateCcw size={12}/>Refresh</button>}
            </div>
            {generating && (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"/>
                  <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
                  <Wand2 size={20} className="absolute inset-0 m-auto text-purple-400"/>
                </div>
                <p className="text-sm text-purple-300 font-semibold">AI is generating your images</p>
                <p className="text-xs text-purple-400/50 mt-1">Face & product preserved accurately</p>
              </div>
            )}
            {!generating && images.length === 0 && (
              <div className="text-center py-12 text-purple-400/40 text-sm">No images yet. Generate your first AI photo above!</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div key={img.id} initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} transition={{delay:i*0.06}}
                    className="rounded-xl overflow-hidden group relative" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={imgUrl(img.upscaled_url || img.image_url)} alt={`${img.angle} view`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e=>{e.target.style.display='none'}}/>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2" style={{background:'linear-gradient(transparent, rgba(0,0,0,0.8))'}}>
                      <div className="flex justify-end gap-1">
                        {!img.is_upscaled && <button onClick={()=>upscale(img.id)} className="p-1.5 rounded-lg text-xs backdrop-blur-sm text-white" style={{background:'rgba(124,58,237,0.8)'}} title="Upscale"><ArrowUpCircle size={13}/></button>}
                        <button onClick={()=>downloadImg(img.upscaled_url || img.image_url)} className="p-1.5 rounded-lg text-xs backdrop-blur-sm text-white" style={{background:'rgba(0,0,0,0.6)'}} title="Download"><Download size={13}/></button>
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold capitalize">{img.angle?.replace('_',' ')}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {img.is_upscaled && <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'rgba(34,197,94,0.2)',color:'#4ade80'}}>HD</span>}
                          <span className="text-xs text-white/50">{img.image_type}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
