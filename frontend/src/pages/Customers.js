// ============================================================
//  Customers Page
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getCustomers, addCommLog, updateCustomer } from '../api';

export default function Customers() {
  const [customers, setCusts]   = useState([]);
  const [search,    setSearch]  = useState('');
  const [filter,    setFilter]  = useState('all');
  const [selected,  setSelected]= useState(null);
  const [tab,       setTab]     = useState('orders');
  const [commNote,  setCommNote]= useState('');
  const [commType,  setCommType]= useState('call');
  const [loading,   setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getCustomers({ search: search||undefined })
      .then(r => setCusts(r.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter(c => {
    if (filter === 'balance')  return parseFloat(c.total_balance) > 0;
    if (filter === 'rx')       return c.rx_held;
    return true;
  });

  const handleAddComm = async () => {
    if (!commNote.trim() || !selected) return;
    await addCommLog(selected.id, { type: commType, note: commNote });
    setCommNote('');
    load();
  };

  const markRxReturned = async (c) => {
    // find the order with the held rx and mark it returned
    const order = c.orders?.find(o => o.has_rx && !o.rx_returned);
    if (order) {
      await import('../api').then(api => api.updateOrder(order.id, { rx_returned: true }));
      load();
      setSelected(prev => ({ ...prev, rx_held: false }));
    }
  };

  const statusBg = { created:'#dbeafe',called:'#fef9c3',delivered:'#dcfce7',overdue:'#fee2e2' };
  const statusCl = { created:'#1e40af',called:'#854d0e',delivered:'#2d7a4f',overdue:'#c0392b' };

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:'0 0 4px' }}>👥 Customers</h1>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Full profiles, order history and refraction records</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search name or phone..."
          style={{ flex:1, minWidth:180, padding:'9px 14px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}
        />
        {['all','balance','rx'].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit',
              background:filter===f?'#0f1f3d':'white', color:filter===f?'white':'#6b7280', borderColor:filter===f?'#0f1f3d':'#e0ddd6' }}>
            {f==='all'?'All':f==='balance'?'💰 Balance Due':'📄 Rx Held'}
          </button>
        ))}
      </div>

      {loading ? <p style={{color:'#6b7280',fontSize:13}}>Loading...</p> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {filtered.map(c => {
            const initials = c.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={c.id} onClick={()=>setSelected(c)}
                style={{ background:'white', border:`1.5px solid ${c.rx_held?'#fde68a':'#e0ddd6'}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all .15s' }}>
                <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'#0f1f3d', display:'flex', alignItems:'center', justifyContent:'center', color:'#e8c96a', fontSize:16, fontWeight:700, fontFamily:"'Playfair Display',serif", flexShrink:0 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f1f3d' }}>{c.name}</div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>Age {c.age} · 📞 {c.phone}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  <span style={{ background:'#dbeafe', color:'#1e40af', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{c.total_orders} orders</span>
                  {parseFloat(c.total_balance)>0
                    ? <span style={{ background:'#fee2e2', color:'#c0392b', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>Balance Due</span>
                    : <span style={{ background:'#dcfce7', color:'#2d7a4f', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>Paid Up</span>
                  }
                  {c.rx_held && <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>📄 Rx Held</span>}
                </div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>Total spent: <b style={{color:'#0f1f3d'}}>Rs. {parseFloat(c.total_spent||0).toLocaleString()}</b></div>
                <div style={{ display:'flex', gap:7 }}>
                  <a onClick={e=>e.stopPropagation()}
                    href={`https://wa.me/94${c.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${c.name}, this is Kuruwita Optical. `)}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding:'6px 12px', background:'#25D366', color:'white', borderRadius:7, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                    💬 WA
                  </a>
                  <button onClick={e=>{e.stopPropagation();setSelected(c);}}
                    style={{ padding:'6px 12px', background:'#0f1f3d', color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    View →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      }

      {/* Detail panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget)setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:520, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>
            {/* Header */}
            <div style={{ background:'#0f1f3d', padding:'22px 22px 18px', position:'relative' }}>
              <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'#c9a84c', display:'flex', alignItems:'center', justifyContent:'center', color:'#0f1f3d', fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',serif", marginBottom:10 }}>
                {selected.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'white', marginBottom:3 }}>{selected.name}</div>
              <div style={{ fontSize:13, color:'#ede9e0', marginBottom:14 }}>Age {selected.age} · 📞 {selected.phone} · {selected.address}</div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${selected.name}, this is Kuruwita Optical. `)}`}
                  target="_blank" rel="noreferrer"
                  style={{ padding:'8px 14px', background:'#25D366', color:'white', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>💬 WhatsApp</a>
                <a href={`tel:${selected.phone}`}
                  style={{ padding:'8px 14px', background:'rgba(255,255,255,.15)', color:'white', border:'1px solid rgba(255,255,255,.3)', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>📞 Call</a>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #e0ddd6', padding:'0 20px', overflowX:'auto' }}>
              {['orders','refraction','communication','profile'].map(t => (
                <button key={t} onClick={()=>setTab(t)}
                  style={{ padding:'12px 14px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
                    color:tab===t?'#0f1f3d':'#6b7280', borderBottom:`2.5px solid ${tab===t?'#c9a84c':'transparent'}`, marginBottom:-1 }}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ padding:20 }}>
              {/* Orders tab */}
              {tab==='orders' && (selected.orders||[]).map(o => (
                <div key={o.id} style={{ background:'#f8f5ef', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#6b7280' }}>{o.order_number}</span>
                    <span style={{ background:statusBg[o.status], color:statusCl[o.status], fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{o.status}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#0f1f3d', marginBottom:4 }}>{o.frame||'—'}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>
                    {o.lens_type} · {o.lens_company} ·
                    <span style={{ color: parseFloat(o.balance_amount)>0?'#c0392b':'#2d7a4f', fontWeight:700 }}>
                      {parseFloat(o.balance_amount)>0 ? ` Rs. ${parseFloat(o.balance_amount).toLocaleString()} owed` : ' Paid ✓'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Refraction tab */}
              {tab==='refraction' && (selected.refractions||[]).map((r,i) => (
                <div key={i} style={{ background:'#f8f5ef', borderRadius:10, padding:14, marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0f1f3d' }}>📅 {new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                    <span style={{ fontSize:11, color:'#6b7280' }}>{r.order_id}</span>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr>{['Eye','SPH','CYL','AXIS','ADD','VA'].map(h=><th key={h} style={{ background:'#ede9e0', padding:'5px 8px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', border:'1px solid #e0ddd6' }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        <tr>{['Right',r.r_sph,r.r_cyl,r.r_axis,r.r_add,r.r_va].map((v,i)=><td key={i} style={{ padding:'5px 8px', textAlign:'center', border:'1px solid #e0ddd6', fontWeight:i===0?700:400, color:i===0?'#0f1f3d':'#1a1a2e', background:i===0?'#ede9e0':'white' }}>{v||'—'}</td>)}</tr>
                        <tr>{['Left',r.l_sph,r.l_cyl,r.l_axis,r.l_add,r.l_va].map((v,i)=><td key={i} style={{ padding:'5px 8px', textAlign:'center', border:'1px solid #e0ddd6', fontWeight:i===0?700:400, color:i===0?'#0f1f3d':'#1a1a2e', background:i===0?'#ede9e0':'white' }}>{v||'—'}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                  {r.notes && <div style={{ fontSize:12, color:'#6b7280', marginTop:8, fontStyle:'italic' }}>💬 {r.notes}</div>}
                </div>
              ))}

              {/* Communication tab */}
              {tab==='communication' && (
                <>
                  <div style={{ marginBottom:14 }}>
                    {(selected.comm_logs||[]).map((c,i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid #f8f5ef' }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background: c.type==='wa'?'#dcfce7':c.type==='call'?'#dbeafe':'#f8f5ef', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                          {c.type==='wa'?'💬':c.type==='call'?'📞':'📝'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, color:'#1a1a2e', fontWeight:500 }}>{c.note}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                        </div>
                      </div>
                    ))}
                    {!(selected.comm_logs||[]).length && <p style={{ fontSize:13, color:'#9ca3af' }}>No communication logged yet</p>}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select value={commType} onChange={e=>setCommType(e.target.value)}
                      style={{ padding:'8px 10px', border:'1.5px solid #e0ddd6', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#f8f5ef', outline:'none' }}>
                      <option value="call">📞 Call</option>
                      <option value="wa">💬 WhatsApp</option>
                      <option value="note">📝 Note</option>
                    </select>
                    <input value={commNote} onChange={e=>setCommNote(e.target.value)} placeholder="Add a note..."
                      style={{ flex:1, padding:'8px 12px', border:'1.5px solid #e0ddd6', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#f8f5ef', outline:'none' }}/>
                    <button onClick={handleAddComm}
                      style={{ padding:'8px 14px', background:'#0f1f3d', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Add</button>
                  </div>
                </>
              )}

              {/* Profile tab */}
              {tab==='profile' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                    {[
                      { l:'Phone',        v: selected.phone },
                      { l:'Age',          v: selected.age+' years' },
                      { l:'Address',      v: selected.address||'—' },
                      { l:'Total orders', v: selected.total_orders },
                      { l:'Total spent',  v: 'Rs. '+parseFloat(selected.total_spent||0).toLocaleString() },
                      { l:'Balance due',  v: 'Rs. '+parseFloat(selected.total_balance||0).toLocaleString() },
                    ].map(item => (
                      <div key={item.l} style={{ background:'#f8f5ef', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#6b7280', marginBottom:3 }}>{item.l}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                  {selected.rx_held && (
                    <div style={{ background:'#e0f2fe', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:13, color:'#0369a1', fontWeight:700, marginBottom:6 }}>📄 Prescription held from {selected.rx_hospital}</div>
                      <button onClick={()=>markRxReturned(selected)}
                        style={{ background:'#0369a1', color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Mark as Returned
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
