import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';
import { buildUploadUrl } from '../../utils/uploads';

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' }
];

const inDateRange = (createdAt, filter) => {
  if (filter === 'all') return true;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;

  const now = Date.now();
  if (filter === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }

  if (filter === '7d') return now - ts <= 7 * 24 * 60 * 60 * 1000;
  if (filter === '30d') return now - ts <= 30 * 24 * 60 * 60 * 1000;
  return true;
};

export default function OwnerProducts() {
  const [products, setProducts] = useState([]);
  const [imageState, setImageState] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const load = () => api.get('/products').then(r=>setProducts(r.data)).catch(()=>{});
  useEffect(()=>{load();},[]);

  const categoryOptions = useMemo(() => {
    return [...new Set(products.map(p => String(p.category || '').trim()).filter(Boolean))].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const hay = `${p.name || ''} ${p.category || ''} ${p.color || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (categoryFilter !== 'all' && String(p.category || '') !== categoryFilter) return false;
      const rawStatus = String(p.status || '').toLowerCase();
      if (statusFilter !== 'all' && rawStatus !== statusFilter) return false;
      if (!inDateRange(p.created_at, dateFilter)) return false;
      return true;
    });
  }, [products, searchFilter, categoryFilter, statusFilter, dateFilter]);

  const onCardImageError = (product) => {
    setImageState(prev => ({ ...prev, [product.id]: 'failed' }));
  };

  const resetFilters = () => {
    setSearchFilter('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const del = async id => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  return (
    <Layout title="My Products" subtitle={`${filteredProducts.length} of ${products.length} products`}
      actions={<Link to="/owner/studio" className="btn-primary"><Plus size={14}/>Add Product</Link>}>
      {products.length===0 ? (
        <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(162,140,250,.3)'}}>
          <div style={{fontSize:64,marginBottom:16}}>📦</div>
          <p style={{marginBottom:8}}>No products yet</p>
          <Link to="/owner/studio" className="btn-primary" style={{display:'inline-flex'}}>Open AI Studio</Link>
        </div>
      ) : (
        <>
          <div style={{marginBottom:14,padding:12,border:'1px solid rgba(124,58,237,.18)',background:'rgba(17,17,24,.92)',borderRadius:12}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:10}}>
              <input
                value={searchFilter}
                onChange={e=>setSearchFilter(e.target.value)}
                placeholder="Search by name/category/color"
                style={{background:'#0f0f17',border:'1px solid rgba(124,58,237,.2)',color:'#ddd',borderRadius:8,padding:'9px 10px',fontSize:12}}
              />

              <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{background:'#0f0f17',border:'1px solid rgba(124,58,237,.2)',color:'#ddd',borderRadius:8,padding:'9px 10px',fontSize:12}}>
                <option value="all">All Categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{background:'#0f0f17',border:'1px solid rgba(124,58,237,.2)',color:'#ddd',borderRadius:8,padding:'9px 10px',fontSize:12,textTransform:'capitalize'}}>
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="generated">Generated</option>
                <option value="failed">Failed</option>
              </select>

              <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{background:'#0f0f17',border:'1px solid rgba(124,58,237,.2)',color:'#ddd',borderRadius:8,padding:'9px 10px',fontSize:12}}>
                {DATE_FILTERS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>

              <button onClick={resetFilters} style={{padding:'0 12px',borderRadius:8,border:'1px solid rgba(16,185,129,.35)',background:'rgba(16,185,129,.14)',color:'#6ee7b7',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reset</button>
            </div>
          </div>

          {filteredProducts.length===0 ? (
            <div style={{textAlign:'center',padding:'50px 20px',color:'rgba(162,140,250,.45)',border:'1px dashed rgba(124,58,237,.2)',borderRadius:14}}>
              <p style={{marginBottom:8}}>No products match these filters</p>
              <button onClick={resetFilters} style={{padding:'8px 12px',borderRadius:8,border:'1px solid rgba(124,58,237,.25)',background:'rgba(124,58,237,.12)',color:'#a78bfa',fontSize:12,cursor:'pointer'}}>
                Clear Filters
              </button>
            </div>
          ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
          {filteredProducts.map(p=>{
            const cardImage = p.original_image;
            const hasGenerated = Number(p.image_count || 0) > 0;
            const rawStatus = String(p.status || 'ready').toLowerCase();
            const status = rawStatus;
            const statusColor = status === 'failed' ? 'rgba(248,113,113,.95)' : status === 'generated' ? 'rgba(52,211,153,.95)' : 'rgba(251,191,36,.95)';
            const statusBg = status === 'failed' ? 'rgba(239,68,68,.18)' : status === 'generated' ? 'rgba(16,185,129,.18)' : 'rgba(245,158,11,.18)';

            return (
            <div key={p.id} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,overflow:'hidden'}}>
              <div style={{position:'relative',aspectRatio:'3/4',background:'rgba(124,58,237,.05)',overflow:'hidden'}}>
                {cardImage && imageState[p.id] !== 'failed' ? (
                  <>
                    <img
                      src={buildUploadUrl(cardImage)}
                      alt={p.name}
                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={() => onCardImageError(p)}
                    />
                  </>
                ) : (
                  <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontSize:28,color:'rgba(162,140,250,.5)',gap:6}}>
                    <Package size={24}/>
                    <span style={{fontSize:10,letterSpacing:'.08em'}}>{status === 'failed' ? 'GENERATION FAILED' : 'INPUT IMAGE MISSING'}</span>
                  </div>
                )}

                <div style={{position:'absolute',top:8,right:8,padding:'3px 7px',borderRadius:999,border:`1px solid ${statusColor}`,background:statusBg,color:statusColor,fontSize:10,fontWeight:700,letterSpacing:'.05em',textTransform:'capitalize'}}>
                  {status}
                </div>
              </div>
              <div style={{padding:'10px 12px'}}>
                <p style={{fontWeight:600,color:'#fff',fontSize:13,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:10}}>{p.category}{p.color?` · ${p.color}`:''}</p>
                <p style={{fontSize:10,color:'rgba(162,140,250,.55)',marginBottom:10}}>{hasGenerated ? `${p.image_count} output image${Number(p.image_count) === 1 ? '' : 's'} in gallery` : status === 'failed' ? 'Last generation failed' : 'No output images yet'}</p>
                <div style={{display:'flex',gap:6}}>
                  <Link to="/owner/studio" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'6px',borderRadius:8,background:'rgba(124,58,237,.1)',color:'#a78bfa',fontSize:11,fontWeight:600,textDecoration:'none'}}>
                    <Wand2 size={11}/>Gen
                  </Link>
                  <Link to="/owner/generated" style={{padding:'6px 8px',borderRadius:8,background:'rgba(16,185,129,.12)',border:'none',cursor:'pointer',color:'rgba(52,211,153,.8)',fontSize:11,fontWeight:700,textDecoration:'none'}}>
                    Out
                  </Link>
                  <button onClick={()=>del(p.id)} style={{padding:'6px 8px',borderRadius:8,background:'rgba(239,68,68,.08)',border:'none',cursor:'pointer',color:'rgba(248,113,113,.6)'}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          );})}
        </div>
          )}
        </>
      )}
    </Layout>
  );
}
