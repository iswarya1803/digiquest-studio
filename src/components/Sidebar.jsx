import React from 'react';
import {
  LayoutDashboard, FolderKanban, Users, BarChart3,
  LogOut, Video, History, Menu, FileEdit
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  if (!user) return null;

  const adminMenu = [
    { id: 'dashboard',      label: 'Dashboard',            icon: LayoutDashboard },
    { id: 'projects',       label: 'Projects & Checklist', icon: FolderKanban },

    { id: 'customers',      label: 'Customers',            icon: Users },
    { id: 'reports',    label: 'Reports & Analytics',  icon: BarChart3 },
    { id: 'revisions',  label: 'Revisions',            icon: FileEdit },
    { id: 'logs',       label: 'System Logs',          icon: History },
  ];

  const clientMenu = [
    { id: 'client_dashboard',     label: 'My Projects',   icon: FolderKanban },
    { id: 'revisions',            label: 'Revisions',     icon: FileEdit },
    { id: 'documents',            label: 'Documents',     icon: History },
  ];

  const menuItems = user.role === 'admin' ? adminMenu : clientMenu;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleNav = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Video size={17} />
        </div>
        <div>
          <div className="sidebar-brand-name">DigiQuest</div>
          <div className="sidebar-brand-sub">Studio</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`sidebar-item${activeTab === id ? ' active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{user.fullName || user.email}</div>
            <div className="sidebar-userrole">{user.role} Portal</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-logout">
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
