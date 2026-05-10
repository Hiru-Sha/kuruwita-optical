// ============================================================
//  Dashboard.js — Fixed: exact Rs. values, no K abbreviation
// ============================================================
import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';

const navy   = '#0f1f3d';
const gold   = '#c9a84c';
const cream  = '#f8f5ef';
const border = '#e0ddd6';
const muted  = '#6b7280';
const success= '#2d7a4f';
const danger = '#c0392b';

// Format money — always exact, no K shortening
const fmtMoney = (n) =>
  'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function Dashboard() {
  const { user }  = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    getDashboard()
      .then(r => { setData(r.data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:muted, flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div>
      <div style={{ fontSize:14 }}>Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:12, padding:24, color:danger, fontSize:14 }}>
      ⚠️ Could not load dashboard. Please refresh the page.
    </div>
  );

  const mr = data?.month_revenue || {};

  // ── KPI card ──────────────────────────────────────────────
  const KPI = ({ label, value, sub, dark, color }) => (
    <div style={{ background: dark ? navy : 'white', border: `1px solid ${dark ? navy : border}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: dark ? gold : muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: dark ? 'white' : (color || navy), lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: dark ? '#ede9e0' : muted, marginTop: 5 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: navy, margin: 0 }}>
        {greeting}, {user?.name?.split(' ')[0]}! 👋
      </h1>
      <p style={{ fontSize: 13, color: muted, margin: '4px 0 24px' }}>
        {today} — Kuruwita Optical
      </p>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="This Month"    value={fmtMoney(mr.total)}           sub={`${mr.order_count || 0} orders`}    dark />
        <KPI label="Today's Sales" value={fmtMoney(data?.daily_revenue)} sub="Today total"                        color={success} />
        <KPI label="Balance Due"   value={fmtMoney(data?.total_balance)} sub="Outstanding"                        color={danger}  />
        <KPI label="Active Orders" value={data?.active_orders || 0}      sub="In progress"                        color='#2563eb' />
        <KPI label="Lens Jobs Out" value={data?.lens_jobs_out || 0}      sub="At labs"                            color='#7c3aed' />
      </div>

      {/* ── Delivery reminders ── */}
      <div style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: navy }}>🔔 Delivery reminders</span>
          {data?.reminders?.length > 0 && (
            <span style={{ background: '#fee2e2', color: danger, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
              {data.reminders.length} urgent
            </span>
          )}
        </div>
        <div style={{ padding: '4px 18px' }}>
          {!data?.reminders?.length
            ? <p style={{ padding: '14px 0', color: muted, fontSize: 13 }}>✅ No urgent reminders — all deliveries on track</p>
            : data.reminders.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${cream}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.status === 'overdue' ? danger : gold, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{r.customer_name}</div>
                  <div style={{ fontSize: 12, color: muted }}>
                    {r.order_number} · Balance {fmtMoney(r.balance_amount)} · Due {r.deliver_date?.slice(0, 10)}
                  </div>
                </div>
                <a href={`https://wa.me/94${r.phone?.replace(/^0/, '')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready at Kuruwita Optical. Please visit us. Thank you!`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background: '#25D366', color: 'white', padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  💬 WA
                </a>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Month summary ── */}
      <div style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: navy }}>📊 This month at a glance</span>
        </div>
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
          {[
            { l: 'Total billed', v: fmtMoney(mr.total),     c: navy    },
            { l: 'Collected',    v: fmtMoney(mr.collected), c: success },
            { l: 'Still owed',   v: fmtMoney(mr.owed),      c: danger  },
            { l: 'Orders',       v: mr.order_count || 0,    c: '#2563eb'},
          ].map(item => (
            <div key={item.l} style={{ background: cream, borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 6 }}>{item.l}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 14 }}>⚡ Quick actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '+ New Order',        href: '/orders/new', bg: gold,  color: navy    },
            { label: '📋 View All Orders', href: '/orders',     bg: navy,  color: 'white' },
            { label: '👥 Customers',        href: '/customers', bg: cream, color: navy, bord: border },
            { label: '🕶️ Inventory',        href: '/inventory', bg: cream, color: navy, bord: border },
          ].map(a => (
            <a key={a.label} href={a.href}
              style={{ padding: '10px 18px', background: a.bg, color: a.color, border: a.bord ? `1.5px solid ${a.bord}` : 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
