// ============================================================
//  Dashboard Page — Updated with Today's Summary
// ============================================================
import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';

const S = {
  title:   { fontFamily: "'Playfair Display',serif", fontSize: 24, color: '#0f1f3d', margin: 0 },
  sub:     { fontSize: 13, color: '#6b7280', margin: '4px 0 24px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 },
  kpi:     { background: 'white', border: '1px solid #e0ddd6', borderRadius: 12, padding: '16px 18px' },
  kl:      { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#6b7280', marginBottom: 6 },
  kv:      { fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#0f1f3d', lineHeight: 1 },
  ks:      { fontSize: 12, color: '#6b7280', marginTop: 5 },
  card:    { background: 'white', border: '1px solid #e0ddd6', borderRadius: 12, overflow: 'hidden', marginBottom: 18 },
  ch:      { padding: '13px 18px', borderBottom: '1px solid #e0ddd6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cht:     { fontSize: 14, fontWeight: 700, color: '#0f1f3d' },
  cb:      { padding: '8px 18px' },
  row:     { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8f5ef' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const todayDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  useEffect(() => {
    // getDashboard() fetches the main data including the new today_summary from backend
    getDashboard()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#6b7280', textAlign: 'center' }}>Loading dashboard...</div>;

  const mr = data?.month_revenue || {};
  const tr = data?.today_summary || { total_orders: 0, daily_revenue: 0 };

  // Helper to format currency nicely
  const formatCurrency = (val) => {
    if (val >= 1000) return `Rs. ${Math.round(val / 1000)}K`;
    return `Rs. ${parseFloat(val).toLocaleString()}`;
  };

  return (
    <div>
      <h1 style={S.title}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]}! 👋</h1>
      <p style={S.sub}>{todayDate} — Kuruwita Optical</p>

      {/* Primary KPI Grid */}
      <div style={S.kpiGrid}>
        
        {/* NEW: Today's Summary Card */}
        <div style={{ ...S.kpi, background: '#c9a84c', borderColor: '#c9a84c' }}>
          <div style={{ ...S.kl, color: '#0f1f3d' }}>Today's Sales</div>
          <div style={{ ...S.kv, color: '#0f1f3d' }}>{formatCurrency(tr.daily_revenue || 0)}</div>
          <div style={{ ...S.ks, color: '#0f1f3d', fontWeight: 600 }}>{tr.total_orders || 0} orders today</div>
        </div>

        {/* Monthly Revenue Card */}
        <div style={{ ...S.kpi, background: '#0f1f3d', borderColor: '#0f1f3d' }}>
          <div style={{ ...S.kl, color: '#c9a84c' }}>This Month</div>
          <div style={{ ...S.kv, color: 'white' }}>{formatCurrency(mr.total || 0)}</div>
          <div style={{ ...S.ks, color: '#ede9e0' }}>{mr.order_count || 0} orders</div>
        </div>

        {/* Balance Due Card */}
        <div style={S.kpi}>
          <div style={S.kl}>Balance Due</div>
          <div style={{ ...S.kv, color: '#c0392b' }}>{formatCurrency(data?.total_balance || 0)}</div>
          <div style={S.ks}>Total outstanding</div>
        </div>

        {/* Active Orders Card */}
        <div style={S.kpi}>
          <div style={S.kl}>Active Orders</div>
          <div style={{ ...S.kv, color: '#2563eb' }}>{data?.active_orders || 0}</div>
          <div style={S.ks}>Work in progress</div>
        </div>
      </div>

      {/* Reminders Section */}
      <div style={S.card}>
        <div style={S.ch}>
          <span style={S.cht}>🔔 Delivery reminders</span>
          {data?.reminders?.length > 0 && (
            <span style={{ background: '#fee2e2', color: '#c0392b', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
              {data.reminders.length} urgent
            </span>
          )}
        </div>
        <div style={S.cb}>
          {!data?.reminders?.length
            ? <p style={{ padding: '12px 0', color: '#6b7280', fontSize: 13 }}>✅ No urgent reminders today</p>
            : data.reminders.map(r => (
              <div key={r.id} style={S.row}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.status === 'overdue' ? '#c0392b' : '#c9a84c', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1f3d' }}>{r.customer_name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {r.order_number} · Bal: Rs. {parseFloat(r.balance_amount).toLocaleString()} · Due: {r.deliver_date}
                  </div>
                </div>
                <a 
                  href={`https://wa.me/94${r.phone?.replace(/^0/, '')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} at Kuruwita Optical is ready for collection. Thank you!`)}`}
                  target="_blank" 
                  rel="noreferrer"
                  style={{ background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                >
                  💬 WA
                </a>
              </div>
            ))
          }
        </div>
      </div>

      {/* Detailed Month Glance */}
      <div style={S.card}>
        <div style={S.ch}><span style={S.cht}>📊 Monthly Financial Summary</span></div>
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { l: 'Total billed',   v: `Rs. ${parseFloat(mr.total || 0).toLocaleString()}`,     c: '#0f1f3d' },
            { l: 'Collected',      v: `Rs. ${parseFloat(mr.collected || 0).toLocaleString()}`, c: '#2d7a4f' },
            { l: 'Still owed',     v: `Rs. ${parseFloat(mr.owed || 0).toLocaleString()}`,      c: '#c0392b' },
          ].map(item => (
            <div key={item.l} style={{ background: '#f8f5ef', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#6b7280', marginBottom: 6 }}>{item.l}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}