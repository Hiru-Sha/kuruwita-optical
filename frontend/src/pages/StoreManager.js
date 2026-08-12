/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const headers = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const fmt   = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK');

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const STATUS_COLORS = {
  new:        { bg:'#dbeafe', color:'#1e40af' },
  confirmed:  { bg:'#dcfce7', color:'#15803d' },
  processing: { bg:'#fef9c3', color:'#854d0e' },
  ready:      { bg:'#e0f2fe', color:'#0369a1' },
  shipped:    { bg:'#f3e8ff', color:'#7e22ce' },
  delivered:  { bg:'#dcfce7', color:'#15803d' },
  cancelled:  { bg:'#fee2e2', color:'#dc2626' },
};

// ── Tab: Products ────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [shown,    setShown]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [page,     setPage]     = useState(0);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');
  const PER = 30;
  const searchTimer = useRef(null);

  useEffect(() => { load(0); }, [filter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(0), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const load = async (pg = page) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: PER, offset: pg * PER });
      if (search.trim()) q.set('search', search.trim());
      if (filter !== 'all') q.set('filter', filter);
      const res  = await fetch(`${BASE()}/store/admin/products?${q}`, { headers: headers() });
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total  || 0);
      setShown(data.shown  || 0);
      setPage(pg);
    } catch(e) {} finally { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      show_on_store:  p.show_on_store  || false,
      store_price:    p.store_price    || '',
      discount_pct:   p.discount_pct   || 0,
      discount_label: p.discount_label || '',
      description:    p.description    || '',
      extra_images:   p.extra_images   || [],
      tags:           (p.tags || []).join(', '),
      sort_order:     p.sort_order     || 0,
    });
  };

  const save = async (id) => {
    setSaving(true);
    try {
      const body = {
        ...form,
        store_price:  form.store_price ? parseFloat(form.store_price) : null,
        discount_pct: parseInt(form.discount_pct) || 0,
        sort_order:   parseInt(form.sort_order)   || 0,
        tags:         form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
      };
      await fetch(`${BASE()}/store/admin/products/${id}`, { method:'PATCH', headers: headers(), body: JSON.stringify(body) });
      // Update locally — no full reload needed
      setProducts(ps => ps.map(p => p.id === id ? { ...p, ...body } : p));
      if (body.show_on_store !== undefined) setShown(s => body.show_on_store ? s + 1 : s - 1);
      showToast('✓ Saved!');
      setEditing(null);
    } catch(e) { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  // Quick toggle — updates state locally, no full reload
  const quickToggle = async (p) => {
    const newVal = !p.show_on_store;
    // Optimistic update
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, show_on_store: newVal } : x));
    setShown(s => newVal ? s + 1 : s - 1);
    try {
      await fetch(`${BASE()}/store/admin/products/${p.id}`, {
        method:'PATCH', headers: headers(),
        body: JSON.stringify({
          show_on_store: newVal, store_price: p.store_price||null,
          discount_pct: p.discount_pct||0, discount_label: p.discount_label||'',
          description: p.description||'', extra_images: p.extra_images||[],
          tags: p.tags||[], sort_order: p.sort_order||0,
        }),
      });
      showToast(newVal ? '✓ Now visible on store' : '✓ Hidden from store');
    } catch(e) {
      // Revert on error
      setProducts(ps => ps.map(x => x.id === p.id ? { ...x, show_on_store: !newVal } : x));
      setShown(s => newVal ? s - 1 : s + 1);
    }
  };

  const addExtraImage = () => {
    const url = prompt('Enter image URL:');
    if (url) setForm(f => ({ ...f, extra_images: [...(f.extra_images||[]), url] }));
  };

  const removeExtraImage = (idx) => {
    setForm(f => ({ ...f, extra_images: f.extra_images.filter((_,i) => i !== idx) }));
  };

  const filtered = products; // filtering done on backend
  const hidden = total - shown;

  const INP = { padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  return (
    <div>
      {toast && <div style={{ position:'fixed', top:80, right:20, background:C.success, color:'white', padding:'10px 20px', borderRadius:10, zIndex:999, fontWeight:700, fontSize:13 }}>{toast}</div>}

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[['Total Items', total, C.navy], ['Shown on Store', shown, C.success], ['Hidden', hidden, C.muted]].map(([l,v,c]) => (
          <div key={l} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', flex:1, minWidth:120 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>{l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:c, fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..." style={{ ...INP, flex:1, minWidth:180 }}/>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['shown','Shown'],['hidden','Hidden']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding:'8px 16px', borderRadius:8, border:`1.5px solid ${filter===v?C.navy:C.border}`, background:filter===v?C.navy:'white', color:filter===v?'white':C.muted, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {loading ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(p => (
            <div key={p.id}>
              {/* Product row */}
              <div style={{ background:'white', border:`1.5px solid ${editing===p.id?C.gold:C.border}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                {/* Image */}
                <div style={{ width:56, height:44, borderRadius:8, overflow:'hidden', background:C.cream, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/> : <span style={{ fontSize:20 }}>🕶️</span>}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize:11, color:C.muted, display:'flex', gap:8, marginTop:2, flexWrap:'wrap' }}>
                    <span>{p.category}</span>
                    {p.brand && <span>· {p.brand}</span>}
                    <span>· Stock: {p.quantity}</span>
                    <span style={{ color:C.gold }}>· {fmt(p.sell_price)}</span>
                    {p.store_price && <span style={{ color:C.success }}>→ Store: {fmt(p.store_price)}</span>}
                    {p.discount_pct > 0 && <span style={{ background:'#fee2e2', color:C.danger, padding:'1px 6px', borderRadius:20, fontWeight:700 }}>{p.discount_pct}% OFF</span>}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  <button onClick={() => quickToggle(p)}
                    style={{ padding:'6px 14px', borderRadius:20, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      background:p.show_on_store?'#dcfce7':'#fee2e2', color:p.show_on_store?C.success:C.danger }}>
                    {p.show_on_store ? '✓ Shown' : '✗ Hidden'}
                  </button>
                  <button onClick={() => editing===p.id ? setEditing(null) : startEdit(p)}
                    style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${C.border}`, background:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
                    {editing===p.id ? 'Close' : '✏️ Edit'}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {editing === p.id && (
                <div style={{ background:C.cream, border:`1.5px solid ${C.gold}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:'20px 20px 20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:16 }}>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Show on Store</label>
                      <div style={{ display:'flex', gap:8 }}>
                        {[true, false].map(v => (
                          <button key={String(v)} onClick={() => setForm(f=>({...f,show_on_store:v}))}
                            style={{ flex:1, padding:'9px', border:`1.5px solid ${form.show_on_store===v?C.navy:C.border}`, borderRadius:8, background:form.show_on_store===v?C.navy:'white', color:form.show_on_store===v?'white':C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            {v ? '✓ Show' : '✗ Hide'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Store Price (Rs.) <span style={{ color:C.muted, fontWeight:400 }}>blank = use inventory price</span></label>
                      <input type="number" value={form.store_price} onChange={e=>setForm(f=>({...f,store_price:e.target.value}))} placeholder={`Inventory: ${fmt(p.sell_price)}`} style={INP}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Discount %</label>
                      <input type="number" min="0" max="90" value={form.discount_pct} onChange={e=>setForm(f=>({...f,discount_pct:e.target.value}))} placeholder="0" style={INP}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Discount Label</label>
                      <input value={form.discount_label} onChange={e=>setForm(f=>({...f,discount_label:e.target.value}))} placeholder="e.g. Sale, Hot Deal" style={INP}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Sort Order (lower = first)</label>
                      <input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))} placeholder="0" style={INP}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Tags (comma separated)</label>
                      <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="blue cut, UV400, polarized" style={INP}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:5 }}>Product Description (shown on store)</label>
                    <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                      placeholder="Describe this product for online customers — material, features, UV protection, suitable for..." rows={3}
                      style={{ ...INP, resize:'vertical', lineHeight:1.6 }}/>
                  </div>
                  {/* Extra images */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>Extra Photos (additional angles)</label>
                      <button onClick={addExtraImage} style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add URL</button>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {/* Main image (from inventory) */}
                      {p.image_url && (
                        <div style={{ position:'relative' }}>
                          <img src={p.image_url} alt="" style={{ width:70, height:70, objectFit:'contain', borderRadius:8, border:`2px solid ${C.gold}`, background:'white' }}/>
                          <div style={{ position:'absolute', top:-6, left:-6, background:C.gold, color:C.navy, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800 }}>1</div>
                        </div>
                      )}
                      {(form.extra_images||[]).map((url, i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={url} alt="" style={{ width:70, height:70, objectFit:'contain', borderRadius:8, border:`1.5px solid ${C.border}`, background:'white' }}
                            onError={e => e.target.style.display='none'}/>
                          <button onClick={()=>removeExtraImage(i)} style={{ position:'absolute', top:-6, right:-6, background:C.danger, color:'white', border:'none', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, cursor:'pointer', padding:0 }}>✕</button>
                        </div>
                      ))}
                      {!(form.extra_images||[]).length && !p.image_url && (
                        <div style={{ fontSize:12, color:C.muted }}>No extra photos yet. Click "+ Add URL" to add more angles.</div>
                      )}
                    </div>
                  </div>

                  {/* Price preview */}
                  {(form.store_price || form.discount_pct > 0) && (
                    <div style={{ background:'white', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                      <div style={{ fontSize:11, color:C.muted }}>Price preview:</div>
                      <div style={{ fontWeight:700, color:C.navy }}>{fmt(form.store_price || p.sell_price)}</div>
                      {form.discount_pct > 0 && <>
                        <div style={{ fontSize:11, color:C.muted }}>After {form.discount_pct}% off:</div>
                        <div style={{ fontWeight:700, color:C.success, fontSize:15 }}>
                          {fmt(Math.round((form.store_price||p.sell_price)*(1-form.discount_pct/100)*100)/100)}
                        </div>
                      </>}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setEditing(null)} style={{ padding:'10px 20px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>Cancel</button>
                    <button onClick={() => save(p.id)} disabled={saving}
                      style={{ flex:1, padding:'10px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
                      {saving ? '⏳ Saving...' : '💾 Save Store Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:40, color:C.muted }}>No products found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {total > PER && !loading && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
          <button onClick={() => load(page - 1)} disabled={page === 0}
            style={{ padding:'8px 20px', background:page===0?C.cream:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:page===0?'not-allowed':'pointer', fontFamily:'inherit', color:page===0?C.muted:C.navy }}>
            ← Prev
          </button>
          <span style={{ fontSize:13, color:C.muted }}>
            {page * PER + 1}–{Math.min((page + 1) * PER, total)} of {total}
          </span>
          <button onClick={() => load(page + 1)} disabled={(page + 1) * PER >= total}
            style={{ padding:'8px 20px', background:(page+1)*PER>=total?C.cream:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:(page+1)*PER>=total?'not-allowed':'pointer', fontFamily:'inherit', color:(page+1)*PER>=total?C.muted:'white' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Orders ──────────────────────────────────────────────
function OrdersTab() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('all');
  const [selected,setSelected]= useState(null);

  useEffect(() => { load(); }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE()}/store/admin/orders?status=${status}&limit=100`, { headers: headers() });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch(e) {} finally { setLoading(false); }
  };

  const updateStatus = async (id, order_status, payment_status) => {
    await fetch(`${BASE()}/store/admin/orders/${id}`, {
      method:'PATCH', headers: headers(),
      body: JSON.stringify({ order_status, payment_status }),
    });
    load();
    if (selected?.id === id) setSelected(s => ({ ...s, order_status: order_status||s.order_status, payment_status: payment_status||s.payment_status }));
  };

  const STATUS_STEPS = ['new','confirmed','processing','ready','shipped','delivered'];

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:16 }}>
      <div>
        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {[['all','All'],['new','New'],['confirmed','Confirmed'],['processing','Processing'],['ready','Ready'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} onClick={() => setStatus(v)}
              style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${status===v?C.navy:C.border}`, background:status===v?C.navy:'white', color:status===v?'white':C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign:'center', padding:32, color:C.muted }}>Loading...</div> :
          orders.length === 0 ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🛒</div>
            <div>No orders yet</div>
          </div> :
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {orders.map(o => {
              const sc = STATUS_COLORS[o.order_status] || { bg:'#f3f4f6', color:'#6b7280' };
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <div key={o.id}
                  onClick={() => setSelected(o)}
                  style={{ background:'white', border:`1.5px solid ${selected?.id===o.id?C.gold:C.border}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
                  onMouseLeave={e => e.currentTarget.style.borderColor = selected?.id===o.id?C.gold:C.border}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{o.order_number}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                        {o.customer_name} · {o.customer_phone}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{o.order_status}</span>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:C.navy }}>{fmt(o.total_amount)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:C.muted, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span>🚚 {o.delivery_type}</span>
                    <span>💳 {o.payment_method}</span>
                    <span style={{ color:o.payment_status==='paid'?C.success:C.danger }}>● {o.payment_status}</span>
                    <span>{new Date(o.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
                    {items.slice(0,3).map(i=>`${i.name} ×${i.qty}`).join(' · ')}
                    {items.length > 3 && ` +${items.length-3} more`}
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>

      {/* Order detail panel */}
      {selected && (
        <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, padding:'20px', position:'sticky', top:80, maxHeight:'80vh', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy }}>{selected.order_number}</div>
            <button onClick={() => setSelected(null)} style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:12, color:C.muted, fontWeight:600 }}>✕</button>
          </div>

          {/* Customer */}
          <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Customer</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{selected.customer_name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{selected.customer_phone}</div>
            {selected.customer_email && <div style={{ fontSize:12, color:C.muted }}>{selected.customer_email}</div>}
            {selected.customer_address && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>📍 {selected.customer_address}</div>}
          </div>

          {/* Items */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8 }}>Items</div>
            {(Array.isArray(selected.items)?selected.items:[]).map((item,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, padding:'6px 0', borderBottom:`1px solid ${C.cream}` }}>
                <span style={{ color:C.navy }}>{item.name} <span style={{ color:C.muted }}>×{item.qty}</span></span>
                <span style={{ fontWeight:700, color:C.navy }}>{fmt((item.final_price||item.price)*item.qty)}</span>
              </div>
            ))}
            {selected.discount_amount > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.success, marginTop:4 }}>
                <span>🎟️ Promo {selected.promo_code}</span><span>− {fmt(selected.discount_amount)}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:C.navy, fontSize:15, marginTop:10, paddingTop:10, borderTop:`1.5px solid ${C.border}` }}>
              <span>Total</span><span>{fmt(selected.total_amount)}</span>
            </div>
          </div>

          {/* Status update */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8 }}>Update Order Status</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {STATUS_STEPS.map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s, null)}
                  style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${selected.order_status===s?C.navy:C.border}`,
                    background:selected.order_status===s?C.navy:'white', color:selected.order_status===s?'white':C.muted,
                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {s}
                </button>
              ))}
              <button onClick={() => updateStatus(selected.id, 'cancelled', null)}
                style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${C.danger}`, background:'white', color:C.danger, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
            </div>
          </div>

          {/* Payment status */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8 }}>Payment Status</div>
            <div style={{ display:'flex', gap:6 }}>
              {['pending','paid','refunded'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, null, s)}
                  style={{ flex:1, padding:'7px', borderRadius:8, border:`1.5px solid ${selected.payment_status===s?C.gold:C.border}`,
                    background:selected.payment_status===s?'#fef9f0':'white', color:selected.payment_status===s?'#92400e':C.muted,
                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <a href={`https://wa.me/94${selected.customer_phone?.replace(/^0/,'').replace(/\s/g,'')}?text=${encodeURIComponent(`Hello ${selected.customer_name}! Your order ${selected.order_number} status: ${selected.order_status}. Thank you for shopping with Kuruwita Opticals!`)}`}
            target="_blank" rel="noreferrer"
            style={{ display:'block', padding:'11px', background:'#25D366', color:'white', borderRadius:10, textDecoration:'none', textAlign:'center', fontWeight:700, fontSize:13 }}>
            💬 WhatsApp Customer
          </a>
        </div>
      )}
    </div>
  );
}

// ── Tab: Reviews ─────────────────────────────────────────────
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE()}/store/admin/reviews`, { headers: headers() });
      setReviews(await res.json());
    } catch(e) {} finally { setLoading(false); }
  };

  const approve = async (id, val) => {
    await fetch(`${BASE()}/store/admin/reviews/${id}`, { method:'PATCH', headers: headers(), body: JSON.stringify({ approved: val }) });
    load();
  };

  const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);

  return (
    <div>
      {loading ? <div style={{ textAlign:'center', padding:32, color:C.muted }}>Loading...</div> :
        reviews.length === 0 ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>No reviews yet</div> :
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 18px', display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                  <span style={{ color:'#f59e0b', fontSize:16 }}>{stars(r.rating)}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{r.customer_name}</span>
                  <span style={{ fontSize:11, color:C.muted }}>{r.product_name}</span>
                </div>
                {r.review_text && <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{r.review_text}</div>}
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => approve(r.id, !r.approved)}
                  style={{ padding:'6px 14px', borderRadius:8, border:'none', background:r.approved?'#dcfce7':'#f3f4f6', color:r.approved?C.success:C.muted, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {r.approved ? '✓ Approved' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ── Tab: Promo Codes ─────────────────────────────────────────
function PromoTab() {
  const [promos,  setPromos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ code:'', description:'', discount_type:'pct', discount_value:'', min_order_amount:'', max_uses:'', expires_at:'' });
  const [adding,  setAdding]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { setPromos(await (await fetch(`${BASE()}/store/admin/promo-codes`, { headers: headers() })).json()); }
    catch(e) {} finally { setLoading(false); }
  };

  const add = async () => {
    if (!form.code || !form.discount_value) return setError('Code and discount required');
    setAdding(true); setError('');
    try {
      const res = await fetch(`${BASE()}/store/admin/promo-codes`, { method:'POST', headers: headers(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ code:'', description:'', discount_type:'pct', discount_value:'', min_order_amount:'', max_uses:'', expires_at:'' });
      load();
    } catch(e) { setError(e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (id, active) => {
    await fetch(`${BASE()}/store/admin/promo-codes/${id}`, { method:'PATCH', headers: headers(), body: JSON.stringify({ active }) });
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    await fetch(`${BASE()}/store/admin/promo-codes/${id}`, { method:'DELETE', headers: headers() });
    load();
  };

  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  return (
    <div>
      {/* Add promo */}
      <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, padding:'20px', marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>🎟️ Create Promo Code</div>
        {error && <div style={{ background:'#fef2f2', color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:12 }}>{error}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Code *</label>
            <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. SAVE20" style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Discount Type</label>
            <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))} style={INP}>
              <option value="pct">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Rs.)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Discount Value *</label>
            <input type="number" value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:e.target.value}))} placeholder={form.discount_type==='pct'?'e.g. 10':'e.g. 500'} style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Min Order (Rs.)</label>
            <input type="number" value={form.min_order_amount} onChange={e=>setForm(f=>({...f,min_order_amount:e.target.value}))} placeholder="0 = no minimum" style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Max Uses</label>
            <input type="number" value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} placeholder="blank = unlimited" style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Expires</label>
            <input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} style={INP}/>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Description</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. 10% off for all customers" style={INP}/>
          </div>
        </div>
        <button onClick={add} disabled={adding}
          style={{ padding:'11px 28px', background:adding?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:adding?'not-allowed':'pointer', fontFamily:'inherit' }}>
          {adding ? '⏳ Creating...' : '+ Create Code'}
        </button>
      </div>

      {/* Promo list */}
      {loading ? <div style={{ textAlign:'center', padding:32, color:C.muted }}>Loading...</div> :
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {promos.map(p => (
            <div key={p.id} style={{ background:'white', border:`1.5px solid ${p.active?C.border:'rgba(200,200,200,.4)'}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, opacity:p.active?1:.6 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy, fontWeight:700 }}>{p.code}</span>
                  <span style={{ background:p.active?'#dcfce7':'#fee2e2', color:p.active?C.success:C.danger, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{p.active?'Active':'Inactive'}</span>
                </div>
                <div style={{ fontSize:12, color:C.muted, display:'flex', gap:12, flexWrap:'wrap' }}>
                  <span>{p.discount_type==='pct'?`${p.discount_value}% off`:`Rs.${p.discount_value} off`}</span>
                  {parseFloat(p.min_order_amount) > 0 && <span>Min order: {fmt(p.min_order_amount)}</span>}
                  {p.max_uses && <span>Uses: {p.used_count}/{p.max_uses}</span>}
                  {!p.max_uses && <span>Used: {p.used_count} times</span>}
                  {p.expires_at && <span>Expires: {new Date(p.expires_at).toLocaleDateString('en-GB')}</span>}
                  {p.description && <span>· {p.description}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => toggle(p.id, !p.active)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${C.border}`, background:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
                  {p.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => del(p.id)} style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid #fca5a5`, background:'#fef2f2', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>🗑️</button>
              </div>
            </div>
          ))}
          {promos.length === 0 && <div style={{ textAlign:'center', padding:40, color:C.muted }}>No promo codes yet</div>}
        </div>
      }
    </div>
  );
}

// ── Main StoreManager ────────────────────────────────────────
export default function StoreManager() {
  const [tab, setTab] = useState('products');

  const TABS = [
    ['products', '🛍️ Products'],
    ['orders',   '📦 Online Orders'],
    ['reviews',  '⭐ Reviews'],
    ['promos',   '🎟️ Promo Codes'],
  ];

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>E-Commerce</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy }}>Online Store Manager</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Manage what appears on your Kuruwita Opticals store</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:`1.5px solid ${C.border}`, paddingBottom:0 }}>
        {TABS.map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding:'10px 18px', border:'none', borderBottom:`3px solid ${tab===v?C.navy:'transparent'}`,
              background:'transparent', fontSize:13, fontWeight:tab===v?700:500, cursor:'pointer',
              fontFamily:'inherit', color:tab===v?C.navy:C.muted, marginBottom:-1.5, transition:'all .2s' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsTab />}
      {tab === 'orders'   && <OrdersTab />}
      {tab === 'reviews'  && <ReviewsTab />}
      {tab === 'promos'   && <PromoTab />}
    </div>
  );
}