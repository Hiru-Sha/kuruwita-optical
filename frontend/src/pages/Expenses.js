/* eslint-disable */
// ============================================================
//  Expenses.js — Daily expenses + cash deposits tracker
//  Tab 1: Daily — today's income, expenses, deposits, cash in hand
//  Tab 2: Expenses — monthly expense list by category
//  Tab 3: Deposits — bank deposit history
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', white:'#ffffff',
};

const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = (d) => new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
const toDate  = (d) => new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const today   = () => new Date().toISOString().split('T')[0];
const thisMonth=() => new Date().toISOString().slice(0,7);

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, marginBottom:5, display:'block' };

const EXPENSE_CATS = [
  { key:'Rent',            icon:'🏠', color:'#7c3aed' },
  { key:'Electricity',     icon:'⚡', color:'#d97706' },
  { key:'Water',           icon:'💧', color:'#2563eb' },
  { key:'Salary',          icon:'👤', color:'#059669' },
  { key:'Lens Purchase',   icon:'🔬', color:'#0891b2' },
  { key:'Frame Purchase',  icon:'🕶️', color:'#6d28d9' },
  { key:'Transport',       icon:'🚗', color:'#dc2626' },
  { key:'Maintenance',     icon:'🔧', color:'#b45309' },
  { key:'Stationary',      icon:'📝', color:'#0f766e' },
  { key:'Food & Tea',      icon:'☕', color:'#92400e' },
  { key:'Phone & Internet',icon:'📱', color:'#1d4ed8' },
  { key:'Other',           icon:'📦', color:'#6b7280' },
];
const BANKS = ['Pan Asia Bank','People\'s Bank','Bank of Ceylon (BOC)','Commercial Bank','HNB','Sampath Bank','NSB','Seylan Bank','Other'];
const _getCat = (key) => EXPENSE_CATS.find(c=>c.key===key) || EXPENSE_CATS[EXPENSE_CATS.length-1];

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiDel(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
}

// ── Small stat box ────────────────────────────────────────────
function StatBox({ label, value, color=C.navy, dark=false, sub }) {
  return (
    <div style={{ background:dark?C.navy:'white', border:`1px solid ${dark?C.navy:C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:dark?C.gold:C.muted, marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:dark?'white':color }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:dark?'#ede9e0':C.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function Expenses() {
  const [activeTab,  setActiveTab]  = useState('daily');
  const [viewDate,   setViewDate]   = useState(today());
  const [month,      setMonth]      = useState(thisMonth());

  // Daily data
  const [dailyIncome,   setDailyIncome]   = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [dailyDeposits, setDailyDeposits] = useState([]);
  const [loading,       setLoading]       = useState(true);

  // Monthly data
  const [allExpenses,  setAllExpenses]  = useState([]);
  const [allDeposits,  setAllDeposits]  = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [catFilter,    setCatFilter]    = useState('all');

  // Add expense form
  const [showAddExp,  setShowAddExp]  = useState(false);
  const [expForm,     setExpForm]     = useState({ date:today(), category:'Rent', description:'', amount:'', payment_method:'cash', notes:'' });
  const [customCat,   setCustomCat]   = useState(''); // custom category name when 'Other' selected
  const [savingExp,   setSavingExp]   = useState(false);
  const [expError,    setExpError]    = useState('');

  // Add deposit form
  const [showAddDep,  setShowAddDep]  = useState(false);
  const [depForm,     setDepForm]     = useState({ date:today(), amount:'', bank_name:"Pan Asia Bank", account_no:'', payment_type:'cash', reference:'', notes:'' });
  const [savingDep,   setSavingDep]   = useState(false);
  const [depError,    setDepError]    = useState('');

  const [toast, setToast] = useState('');

  // Custom categories stored in localStorage
  const [customCats, setCustomCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ko_custom_expense_cats') || '[]'); }
    catch { return []; }
  });
  const [showManageCats, setShowManageCats] = useState(false);

  // Budget limits per category — stored in localStorage
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ko_expense_budgets') || '{}'); }
    catch { return {}; }
  });
  const [showBudgets, setShowBudgets] = useState(false);
  const saveBudgets = (b) => { setBudgets(b); localStorage.setItem('ko_expense_budgets', JSON.stringify(b)); };
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');

  const CAT_ICONS = ['📌','🏷️','💡','🛒','🎯','🔑','📦','💼','🎁','🔌','🚿','🧹','📋','🖨️','🚚','🌐','💊','🏥','📚','🎓'];

  const saveCustomCats = (cats) => {
    setCustomCats(cats);
    localStorage.setItem('ko_custom_expense_cats', JSON.stringify(cats));
  };

  const addCustomCategory = () => {
    if (!newCatName.trim()) return;
    const key = newCatName.trim();
    if (EXPENSE_CATS.find(c=>c.key===key) || customCats.find(c=>c.key===key)) return alert('Category already exists');
    const colors = ['#0ea5e9','#8b5cf6','#f43f5e','#10b981','#f59e0b','#6366f1','#ec4899','#14b8a6'];
    const newCat = { key, icon:newCatIcon, color:colors[customCats.length % colors.length] };
    saveCustomCats([...customCats, newCat]);
    setNewCatName(''); setNewCatIcon('📌');
  };

  const deleteCustomCategory = (key) => {
    if (!window.confirm(`Delete category "${key}"?`)) return;
    saveCustomCats(customCats.filter(c=>c.key!==key));
  };

  const allCats = [...EXPENSE_CATS, ...customCats];
  const getCatAll = (key) => allCats.find(c=>c.key===key) || EXPENSE_CATS[EXPENSE_CATS.length-1];
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  // ── Generate PDF expense report ─────────────────────────────
  const generatePDF = async (period, value) => {
    // Determine date range
    let fromDate, toDate, title;
    const now = new Date();
    if (period === 'month') {
      const [y,m] = (value||month).split('-');
      fromDate = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      toDate   = `${y}-${m}-${String(lastDay).padStart(2,'0')}`;
      title    = `Monthly Expenses — ${new Date(fromDate+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`;
    } else if (period === 'week') {
      const start = new Date(now); start.setDate(now.getDate()-now.getDay());
      fromDate = start.toISOString().split('T')[0];
      const end = new Date(start); end.setDate(start.getDate()+6);
      toDate   = end.toISOString().split('T')[0];
      title    = `Weekly Expenses — ${start.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} to ${end.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`;
    } else if (period === 'year') {
      const yr = value || String(now.getFullYear());
      fromDate = `${yr}-01-01`;
      toDate   = `${yr}-12-31`;
      title    = `Annual Expenses — ${yr}`;
    }

    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/expenses?from=${fromDate}&to=${toDate}&limit=1000`, { headers:{ Authorization:`Bearer ${token}` } });
      const exps  = await res.json();
      const list  = Array.isArray(exps) ? exps : [];

      // Group by category
      const byCat = list.reduce((acc,e)=>{
        const k = e.category||'Other';
        if (!acc[k]) acc[k] = { total:0, count:0, items:[] };
        acc[k].total += parseFloat(e.amount||0);
        acc[k].count++;
        acc[k].items.push(e);
        return acc;
      }, {});
      const grandTotal = list.reduce((s,e)=>s+parseFloat(e.amount||0),0);

      const fmtRs = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
      const fmtD  = (d) => d ? new Date(d.slice(0,10)+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';

      const catRows = Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,data])=>`
        <tr style="background:#f8f5ef">
          <td colspan="3" style="padding:6px 10px;font-weight:700;color:#0f1f3d;font-size:12px;border:1px solid #e0ddd6">${getCatAll(cat).icon} ${cat}</td>
          <td style="padding:6px 10px;font-weight:700;color:#0f1f3d;text-align:right;border:1px solid #e0ddd6">${fmtRs(data.total)}</td>
        </tr>
        ${data.items.map(e=>`
        <tr>
          <td style="padding:5px 10px 5px 22px;font-size:11px;color:#6b7280;border:1px solid #e0ddd6">${fmtD(e.date)}</td>
          <td style="padding:5px 10px;font-size:12px;color:#0f1f3d;border:1px solid #e0ddd6">${e.description||cat}</td>
          <td style="padding:5px 10px;font-size:11px;color:#6b7280;text-align:center;border:1px solid #e0ddd6">${e.payment_method==='bank'?'Bank':'Cash'}</td>
          <td style="padding:5px 10px;font-size:12px;font-weight:600;color:#c0392b;text-align:right;border:1px solid #e0ddd6">− ${fmtRs(e.amount)}</td>
        </tr>`).join('')}
      `).join('');

      const win = window.open('','_blank','width=900,height=700');
      win.document.write(`<!DOCTYPE html><html><head>
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#0f1f3d;}
  @page{size:A4;margin:15mm;}
  @media print{body{padding:0;}.no-print{display:none;}}
  table{width:100%;border-collapse:collapse;}
  th{background:#0f1f3d;color:#c9a84c;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
  th:last-child{text-align:right;}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #0f1f3d;margin-bottom:18px">
  <div>
    <div style="font-size:20px;font-weight:700;color:#0f1f3d">Wickramakalutota Opticals</div>
    <div style="font-size:13px;color:#666;margin-top:2px">No.57, Kurunegala Road, Chilaw · 032 222 1211</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:700;color:#0f1f3d">${title}</div>
    <div style="font-size:11px;color:#888">${fromDate} to ${toDate}</div>
    <div style="font-size:11px;color:#888">Printed: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
  <div style="background:#fee2e2;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#c0392b;font-weight:700;text-transform:uppercase">Total Expenses</div>
    <div style="font-size:22px;font-weight:700;color:#c0392b">${fmtRs(grandTotal)}</div>
  </div>
  <div style="background:#f3f4f6;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#374151;font-weight:700;text-transform:uppercase">Transactions</div>
    <div style="font-size:22px;font-weight:700;color:#0f1f3d">${list.length}</div>
  </div>
  <div style="background:#f3f4f6;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#374151;font-weight:700;text-transform:uppercase">Categories</div>
    <div style="font-size:22px;font-weight:700;color:#0f1f3d">${Object.keys(byCat).length}</div>
  </div>
</div>
<table>
  <thead><tr>
    <th style="width:100px">Date</th>
    <th>Description</th>
    <th style="width:70px;text-align:center">Payment</th>
    <th style="width:130px;text-align:right">Amount</th>
  </tr></thead>
  <tbody>
    ${catRows}
    <tr style="background:#0f1f3d">
      <td colspan="3" style="padding:10px;font-weight:700;color:white;font-size:14px;border:1px solid #0f1f3d">GRAND TOTAL</td>
      <td style="padding:10px;font-weight:700;color:#c9a84c;text-align:right;font-size:16px;border:1px solid #0f1f3d">${fmtRs(grandTotal)}</td>
    </tr>
  </tbody>
</table>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
      win.document.close();
    } catch(e) { alert('Failed to generate report: '+e.message); }
  };

  // ── Load daily data ─────────────────────────────────────────
  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');

      const [orders, qsales, expenses, deposits] = await Promise.all([
        fetch(`${BASE}/orders?limit=100`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()),
        fetch(`${BASE}/quick-sales?limit=100`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()),
        apiGet(`/expenses?month=${viewDate.slice(0,7)}`),
        apiGet(`/cash-deposits?date=${viewDate}`),
      ]);

      // Calculate today's income from orders + quick sales
      const todayOrders = (Array.isArray(orders)?orders:[]).filter(o => o.created_at?.slice(0,10)===viewDate);
      const todayQS     = (Array.isArray(qsales)?qsales:[]).filter(s => s.created_at?.slice(0,10)===viewDate);

      // Cash collected today = advances paid today + quick sale totals
      const orderIncome = todayOrders.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0);
      const qsIncome    = todayQS.reduce((s,q)=>s+parseFloat(q.total||0),0);
      setDailyIncome(orderIncome + qsIncome);

      // Today's expenses
      const todayExp = (Array.isArray(expenses)?expenses:[]).filter(e => e.date?.slice(0,10)===viewDate);
      setDailyExpenses(todayExp);
      setDailyDeposits(Array.isArray(deposits)?deposits:[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate]);

  // ── Load monthly data ───────────────────────────────────────
  const loadMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const [exp, dep, sum] = await Promise.all([
        apiGet(`/expenses?month=${month}${catFilter!=='all'?`&category=${encodeURIComponent(catFilter)}`:''}`)  ,
        apiGet(`/cash-deposits?month=${month}`),
        fetch(`${BASE}/expenses/summary?month=${month}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()),
      ]);
      setAllExpenses(Array.isArray(exp)?exp:[]);
      setAllDeposits(Array.isArray(dep)?dep:[]);
      setSummary(sum);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, catFilter]);

  useEffect(()=>{
    if (activeTab==='daily')    loadDaily();
    if (activeTab==='expenses') loadMonthly();
    if (activeTab==='deposits') loadMonthly();
  },[activeTab, loadDaily, loadMonthly]);

  // ── Computed daily values ───────────────────────────────────
  const totalDailyExp     = dailyExpenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const totalDailyDeposit = dailyDeposits.reduce((s,d)=>s+parseFloat(d.amount||0),0);
  const cashInHand        = dailyIncome - totalDailyExp - totalDailyDeposit;

  // ── Add expense ─────────────────────────────────────────────
  const handleAddExpense = async () => {
    if (expForm.category === 'Other' && !customCat.trim()) return setExpError('Please enter the expense name');
    if (!expForm.description.trim() && expForm.category !== 'Other') return setExpError('Please enter a description');
    // Warn if adding frame/lens purchase as expense — this causes double counting
    if (expForm.category === 'Frame Purchase' || expForm.category === 'Lens Purchase') {
      const ok = window.confirm(
        '⚠️ Double-counting warning!\n\n' +
        'Frame and lens costs are already recorded through:\n' +
        '• Frame → added to Inventory with buy price\n' +
        '• Lens → entered via Orders → Update Costs\n\n' +
        'Adding them here as expenses will count the cost TWICE in your profit report.\n\n' +
        'Only continue if this is a special case (e.g. damaged stock, samples).\n\nContinue anyway?'
      );
      if (!ok) return;
    }
    // Build final description
    const finalDesc = expForm.category === 'Other' && customCat.trim()
      ? customCat.trim() + (expForm.description.trim() ? ': ' + expForm.description.trim() : '')
      : expForm.description.trim();
    if (!expForm.amount || parseFloat(expForm.amount) <= 0) return setExpError('Please enter a valid amount');
    setExpError(''); setSavingExp(true);
    try {
      const res = await apiPost('/expenses', { ...expForm, amount:parseFloat(expForm.amount) });
      if (res.error) throw new Error(res.error);
      setCustomCat('');
      setExpForm({ date:viewDate, category:'Rent', description:'', amount:'', payment_method:'cash', notes:'' });
      setShowAddExp(false);
      showToast('Expense added ✓');
      loadDaily(); loadMonthly();
    } catch(e) { setExpError(e.message||'Failed'); }
    finally { setSavingExp(false); }
  };

  // ── Add deposit ─────────────────────────────────────────────
  const handleAddDeposit = async () => {
    if (!depForm.amount || parseFloat(depForm.amount) <= 0) return setDepError('Please enter deposit amount');
    setDepError(''); setSavingDep(true);
    try {
      const res = await apiPost('/cash-deposits', { ...depForm, amount:parseFloat(depForm.amount) });
      if (res.error) throw new Error(res.error);
      setDepForm({ date:viewDate, amount:'', bank_name:"Pan Asia Bank", account_no:'', payment_type:'cash', reference:'', notes:'' });
      setShowAddDep(false);
      showToast('Deposit recorded ✓');
      loadDaily(); loadMonthly();
    } catch(e) { setDepError(e.message||'Failed'); }
    finally { setSavingDep(false); }
  };

  const handleDeleteExp = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await apiDel(`/expenses/${id}`);
    showToast('Deleted'); loadDaily(); loadMonthly();
  };

  const handleDeleteDep = async (id) => {
    if (!window.confirm('Delete this deposit entry?')) return;
    await apiDel(`/cash-deposits/${id}`);
    showToast('Deleted'); loadDaily(); loadMonthly();
  };

  const TABS = [
    { key:'daily',    label:'📅 Daily Cash Flow' },
    { key:'expenses', label:'💸 Expenses'         },
    { key:'deposits', label:'🏦 Bank Deposits'    },
  ];

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:1100 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>💸 Expenses & Cash</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Daily cash flow, expenses, and bank deposits</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {activeTab==='daily' && (
            <>
              <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
                style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
              <button onClick={()=>setViewDate(today())}
                style={{ padding:'8px 14px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                Today
              </button>
            </>
          )}
          {(activeTab==='expenses'||activeTab==='deposits') && (
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
              style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ DAILY CASH FLOW ══════════════════════ */}
      {activeTab==='daily' && (
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy, marginBottom:16 }}>
            {toDate(viewDate)}
            {viewDate===today() && <span style={{ marginLeft:10, background:C.gold, color:C.navy, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, fontFamily:"'DM Sans',sans-serif" }}>Today</span>}
          </div>

          {/* Summary row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            <StatBox label="Cash In"      value={fmt(dailyIncome)}        color={C.success}  sub="Orders + Quick sales" />
            <StatBox label="Expenses Out" value={fmt(totalDailyExp)}      color={C.danger}   sub={`${dailyExpenses.length} expense${dailyExpenses.length!==1?'s':''}`} />
            <StatBox label="Deposited"    value={fmt(totalDailyDeposit)}  color='#2563eb'    sub={`${dailyDeposits.length} deposit${dailyDeposits.length!==1?'s':''}`} />
            <StatBox label="Cash in Hand" value={fmt(cashInHand)}
              color={cashInHand>=0?C.success:C.danger}
              dark={cashInHand>=0}
              sub={cashInHand<0?'⚠️ Check entries':'Ready to deposit'} />
          </div>

          {/* Cash flow formula */}
          <div style={{ background:C.cream, borderRadius:12, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:14 }}>
            <span style={{ color:C.success, fontWeight:700 }}>{fmt(dailyIncome)} cash in</span>
            <span style={{ color:C.muted }}>−</span>
            <span style={{ color:C.danger, fontWeight:700 }}>{fmt(totalDailyExp)} expenses</span>
            <span style={{ color:C.muted }}>−</span>
            <span style={{ color:'#2563eb', fontWeight:700 }}>{fmt(totalDailyDeposit)} deposited</span>
            <span style={{ color:C.muted }}>=</span>
            <span style={{ color:cashInHand>=0?C.success:C.danger, fontWeight:700, fontSize:16 }}>{fmt(cashInHand)} in hand</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* LEFT: Today's expenses */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>💸 Expenses</div>
                <button onClick={()=>{ setExpForm(f=>({...f,date:viewDate})); setShowAddExp(s=>!s); setShowAddDep(false); }}
                  style={{ padding:'7px 14px', background:showAddExp?C.cream:C.gold, color:showAddExp?C.muted:C.navy, border:showAddExp?`1.5px solid ${C.border}`:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {showAddExp?'✕ Cancel':'+ Add'}
                </button>
              </div>

              {/* Add expense form */}
              {showAddExp && (
                <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
                  {expError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:10 }}>⚠️ {expError}</div>}

                  {/* Category quick-pick */}
                  <div style={{ marginBottom:10 }}>
                    <label style={LBL}>Category</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {allCats.map(cat=>(
                        <button key={cat.key} onClick={()=>setExpForm(f=>({...f,category:cat.key}))}
                          style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${expForm.category===cat.key?cat.color:C.border}`, background:expForm.category===cat.key?cat.color+'18':'white', color:expForm.category===cat.key?cat.color:C.muted }}>
                          {cat.icon} {cat.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    <div>
                      <label style={LBL}>Amount (Rs.)</label>
                      <input type="number" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 500" style={INP} autoFocus/>
                    </div>
                    <div>
                      <label style={LBL}>Payment</label>
                      <select value={expForm.payment_method} onChange={e=>setExpForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                        <option value="cash">💵 Cash</option>
                        <option value="bank">🏦 Bank</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom expense name — shown when Other is selected */}
                  {expForm.category === 'Other' && (
                    <div style={{ marginBottom:10, background:'#fffbeb', border:'1.5px solid #f59e0b', borderRadius:9, padding:'10px 12px' }}>
                      <label style={{ ...LBL, color:'#92400e' }}>📝 Expense Name *</label>
                      <input value={customCat} onChange={e=>setCustomCat(e.target.value)}
                        placeholder="e.g. Printing, Donations, Parking, Cleaning..."
                        style={{ ...INP, border:'1.5px solid #f59e0b', background:'white' }}
                        autoFocus/>
                    </div>
                  )}

                  <div style={{ marginBottom:10 }}>
                    <label style={LBL}>{expForm.category === 'Other' ? 'Additional Notes (optional)' : 'Description'}</label>
                    <input value={expForm.description} onChange={e=>setExpForm(f=>({...f,description:e.target.value}))}
                      placeholder={expForm.category === 'Other' ? 'Any extra details...' : `e.g. ${getCatAll(expForm.category).icon} ${expForm.category}`}
                      style={INP}/>
                  </div>

                  <button onClick={handleAddExpense} disabled={savingExp}
                    style={{ width:'100%', padding:'10px', background:savingExp?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:savingExp?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {savingExp?'Saving...':'💾 Save Expense'}
                  </button>
                </div>
              )}

              {/* Expense list */}
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {!dailyExpenses.length
                  ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
                      No expenses recorded for this day
                    </div>
                  : dailyExpenses.map(exp=>{
                      const cat = getCatAll(exp.category);
                      return (
                        <div key={exp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom:`1px solid ${C.cream}` }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:cat.color+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                            {cat.icon}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.description}</div>
                            <div style={{ fontSize:11, color:C.muted }}>
                              <span style={{ background:cat.color+'15', color:cat.color, padding:'1px 7px', borderRadius:20, fontWeight:600, fontSize:10 }}>{exp.category}</span>
                              <span style={{ marginLeft:6 }}>{exp.payment_method==='bank'?'🏦':'💵'}</span>
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:C.danger }}>− {fmt(exp.amount)}</div>
                            <button onClick={()=>handleDeleteExp(exp.id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:11, padding:0, fontFamily:'inherit' }}>🗑️</button>
                          </div>
                        </div>
                      );
                    })
                }
                {dailyExpenses.length>0 && (
                  <div style={{ padding:'10px 14px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700 }}>
                    <span style={{ color:C.muted }}>Total Expenses</span>
                    <span style={{ color:C.danger }}>{fmt(totalDailyExp)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Bank deposits */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>🏦 Bank Deposits</div>
                <button onClick={()=>{ setDepForm(f=>({...f,date:viewDate})); setShowAddDep(s=>!s); setShowAddExp(false); }}
                  style={{ padding:'7px 14px', background:showAddDep?C.cream:'#2563eb', color:showAddDep?C.muted:'white', border:showAddDep?`1.5px solid ${C.border}`:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {showAddDep?'✕ Cancel':'🏦 Record Deposit'}
                </button>
              </div>

              {/* Add deposit form */}
              {showAddDep && (
                <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
                  {depError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:10 }}>⚠️ {depError}</div>}

                  <div style={{ marginBottom:10 }}>
                    <label style={LBL}>Amount Deposited (Rs.) *</label>
                    <input type="number" value={depForm.amount} onChange={e=>setDepForm(f=>({...f,amount:e.target.value}))}
                      placeholder="e.g. 25000" style={{ ...INP, fontSize:16, fontWeight:700 }} autoFocus/>
                    {/* Quick fill from cash in hand */}
                    {cashInHand > 0 && (
                      <button onClick={()=>setDepForm(f=>({...f,amount:String(Math.round(cashInHand))}))}
                        style={{ marginTop:6, padding:'5px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                        Fill: {fmt(cashInHand)} (cash in hand)
                      </button>
                    )}
                  </div>

                  {/* Payment Type */}
                  <div style={{ marginBottom:10 }}>
                    <label style={LBL}>How was it deposited?</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['cash','💵 Cash deposit'],['online','📱 Online / Transfer'],['cheque','📋 Cheque from customer']].map(([v,l])=>(
                        <button key={v} onClick={()=>setDepForm(f=>({...f,payment_type:v}))}
                          style={{ flex:1, padding:'8px 6px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${depForm.payment_type===v?'#2563eb':C.border}`, background:depForm.payment_type===v?'#eff6ff':'white', color:depForm.payment_type===v?'#1e40af':C.muted, textAlign:'center' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    <div>
                      <label style={LBL}>Bank</label>
                      <select value={depForm.bank_name} onChange={e=>setDepForm(f=>({...f,bank_name:e.target.value}))} style={SEL}>
                        {BANKS.map(b=><option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Account No.</label>
                      <input value={depForm.account_no} onChange={e=>setDepForm(f=>({...f,account_no:e.target.value}))}
                        placeholder="e.g. 1234567890" style={INP}/>
                    </div>
                  </div>

                  {/* Cheque fields */}
                  {depForm.payment_type === 'cheque' && (
                    <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:10 }}>📋 Cheque Details</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={LBL}>Cheque No.</label>
                          <input value={depForm.reference} onChange={e=>setDepForm(f=>({...f,reference:e.target.value}))}
                            placeholder="e.g. 001234" style={INP}/>
                        </div>
                        <div>
                          <label style={LBL}>Cheque Date</label>
                          <input type="date" value={depForm.cheque_date||''} onChange={e=>setDepForm(f=>({...f,cheque_date:e.target.value}))} style={INP}/>
                        </div>
                        <div>
                          <label style={LBL}>Drawn on Bank</label>
                          <input value={depForm.cheque_bank||''} onChange={e=>setDepForm(f=>({...f,cheque_bank:e.target.value}))}
                            placeholder="Customer's bank" style={INP}/>
                        </div>
                        <div>
                          <label style={LBL}>Customer Name</label>
                          <input value={depForm.notes} onChange={e=>setDepForm(f=>({...f,notes:e.target.value}))}
                            placeholder="Cheque holder name" style={INP}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {depForm.payment_type !== 'cheque' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={LBL}>Slip / Ref No.</label>
                        <input value={depForm.reference} onChange={e=>setDepForm(f=>({...f,reference:e.target.value}))} placeholder="Optional" style={INP}/>
                      </div>
                      <div>
                        <label style={LBL}>Notes</label>
                        <input value={depForm.notes} onChange={e=>setDepForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" style={INP}/>
                      </div>
                    </div>
                  )}

                  <button onClick={handleAddDeposit} disabled={savingDep}
                    style={{ width:'100%', padding:'10px', background:savingDep?C.muted:'#2563eb', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:savingDep?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {savingDep?'Saving...':'🏦 Save Deposit'}
                  </button>
                </div>
              )}

              {/* Deposit list */}
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {!dailyDeposits.length
                  ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>🏦</div>
                      No deposits recorded for this day
                    </div>
                  : dailyDeposits.map(dep=>(
                      <div key={dep.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom:`1px solid ${C.cream}` }}>
                        <div style={{ width:36, height:36, borderRadius:9, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                          🏦
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>
                            {dep.bank_name||'Bank Deposit'}
                            {dep.account_no && <span style={{ fontSize:11, color:C.muted, marginLeft:8 }}>A/C: {dep.account_no}</span>}
                          </div>
                          <div style={{ fontSize:11, color:C.muted, display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                            {dep.payment_type && dep.payment_type!=='cash' && (
                              <span style={{ background:dep.payment_type==='cheque'?'#fffbeb':'#eff6ff', color:dep.payment_type==='cheque'?'#92400e':'#1e40af', padding:'1px 7px', borderRadius:20, fontWeight:600, fontSize:10 }}>
                                {dep.payment_type==='cheque'?'📋 Cheque':'📱 Online'}
                              </span>
                            )}
                            {dep.payment_type==='cheque' && dep.reference && <span>Cheque: {dep.reference}</span>}
                            {dep.payment_type!=='cheque' && dep.reference && <span>Ref: {dep.reference}</span>}
                            {dep.notes && <span>{dep.notes}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#2563eb' }}>{fmt(dep.amount)}</div>
                          <button onClick={()=>handleDeleteDep(dep.id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:11, padding:0, fontFamily:'inherit' }}>🗑️</button>
                        </div>
                      </div>
                    ))
                }
                {dailyDeposits.length>0 && (
                  <div style={{ padding:'10px 14px', background:'#eff6ff', display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700 }}>
                    <span style={{ color:C.muted }}>Total Deposited</span>
                    <span style={{ color:'#2563eb' }}>{fmt(totalDailyDeposit)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ EXPENSES TAB ═════════════════════════ */}
      {activeTab==='expenses' && (
        <div>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
            <StatBox label="Month Total"   value={fmt(summary?.totals?.month_total||0)} dark />
            <StatBox label="Today"         value={fmt(summary?.totals?.today_total||0)} color={C.danger} />
            <StatBox label="Transactions"  value={summary?.totals?.count||0}            color='#2563eb' />
            <StatBox label="Categories"    value={summary?.by_category?.length||0}      color='#7c3aed' />
          </div>

          {/* Add button */}
          <div style={{ marginBottom:14, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={()=>{ setExpForm(f=>({...f,date:today()})); setShowAddExp(s=>!s); }}
              style={{ padding:'9px 20px', background:showAddExp?C.cream:C.gold, color:showAddExp?C.muted:C.navy, border:showAddExp?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAddExp?'✕ Cancel':'+ Add Expense'}
            </button>
            <button onClick={()=>setShowManageCats(s=>!s)}
              style={{ padding:'9px 16px', background:showManageCats?C.cream:'#7c3aed', color:showManageCats?C.muted:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showManageCats?'✕ Close':'⚙️ Manage Categories'}
            </button>
            <div style={{ display:'flex', gap:6 }}>
              {[
                { label:'This Month', fn:()=>generatePDF('month', month) },
                { label:'This Week',  fn:()=>generatePDF('week',  null)  },
                { label:'Full Year',  fn:()=>generatePDF('year',  month.slice(0,4)) },
              ].map(btn=>(
                <button key={btn.label} onClick={btn.fn}
                  style={{ padding:'9px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
                  🖨️ {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manage Categories panel */}
          {showManageCats && (
            <div style={{ background:'white', border:`1.5px solid #7c3aed`, borderRadius:14, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#7c3aed', marginBottom:14 }}>⚙️ Manage Custom Categories</div>
              {/* Add new category */}
              <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <label style={LBL}>Category Name</label>
                  <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                    placeholder="e.g. Lab Equipment, Marketing..."
                    style={INP} onKeyDown={e=>e.key==='Enter'&&addCustomCategory()}/>
                </div>
                <div>
                  <label style={LBL}>Icon</label>
                  <select value={newCatIcon} onChange={e=>setNewCatIcon(e.target.value)}
                    style={{ ...INP, width:80 }}>
                    {CAT_ICONS.map(i=><option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <button onClick={addCustomCategory}
                  style={{ padding:'10px 18px', background:'#7c3aed', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  + Add
                </button>
              </div>
              {/* Custom categories list */}
              {customCats.length===0
                ? <div style={{ fontSize:13, color:C.muted, textAlign:'center', padding:'10px 0' }}>No custom categories yet — add one above</div>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {customCats.map(cat=>(
                      <div key={cat.key} style={{ display:'flex', alignItems:'center', gap:6, background:cat.color+'15', border:`1px solid ${cat.color}`, borderRadius:20, padding:'5px 12px', fontSize:13 }}>
                        <span>{cat.icon}</span>
                        <span style={{ fontWeight:600, color:cat.color }}>{cat.key}</span>
                        <button onClick={()=>deleteCustomCategory(cat.key)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:12, padding:'0 0 0 4px' }}>✕</button>
                      </div>
                    ))}
                  </div>
              }
              <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Custom categories are saved locally on this device</div>
            </div>
          )}

          {/* Add form */}
          {showAddExp && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
              {expError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:12 }}>⚠️ {expError}</div>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:14 }}>
                {allCats.map(cat=>(
                  <button key={cat.key} onClick={()=>setExpForm(f=>({...f,category:cat.key}))}
                    style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${expForm.category===cat.key?cat.color:C.border}`, background:expForm.category===cat.key?cat.color+'15':'white', color:expForm.category===cat.key?cat.color:C.muted }}>
                    {cat.icon} {cat.key}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={LBL}>Date</label><input type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))} style={INP}/></div>
                <div><label style={LBL}>Amount (Rs.)</label><input type="number" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 15000" style={INP}/></div>
                <div><label style={LBL}>Payment</label><select value={expForm.payment_method} onChange={e=>setExpForm(f=>({...f,payment_method:e.target.value}))} style={SEL}><option value="cash">💵 Cash</option><option value="bank">🏦 Bank</option></select></div>
              </div>
              {/* Custom name when Other selected */}
              {expForm.category === 'Other' && (
                <div style={{ marginBottom:12, background:'#fffbeb', border:'1.5px solid #f59e0b', borderRadius:9, padding:'10px 12px' }}>
                  <label style={{ ...LBL, color:'#92400e' }}>📝 Expense Name *</label>
                  <input value={customCat} onChange={e=>setCustomCat(e.target.value)}
                    placeholder="e.g. Printing, Donations, Parking, Cleaning..."
                    style={{ ...INP, border:'1.5px solid #f59e0b', background:'white' }} autoFocus/>
                </div>
              )}
              <div style={{ marginBottom:12 }}>
                <label style={LBL}>{expForm.category === 'Other' ? 'Additional Notes (optional)' : 'Description'}</label>
                <input value={expForm.description} onChange={e=>setExpForm(f=>({...f,description:e.target.value}))}
                  placeholder={expForm.category === 'Other' ? 'Any extra details...' : 'Description...'}
                  style={INP}/>
              </div>
              <button onClick={handleAddExpense} disabled={savingExp} style={{ padding:'10px 22px', background:savingExp?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {savingExp?'Saving...':'💾 Save Expense'}
              </button>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16 }}>
            {/* Category breakdown */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>By Category</span>
                <button onClick={()=>setShowBudgets(s=>!s)}
                  style={{ fontSize:11, fontWeight:600, padding:'4px 10px', background:showBudgets?'#fee2e2':C.cream, color:showBudgets?C.danger:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
                  {showBudgets ? '✕ Close' : '🎯 Set Budgets'}
                </button>
              </div>
              {showBudgets && (
                <div style={{ padding:'12px 14px', background:'#fffbeb', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:'#92400e', marginBottom:10, fontWeight:600 }}>Set monthly budget limits per category — you'll get a warning at 80%</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {summary?.by_category?.map(cat => (
                      <div key={cat.category} style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12, minWidth:80, color:C.navy, fontWeight:600 }}>{cat.category}</span>
                        <input type="number" placeholder="No limit"
                          value={budgets[cat.category]||''}
                          onChange={e=>saveBudgets({...budgets,[cat.category]:e.target.value?parseFloat(e.target.value):undefined})}
                          style={{ width:'100%', padding:'5px 8px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:'inherit', outline:'none', background:'white' }}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!summary?.by_category?.length
                ? <div style={{ padding:20, textAlign:'center', color:C.muted, fontSize:13 }}>No expenses</div>
                : summary.by_category.map(cat=>{
                    const info = getCatAll(cat.category);
                    const max  = parseFloat(summary.by_category[0]?.total)||1;
                    return (
                      <div key={cat.category} onClick={()=>setCatFilter(catFilter===cat.category?'all':cat.category)}
                        style={{ padding:'10px 14px', borderBottom:`1px solid ${C.cream}`, cursor:'pointer', background:catFilter===cat.category?info.color+'10':'white' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <span>{info.icon}</span>
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{cat.category}</div>
                              <div style={{ fontSize:10, color:C.muted }}>{cat.count} entries</div>
                            </div>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:info.color }}>{fmt(cat.total)}</span>
                        </div>
                        <div style={{ height:5, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${parseFloat(cat.total)/max*100}%`, background:info.color, borderRadius:3 }}/>
                        </div>
                        {budgets[cat.category] && parseFloat(cat.total) > parseFloat(budgets[cat.category]) * 0.8 && (
                          <div style={{ marginTop:4, fontSize:10, fontWeight:700,
                            color: parseFloat(cat.total) >= parseFloat(budgets[cat.category]) ? C.danger : '#b45309',
                            background: parseFloat(cat.total) >= parseFloat(budgets[cat.category]) ? '#fee2e2' : '#fef9c3',
                            padding:'2px 8px', borderRadius:10, display:'inline-block' }}>
                            {parseFloat(cat.total) >= parseFloat(budgets[cat.category])
                              ? `Over budget! (limit: ${fmt(budgets[cat.category])})`
                              : `${Math.round(parseFloat(cat.total)/parseFloat(budgets[cat.category])*100)}% of Rs. ${parseFloat(budgets[cat.category]).toLocaleString()} budget`}
                          </div>
                        )}
                      </div>
                    );
                  })
              }
              {summary?.totals?.month_total>0 && (
                <div style={{ padding:'10px 14px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700 }}>
                  <span>Total</span><span style={{ color:C.danger }}>{fmt(summary.totals.month_total)}</span>
                </div>
              )}
            </div>

            {/* Expense list */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{catFilter==='all'?'All Expenses':`${getCatAll(catFilter).icon} ${catFilter}`}</span>
                <span style={{ fontSize:12, color:C.muted }}>{allExpenses.length} records</span>
              </div>
              {!allExpenses.length
                ? <div style={{ padding:40, textAlign:'center', color:C.muted }}><div style={{ fontSize:32, marginBottom:8 }}>💸</div>No expenses</div>
                : allExpenses.map((exp,idx)=>{
                    const cat = getCatAll(exp.category);
                    const prev = allExpenses[idx-1];
                    const showD = !prev || prev.date?.slice(0,10) !== exp.date?.slice(0,10);
                    return (
                      <React.Fragment key={exp.id}>
                        {showD && (
                          <div style={{ padding:'7px 16px', background:C.cream, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px' }}>
                            {fmtDate(exp.date?.slice(0,10))}
                            {exp.date?.slice(0,10)===today() && <span style={{ marginLeft:8, background:C.gold, color:C.navy, fontSize:9, padding:'1px 7px', borderRadius:20 }}>Today</span>}
                          </div>
                        )}
                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid ${C.cream}` }}>
                          <div style={{ width:34, height:34, borderRadius:8, background:cat.color+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{cat.icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{exp.description}</div>
                            <div style={{ fontSize:11, color:C.muted }}>
                              <span style={{ background:cat.color+'15', color:cat.color, padding:'1px 7px', borderRadius:20, fontWeight:600, fontSize:10 }}>{exp.category}</span>
                              <span style={{ marginLeft:6 }}>{exp.payment_method==='bank'?'🏦 Bank':'💵 Cash'}</span>
                              {exp.notes && <span style={{ marginLeft:6 }}>· {exp.notes}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:C.danger }}>− {fmt(exp.amount)}</div>
                            <button onClick={()=>handleDeleteExp(exp.id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:11, padding:0, fontFamily:'inherit' }}>🗑️</button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DEPOSITS TAB ═════════════════════════ */}
      {activeTab==='deposits' && (
        <div>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
            <StatBox label="Month Deposited" value={fmt(allDeposits.reduce((s,d)=>s+parseFloat(d.amount||0),0))} color='#2563eb' dark />
            <StatBox label="Deposits"        value={allDeposits.length}                                          color='#2563eb' />
            {(() => {
              const byBank = allDeposits.reduce((acc,d)=>{ acc[d.bank_name||'Unknown']=(acc[d.bank_name||'Unknown']||0)+1; return acc; },{});
              return Object.entries(byBank).slice(0,2).map(([bank,count])=>(
                <StatBox key={bank} label={bank} value={`${count} deposit${count!==1?'s':''}`} color='#2563eb'/>
              ));
            })()}
          </div>

          {/* Add button */}
          <div style={{ marginBottom:14 }}>
            <button onClick={()=>{ setDepForm(f=>({...f,date:today()})); setShowAddDep(s=>!s); }}
              style={{ padding:'9px 20px', background:showAddDep?C.cream:'#2563eb', color:showAddDep?C.muted:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAddDep?'✕ Cancel':'🏦 Record Bank Deposit'}
            </button>
          </div>

          {/* Add deposit form */}
          {showAddDep && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
              {depError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:12 }}>⚠️ {depError}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={LBL}>Date</label><input type="date" value={depForm.date} onChange={e=>setDepForm(f=>({...f,date:e.target.value}))} style={INP}/></div>
                <div><label style={LBL}>Amount (Rs.)</label><input type="number" value={depForm.amount} onChange={e=>setDepForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 25000" style={{ ...INP, fontWeight:700 }}/></div>
                <div><label style={LBL}>Bank</label><select value={depForm.bank_name} onChange={e=>setDepForm(f=>({...f,bank_name:e.target.value}))} style={SEL}>{BANKS.map(b=><option key={b}>{b}</option>)}</select></div>
                <div><label style={LBL}>Account No.</label><input value={depForm.account_no} onChange={e=>setDepForm(f=>({...f,account_no:e.target.value}))} placeholder="e.g. 1234567890" style={INP}/></div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={LBL}>How deposited?</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {[['cash','💵 Cash'],['online','📱 Online'],['cheque','📋 Cheque']].map(([v,l])=>(
                      <button key={v} onClick={()=>setDepForm(f=>({...f,payment_type:v}))}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${depForm.payment_type===v?'#2563eb':C.border}`, background:depForm.payment_type===v?'#eff6ff':'white', color:depForm.payment_type===v?'#1e40af':C.muted }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {depForm.payment_type === 'cheque'
                  ? <>
                      <div><label style={LBL}>Cheque No. *</label><input value={depForm.reference} onChange={e=>setDepForm(f=>({...f,reference:e.target.value}))} placeholder="e.g. 001234" style={INP}/></div>
                      <div><label style={LBL}>Cheque Date</label><input type="date" value={depForm.cheque_date||''} onChange={e=>setDepForm(f=>({...f,cheque_date:e.target.value}))} style={INP}/></div>
                      <div><label style={LBL}>Drawn on Bank</label><input value={depForm.cheque_bank||''} onChange={e=>setDepForm(f=>({...f,cheque_bank:e.target.value}))} placeholder="Customer's bank" style={INP}/></div>
                      <div><label style={LBL}>Cheque Holder</label><input value={depForm.notes} onChange={e=>setDepForm(f=>({...f,notes:e.target.value}))} placeholder="Customer name" style={INP}/></div>
                    </>
                  : <div><label style={LBL}>Slip / Reference No.</label><input value={depForm.reference} onChange={e=>setDepForm(f=>({...f,reference:e.target.value}))} placeholder="Optional" style={INP}/></div>
                }
              </div>
              <div style={{ marginBottom:12 }}><label style={LBL}>Notes</label><input value={depForm.notes} onChange={e=>setDepForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" style={INP}/></div>
              <button onClick={handleAddDeposit} disabled={savingDep} style={{ padding:'10px 22px', background:savingDep?C.muted:'#2563eb', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {savingDep?'Saving...':'🏦 Save Deposit'}
              </button>
            </div>
          )}

          {/* Deposit list */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>All Deposits</span>
              <span style={{ fontSize:13, color:C.muted }}>{allDeposits.length} records</span>
            </div>
            {!allDeposits.length
              ? <div style={{ padding:40, textAlign:'center', color:C.muted }}><div style={{ fontSize:32, marginBottom:8 }}>🏦</div>No deposits this month</div>
              : allDeposits.map((dep,idx)=>{
                  const prev  = allDeposits[idx-1];
                  const showD = !prev || prev.date?.slice(0,10) !== dep.date?.slice(0,10);
                  return (
                    <React.Fragment key={dep.id}>
                      {showD && (
                        <div style={{ padding:'7px 18px', background:C.cream, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px' }}>
                          {fmtDate(dep.date?.slice(0,10))}
                          {dep.date?.slice(0,10)===today() && <span style={{ marginLeft:8, background:'#dbeafe', color:'#1d4ed8', fontSize:9, padding:'1px 7px', borderRadius:20 }}>Today</span>}
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderBottom:`1px solid ${C.cream}` }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏦</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>
                            {dep.bank_name||'Bank Deposit'}
                            {dep.account_no && <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>A/C: {dep.account_no}</span>}
                          </div>
                          <div style={{ fontSize:12, color:C.muted, display:'flex', gap:8, flexWrap:'wrap', marginTop:2 }}>
                            {dep.payment_type && dep.payment_type!=='cash' && (
                              <span style={{ background:dep.payment_type==='cheque'?'#fffbeb':'#eff6ff', color:dep.payment_type==='cheque'?'#92400e':'#1e40af', padding:'2px 9px', borderRadius:20, fontWeight:700, fontSize:11 }}>
                                {dep.payment_type==='cheque'?'📋 Cheque':'📱 Online Transfer'}
                              </span>
                            )}
                            {dep.payment_type==='cheque' && dep.reference && <span><b>Cheque No:</b> {dep.reference}</span>}
                            {dep.payment_type==='cheque' && dep.cheque_bank && <span>· {dep.cheque_bank}</span>}
                            {dep.payment_type!=='cheque' && dep.reference && <span style={{ fontWeight:600 }}>Ref: {dep.reference}</span>}
                            {dep.reference && dep.notes && ' · '}
                            {dep.notes}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'#2563eb' }}>{fmt(dep.amount)}</div>
                          <button onClick={()=>handleDeleteDep(dep.id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:11, padding:0, fontFamily:'inherit' }}>🗑️ delete</button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
            }
            {allDeposits.length>0 && (
              <div style={{ padding:'12px 18px', background:'#eff6ff', display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700 }}>
                <span style={{ color:C.muted }}>Total Deposited</span>
                <span style={{ color:'#2563eb' }}>{fmt(allDeposits.reduce((s,d)=>s+parseFloat(d.amount||0),0))}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}