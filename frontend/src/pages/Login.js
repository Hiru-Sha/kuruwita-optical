// ============================================================
//  Login Page
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0f1f3d 0%,#162847 60%,#1a3560 100%)', fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <div style={{ background:'white', borderRadius:20, padding:'48px 44px', width:'100%', maxWidth:400, boxShadow:'0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>👁️</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'#0f1f3d', margin:0 }}>Kuruwita Optical</h1>
          <p style={{ fontSize:11, color:'#c9a84c', letterSpacing:'2px', textTransform:'uppercase', margin:'6px 0 0' }}>Management System</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#c0392b', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#6b7280', marginBottom:6 }}>Username</label>
            <input
              type="text" value={form.username} autoComplete="username"
              onChange={e => setForm(f=>({...f, username:e.target.value}))}
              placeholder="Enter username"
              style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e0ddd6', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none', background:'#f8f5ef' }}
            />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#6b7280', marginBottom:6 }}>Password</label>
            <input
              type="password" value={form.password} autoComplete="current-password"
              onChange={e => setForm(f=>({...f, password:e.target.value}))}
              placeholder="Enter password"
              style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e0ddd6', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none', background:'#f8f5ef' }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:14, background: loading ? '#6b7280' : '#0f1f3d', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#9ca3af' }}>
          Default: <b style={{ color:'#0f1f3d' }}>admin</b> / <b style={{ color:'#0f1f3d' }}>password</b>
        </p>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box}`}</style>
    </div>
  );
}
