/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form,      setForm]    = useState({ username:'', password:'' });
  const [error,     setError]   = useState('');
  const [loading,   setLoading] = useState(false);
  const [showPass,  setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect username or password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Inter','DM Sans',sans-serif" }}>

      {/* Left panel — branding */}
      <div style={{ flex:1, background:'linear-gradient(160deg,#0b1829 0%,#0f1f3d 50%,#162d52 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, position:'relative', overflow:'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(201,168,76,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(201,168,76,.04)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', textAlign:'center', maxWidth:360 }}>
          {/* Logo mark */}
          <div style={{ width:72, height:72, borderRadius:20, background:'rgba(201,168,76,.12)', border:'1px solid rgba(201,168,76,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M20.188 10.934C18.74 7.427 15.55 5 12 5s-6.74 2.427-8.188 5.934a1 1 0 000 .132C5.26 14.573 8.45 17 12 17s6.74-2.427 8.188-5.934a1 1 0 000-.132z"/>
            </svg>
          </div>

          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'white', margin:'0 0 8px', lineHeight:1.2 }}>
            Kuruwita Optical
          </h1>
          <p style={{ fontSize:12, color:'#c9a84c', letterSpacing:'2.5px', textTransform:'uppercase', margin:'0 0 40px', fontWeight:600 }}>
            Management System
          </p>

          {/* Feature dots */}
          {['Orders & Inventory', 'Repairs & Quick Sales', 'Finance & Reports'].map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, textAlign:'left' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#c9a84c', flexShrink:0 }}/>
              <span style={{ fontSize:14, color:'rgba(237,233,224,.7)' }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ position:'absolute', bottom:24, fontSize:11, color:'rgba(255,255,255,.25)', letterSpacing:'1px' }}>
          Wickramakalutota Opticals · Chilaw
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width:440, display:'flex', alignItems:'center', justifyContent:'center', background:'#f9f9fb', padding:'40px 48px' }}>
        <div style={{ width:'100%', maxWidth:340 }}>
          <div style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'#111827', margin:'0 0 6px', fontFamily:"'Playfair Display',serif" }}>
              Welcome back
            </h2>
            <p style={{ fontSize:14, color:'#6b7280', margin:0 }}>Sign in to your account to continue</p>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, letterSpacing:'.3px' }}>Username</label>
              <input
                type="text" value={form.username} autoComplete="username"
                onChange={e => setForm(f=>({...f, username:e.target.value}))}
                placeholder="Enter your username"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e5e5ea', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:'#111827', transition:'border-color .15s' }}
                onFocus={e => e.target.style.borderColor='#0f1f3d'}
                onBlur={e => e.target.style.borderColor='#e5e5ea'}
              />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, letterSpacing:'.3px' }}>Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass?'text':'password'} value={form.password} autoComplete="current-password"
                  onChange={e => setForm(f=>({...f, password:e.target.value}))}
                  placeholder="Enter your password"
                  style={{ width:'100%', padding:'11px 44px 11px 14px', border:'1.5px solid #e5e5ea', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:'#111827', transition:'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor='#0f1f3d'}
                  onBlur={e => e.target.style.borderColor='#e5e5ea'}
                />
                <button type="button" onClick={() => setShowPass(s=>!s)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4, display:'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPass ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', background: loading ? '#9ca3af' : '#0f1f3d', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .15s' }}>
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{animation:'spin 1s linear infinite'}}/></svg>
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#9ca3af' }}>
            Default login: <b style={{ color:'#374151' }}>admin</b> / <b style={{ color:'#374151' }}>password</b>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media(max-width:768px){
          div[style*="flex:1"] { display:none !important; }
          div[style*="width:440px"] { width:100% !important; }
        }
      `}</style>
    </div>
  );
}