import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Revision from './pages/Revision';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DigiAssist from './components/DigiAssist';
import NotificationToast from './components/NotificationToast';

export default function App() {
  const [user, setUser]             = useState(null);
  const [authView, setAuthView]     = useState('login'); // 'login' | 'signup'
  const [activeTab, setActiveTab]   = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);

  useEffect(() => {
    const check = async () => {
      const token      = localStorage.getItem('token');
      const cachedUser = localStorage.getItem('user');

      if (token && cachedUser) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const u = await res.json();
            const fullUser = { id: u.id, email: u.email, role: u.role, fullName: u.full_name };
            setUser(fullUser);
            setActiveTab(fullUser.role === 'admin' ? 'dashboard' : 'client_dashboard');
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch {
          const cached = JSON.parse(cachedUser);
          setUser(cached);
          setActiveTab(cached.role === 'admin' ? 'dashboard' : 'client_dashboard');
        }
      }
      setAuthenticating(false);
    };
    check();
  }, []);

  const handleLoginSuccess = (u) => {
    setUser(u);
    setActiveTab(u.role === 'admin' ? 'dashboard' : 'client_dashboard');
  };

  if (authenticating) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p className="loading-text">Syncing session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignupSuccess={handleLoginSuccess}
          onBackToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onShowSignup={() => setAuthView('signup')}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="main-wrapper">
        <Navbar
          user={user}
          activeTab={activeTab}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="page-content">
          {activeTab === 'revisions'
            ? <Revision />
            : user.role === 'admin'
              ? <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
              : <ClientDashboard activeTab={activeTab} />
          }
        </main>
      </div>

      <DigiAssist />
      <NotificationToast />
    </div>
  );
}
