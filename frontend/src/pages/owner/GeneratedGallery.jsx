import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, Images, Pencil, Save, Wand2, X } from 'lucide-react';
import Layout from '../../components/shared/Layout';
import api from '../../utils/api';
import { buildUploadUrl } from '../../utils/uploads';

const prettyValue = (value = '') => String(value || '').replace(/_/g, ' ').trim();

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' }
];

const LISTING_PLATFORMS = ['amazon', 'flipkart'];

const filterFieldStyle = {
  background: 'rgba(14,14,21,.95)',
  border: '1px solid rgba(124,58,237,.18)',
  borderRadius: 10,
  padding: '6px 8px'
};

const filterLabelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'rgba(162,140,250,.55)',
  marginBottom: 5,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  fontWeight: 600
};

const filterTriggerStyle = {
  width: '100%',
  background: 'rgba(9,9,15,.9)',
  border: '1px solid rgba(124,58,237,.24)',
  borderRadius: 8,
  color: 'rgba(226,226,240,.9)',
  fontSize: 12,
  padding: '9px 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer'
};

const dropdownMenuStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  borderRadius: 10,
  border: '1px solid rgba(124,58,237,.25)',
  background: 'linear-gradient(180deg,rgba(18,18,27,.98),rgba(12,12,18,.98))',
  boxShadow: '0 12px 28px rgba(0,0,0,.45)',
  overflow: 'hidden',
  zIndex: 30,
  maxHeight: 220,
  overflowY: 'auto'
};

const dropdownItemStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: 'rgba(226,226,240,.86)',
  textAlign: 'left',
  fontSize: 12,
  padding: '9px 10px',
  cursor: 'pointer'
};

const listingInputStyle = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid rgba(124,58,237,.2)',
  background: 'rgba(10,10,16,.75)',
  color: '#ddd',
  fontSize: 12,
  padding: '8px 10px'
};

function FilterSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={rootRef} style={{ ...filterFieldStyle, position: 'relative' }}>
      <label style={filterLabelStyle}>{label}</label>
      <button type="button" onClick={() => setOpen((prev) => !prev)} style={filterTriggerStyle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{selected?.label || 'Select'}</span>
        <ChevronDown size={14} color="rgba(162,140,250,.7)" />
      </button>
      {open && (
        <div style={dropdownMenuStyle}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                ...dropdownItemStyle,
                background: option.value === value ? 'rgba(124,58,237,.2)' : 'transparent',
                color: option.value === value ? '#c4b5fd' : 'rgba(226,226,240,.86)'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

const toTextLines = (value) => (Array.isArray(value) ? value.join('\n') : String(value || ''));
const toCommaText = (value) => (Array.isArray(value) ? value.join(', ') : String(value || ''));

export default function OwnerGeneratedGallery() {
  const [items, setItems] = useState([]);
  const [imageState, setImageState] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskPlatform, setTaskPlatform] = useState({});
  const [listingState, setListingState] = useState({});

  const [productFilter, setProductFilter] = useState('all');
  const [angleFilter, setAngleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    api.get('/products/generated').then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  const productOptions = useMemo(() => {
    const seen = new Map();
    items.forEach((item) => {
      const id = String(item.product_id || 'unknown');
      if (!seen.has(id)) seen.set(id, item.product_name || 'Untitled Product');
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const angleOptions = useMemo(() => [...new Set(items.map((item) => String(item.angle || '').trim()).filter(Boolean))].sort(), [items]);
  const typeOptions = useMemo(() => [...new Set(items.map((item) => String(item.image_type || '').trim()).filter(Boolean))].sort(), [items]);

  const productFilterOptions = useMemo(() => [{ value: 'all', label: 'All Products' }, ...productOptions.map((p) => ({ value: p.id, label: p.name }))], [productOptions]);
  const angleFilterOptions = useMemo(() => [{ value: 'all', label: 'All Angles' }, ...angleOptions.map((v) => ({ value: v, label: prettyValue(v) }))], [angleOptions]);
  const typeFilterOptions = useMemo(() => [{ value: 'all', label: 'All Types' }, ...typeOptions.map((v) => ({ value: v, label: prettyValue(v) }))], [typeOptions]);
  const dateFilterOptions = useMemo(() => DATE_FILTERS.map((v) => ({ value: v.id, label: v.label })), []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (productFilter !== 'all' && String(item.product_id || '') !== productFilter) return false;
      if (angleFilter !== 'all' && String(item.angle || '') !== angleFilter) return false;
      if (typeFilter !== 'all' && String(item.image_type || '') !== typeFilter) return false;
      if (!inDateRange(item.created_at, dateFilter)) return false;
      return true;
    });
  }, [items, productFilter, angleFilter, typeFilter, dateFilter]);

  const groupedTasks = useMemo(() => {
    const taskMap = new Map();
    filteredItems.forEach((item) => {
      const groupId = String(item.product_id || `unknown-${item.id}`);
      if (!taskMap.has(groupId)) {
        taskMap.set(groupId, {
          id: groupId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          created_at: item.created_at,
          images: [item]
        });
      } else {
        const task = taskMap.get(groupId);
        task.images.push(item);
        if (new Date(item.created_at).getTime() > new Date(task.created_at).getTime()) {
          task.created_at = item.created_at;
        }
      }
    });

    return Array.from(taskMap.values())
      .map((task) => ({
        ...task,
        images: [...task.images].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filteredItems]);

  const activeTask = useMemo(() => groupedTasks.find((task) => task.id === activeTaskId) || null, [groupedTasks, activeTaskId]);

  useEffect(() => {
    if (activeTaskId && !activeTask) setActiveTaskId(null);
  }, [activeTaskId, activeTask]);

  useEffect(() => {
    if (!activeTaskId) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveTaskId(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeTaskId]);

  const setListingForKey = (key, patch) => {
    setListingState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  };

  const getCurrentPlatform = (task) => taskPlatform[task.id] || 'amazon';
  const getListingKey = (task, platform) => `${task.product_id}:${platform}`;

  const normalizeContent = (content) => {
    if (!content) return null;
    return {
      title: content.title || '',
      description: content.description || '',
      bullet_points: Array.isArray(content.bullet_points) ? content.bullet_points : [],
      keywords: Array.isArray(content.keywords) ? content.keywords : [],
      category_path: content.category_path || ''
    };
  };

  const ensureListingLoaded = async (task, platform) => {
    const key = getListingKey(task, platform);
    const current = listingState[key];
    if (current?.content) return current.content;
    if (current?.loading) return null;
    if (current?.exists === false) return null;

    setListingForKey(key, { loading: true, error: '' });
    try {
      const { data } = await api.get(`/products/${task.product_id}/listing-content`, { params: { platform } });
      if (data?.exists) {
        const normalized = normalizeContent(data.content);
        setListingForKey(key, { loading: false, exists: true, content: normalized });
        return normalized;
      } else {
        setListingForKey(key, { loading: false, exists: false, content: null });
        return null;
      }
    } catch {
      setListingForKey(key, { loading: false, error: 'Failed to fetch listing content' });
      return null;
    }
  };

  const handleGenerateListing = async (task) => {
    const platform = getCurrentPlatform(task);
    const key = getListingKey(task, platform);
    setListingForKey(key, { generating: true, error: '' });
    try {
      const { data } = await api.post(`/products/${task.product_id}/listing-content`, { platform });
      setListingForKey(key, {
        generating: false,
        exists: true,
        editing: false,
        content: normalizeContent(data)
      });
    } catch (err) {
      setListingForKey(key, { generating: false, error: err?.response?.data?.error || 'Listing generation failed' });
    }
  };

  const handleStartEdit = async (task) => {
    const platform = getCurrentPlatform(task);
    const key = getListingKey(task, platform);
    const loadedContent = await ensureListingLoaded(task, platform);
    const content = loadedContent || listingState[key]?.content || { title: '', description: '', bullet_points: [], keywords: [], category_path: '' };
    setListingForKey(key, {
      editing: true,
      draft: {
        title: content.title || '',
        description: content.description || '',
        bullet_points: toTextLines(content.bullet_points),
        keywords: toCommaText(content.keywords),
        category_path: content.category_path || ''
      }
    });
  };

  const handleSaveEdit = async (task) => {
    const platform = getCurrentPlatform(task);
    const key = getListingKey(task, platform);
    const draft = listingState[key]?.draft || {};

    setListingForKey(key, { saving: true, error: '' });
    try {
      await api.put(`/products/${task.product_id}/listing-content`, {
        platform,
        title: draft.title || '',
        description: draft.description || '',
        bullet_points: draft.bullet_points || '',
        keywords: draft.keywords || '',
        category_path: draft.category_path || ''
      });

      setListingForKey(key, {
        saving: false,
        editing: false,
        exists: true,
        content: {
          title: draft.title || '',
          description: draft.description || '',
          bullet_points: String(draft.bullet_points || '').split('\n').map((v) => v.trim()).filter(Boolean),
          keywords: String(draft.keywords || '').split(',').map((v) => v.trim()).filter(Boolean),
          category_path: draft.category_path || ''
        }
      });
    } catch (err) {
      setListingForKey(key, { saving: false, error: err?.response?.data?.error || 'Failed to save listing content' });
    }
  };

  const getImagePath = (item) => {
    if (imageState[item.id] === 'fallback') return item.image_url;
    return item.final_image_url || item.image_url;
  };

  const onImageError = (item) => {
    const state = imageState[item.id];
    const canFallback =
      state !== 'fallback' &&
      state !== 'failed' &&
      item.final_image_url &&
      item.image_url &&
      item.final_image_url !== item.image_url;

    if (canFallback) {
      setImageState((prev) => ({ ...prev, [item.id]: 'fallback' }));
      return;
    }

    setImageState((prev) => ({ ...prev, [item.id]: 'failed' }));
  };

  const openTask = (task) => {
    setActiveTaskId(task.id);
    const platform = taskPlatform[task.id] || 'amazon';
    ensureListingLoaded(task, platform);
  };

  const closeTaskModal = () => {
    setActiveTaskId(null);
  };

  const downloadImage = (storedPath) => {
    const href = buildUploadUrl(storedPath);
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = 'clothvision-output.jpg';
    a.click();
  };

  const resetFilters = () => {
    setProductFilter('all');
    setAngleFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
  };

  const deckOffsets = [
    { x: 0, y: 0, rotate: 0, z: 3, scale: 1 },
    { x: 12, y: 0, rotate: 4, z: 2, scale: 0.97 },
    { x: 24, y: 0, rotate: 7, z: 1, scale: 0.94 }
  ];

  return (
    <Layout
      title="Generated Gallery"
      subtitle={`${groupedTasks.length} product${groupedTasks.length === 1 ? '' : 's'} · ${filteredItems.length} outputs`}
      actions={<Link to="/owner/studio" className="btn-primary"><Wand2 size={14}/>Generate New</Link>}
    >
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(162,140,250,.3)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🖼️</div>
          <p style={{ marginBottom: 8 }}>No generated outputs yet</p>
          <p style={{ fontSize: 12, marginBottom: 16 }}>Create images in AI Studio and they will appear here.</p>
          <Link to="/owner/studio" className="btn-primary" style={{ display: 'inline-flex' }}>Open AI Studio</Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14, padding: 12, border: '1px solid rgba(124,58,237,.2)', background: 'linear-gradient(180deg,rgba(17,17,24,.95),rgba(12,12,18,.95))', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, flex: '1 1 680px' }}>
                <FilterSelect label="Product" value={productFilter} options={productFilterOptions} onChange={setProductFilter} />
                <FilterSelect label="Angle" value={angleFilter} options={angleFilterOptions} onChange={setAngleFilter} />
                <FilterSelect label="Type" value={typeFilter} options={typeFilterOptions} onChange={setTypeFilter} />
                <FilterSelect label="Date" value={dateFilter} options={dateFilterOptions} onChange={setDateFilter} />
              </div>
              <button
                onClick={resetFilters}
                style={{
                  alignSelf: 'stretch',
                  minHeight: 58,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(16,185,129,.35)',
                  background: 'linear-gradient(180deg,rgba(16,185,129,.18),rgba(5,150,105,.12))',
                  color: '#6ee7b7',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {groupedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(162,140,250,.45)', border: '1px dashed rgba(124,58,237,.2)', borderRadius: 14 }}>
              <p style={{ marginBottom: 8 }}>No outputs match these filters</p>
              <button onClick={resetFilters} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,.25)', background: 'rgba(124,58,237,.12)', color: '#a78bfa', fontSize: 12, cursor: 'pointer' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                {groupedTasks.map((task) => {
                  const previewImages = task.images.slice(0, 3);

                  return (
                    <div key={task.id} style={{ background: '#111118', border: '1px solid #1e1e2d', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: 12 }}>
                        <div style={{ marginBottom: 10, position: 'relative', aspectRatio: '4/3', borderRadius: 12, border: '1px solid rgba(124,58,237,.15)', background: 'radial-gradient(circle at 25% 10%, rgba(124,58,237,.2), rgba(11,11,17,.9) 60%)', overflow: 'hidden' }}>
                          {previewImages.length > 0 ? (
                            previewImages.map((item, index) => {
                              const layer = deckOffsets[index] || deckOffsets[deckOffsets.length - 1];
                              const imagePath = getImagePath(item);
                              return (
                                <div
                                  key={`deck-${item.id}`}
                                  style={{
                                    position: 'absolute',
                                    inset: '14px 22px 14px 14px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(124,58,237,.28)',
                                    boxShadow: '0 16px 30px rgba(0,0,0,.45)',
                                    overflow: 'hidden',
                                    background: '#f5f5f6',
                                    transform: `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rotate}deg) scale(${layer.scale})`,
                                    zIndex: layer.z
                                  }}
                                >
                                  {imagePath && imageState[item.id] !== 'failed' ? (
                                    <img
                                      src={buildUploadUrl(imagePath)}
                                      alt={task.product_name || 'Generated output'}
                                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f6' }}
                                      onError={() => onImageError(item)}
                                    />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(162,140,250,.6)' }}>
                                      <Images size={20} />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', color: 'rgba(162,140,250,.5)' }}>
                              <Images size={22} />
                              <span style={{ fontSize: 10, letterSpacing: '.08em' }}>NO PREVIEW</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{task.product_name || 'Untitled Product'}</p>
                            <p style={{ color: 'rgba(162,140,250,.45)', fontSize: 11 }}>Updated {task.created_at ? new Date(task.created_at).toLocaleString() : ''}</p>
                          </div>
                          <button
                            onClick={() => openTask(task)}
                            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(124,58,237,.35)', background: 'rgba(124,58,237,.14)', color: '#c4b5fd', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeTask && (() => {
                const platform = getCurrentPlatform(activeTask);
                const listingKey = getListingKey(activeTask, platform);
                const listing = listingState[listingKey] || {};

                return (
                  <div
                    onClick={closeTaskModal}
                    style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(4,4,8,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 'min(1120px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 16, border: '1px solid rgba(124,58,237,.3)', background: 'linear-gradient(180deg,rgba(14,14,21,.98),rgba(9,9,15,.98))', boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(124,58,237,.18)' }}>
                        <div>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{activeTask.product_name || 'Untitled Product'}</p>
                          <p style={{ color: 'rgba(162,140,250,.52)', fontSize: 12 }}>{activeTask.images.length} output image{activeTask.images.length === 1 ? '' : 's'} · {activeTask.created_at ? new Date(activeTask.created_at).toLocaleString() : ''}</p>
                        </div>
                        <button
                          onClick={closeTaskModal}
                          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(124,58,237,.25)', background: 'rgba(124,58,237,.12)', color: '#c4b5fd', cursor: 'pointer' }}
                          title="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {LISTING_PLATFORMS.map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  setTaskPlatform((prev) => ({ ...prev, [activeTask.id]: p }));
                                  ensureListingLoaded(activeTask, p);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  border: `1px solid ${platform === p ? 'rgba(124,58,237,.6)' : 'rgba(124,58,237,.2)'}`,
                                  background: platform === p ? 'rgba(124,58,237,.2)' : 'transparent',
                                  color: platform === p ? '#c4b5fd' : 'rgba(162,140,250,.5)',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleGenerateListing(activeTask)}
                              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,.4)', background: 'rgba(124,58,237,.16)', color: '#a78bfa', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                            >
                              {listing.generating ? 'Generating...' : (listing.content ? 'Regenerate Content' : 'Generate Content')}
                            </button>

                            <button
                              onClick={() => handleStartEdit(activeTask)}
                              style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(240,180,41,.35)', background: 'rgba(240,180,41,.12)', color: '#f0b429', cursor: 'pointer' }}
                              title="Edit content"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                          <div style={{ border: '1px solid rgba(124,58,237,.15)', borderRadius: 12, background: 'rgba(10,10,16,.58)', padding: 12 }}>
                            <p style={{ marginBottom: 10, color: 'rgba(162,140,250,.55)', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }}>Outputs</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
                              {activeTask.images.map((item) => {
                                const imagePath = getImagePath(item);
                                const imageType = prettyValue(item.image_type) || 'generated';
                                const angle = prettyValue(item.angle);
                                return (
                                  <div key={item.id} style={{ background: 'rgba(124,58,237,.04)', border: '1px solid rgba(124,58,237,.12)', borderRadius: 11, overflow: 'hidden' }}>
                                    <div style={{ position: 'relative', aspectRatio: '1/1', background: 'rgba(124,58,237,.05)', overflow: 'hidden' }}>
                                      {imagePath && imageState[item.id] !== 'failed' ? (
                                        <img
                                          src={buildUploadUrl(imagePath)}
                                          alt={item.product_name || 'Generated output'}
                                          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f6' }}
                                          onError={() => onImageError(item)}
                                        />
                                      ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'rgba(162,140,250,.5)', gap: 6 }}>
                                          <Images size={24} />
                                          <span style={{ fontSize: 10, letterSpacing: '.08em' }}>IMAGE UNAVAILABLE</span>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ padding: '8px 10px' }}>
                                      <p style={{ fontSize: 11, color: 'rgba(162,140,250,.65)', textTransform: 'capitalize' }}>{imageType}{angle ? ` · ${angle}` : ''}</p>
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                        <button
                                          onClick={() => downloadImage(imagePath)}
                                          style={{ padding: '5px 7px', borderRadius: 8, background: 'rgba(16,185,129,.08)', border: 'none', cursor: 'pointer', color: 'rgba(52,211,153,.8)' }}
                                        >
                                          <Download size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ border: '1px solid rgba(124,58,237,.15)', borderRadius: 12, background: 'rgba(10,10,16,.58)', padding: 12 }}>
                            <p style={{ marginBottom: 10, color: 'rgba(162,140,250,.55)', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }}>Listing Content</p>

                            {listing.loading ? (
                              <p style={{ fontSize: 12, color: 'rgba(162,140,250,.5)' }}>Loading listing content...</p>
                            ) : listing.editing ? (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <input
                                  value={listing.draft?.title || ''}
                                  onChange={(e) => setListingForKey(listingKey, { draft: { ...(listing.draft || {}), title: e.target.value } })}
                                  placeholder="Listing title"
                                  style={listingInputStyle}
                                />
                                <textarea
                                  rows={3}
                                  value={listing.draft?.description || ''}
                                  onChange={(e) => setListingForKey(listingKey, { draft: { ...(listing.draft || {}), description: e.target.value } })}
                                  placeholder="Description"
                                  style={{ ...listingInputStyle, resize: 'vertical' }}
                                />
                                <textarea
                                  rows={3}
                                  value={listing.draft?.bullet_points || ''}
                                  onChange={(e) => setListingForKey(listingKey, { draft: { ...(listing.draft || {}), bullet_points: e.target.value } })}
                                  placeholder="Bullet points (one per line)"
                                  style={{ ...listingInputStyle, resize: 'vertical' }}
                                />
                                <input
                                  value={listing.draft?.keywords || ''}
                                  onChange={(e) => setListingForKey(listingKey, { draft: { ...(listing.draft || {}), keywords: e.target.value } })}
                                  placeholder="Keywords (comma separated)"
                                  style={listingInputStyle}
                                />
                                <input
                                  value={listing.draft?.category_path || ''}
                                  onChange={(e) => setListingForKey(listingKey, { draft: { ...(listing.draft || {}), category_path: e.target.value } })}
                                  placeholder="Category path"
                                  style={listingInputStyle}
                                />

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button onClick={() => setListingForKey(listingKey, { editing: false })} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,.2)', background: 'transparent', color: 'rgba(162,140,250,.7)', fontSize: 11, cursor: 'pointer' }}>
                                    Cancel
                                  </button>
                                  <button onClick={() => handleSaveEdit(activeTask)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,.35)', background: 'rgba(16,185,129,.14)', color: '#6ee7b7', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                                    {listing.saving ? 'Saving...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Save size={11} />Save</span>}
                                  </button>
                                </div>
                              </div>
                            ) : listing.content ? (
                              <div>
                                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{listing.content.title || 'Listing Title'}</p>
                                <p style={{ color: 'rgba(226,226,240,.7)', fontSize: 12, lineHeight: 1.45, marginBottom: 8 }}>{listing.content.description || 'No description yet'}</p>
                                {Array.isArray(listing.content.bullet_points) && listing.content.bullet_points.length > 0 && (
                                  <p style={{ color: 'rgba(162,140,250,.55)', fontSize: 11 }}>
                                    {listing.content.bullet_points.slice(0, 4).join(' • ')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p style={{ fontSize: 12, color: 'rgba(162,140,250,.5)' }}>No listing content yet. Generate or edit manually.</p>
                            )}

                            {listing.error && <p style={{ marginTop: 8, color: 'rgba(248,113,113,.8)', fontSize: 11 }}>{listing.error}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}
    </Layout>
  );
}
