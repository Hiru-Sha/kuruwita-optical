// ============================================================
//  Settings Page
// ============================================================
import React, { useState } from 'react';
import { changePassword } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [form,    setForm]  = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [msg,     setMsg]   = useState('');
  const [err,     setErr]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (form.newPassword !== form.confirmPassword) { setErr('New passwords do not match'); return; }
    if (form.newPassword.length < 6) { setErr('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg('✅ Password changed successfully!');
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) {
      setErr(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const inp = { width:'100%', padding:'11px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:'#f8f5ef', marginTop:6 };
  const lbl = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280' };

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:'0 0 4px' }}>Settings</h1>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>Manage your account and app preferences</p>

      {/* Profile info */}
      <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, padding:22, marginBottom:18 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#0f1f3d', marginBottom:16 }}>👤 Your Account</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            { l:'Full name',  v: user?.name },
            { l:'Username',   v: user?.username },
            { l:'Role',       v: user?.role === 'admin' ? '👑 Admin (Owner)' : '👤 Staff' },
            { l:'Access',     v: user?.role === 'admin' ? 'Full access' : 'Standard access' },
          ].map(item => (
            <div key={item.l} style={{ background:'#f8f5ef', borderRadius:9, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#6b7280', marginBottom:3 }}>{item.l}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e' }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, padding:22, marginBottom:18 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#0f1f3d', marginBottom:16 }}>🔒 Change Password</h3>
        {msg && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#2d7a4f', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{msg}</div>}
        {err && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#c0392b', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{err}</div>}
        <form onSubmit={handleChange}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Current Password</label>
            <input type="password" style={inp} value={form.currentPassword} onChange={e=>setForm(f=>({...f,currentPassword:e.target.value}))} placeholder="Your current password"/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>New Password</label>
            <input type="password" style={inp} value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))} placeholder="At least 6 characters"/>
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>Confirm New Password</label>
            <input type="password" style={inp} value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Repeat new password"/>
          </div>
          <button type="submit" disabled={loading} style={{ padding:'11px 24px', background: loading?'#6b7280':'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* App info */}
      <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, padding:22 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#0f1f3d', marginBottom:14 }}>ℹ️ App Info</h3>
        <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.8 }}>
          <div>🏪 <b style={{ color:'#0f1f3d' }}>Kuruwita Optical</b> — Management System</div>
          <div>📦 Version: <b style={{ color:'#0f1f3d' }}>1.0.0</b></div>
          <div>🔬 Lens labs: <b style={{ color:'#0f1f3d' }}>Negombo Optical, Solex Optical</b></div>
          <div>💾 Database: <b style={{ color:'#0f1f3d' }}>Supabase PostgreSQL</b></div>
          <div>🌐 Hosting: <b style={{ color:'#0f1f3d' }}>Vercel (frontend) + Railway (backend)</b></div>
        </div>
      </div>
    </div>
  );
}
