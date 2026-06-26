import React, { useState, useRef, useEffect } from 'react';
import { Video, Mail, Lock, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Login({ onLoginSuccess, onShowSignup }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [mode, setMode]             = useState('login'); // 'login' | 'forgot' | 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode]   = useState('');
  const [inputCode, setInputCode]   = useState('');
  const [newPass, setNewPass]       = useState('');
  const [message, setMessage]       = useState('');

  const cardRef = useRef(null);
  const contentRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 20; // Tilt intensity
    const y = (e.clientY - top - height / 2) / 20;
    
    // Apply 3D rotation based on mouse position
    cardRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    
    // Apply parallax translation to inner content
    if (contentRef.current) {
      contentRef.current.style.transform = `translateZ(40px) translateX(${-x/2}px) translateY(${-y/2}px)`;
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
    if (contentRef.current) {
      contentRef.current.style.transform = 'translateZ(30px) translateX(0) translateY(0)';
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('https://digiquest-studio.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server unreachable. Please check if the backend is running.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res  = await fetch('https://digiquest-studio.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server unreachable. Please check if the backend is running.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.resetCode) {
        setResetCode(data.resetCode);
        setMessage(`Demo reset code: ${data.resetCode}`);
        setTimeout(() => { setMode('reset'); setInputCode(data.resetCode); }, 1500);
      } else { setMessage(data.message); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res  = await fetch('https://digiquest-studio.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: inputCode, newPassword: newPass })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server unreachable. Please check if the backend is running.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setTimeout(() => { setMode('login'); setEmail(resetEmail); setPassword(newPass); }, 1500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const quickFill = (role) => {
    if (role === 'admin')  { setEmail('admin@digiquest.com');  setPassword('admin123'); }
    if (role === 'client') { setEmail('client@digiquest.com'); setPassword('client123'); }
    setError(''); setMode('login');
  };

  return (
    <div className="login-page" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      
      <div className="login-shape login-shape-cube" />
      <div className="login-shape login-shape-sphere" />
      <div className="login-shape login-shape-ring" />
      <div className="login-shape login-shape-pyramid" />

      <div className="login-card glass-panel animate-fade-in" ref={cardRef}>
        <div ref={contentRef} style={{ transition: 'transform 0.1s ease-out' }}>
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Video size={22} />
          </div>
          <h1 className="login-brand-title">DigiQuest Studio</h1>
          <p className="login-brand-sub">Delivery Checklist & Client Sign-off Tracker</p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-glow)', border: '1px solid rgba(244,63,94,.25)', color: 'var(--danger)', fontSize: '0.78rem', marginBottom: '16px' }}>
            <ShieldAlert size={15} /> {error}
          </div>
        )}
        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,.25)', color: 'var(--success)', fontSize: '0.78rem', marginBottom: '16px' }}>
            <CheckCircle2 size={15} /> {message}
          </div>
        )}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon"><Mail size={16} /></span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com" className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot password?
                </button>
              </div>
              <div className="input-wrap">
                <span className="input-icon"><Lock size={16} /></span>
                <input type={showPass ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="form-input" style={{ paddingRight: '40px' }} />
                <button type="button" className="input-toggle-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ padding: '13px', marginTop: '8px', fontSize: '0.9rem' }}>
              {loading ? 'Authenticating…' : 'Sign In →'}
            </button>


          </form>
        )}

        {/* ── FORGOT ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Enter your registered email and we'll generate a secure recovery code.
            </p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon"><Mail size={16} /></span>
                <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="name@company.com" className="form-input" />
              </div>
            </div>
            <div className="g2" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setMode('login')} className="btn btn-secondary" style={{ padding: '12px' }}>← Back</button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px' }}>
                {loading ? 'Generating…' : 'Send Code'}
              </button>
            </div>
          </form>
        )}

        {/* ── RESET ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">Recovery Code</label>
              <input type="text" required value={inputCode} onChange={e => setInputCode(e.target.value)}
                placeholder="DIGI-XXXX" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrap">
                <span className="input-icon"><Lock size={16} /></span>
                <input type="password" required value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••" className="form-input" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ padding: '13px', marginTop: '8px' }}>
              {loading ? 'Saving…' : 'Reset Password'}
            </button>
          </form>
        )}

        {mode === 'login' && onShowSignup && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button type="button" onClick={onShowSignup}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'underline' }}>
                Create Account
              </button>
            </p>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
