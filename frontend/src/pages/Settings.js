/* eslint-disable */
// ============================================================
//  Settings.js — Password + Staff management + Permissions
// ============================================================
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };

// ── All features that can be toggled per staff ────────────────
const ALL_FEATURES = [
  { key:'dashboard',       label:'Dashboard',         icon:'🏠', group:'Core',     desc:'Daily cash summary, reminders, QR scan' },
  { key:'orders',          label:'Orders',             icon:'📋', group:'Core',     desc:'View, create and manage orders' },
  { key:'new_order',       label:'New Order',          icon:'➕', group:'Core',     desc:'Create new orders (requires Orders)' },
  { key:'quick_sale',      label:'Quick Sale',         icon:'⚡', group:'Core',     desc:'Cash sales without Rx' },
  { key:'customers',       label:'Customers',          icon:'👥', group:'Core',     desc:'Customer profiles, Rx history' },
  { key:'inventory',       label:'Inventory',          icon:'📦', group:'Core',     desc:'View and manage stock' },
  { key:'repairs',         label:'Repairs',            icon:'🔧', group:'Core',     desc:'Repair jobs tracking' },
  { key:'expenses',        label:'Expenses & Cash',    icon:'💸', group:'Finance',  desc:'Daily cash flow, expenses, deposits' },
  { key:'reports',         label:'Reports',            icon:'📊', group:'Finance',  desc:'Revenue, profit, top sellers' },
  { key:'lens_prices',     label:'Lens Prices',        icon:'🔬', group:'Finance',  desc:'Lens price list and supplier reference' },
  { key:'kalutota',        label:'Kalutota Account',   icon:'🏪', group:'Finance',  desc:'Inter-shop trade account' },
  { key:'bulk_import',     label:'Bulk Import',        icon:'📥', group:'Admin',    desc:'Import past orders' },
  { key:'delete_orders',   label:'Delete Orders',      icon:'🗑️', group:'Admin',    desc:'Can delete orders (sensitive)' },
  { key:'delete_inventory',label:'Delete Inventory',   icon:'🗑️', group:'Admin',    desc:'Can delete inventory items' },
  { key:'print_receipts',  label:'Print Receipts',     icon:'🖨️', group:'Core',     desc:'Print advance and balance bills' },
];

const GROUPS = ['Core','Finance','Admin'];

// Default permissions for new staff
const DEFAULT_STAFF_PERMS = [
  'dashboard','orders','new_order','quick_sale',
  'customers','inventory','repairs','print_receipts',
];

function api(path, method='GET', body=null) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method,
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r=>r.json());
}

// ── Permission editor ─────────────────────────────────────────
function PermissionEditor({ permissions, onChange, compact=false }) {
  const perms = permissions || DEFAULT_STAFF_PERMS;
  const toggle = (key) => {
    const next = perms.includes(key) ? perms.filter(k=>k!==key) : [...perms, key];
    onChange(next);
  };
  const setGroup = (group, on) => {
    const groupKeys = ALL_FEATURES.filter(f=>f.group===group).map(f=>f.key);
    const without   = perms.filter(k=>!groupKeys.includes(k));
    onChange(on ? [...without, ...groupKeys] : without);
  };

  return (
    <div>
      {GROUPS.map(group=>{
        const features = ALL_FEATURES.filter(f=>f.group===group);
        const allOn    = features.every(f=>perms.includes(f.key));
        const someOn   = features.some(f=>perms.includes(f.key));
        return (
          <div key={group} style={{ marginBottom:14 }}>
            {/* Group header with select-all toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted }}>{group}</div>
              <button onClick={()=>setGroup(group, !allOn)}
                style={{ padding:'3px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  border:`1px solid ${allOn?C.success:C.border}`,
                  background:allOn?'#dcfce7':someOn?'#fef9c3':'white',
                  color:allOn?C.success:someOn?'#92400e':C.muted,
                  borderRadius:20 }}>
                {allOn?'All on':'All off'}
              </button>
            </div>
            {/* Feature toggles */}
            <div style={{ display:'grid', gridTemplateColumns:compact?'1fr':'1fr 1fr', gap:6 }}>
              {features.map(f=>{
                const on = perms.includes(f.key);
                return (
                  <div key={f.key} onClick={()=>toggle(f.key)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, cursor:'pointer',
                      border:`1.5px solid ${on?C.navy:C.border}`,
                      background:on?'#f0f4ff':'white',
                      transition:'all .1s' }}>
                    {/* Toggle pill */}
                    <div style={{ width:36, height:20, borderRadius:10, background:on?C.navy:C.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
                      <div style={{ position:'absolute', top:3, left:on?19:3, width:14, height:14, borderRadius:'50%', background:'white', transition:'left .15s' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:on?C.navy:C.muted, display:'flex', alignItems:'center', gap:5 }}>
                        <span>{f.icon}</span> {f.label}
                      </div>
                      {!compact && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{f.desc}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function Settings() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [pwForm,    setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [pwMsg,     setPwMsg]    = useState('');
  const [pwError,   setPwError]  = useState('');
  const [pwSaving,  setPwSaving] = useState(false);

  const [staffList,    setStaffList]    = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm,    setStaffForm]    = useState({ username:'', full_name:'', password:'', role:'staff', permissions: DEFAULT_STAFF_PERMS });
  const [staffMsg,     setStaffMsg]     = useState('');
  const [staffError,   setStaffError]   = useState('');
  const [staffSaving,  setStaffSaving]  = useState(false);

  const [resetId,   setResetId]  = useState(null);
  const [resetPw,   setResetPw]  = useState('');
  const [resetMsg,  setResetMsg] = useState('');

  // Which staff member's permissions we're editing
  const [editPermId,   setEditPermId]   = useState(null);
  const [editPermData, setEditPermData] = useState([]);
  const [savingPerm,   setSavingPerm]   = useState(false);
  const [permMsg,      setPermMsg]      = useState('');

  useEffect(()=>{ if (isAdmin) loadStaff(); },[isAdmin]);

  const loadStaff = async () => {
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/users`, { headers:{ Authorization:`Bearer ${token}` } });
      const data  = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwMsg('');
    if (!pwForm.current || !pwForm.newPw) return setPwError('Please fill in all fields');
    if (pwForm.newPw !== pwForm.confirm)  return setPwError('New passwords do not match');
    if (pwForm.newPw.length < 6)          return setPwError('Password must be at least 6 characters');
    setPwSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/change-password`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPwMsg('Password changed successfully');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e) { setPwError(e.message); }
    finally { setPwSaving(false); }
  };

  const handleAddStaff = async () => {
    setStaffError(''); setStaffMsg('');
    if (!staffForm.username.trim())  return setStaffError('Username required');
    if (!staffForm.full_name.trim()) return setStaffError('Full name required');
    if (!staffForm.password || staffForm.password.length < 6) return setStaffError('Password must be at least 6 characters');
    setStaffSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/users`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          username:    staffForm.username,
          full_name:   staffForm.full_name,
          password:    staffForm.password,
          role:        staffForm.role,
          permissions: staffForm.role === 'admin' ? ALL_FEATURES.map(f=>f.key) : staffForm.permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStaffMsg(`Account created for ${staffForm.full_name}`);
      setStaffForm({ username:'', full_name:'', password:'', role:'staff', permissions: DEFAULT_STAFF_PERMS });
      setShowAddStaff(false);
      loadStaff();
    } catch(e) { setStaffError(e.message); }
    finally { setStaffSaving(false); }
  };

  const handleSavePermissions = async (id) => {
    setSavingPerm(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/users/${id}/permissions`, {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ permissions: editPermData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPermMsg('Permissions saved');
      setEditPermId(null);
      loadStaff();
      setTimeout(()=>setPermMsg(''),3000);
    } catch(e) { setPermMsg(e.message); }
    finally { setSavingPerm(false); }
  };

  const handleResetPassword = async (id) => {
    if (!resetPw || resetPw.length < 6) return setResetMsg('Password must be at least 6 characters');
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/users/${id}/reset-password`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ newPassword: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResetMsg('Password reset');
      setResetId(null); setResetPw('');
      setTimeout(()=>setResetMsg(''),3000);
    } catch(e) { setResetMsg(e.message); }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s account?`)) return;
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      await fetch(`${BASE}/auth/users/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      loadStaff();
    } catch(e) { console.error(e); }
  };

  const ROLE_INFO = {
    admin: { label:'Admin', color:'#7c3aed', bg:'#f5f3ff' },
    staff: { label:'Staff', color:'#2563eb', bg:'#eff6ff' },
  };

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:700 }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:'0 0 4px' }}>Settings</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Manage your account and staff access</p>

      {/* ── CHANGE PASSWORD ── */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:4 }}>🔒 Change Password</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:18 }}>
          Logged in as: <b style={{color:C.navy}}>{user?.name}</b>
          <span style={{ marginLeft:8, background:ROLE_INFO[user?.role]?.bg||C.cream, color:ROLE_INFO[user?.role]?.color||C.muted, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>
            {user?.role}
          </span>
        </div>

        {pwMsg   && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{pwMsg}</div>}
        {pwError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger,  borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{pwError}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { l:'Current Password', k:'current', },
            { l:'New Password',     k:'newPw',   },
            { l:'Confirm New Password', k:'confirm', },
          ].map(f=>(
            <div key={f.k}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>{f.l}</label>
              <input type="password" value={pwForm[f.k]} onChange={e=>setPwForm(p=>({...p,[f.k]:e.target.value}))}
                placeholder={f.l} style={INP}/>
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={pwSaving}
            style={{ padding:'10px 22px', background:pwSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', alignSelf:'flex-start' }}>
            {pwSaving?'Saving...':'Save New Password'}
          </button>
        </div>
      </div>

      {/* ── STAFF MANAGEMENT ── */}
      {isAdmin && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>👥 Staff Accounts</div>
            <button onClick={()=>{ setShowAddStaff(s=>!s); setStaffError(''); setStaffMsg(''); }}
              style={{ padding:'7px 16px', background:showAddStaff?C.cream:C.gold, color:showAddStaff?C.muted:C.navy, border:showAddStaff?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAddStaff?'✕ Cancel':'+ Add Staff'}
            </button>
          </div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:18 }}>Manage who can login and which features they can access</div>

          {/* Add staff form */}
          {showAddStaff && (
            <div style={{ background:C.cream, borderRadius:12, padding:20, marginBottom:18, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:16 }}>New Staff Account</div>

              {staffError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>{staffError}</div>}
              {staffMsg   && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>{staffMsg}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Full Name *</label>
                  <input value={staffForm.full_name} onChange={e=>setStaffForm(f=>({...f,full_name:e.target.value}))} placeholder="e.g. Nimal Perera" style={INP}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Username *</label>
                  <input value={staffForm.username} onChange={e=>setStaffForm(f=>({...f,username:e.target.value.toLowerCase().replace(/\s/g,'')}))} placeholder="e.g. nimal" style={INP}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Password *</label>
                  <input type="password" value={staffForm.password} onChange={e=>setStaffForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters" style={INP}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Role *</label>
                  <select value={staffForm.role}
                    onChange={e=>setStaffForm(f=>({...f, role:e.target.value, permissions: e.target.value==='admin' ? ALL_FEATURES.map(f=>f.key) : DEFAULT_STAFF_PERMS }))}
                    style={{ ...INP, cursor:'pointer' }}>
                    <option value="staff">Staff — custom permissions</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
              </div>

              {/* Permissions — only shown for staff role */}
              {staffForm.role === 'staff' && (
                <div style={{ background:'white', borderRadius:10, padding:16, marginBottom:14, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>
                    Feature Access
                    <span style={{ marginLeft:8, fontSize:11, color:C.muted, fontWeight:400 }}>
                      {staffForm.permissions.length} of {ALL_FEATURES.length} features enabled
                    </span>
                  </div>
                  <PermissionEditor
                    permissions={staffForm.permissions}
                    onChange={perms=>setStaffForm(f=>({...f,permissions:perms}))}
                    compact={false}
                  />
                </div>
              )}

              {staffForm.role === 'admin' && (
                <div style={{ background:'#f5f3ff', border:`1px solid #c4b5fd`, borderRadius:10, padding:'11px 14px', marginBottom:14, fontSize:13, color:'#7c3aed' }}>
                  Admin has full access to all features — no restrictions.
                </div>
              )}

              <button onClick={handleAddStaff} disabled={staffSaving}
                style={{ padding:'10px 22px', background:staffSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {staffSaving?'Creating...':'Create Account'}
              </button>
            </div>
          )}

          {/* Messages */}
          {resetMsg && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:9, padding:'9px 14px', fontSize:13, marginBottom:12 }}>{resetMsg}</div>}
          {permMsg  && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:9, padding:'9px 14px', fontSize:13, marginBottom:12 }}>{permMsg}</div>}

          {/* Staff list */}
          {!staffList.length
            ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>No staff accounts yet</div>
            : staffList.map(s=>{
                const info          = ROLE_INFO[s.role] || ROLE_INFO.staff;
                const isCurrentUser = s.id === user?.id;
                const perms         = s.permissions || (s.role==='admin' ? ALL_FEATURES.map(f=>f.key) : DEFAULT_STAFF_PERMS);
                const isEditingPerm = editPermId === s.id;
                const isEditingReset= resetId    === s.id;
                return (
                  <div key={s.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, marginBottom:12, overflow:'hidden', background:'white' }}>

                    {/* Staff row header */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:42, height:42, borderRadius:'50%', background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:info.color, flexShrink:0 }}>
                          {s.full_name?.charAt(0)||'?'}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.navy, display:'flex', alignItems:'center', gap:8 }}>
                            {s.full_name}
                            {isCurrentUser && <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>(you)</span>}
                            <span style={{ background:info.bg, color:info.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{info.label}</span>
                          </div>
                          <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>@{s.username}</div>
                          {/* Permission summary */}
                          {s.role !== 'admin' && (
                            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                              {perms.length} features · {perms.slice(0,4).map(k=>ALL_FEATURES.find(f=>f.key===k)?.icon||'').join('')}
                              {perms.length>4?` +${perms.length-4} more`:''}
                            </div>
                          )}
                          {s.role === 'admin' && (
                            <div style={{ fontSize:11, color:'#7c3aed', marginTop:3 }}>Full access to all features</div>
                          )}
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          {s.role !== 'admin' && (
                            <button onClick={()=>{
                              if (isEditingPerm) { setEditPermId(null); }
                              else { setEditPermId(s.id); setEditPermData(perms); setResetId(null); }
                            }}
                              style={{ padding:'5px 12px', background:isEditingPerm?'#fee2e2':'#eff6ff', border:`1px solid ${isEditingPerm?'#fca5a5':'#93c5fd'}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:isEditingPerm?C.danger:'#1e40af' }}>
                              {isEditingPerm ? '✕ Cancel' : '🔐 Permissions'}
                            </button>
                          )}
                          <button onClick={()=>{ setResetId(resetId===s.id?null:s.id); setResetPw(''); setEditPermId(null); }}
                            style={{ padding:'5px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                            🔑 Reset PW
                          </button>
                          <button onClick={()=>handleDeleteStaff(s.id, s.full_name)}
                            style={{ padding:'5px 10px', background:'#fee2e2', border:`1px solid #fca5a5`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permission editor — expands inline */}
                    {isEditingPerm && (
                      <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 16px 20px', background:C.cream }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:14 }}>
                          Feature Access for {s.full_name}
                          <span style={{ marginLeft:8, fontSize:11, color:C.muted, fontWeight:400 }}>
                            {editPermData.length} of {ALL_FEATURES.length} enabled
                          </span>
                        </div>
                        <PermissionEditor
                          permissions={editPermData}
                          onChange={setEditPermData}
                          compact={false}
                        />
                        <div style={{ display:'flex', gap:8, marginTop:16 }}>
                          <button onClick={()=>handleSavePermissions(s.id)} disabled={savingPerm}
                            style={{ padding:'10px 22px', background:savingPerm?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            {savingPerm?'Saving...':'Save Permissions'}
                          </button>
                          <button onClick={()=>setEditPermId(null)}
                            style={{ padding:'10px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                            Cancel
                          </button>
                          <button onClick={()=>setEditPermData(DEFAULT_STAFF_PERMS)}
                            style={{ padding:'10px 14px', background:'#fef9c3', border:`1px solid #fde68a`, borderRadius:9, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#92400e' }}>
                            Reset to defaults
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Password reset — expands inline */}
                    {isEditingReset && (
                      <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px', background:C.cream, display:'flex', gap:8 }}>
                        <input type="password" value={resetPw} onChange={e=>setResetPw(e.target.value)}
                          placeholder="New password (min 6 chars)" style={{ ...INP, flex:1 }}/>
                        <button onClick={()=>handleResetPassword(s.id)}
                          style={{ padding:'10px 16px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {!isAdmin && (
        <div style={{ background:'#eff6ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#0369a1', marginBottom:4 }}>Staff Account</div>
          <div style={{ fontSize:13, color:'#0369a1' }}>
            You are logged in as <b>{user?.name}</b>. Contact your admin to change permissions or access level.
          </div>
        </div>
      )}
    </div>
  );
}