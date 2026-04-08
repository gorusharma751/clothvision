import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package, Wand2, Trash2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import Modal from '../../components/shared/Modal';
import DropZone from '../../components/shared/DropZone';
import api from '../../utils/api';

const CATEGORIES = ['Shirt','T-Shirt','Jeans','Pants','Dress','Jacket','Blazer','Watch','Perfume','Cap','Bag','Shoes','Belt','Saree','Kurta','Other'];

export default function OwnerProducts() {
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', category:'Shirt', color:'', size_range:'', material:'', price:'', brand:'', description:'' });

  const load = () => api.get('/products').then(r => setProducts(r.data));
  useEffect(() => { load(); }, []);

  const handleFile = f => { setFile(f); setPreview(URL.createObjectURL(f)); };

  const handleAdd = async e => {
    e.preventDefault();
    if (!file) return toast.error('Please upload a product image');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      fd.append('product_image', file);
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Product added!');
      setShowAdd(false); setFile(null); setPreview(null); setForm({ name:'', category:'Shirt', color:'', size_range:'', material:'', price:'', brand:'', description:'' });
      load();
    } catch(err) { toast.error(err.response?.data?.error || 'Error adding product'); } finally { setLoading(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Error deleting'); }
  };

  return (
    <Layout title="My Products" subtitle={`${products.length} products`}
      actions={<button onClick={()=>setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/>Add Product</button>}>

      {products.length === 0 ? (
        <div className="text-center py-24">
          <Package size={56} className="mx-auto text-purple-400/20 mb-4"/>
          <p className="text-purple-400/40 mb-2">No products yet</p>
          <p className="text-xs text-purple-400/25 mb-6">Upload your first product to start generating AI photos</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary">Add First Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
              className="rounded-2xl overflow-hidden group" style={{background:'#111118', border:'1px solid #1e1e2d'}}>
              <div className="aspect-square relative overflow-hidden" style={{background:'rgba(124,58,237,0.05)'}}>
                {p.original_image ? (
                  <img src={`/uploads/${p.original_image.split('/uploads/')[1]}?token=${localStorage.getItem('cv_token')}`}
                    alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                ) : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-purple-400/30"/></div>}
                <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'rgba(0,0,0,0.8)', color:'#f0b429'}}>
                  {p.image_count} imgs
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-white text-sm truncate mb-0.5">{p.name}</p>
                <p className="text-xs text-purple-400/50 mb-3">{p.category}{p.color ? ` · ${p.color}` : ''}</p>
                <div className="flex gap-2">
                  <Link to={`/owner/generate/${p.id}`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{background:'rgba(124,58,237,0.15)', color:'#a78bfa'}}>
                    <Wand2 size={12}/> Generate
                  </Link>
                  <button onClick={()=>handleDelete(p.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add New Product" width="max-w-2xl">
        <form onSubmit={handleAdd} className="space-y-4">
          <DropZone onFile={handleFile} preview={preview} label="Upload Product Photo"/>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">PRODUCT NAME *</label>
              <input className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="e.g. Premium Cotton Shirt"/>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">CATEGORY</label>
              <select className="input-field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">COLOR</label>
              <input className="input-field" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} placeholder="e.g. Navy Blue"/>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">MATERIAL</label>
              <input className="input-field" value={form.material} onChange={e=>setForm({...form,material:e.target.value})} placeholder="e.g. 100% Cotton"/>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">SIZE RANGE</label>
              <input className="input-field" value={form.size_range} onChange={e=>setForm({...form,size_range:e.target.value})} placeholder="e.g. XS-3XL"/>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">BRAND</label>
              <input className="input-field" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="Brand name"/>
            </div>
            <div>
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">PRICE (₹)</label>
              <input className="input-field" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="799"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-purple-300 font-display tracking-wider block mb-1">ADDITIONAL DETAILS (helps AI generate better photos)</label>
              <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Regular fit, spread collar, single chest pocket, suitable for formal & casual wear"/>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border text-purple-400 text-sm hover:bg-white/5" style={{borderColor:'rgba(124,58,237,0.2)'}}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">{loading ? 'Adding...' : 'Add Product'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
