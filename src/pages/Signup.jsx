import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Briefcase, Eye, EyeOff, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Signup({ onSignupSuccess, onBackToLogin }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'client'
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.fullName || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // try relative path first (uses Vite proxy in dev)
      let res;
      try {
        res = await fetch('https://digiquest-studio.onrender.com/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } catch (netErr) {
        // fallback to direct backend URL if proxy or network prevented relative fetch
        res = await fetch('https://digiquest-studio.onrender.com/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Signup failed (status ${res.status})`);

      // Auto-login after signup — same fallback approach
      let loginRes;
      try {
        loginRes = await fetch('https://digiquest-studio.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password })
        });
      } catch (netErr) {
        loginRes = await fetch('https://digiquest-studio.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password })
        });
      }
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error(loginData.error || `Auto-login failed (status ${loginRes.status})`);

      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));
      onSignupSuccess(loginData.user);
    } catch (e) {
      setError(e.message || 'Network error — unable to reach the backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      <div className="login-card glass-panel animate-fade-in">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon" style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}>
            <UserPlus size={22} />
          </div>
          <h1 className="login-brand-title">Create Account</h1>
          <p className="login-brand-sub">Join DigiQuest Studio today</p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-glow)', border: '1px solid rgba(244,63,94,.25)', color: 'var(--danger)', fontSize: '0.78rem', marginBottom: '16px' }}>
            <ShieldAlert size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrap">
              <span className="input-icon"><User size={16} /></span>
              <input type="text" name="fullName" required value={form.fullName}
                onChange={handleChange} placeholder="John Doe" className="form-input" />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrap">
              <span className="input-icon"><Mail size={16} /></span>
              <input type="email" name="email" required value={form.email}
                onChange={handleChange} placeholder="name@company.com" className="form-input" />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input type={showPass ? 'text' : 'password'} name="password" required value={form.password}
                onChange={handleChange} placeholder="Min 6 characters" className="form-input"
                style={{ paddingRight: '40px' }} />
              <button type="button" className="input-toggle-btn" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full"
            style={{ padding: '13px', marginTop: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}>
            {loading ? 'Creating Account…' : 'Create Account →'}
          </button>

        </form>

        {/* Back to Login */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
          <button onClick={onBackToLogin} className="btn btn-secondary"
            style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
