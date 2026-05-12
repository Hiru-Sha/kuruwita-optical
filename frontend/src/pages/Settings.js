/* eslint-disable */
// ============================================================
//  Settings.js — Change password + staff management (admin only)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };

function api(path, method='GET', body=null) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method,
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r=>r.json());
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  // Change password
  const [pwForm,    setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [pwMsg,     setPwMsg]    = useState('');
  const [pwError,   setPwError]  = useState('');
  const [pwSaving,  setPwSaving] = useState(false);

  // Staff management (admin only)
  const [staffList,  setStaffList]  = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm,  setStaffForm]  = useState({ username:'', full_name:'', password:'', role:'staff' });
  const [staffMsg,   setStaffMsg]   = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffSaving,setStaffSaving]= useState(false);

  // Reset staff password
  const [resetId,     setResetId]    = useState(null);
  const [resetPw,     setResetPw]    = useState('');
  const [resetMsg,    setResetMsg]   = useState('');

  useEffect(()=>{
    if (isAdmin) loadStaff();
  },[isAdmin]);

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
      setPwMsg('Password changed successfully ✅');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e) { setPwError(e.message); }
    finally { setPwSaving(false); }
  };

  const handleAddStaff = async () => {
    setStaffError(''); setStaffMsg('');
    if (!staffForm.username.trim()) return setStaffError('Username required');
    if (!staffForm.full_name.trim()) return setStaffError('Full name required');
    if (!staffForm.password || staffForm.password.length < 6) return setStaffError('Password must be at least 6 characters');
    setStaffSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/auth/users`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStaffMsg(`Account created for ${staffForm.full_name} ✅`);
      setStaffForm({ username:'', full_name:'', password:'', role:'staff' });
      setShowAddStaff(false);
      loadStaff();
    } catch(e) { setStaffError(e.message); }
    finally { setStaffSaving(false); }
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
      setResetMsg('Password reset ✅');
      setResetId(null); setResetPw('');
      setTimeout(()=>setResetMsg(''), 3000);
    } catch(e) { setResetMsg(e.message); }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s account? They will no longer be able to login.`)) return;
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      await fetch(`${BASE}/auth/users/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      loadStaff();
    } catch(e) { console.error(e); }
  };

  const ROLE_INFO = {
    admin: { label:'Admin', color:'#7c3aed', bg:'#f5f3ff', desc:'Full access to everything' },
    staff: { label:'Staff', color:'#2563eb', bg:'#eff6ff', desc:'Orders, customers, inventory, quick sale only' },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:640 }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:'0 0 4px' }}>⚙️ Settings</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Manage your account and staff access</p>

      {/* ── CHANGE PASSWORD ── */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:4 }}>🔒 Change Password</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:18 }}>Logged in as: <b style={{color:C.navy}}>{user?.name}</b> ({user?.role})</div>

        {pwMsg   && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{pwMsg}</div>}
        {pwError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger,  borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>⚠️ {pwError}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { l:'Current Password', k:'current', t:'password' },
            { l:'New Password',     k:'newPw',   t:'password' },
            { l:'Confirm Password', k:'confirm',  t:'password' },
          ].map(f=>(
            <div key={f.k}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>{f.l}</label>
              <input type={f.t} value={pwForm[f.k]} onChange={e=>setPwForm(p=>({...p,[f.k]:e.target.value}))}
                placeholder={f.l} style={INP}/>
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={pwSaving}
            style={{ padding:'10px 22px', background:pwSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', alignSelf:'flex-start' }}>
            {pwSaving?'Saving...':'Save New Password'}
          </button>
        </div>
      </div>

      {/* ── STAFF MANAGEMENT (admin only) ── */}
      {isAdmin && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>👥 Staff Accounts</div>
            <button onClick={()=>setShowAddStaff(s=>!s)}
              style={{ padding:'7px 16px', background:showAddStaff?C.cream:C.gold, color:showAddStaff?C.muted:C.navy, border:showAddStaff?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAddStaff?'✕ Cancel':'+ Add Staff'}
            </button>
          </div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:18 }}>Manage who can access the system and what they can see</div>

          {/* Role explanation */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
            {Object.entries(ROLE_INFO).map(([role, info])=>(
              <div key={role} style={{ background:info.bg, borderRadius:10, padding:'12px 14px', border:`1px solid ${info.color}30` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ background:info.color, color:'white', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{info.label}</span>
                </div>
                <div style={{ fontSize:12, color:info.color, fontWeight:600 }}>{info.desc}</div>
                {role==='staff' && (
                  <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                    ✅ Orders · Quick Sale · Customers · Inventory<br/>
                    ❌ Reports · Expenses · Profit data
                  </div>
                )}
                {role==='admin' && (
                  <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                    ✅ Everything including Reports, Expenses, Profit
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add staff form */}
          {showAddStaff && (
            <div style={{ background:C.cream, borderRadius:12, padding:18, marginBottom:18 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>New Staff Account</div>
              {staffError && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>⚠️ {staffError}</div>}
              {staffMsg   && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>{staffMsg}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
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
                  <select value={staffForm.role} onChange={e=>setStaffForm(f=>({...f,role:e.target.value}))}
                    style={{ ...INP, cursor:'pointer' }}>
                    <option value="staff">Staff — limited access</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
              </div>

              <button onClick={handleAddStaff} disabled={staffSaving}
                style={{ padding:'10px 22px', background:staffSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {staffSaving?'Creating...':'✓ Create Account'}
              </button>
            </div>
          )}

          {/* Staff list */}
          {resetMsg && <div style={{ background:'#dcfce7', border:`1px solid #86efac`, color:C.success, borderRadius:9, padding:'9px 14px', fontSize:13, marginBottom:12 }}>{resetMsg}</div>}

          {!staffList.length
            ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>No staff accounts yet</div>
            : staffList.map(s=>{
                const info = ROLE_INFO[s.role] || ROLE_INFO.staff;
                const isCurrentUser = s.id === user?.id;
                return (
                  <div key={s.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', marginBottom:10, background:'white' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: resetId===s.id?12:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:'50%', background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:info.color, flexShrink:0 }}>
                          {s.full_name?.charAt(0)||'?'}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>
                            {s.full_name}
                            {isCurrentUser && <span style={{ marginLeft:8, fontSize:11, color:C.muted }}>(you)</span>}
                          </div>
                          <div style={{ fontSize:12, color:C.muted }}>@{s.username}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ background:info.bg, color:info.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{info.label}</span>
                        {!isCurrentUser && (
                          <>
                            <button onClick={()=>{ setResetId(resetId===s.id?null:s.id); setResetPw(''); }}
                              style={{ padding:'5px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                              🔑 Reset PW
                            </button>
                            <button onClick={()=>handleDeleteStaff(s.id, s.full_name)}
                              style={{ padding:'5px 10px', background:'#fee2e2', border:`1px solid #fca5a5`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline password reset */}
                    {resetId===s.id && (
                      <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
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

      {/* Staff sees limited message */}
      {!isAdmin && (
        <div style={{ background:'#eff6ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#0369a1', marginBottom:4 }}>ℹ️ Staff Account</div>
          <div style={{ fontSize:13, color:'#0369a1' }}>
            You are logged in as <b>{user?.name}</b> (Staff). Contact your admin to manage staff accounts or change your access level.
          </div>
        </div>
      )}
    </div>
  );
}
