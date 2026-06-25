/* eslint-disable */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login }        = useAuth();
  const navigate          = useNavigate();
  const [username,setUser]= useState('');
  const [password,setPass]= useState('');
  const [error,   setErr] = useState('');
  const [loading, setLoad]= useState(false);
  const [showPass,setShow]= useState(false);

  const handleLogin = async e => {
    e.preventDefault();
    if (!username || !password) return setErr('Please enter username and password');
    setLoad(true); setErr('');
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace:true });
    } catch(err) {
      setErr(err.message || 'Invalid credentials');
    } finally { setLoad(false); }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex',
      background:'var(--bg-base)',
      fontFamily:'var(--font-body)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex:1, display:'none',
        background:'linear-gradient(145deg,var(--navy) 0%,#1a3060 60%,#0d2245 100%)',
        padding:48, flexDirection:'column', justifyContent:'space-between',
        position:'relative', overflow:'hidden',
      }} className="login-left">
        {/* Decorative circles */}
        {[
          { size:300, top:-80,  right:-60,  opacity:.05 },
          { size:200, bottom:60,left:-40,   opacity:.06 },
          { size:150, top:'40%',right:'10%',opacity:.04 },
        ].map((c,i)=>(
          <div key={i} style={{
            position:'absolute', width:c.size, height:c.size,
            borderRadius:'50%', border:'2px solid var(--gold)',
            top:c.top, bottom:c.bottom, left:c.left, right:c.right,
            opacity:c.opacity,
          }}/>
        ))}

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:60 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,var(--gold),#E8C96A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(201,168,76,.4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
                <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'#fff', fontWeight:600 }}>Kuruwita Optical</div>
              <div style={{ fontSize:11, color:'rgba(201,168,76,.7)', letterSpacing:'.06em' }}>MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:32, color:'#fff', lineHeight:1.3, marginBottom:16, fontWeight:600 }}>
            Your optical shop,<br/>perfectly managed.
          </div>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.7 }}>
            Orders · Inventory · Lab receivings ·<br/>Balance tracking · End of day reports
          </p>
        </div>

        <div style={{ fontSize:12, color:'rgba(255,255,255,.25)' }}>
          Wickramakalutota Opticals, Kuruwita
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width:'100%', maxWidth:460, margin:'0 auto',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'32px 24px',
      }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          {/* Logo (mobile) */}
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,var(--navy),#1a3060)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16, boxShadow:'var(--shadow-lg)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
                <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
              </svg>
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>
              Welcome back
            </div>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
              Sign in to Kuruwita Optical
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>

            {error && (
              <div style={{
                background:'var(--danger-bg)', color:'var(--danger)',
                border:'1px solid var(--danger-border)',
                borderRadius:'var(--r-md)', padding:'11px 16px',
                fontSize:13, fontWeight:500, marginBottom:20,
                display:'flex', alignItems:'center', gap:8,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>
                Username
              </label>
              <input
                type="text" value={username} onChange={e=>setUser(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username" autoFocus
                style={{
                  width:'100%', padding:'12px 14px',
                  background:'var(--bg-surface)',
                  border:'1.5px solid var(--border)',
                  borderRadius:'var(--r-md)',
                  fontSize:14, fontFamily:'var(--font-body)',
                  color:'var(--text-primary)', outline:'none',
                  transition:'border-color var(--t-fast), box-shadow var(--t-fast)',
                }}
                onFocus={e=>{ e.target.style.borderColor='var(--gold)'; e.target.style.boxShadow='0 0 0 3px rgba(201,168,76,.12)'; }}
                onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; }}
              />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass?'text':'password'} value={password}
                  onChange={e=>setPass(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width:'100%', padding:'12px 44px 12px 14px',
                    background:'var(--bg-surface)',
                    border:'1.5px solid var(--border)',
                    borderRadius:'var(--r-md)',
                    fontSize:14, fontFamily:'var(--font-body)',
                    color:'var(--text-primary)', outline:'none',
                    transition:'border-color var(--t-fast), box-shadow var(--t-fast)',
                  }}
                  onFocus={e=>{ e.target.style.borderColor='var(--gold)'; e.target.style.boxShadow='0 0 0 3px rgba(201,168,76,.12)'; }}
                  onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; }}
                />
                <button type="button" onClick={()=>setShow(s=>!s)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:4 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px',
                background: loading ? 'var(--text-muted)' : 'var(--navy)',
                color:'#fff', border:'none',
                borderRadius:'var(--r-md)',
                fontSize:14, fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font-body)',
                transition:'all var(--t-fast)',
                boxShadow: loading ? 'none' : 'var(--shadow-md)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {loading ? (
                <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/> Signing in…</>
              ) : 'Sign In →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:28, fontSize:11, color:'var(--text-muted)' }}>
            Kuruwita (Wickramakalutota) Opticals
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .login-left { display: flex !important; } }
      `}</style>
    </div>
  );
}