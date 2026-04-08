import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserSquare, Wand2, Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import DropZone from '../../components/shared/DropZone';
import api from '../../utils/api';

export default function CustomerTryOn() {
  const [customerFile, setCustomerFile] = useState(null);
  const [productFile, setProductFile] = useState(null);
  const [customerPreview, setCustomerPreview] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [results, setResults] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ product_name:'', product_category:'', product_color:'' });

  const handleCustomer = f => { setCustomerFile(f); setCustomerPreview(URL.createObjectURL(f)); };
  const handleProduct = f => { setProductFile(f); setProductPreview(URL.createObjectURL(f)); };

  const generate = async () => {
    if (!customerFile || !productFile) return toast.error('Upload both photos');
    setGenerating(true); setResults([]);
    try {
      const fd = new FormData();
      fd.append('customer_photo', customerFile);
      fd.append('product_photo', productFile);
      Object.entries(form).forEach(([k,v]) => v && fd.append(k, v));
      const r = await api.post('/products/customer-tryon', fd, { headers: {'Content-Type':'multipart/form-data'} });
      setResults(r.data.images);
      toast.success(`Generated ${r.data.images.length} try-on images! Used ${r.data.record.credits_used} credits.`);
    } catch(err) {
      if (err.response?.data?.error === 'Insufficient credits') toast.error('Not enough credits!');
      else toast.error(err.response?.data?.error || 'Try-on generation failed');
    } finally { setGenerating(false); }
  };

  const token = localStorage.getItem('cv_token');
  const imgUrl = path => path ? `/uploads/${path.split('/uploads/')[1]}?token=${token}` : null;
  const download = url => { const a = document.createElement('a'); a.href = url; a.download = 'tryon.jpg'; a.click(); };

  return (
    <Layout title="Customer Try-On" subtitle="Show customers how they look in your products">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><UserSquare size={18} className="text-purple-400"/>Upload Photos</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-purple-300 font-display tracking-wider mb-2">CUSTOMER PHOTO</p>
                <DropZone onFile={handleCustomer} preview={customerPreview} label="Customer photo"/>
              </div>
              <div>
                <p className="text-xs text-purple-300 font-display tracking-wider mb-2">PRODUCT PHOTO</p>
                <DropZone onFile={handleProduct} preview={productPreview} label="Product photo"/>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">PRODUCT NAME (optional)</label>
                <input className="input-field" value={form.product_name} onChange={e=>setForm({...form,product_name:e.target.value})} placeholder="e.g. Blue Denim Jacket"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">CATEGORY</label>
                  <input className="input-field" value={form.product_category} onChange={e=>setForm({...form,product_category:e.target.value})} placeholder="e.g. Jacket"/>
                </div>
                <div>
                  <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">COLOR</label>
                  <input className="input-field" value={form.product_color} onChange={e=>setForm({...form,product_color:e.target.value})} placeholder="e.g. Blue"/>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.15)'}}>
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-purple-400 mt-0.5 flex-shrink-0"/>
              <div className="text-xs text-purple-300/70 space-y-1">
                <p className="font-semibold text-purple-300">How it works</p>
                <p>• Upload customer's photo & product photo</p>
                <p>• AI generates realistic try-on images</p>
                <p>• Customer's face preserved accurately</p>
                <p>• Product color & design stays exact</p>
                <p>• 2 angles generated (front + 3/4 view)</p>
              </div>
            </div>
          </div>

          <motion.button onClick={generate} disabled={generating || !customerFile || !productFile}
            whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-base">
            {generating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating Try-On...</> : <><Wand2 size={18}/>Generate Try-On Images</>}
          </motion.button>
        </div>

        {/* Results */}
        <div className="rounded-2xl p-5" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
          <h3 className="font-display font-semibold text-white mb-4">Try-On Results</h3>
          {generating && (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"/>
                <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
                <div className="absolute inset-0 border-4 border-gold-400/20 rounded-full scale-75"/>
                <div className="absolute inset-0 border-4 border-gold-400/40 border-b-transparent rounded-full animate-spin scale-75" style={{animationDirection:'reverse'}}/>
                <Wand2 size={24} className="absolute inset-0 m-auto text-purple-400"/>
              </div>
              <p className="text-purple-300 font-semibold mb-2">AI is creating your try-on</p>
              <p className="text-xs text-purple-400/50">Preserving face & product details...</p>
            </div>
          )}
          {!generating && results.length === 0 && (
            <div className="text-center py-16 text-purple-400/40">
              <UserSquare size={48} className="mx-auto mb-3 opacity-20"/>
              <p className="text-sm">Results will appear here</p>
            </div>
          )}
          <AnimatePresence>
            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {results.map((r, i) => (
                  <motion.div key={i} initial={{opacity:0, scale:0.85}} animate={{opacity:1, scale:1}} transition={{delay:i*0.1}}
                    className="rounded-xl overflow-hidden group relative" style={{background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)'}}>
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={imgUrl(r.url)} alt={r.angle} className="w-full h-full object-cover"/>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2" style={{background:'linear-gradient(transparent, rgba(0,0,0,0.8))'}}>
                      <p className="text-white text-xs font-semibold capitalize">{r.angle?.replace('_',' ')}</p>
                      <button onClick={()=>download(imgUrl(r.url))} className="p-1.5 rounded-lg" style={{background:'rgba(124,58,237,0.8)'}}><Download size={13} className="text-white"/></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
