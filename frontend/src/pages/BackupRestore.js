/* eslint-disable */
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  surface:'white', border:'#e0ddd6', muted:'#6b7280',
  success:'#15803d', danger:'#dc2626',
};

async function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL||'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  const res   = await fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

export default function BackupRestore() {
  const [loading,    setLoading]    = useState(false);
  const [status,     setStatus]     = useState('');
  const [backupInfo, setBackupInfo] = useState(null);
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('ko_last_backup')||null);

  const handleExport = async () => {
    setLoading(true);
    setStatus('Connecting to database...');
    try {
      setStatus('Fetching all records (may take 10-20 seconds)...');
      const data = await apiGet('/backup');

      setStatus('Building Excel workbook...');
      const wb = XLSX.utils.book_new();

      const sheets = [
        { key:'customers',    name:'Customers',     note:'All customer profiles' },
        { key:'orders',       name:'Orders',         note:'All spectacle orders' },
        { key:'repairs',      name:'Repairs',        note:'All repair jobs' },
        { key:'quick_sales',  name:'Quick Sales',    note:'All walk-in sales' },
        { key:'expenses',     name:'Expenses',       note:'All expense records' },
        { key:'inventory',    name:'Inventory',      note:'All stock items' },
        { key:'kalutota',     name:'Kalutota AC',    note:'Inter-shop transactions' },
        { key:'deposits',     name:'Bank Deposits',  note:'All bank deposit records' },
        { key:'stock_history',name:'Stock History',  note:'Stock movements' },
        { key:'refractions',  name:'Refractions',    note:'Eye test records' },
      ];

      sheets.forEach(({ key, name }) => {
        const rows = data.tables[key] || [];
        const ws   = rows.length
          ? XLSX.utils.json_to_sheet(rows)
          : XLSX.utils.aoa_to_sheet([['No records in this table']]);
        if (rows.length) {
          ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(Math.max(k.length, 10), 40) }));
        }
        XLSX.utils.book_append_sheet(wb, ws, name);
      });

      const now = new Date().toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const summary = [
        ['KURUWITA OPTICAL — COMPLETE DATA BACKUP'],
        ['Exported:', now],
        [''],
        ['TABLE', 'RECORDS', 'NOTES'],
        ...sheets.map(s => [s.name, (data.tables[s.key]||[]).length, s.note]),
        [''],
        ['TOTAL', sheets.reduce((sum,s)=>sum+(data.tables[s.key]||[]).length,0), 'records across all tables'],
        [''],
        ['HOW TO RESTORE:'],
        ['1. Save this file securely (Google Drive / email to yourself)'],
        ['2. If data is lost, contact developer with this file'],
        ['3. Developer can re-import data within minutes'],
      ];
      const sumWs = XLSX.utils.aoa_to_sheet(summary);
      sumWs['!cols'] = [{wch:22},{wch:10},{wch:35}];
      XLSX.utils.book_append_sheet(wb, sumWs, 'SUMMARY');
      wb.SheetNames = ['SUMMARY', ...wb.SheetNames.filter(n => n !== 'SUMMARY')];

      const fileName = `KurwitaOptical_Backup_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const ts = new Date().toLocaleString('en-GB');
      localStorage.setItem('ko_last_backup', ts);
      setLastBackup(ts);
      setBackupInfo({ counts: data.counts, fileName });
      setStatus('SUCCESS');
    } catch(e) {
      setStatus('ERROR:' + e.message);
    } finally { setLoading(false); }
  };

  const statusColor = status === 'SUCCESS' ? C.success
    : status.startsWith('ERROR') ? C.danger : '#1d4ed8';
  const statusBg = status === 'SUCCESS' ? '#f0fdf4'
    : status.startsWith('ERROR') ? '#fef2f2' : '#eff6ff';

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:900, width:'100%', margin:'0 auto' }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.navy, margin:'0 0 4px' }}>💾 Backup & Recovery</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'0 0 24px' }}>Export all your data to Excel · Keep local copies · Protect against data loss</p>

      {status && status !== '' && (
        <div style={{ background:statusBg, border:`1.5px solid ${statusColor}44`, borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, fontWeight:600, color:statusColor }}>
          {status === 'SUCCESS' ? '✅ Backup downloaded successfully!' : status.startsWith('ERROR') ? '❌ ' + status.replace('ERROR:','') : '⏳ ' + status}
        </div>
      )}

      {/* Main export card */}
      <div style={{ background:'white', border:`2.5px solid ${C.gold}`, borderRadius:16, padding:28, marginBottom:20, boxShadow:'0 4px 20px rgba(201,168,76,.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.navy, marginBottom:6 }}>📥 Export All Data to Excel</div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>
              Downloads a complete <b>Excel file</b> with <b>10 separate sheets</b> — one per table.<br/>
              Includes every customer, order, repair, sale, expense, and inventory item.
            </div>
          </div>
          <div style={{ fontSize:48, marginLeft:16 }}>📊</div>
        </div>

        {lastBackup && (
          <div style={{ background:C.cream, borderRadius:9, padding:'8px 14px', marginBottom:14, fontSize:12, color:C.muted, display:'flex', alignItems:'center', gap:8 }}>
            🕐 Last backup: <b style={{ color:C.navy }}>{lastBackup}</b>
          </div>
        )}
        {!lastBackup && (
          <div style={{ background:'#fef9c3', border:'1px solid #fcd34d', borderRadius:9, padding:'8px 14px', marginBottom:14, fontSize:12, color:'#92400e', fontWeight:600 }}>
            ⚠️ No backup taken yet — download one now to protect your data!
          </div>
        )}

        <button onClick={handleExport} disabled={loading}
          style={{ width:'100%', padding:'16px', background:loading?C.muted:C.navy, color:'white', border:'none',
            borderRadius:12, fontSize:16, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit',
            boxShadow:loading?'none':'0 4px 16px rgba(15,31,61,.25)', transition:'all .15s' }}>
          {loading ? '⏳ Exporting all data...' : '💾 Download Excel Backup Now'}
        </button>

        {backupInfo && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, color:C.muted, marginBottom:8, fontWeight:600 }}>
              ✅ File saved: <b style={{ color:C.navy }}>{backupInfo.fileName}</b>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {Object.entries(backupInfo.counts).map(([k,v])=>(
                <div key={k} style={{ background:C.cream, borderRadius:9, padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:2 }}>{k.replace('_',' ')}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:C.navy }}>{v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* What's included */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>📋 What's Included</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            {icon:'👥',l:'Customers',d:'All profiles, phone, age, history'},
            {icon:'📋',l:'Orders',d:'All spectacle orders and Rx'},
            {icon:'🔧',l:'Repairs',d:'All repair jobs and payments'},
            {icon:'🛍️',l:'Quick Sales',d:'All walk-in sales with items'},
            {icon:'💸',l:'Expenses',d:'All expense records by category'},
            {icon:'📦',l:'Inventory',d:'All frames, sunglasses, stock'},
            {icon:'🏪',l:'Kalutota A/C',d:'All inter-shop transactions'},
            {icon:'🏦',l:'Bank Deposits',d:'All deposit records'},
            {icon:'📜',l:'Stock History',d:'Stock movement log'},
            {icon:'👁️',l:'Refractions',d:'Eye test prescription records'},
          ].map(item=>(
            <div key={item.l} style={{ display:'flex', gap:10, padding:'8px 12px', background:C.cream, borderRadius:9, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{item.l}</div>
                <div style={{ fontSize:11, color:C.muted }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:14, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#92400e', marginBottom:10 }}>⚠️ Backup Best Practices</div>
        {[
          {i:'📅',t:'Take a backup at the end of every month and save to Google Drive'},
          {i:'🔴',t:'Always backup after entering a large batch of orders or importing data'},
          {i:'📂',t:'Keep 3 copies: this week, last month, and 3 months ago'},
          {i:'📧',t:'Email the Excel file to yourself so you have an offsite copy'},
          {i:'🔒',t:'The file contains all customer data — store it privately'},
        ].map((tip,i)=>(
          <div key={i} style={{ display:'flex', gap:10, fontSize:13, color:'#78350f', marginBottom:6 }}>
            <span>{tip.i}</span><span>{tip.t}</span>
          </div>
        ))}
      </div>

      {/* Restore guide */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>🔄 If Something Goes Wrong — How to Restore</div>
        {[
          'Open your most recent backup Excel file',
          'Find the sheet with lost data (e.g. "Customers" or "Orders")',
          'Send the file to the developer (Hirusha)',
          'Developer re-imports the rows into the database within minutes',
        ].map((step,i)=>(
          <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', background:C.cream, borderRadius:9, marginBottom:8, alignItems:'center' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:C.navy, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
            <div style={{ fontSize:13, color:C.navy }}>{step}</div>
          </div>
        ))}
        <div style={{ marginTop:12, padding:'10px 14px', background:'#f0fdf4', borderRadius:9, fontSize:12, color:C.success, fontWeight:600 }}>
          ✅ With a recent backup, no data is ever permanently lost. The more often you backup, the safer you are.
        </div>
      </div>
    </div>
  );
}