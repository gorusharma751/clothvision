import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';
import { buildUploadUrl } from '../../utils/uploads';

export default function OwnerProducts() {
  const [products, setProducts] = useState([]);
  const load = () => api.get('/products').then(r=>setProducts(r.data)).catch(()=>{});
  useEffect(()=>{load();},[]);
  const del = async id => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };
  return (
    <Layout title="My Products" subtitle={`${products.length} products`}
      actions={<Link to="/owner/studio" className="btn-primary"><Plus size={14}/>Add Product</Link>}>
      {products.length===0 ? (
        <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(162,140,250,.3)'}}>
          <div style={{fontSize:64,marginBottom:16}}>📦</div>
          <p style={{marginBottom:8}}>No products yet</p>
          <Link to="/owner/studio" className="btn-primary" style={{display:'inline-flex'}}>Open AI Studio</Link>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
          {products.map(p=>(
            <div key={p.id} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,overflow:'hidden'}}>
              <div style={{aspectRatio:'3/4',background:'rgba(124,58,237,.05)',overflow:'hidden'}}>
                {p.original_image ? <img src={buildUploadUrl(p.original_image)} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>📦</div>}
              </div>
              <div style={{padding:'10px 12px'}}>
                <p style={{fontWeight:600,color:'#fff',fontSize:13,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:10}}>{p.category}{p.color?` · ${p.color}`:''}</p>
                <div style={{display:'flex',gap:6}}>
                  <Link to="/owner/studio" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'6px',borderRadius:8,background:'rgba(124,58,237,.1)',color:'#a78bfa',fontSize:11,fontWeight:600,textDecoration:'none'}}>
                    <Wand2 size={11}/>Gen
                  </Link>
                  <button onClick={()=>del(p.id)} style={{padding:'6px 8px',borderRadius:8,background:'rgba(239,68,68,.08)',border:'none',cursor:'pointer',color:'rgba(248,113,113,.6)'}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
