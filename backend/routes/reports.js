/* eslint-disable */
// ============================================================
//  Reports.js — Corrected profit calculation (v2)
//
//  PROFIT FORMULA:
//  Revenue - Frame COGS - Lens COGS - QS COGS - Gift COGS - Operating Expenses
//
//  NOT subtracted from profit:
//  ✗ Dealer purchases (inventory addition, not expense)
//  ✗ lens_buy_price on orders (use Lab Receivings instead)
// ============================================================
import React, { useEffect, useState } from 'react';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const fmt   = n  => 'Rs. ' + Math.round(parseFloat(n||0)).toLocaleString();
const pct   = (a,b) => b > 0 ? Math.round(parseFloat(a)/parseFloat(b)*100) : 0;
const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => new Date().toISOString().slice(0,7) + '-01';

// ── Small KPI tile ───────────────────────────────────────────
function KPI({ label, value, sub, dark, accent, border: bdr }) {
  return (
    <div style={{
      background: dark ? 'linear-gradient(135deg, var(--navy) 0%, #162240 100%)' : 'var(--bg-surface)',
      border: `1px solid ${bdr || (dark ? 'transparent' : 'var(--border)')}`,
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      boxShadow: dark ? '0 4px 20px rgba(10,22,40,.3)' : 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.09em', color: dark ? 'var(--gold)' : 'var(--text-muted)', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: dark ? '#fff' : (accent || 'var(--text-primary)'), lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: dark ? 'rgba(255,255,255,.5)' : 'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Profit waterfall row ─────────────────────────────────────
function WaterfallRow({ label, amount, isRevenue, isTotal, sub, positive, indent }) {
  const color = isRevenue ? 'var(--success)' : isTotal
    ? (parseFloat(amount) >= 0 ? 'var(--success)' : 'var(--danger)')
    : 'var(--danger)';
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding: isTotal ? '14px 18px' : '10px 18px',
      background: isTotal ? (parseFloat(amount) >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)') : 'transparent',
      borderTop: isTotal ? `2px solid ${parseFloat(amount) >= 0 ? 'var(--success-border)' : 'var(--danger-border)'}` : `1px solid var(--border)`,
      paddingLeft: indent ? 36 : 18,
    }}>
      <div>
        <div style={{ fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? 700 : 500, color: isTotal ? color : 'var(--text-primary)' }}>
          {!isRevenue && !isTotal && <span style={{ color:'var(--danger)', marginRight:4 }}>−</span>}
          {isRevenue && <span style={{ color:'var(--success)', marginRight:4 }}>+</span>}
          {label}
        </div>
        {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize: isTotal ? 18 : 15, fontWeight:700, color }}>
        {fmt(amount)}
      </div>
    </div>
  );
}

// ── Main Reports ─────────────────────────────────────────────
export default function Reports() {
  const [data,    setData]   = useState(null);
  const [loading, setLoad]   = useState(false);
  const [error,   setError]  = useState('');
  const [from,    setFrom]   = useState(monthStart());
  const [to,      setTo]     = useState(today());
  const [tab,     setTab]    = useState('profit');

  const load = async () => {
    setLoad(true); setError('');
    try {
      const res = await fetch(`${BASE()}/full-report?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error('Failed to load report');
      setData(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  const TABS = [
    { k:'profit',    l:'📊 Profit & Loss' },
    { k:'inventory', l:'📦 Inventory'     },
    { k:'cashflow',  l:'💵 Cash Flow'     },
    { k:'orders',    l:'📋 Orders'        },
    { k:'expenses',  l:'💸 Expenses'      },
  ];

  const s = data?.summary;

  return (
    <div style={{ fontFamily:'var(--font-body)', maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--text-primary)', margin:0 }}>Reports</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>Accurate profit with correct COGS calculation</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
            style={{ padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--bg-surface)', color:'var(--text-primary)' }}/>
          <span style={{ color:'var(--text-muted)', fontSize:13 }}>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)}
            style={{ padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--bg-surface)', color:'var(--text-primary)' }}/>
          <button onClick={load} disabled={loading}
            style={{ padding:'9px 18px', background:'var(--navy)', color:'#fff', border:'none', borderRadius:'var(--r-md)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? '⏳' : '🔄 Load'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:'var(--danger-bg)', color:'var(--danger)', border:'1px solid var(--danger-border)', borderRadius:'var(--r-md)', padding:'12px 16px', marginBottom:16, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:14 }}>Loading report…</div>
        </div>
      )}

      {!loading && data && (<>

        {/* Summary KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          <KPI dark label="Net Profit" value={fmt(s.netProfit)}
            sub={`${s.profitMargin}% margin`}/>
          <KPI label="Total Revenue" value={fmt(s.totalRevenue)} accent="var(--success)"
            sub={`${data.orders?.total_orders} orders`}/>
          <KPI label="Total COGS" value={fmt(s.totalCOGS)} accent="var(--danger)"
            sub="Cost of goods sold"/>
          <KPI label="Operating Exp" value={fmt(s.operatingExpenses)} accent="var(--warning)"
            sub="Rent, electricity etc."/>
          <KPI label="Inventory Value" value={fmt(s.inventoryValue)} accent="#2563eb"
            sub="Stock on shelf (asset)"/>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:20, overflowX:'auto' }}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{ padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:tab===t.k?'var(--navy)':'var(--text-muted)', borderBottom:`2.5px solid ${tab===t.k?'var(--gold)':'transparent'}`, marginBottom:-1, transition:'all 150ms' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════
            PROFIT & LOSS TAB
        ═══════════════════════════════════════════════ */}
        {tab === 'profit' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Waterfall chart */}
            <div style={{ gridColumn:'1/-1', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>Profit & Loss Statement</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{from} → {to}</div>
              </div>

              {/* Revenue */}
              <WaterfallRow label="Order Revenue" amount={s.orderRevenue} isRevenue
                sub={`${data.orders?.total_orders} orders billed`}/>
              <WaterfallRow label="Quick Sale Revenue" amount={s.qsRevenue} isRevenue
                sub={`${data.quickSales?.total_sales} sales`}/>
              <WaterfallRow label="Repair Revenue" amount={s.repairRevenue} isRevenue
                sub={`${data.repairs?.total_repairs} repairs`}/>
              <WaterfallRow label="TOTAL REVENUE" amount={s.totalRevenue} isTotal isRevenue/>

              {/* COGS */}
              <div style={{ padding:'8px 18px 4px', background:'var(--bg-sunken)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-muted)' }}>
                Cost of Goods Sold (COGS)
              </div>
              <WaterfallRow label="Frame cost (per order sold)" amount={s.cogs_breakdown.frame} indent
                sub="frame_buy_price on orders — cost when each frame sold"/>
              <WaterfallRow label="Lens cost (Lab Receivings)" amount={s.cogs_breakdown.lens} indent
                sub="Negombo Optical, Solex — from Lab Receivings payments"/>
              <WaterfallRow label="Quick sale item cost" amount={s.cogs_breakdown.quickSale} indent
                sub="cost_price × qty for sunglasses, reading glasses etc."/>
              <WaterfallRow label="Free gifts given with orders" amount={s.cogs_breakdown.gifts} indent
                sub="Boxes, bags, lens cleaners, pouches — snapshotted cost"/>
              <WaterfallRow label="Repair materials cost" amount={s.cogs_breakdown.repairs} indent
                sub="Actual parts used in repairs"/>
              <WaterfallRow label="TOTAL COGS" amount={s.totalCOGS} isTotal/>

              {/* Gross Profit */}
              <WaterfallRow label="GROSS PROFIT" amount={s.grossProfit} isTotal
                sub={`${pct(s.grossProfit,s.totalRevenue)}% gross margin`}/>

              {/* Operating expenses */}
              <div style={{ padding:'8px 18px 4px', background:'var(--bg-sunken)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-muted)' }}>
                Operating Expenses (rent, electricity, staff, etc.)
              </div>
              {data.expenses?.byCategory?.map(cat=>(
                <WaterfallRow key={cat.category} label={cat.category} amount={cat.total} indent
                  sub={`${cat.count} entries`}/>
              ))}
              <WaterfallRow label="TOTAL OPERATING EXPENSES" amount={s.operatingExpenses} isTotal/>

              {/* Net Profit */}
              <WaterfallRow label="NET PROFIT" amount={s.netProfit} isTotal
                sub={`${s.profitMargin}% net margin on revenue`}/>
            </div>

            {/* COGS breakdown chart */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>
                COGS Breakdown
              </div>
              {[
                { label:'Frame costs',    val:s.cogs_breakdown.frame,     color:'#2563eb', icon:'🕶️' },
                { label:'Lens costs',     val:s.cogs_breakdown.lens,      color:'#7c3aed', icon:'🔬' },
                { label:'Quick sale items',val:s.cogs_breakdown.quickSale,color:'#0891b2', icon:'⚡' },
                { label:'Free gifts',     val:s.cogs_breakdown.gifts,     color:'#059669', icon:'🎁' },
                { label:'Repair parts',   val:s.cogs_breakdown.repairs,   color:'#b45309', icon:'🔧' },
              ].map(item=>(
                <div key={item.label} style={{ padding:'12px 18px', borderBottom:'1px solid var(--bg-sunken)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{item.icon} {item.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:item.color }}>{fmt(item.val)}</span>
                  </div>
                  <div style={{ height:5, background:'var(--bg-sunken)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct(item.val, s.totalCOGS)}%`, background:item.color, borderRadius:3 }}/>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{pct(item.val,s.totalCOGS)}% of COGS · {pct(item.val,s.totalRevenue)}% of revenue</div>
                </div>
              ))}
            </div>

            {/* Revenue breakdown */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>
                Revenue Sources
              </div>
              {[
                { label:'Orders',      val:s.orderRevenue,   color:'var(--success)', icon:'📋', sub:`${data.orders?.total_orders} orders` },
                { label:'Quick Sales', val:s.qsRevenue,      color:'#2563eb',        icon:'⚡', sub:`${data.quickSales?.total_sales} sales` },
                { label:'Repairs',     val:s.repairRevenue,  color:'#0891b2',        icon:'🔧', sub:`${data.repairs?.total_repairs} jobs` },
              ].map(item=>(
                <div key={item.label} style={{ padding:'12px 18px', borderBottom:'1px solid var(--bg-sunken)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{item.icon} {item.label}</span>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:item.color }}>{fmt(item.val)}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{item.sub}</div>
                    </div>
                  </div>
                  <div style={{ height:5, background:'var(--bg-sunken)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct(item.val,s.totalRevenue)}%`, background:item.color, borderRadius:3 }}/>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{pct(item.val,s.totalRevenue)}% of total revenue</div>
                </div>
              ))}
            </div>

            {/* Dealer purchases note */}
            <div style={{ gridColumn:'1/-1', background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:'var(--r-lg)', padding:'14px 18px', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ fontSize:24, flexShrink:0 }}>📦</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#1e40af', marginBottom:4 }}>
                  Dealer Purchases: {fmt(s.dealerPurchases)} — shown for info only, NOT subtracted from profit
                </div>
                <div style={{ fontSize:12, color:'#3b82f6', lineHeight:1.6 }}>
                  When you buy frames/sunglasses from a dealer, that money becomes <b>inventory (an asset)</b> — not an expense yet.
                  The cost is recorded when each item is SOLD via <b>frame_buy_price on orders</b> or <b>cost_price on quick sales</b>.
                  This prevents double-counting. Your inventory value is currently <b>{fmt(s.inventoryValue)}</b>.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            INVENTORY TAB
        ═══════════════════════════════════════════════ */}
        {tab === 'inventory' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
            <KPI dark label="Inventory Value (Cost)" value={fmt(s.inventoryValue)}
              sub="What you paid for unsold stock"/>
            <KPI label="Inventory Value (Retail)" value={fmt(s.inventoryRetailValue)}
              accent="var(--success)" sub="What unsold stock would sell for"/>
            <KPI label="Potential Profit in Stock" value={fmt(s.inventoryRetailValue - s.inventoryValue)}
              accent="#7c3aed" sub="If all stock was sold today"/>
            <KPI label="Low Stock Items" value={s.lowStockItems} accent="var(--warning)"
              sub="Below minimum quantity"/>
            <KPI label="Out of Stock" value={s.outOfStockItems} accent="var(--danger)"
              sub="Zero quantity"/>

            <div style={{ gridColumn:'1/-1', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <div style={{ fontSize:15, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--text-primary)', marginBottom:14 }}>
                Dealer Purchases this period — Stock Added
              </div>
              {!data.dealerPurchases?.length
                ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>No purchases in this period</div>
                : data.dealerPurchases.map(d=>(
                  <div key={d.dealer_name} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>🏪 {d.dealer_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{d.purchases} purchases · {d.items} items added to stock</div>
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--navy)' }}>{fmt(d.total)}</div>
                  </div>
                ))
              }
              <div style={{ marginTop:14, padding:'12px 14px', background:'#eff6ff', borderRadius:'var(--r-md)', fontSize:12, color:'#1e40af' }}>
                💡 These purchases add to your inventory asset value. They become COGS when each item is sold.
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            CASH FLOW TAB
        ═══════════════════════════════════════════════ */}
        {tab === 'cashflow' && (
          <div style={{ display:'grid', gap:16 }}>
            <div style={{ background:'var(--navy)', borderRadius:'var(--r-xl)', padding:'22px 24px', color:'white' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--gold)', marginBottom:4 }}>
                Why cash in hand ≠ profit
              </div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.7)', lineHeight:1.7, margin:'8px 0 0' }}>
                When you buy Rs. {fmt(s.dealerPurchases).replace('Rs. ','')} of stock from dealers, that cash leaves your hands immediately.
                But only Rs. {fmt(s.cogs_breakdown.frame + s.cogs_breakdown.quickSale)} of that stock was sold this period — recorded as COGS.
                The remaining stock (Rs. {fmt(s.inventoryValue)}) is sitting on your shelf as an asset — still YOUR money, just in product form.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', background:'var(--success-bg)', fontSize:13, fontWeight:700, color:'var(--success)' }}>💚 Cash Coming In</div>
                {[
                  { l:'Order advances collected', v: data.orders?.collected },
                  { l:'Quick sale revenue',       v: s.qsRevenue            },
                  { l:'Repair charges',           v: s.repairRevenue        },
                ].map(row=>(
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 18px', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                    <span style={{ color:'var(--text-primary)' }}>{row.l}</span>
                    <span style={{ fontWeight:700, color:'var(--success)' }}>{fmt(row.v)}</span>
                  </div>
                ))}
              </div>

              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', background:'var(--danger-bg)', fontSize:13, fontWeight:700, color:'var(--danger)' }}>❤️ Cash Going Out</div>
                {[
                  { l:'Stock purchases (dealer)',  v: s.dealerPurchases        },
                  { l:'Lab payments (lenses)',     v: s.cogs_breakdown.lens    },
                  { l:'Operating expenses',        v: s.operatingExpenses      },
                  { l:'Deposited to bank',         v: s.totalDeposited         },
                ].map(row=>(
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 18px', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                    <span style={{ color:'var(--text-primary)' }}>{row.l}</span>
                    <span style={{ fontWeight:700, color:'var(--danger)' }}>{fmt(row.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            ORDERS TAB
        ═══════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'100px 130px 1fr 100px 100px 90px 90px 90px', padding:'9px 14px', background:'var(--bg-sunken)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>
              <span>Order</span><span>Customer</span><span>Frame / Lens</span>
              <span>Revenue</span><span>Frame Cost</span><span>Lens Cost</span><span>Gift Cost</span><span>Profit</span>
            </div>
            {data.orders?.list?.map(o=>(
              <div key={o.order_number} style={{ display:'grid', gridTemplateColumns:'100px 130px 1fr 100px 100px 90px 90px 90px', padding:'10px 14px', borderBottom:'1px solid var(--bg-sunken)', alignItems:'center', fontSize:12 }}>
                <span style={{ fontWeight:700, color:'var(--navy)' }}>{o.order_number}</span>
                <span style={{ color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customer_name}</span>
                <span style={{ color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.frame} · {o.lens_type}</span>
                <span style={{ fontWeight:700, color:'var(--success)' }}>{fmt(o.total_amount)}</span>
                <span style={{ color:'var(--danger)' }}>{o.customer_own_frame ? '— own' : fmt(o.frame_buy_price)}</span>
                <span style={{ color:'var(--danger)' }}>{fmt(o.lab_bill_amount)}</span>
                <span style={{ color:parseFloat(o.gift_cost)>0?'#7c3aed':'var(--text-muted)' }}>
                  {parseFloat(o.gift_cost)>0 ? fmt(o.gift_cost) : '—'}
                </span>
                <span style={{ fontWeight:700, color:parseFloat(o.order_profit)>=0?'var(--success)':'var(--danger)' }}>
                  {fmt(o.order_profit)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            EXPENSES TAB
        ═══════════════════════════════════════════════ */}
        {tab === 'expenses' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--text-primary)' }}>
                Operating Expenses by Category
              </div>
              {!data.expenses?.byCategory?.length
                ? <div style={{ padding:24, color:'var(--text-muted)', fontSize:13 }}>No operating expenses</div>
                : data.expenses.byCategory.map(cat=>(
                  <div key={cat.category} style={{ padding:'11px 18px', borderBottom:'1px solid var(--bg-sunken)', display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{cat.category}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{cat.count} entries</div>
                    </div>
                    <div style={{ fontWeight:700, color:'var(--danger)' }}>{fmt(cat.total)}</div>
                  </div>
                ))
              }
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--text-primary)' }}>
                Lab Payments (Lens COGS)
              </div>
              {data.lensJobs?.map(lab=>(
                <div key={lab.lens_company} style={{ padding:'11px 18px', borderBottom:'1px solid var(--bg-sunken)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>🔬 {lab.lens_company}</span>
                    <span style={{ fontWeight:700, color:'var(--danger)' }}>{fmt(lab.lab_total)}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Paid: {fmt(lab.total_paid)} · Unpaid: <span style={{ color:'var(--warning)', fontWeight:600 }}>{fmt(lab.total_unpaid)}</span> · {lab.orders_with_bill} orders
                  </div>
                </div>
              ))}
              <div style={{ padding:'11px 18px', background:'var(--bg-sunken)', fontSize:12, color:'var(--text-muted)' }}>
                These appear under COGS (lens cost), not operating expenses
              </div>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}