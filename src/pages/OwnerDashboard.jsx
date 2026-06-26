import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Download, FileText, Table2, FolderOpen, Users,
  CheckCircle2, Clock, TrendingUp, RefreshCw, Plus, Eye
} from 'lucide-react';
import ProjectForm from '../components/ProjectForm';
import QRCodeComponent from '../components/QRCodeComponent';

const STATUS_COLORS = {
  Completed:    '#22c55e',
  'In Progress':'#818cf8',
  Planning:     '#22d3ee',
  Review:       '#f59e0b',
  'On Hold':    '#ef4444'
};

const PIE_COLORS = ['#22c55e', '#818cf8', '#22d3ee', '#f59e0b', '#ef4444'];

export default function OwnerDashboard() {
  const [projects, setProjects]     = useState([]);
  const [stats, setStats]           = useState({ total: 0, completed: 0, inProgress: 0, pending: 0 });
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [qrProject, setQrProject]   = useState(null);
  const [exporting, setExporting]   = useState('');

  const token = localStorage.getItem('token');

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        const total      = data.length;
        const completed  = data.filter(p => p.status === 'Completed').length;
        const inProgress = data.filter(p => p.status === 'In Progress').length;
        const pending    = data.filter(p => p.status === 'Planning').length;
        setStats({ total, completed, inProgress, pending });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function downloadFile(url, filename) {
    setExporting(filename);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setExporting(''); return; }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { /* ignore */ }
    setExporting('');
  }

  // Build chart data
  const statusData = Object.entries(
    projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const completionData = projects
    .slice(0, 8)
    .map(p => ({ name: p.title?.slice(0, 14) + (p.title?.length > 14 ? '…' : ''), completion: p.completion_rate || 0 }));

  const statCards = [
    { label: 'Total Projects', value: stats.total,      icon: FolderOpen,    color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    { label: 'Completed',      value: stats.completed,  icon: CheckCircle2,  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { label: 'In Progress',    value: stats.inProgress, icon: TrendingUp,    color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
    { label: 'Planning',       value: stats.pending,    icon: Clock,         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Owner Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '14px' }}>
            Complete overview of all projects and performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={fetchProjects} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => downloadFile('/api/reports/projects', 'projects_report.pdf')}
            disabled={!!exporting}
            style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', color: '#818cf8', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <FileText size={14} /> {exporting === 'projects_report.pdf' ? 'Exporting…' : 'PDF Report'}
          </button>
          <button
            onClick={() => downloadFile('/api/reports/projects/excel', 'projects_report.xlsx')}
            disabled={!!exporting}
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Table2 size={14} /> {exporting === 'projects_report.xlsx' ? 'Exporting…' : 'Excel Report'}
          </button>
          <button
            onClick={() => { setEditProject(null); setShowForm(true); }}
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}
          >
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '14px', padding: '20px', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', gap: '16px',
            transition: 'transform 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '–' : value}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Status Pie Chart */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(12px)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Bar Chart */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(12px)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Completion Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={v => [`${v}%`, 'Completion']} contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="completion" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects Table */}
      <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', backdropFilter: 'blur(12px)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            All Projects ({projects.length})
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                {['Title','Client','Status','Priority','Completion','Deadline','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading projects…</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No projects yet. Create your first one!</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--glass-border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.client_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${STATUS_COLORS[p.status] || '#94a3b8'}22`, color: STATUS_COLORS[p.status] || '#94a3b8', border: `1px solid ${STATUS_COLORS[p.status] || '#94a3b8'}44` }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.priority || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--glass-border)', borderRadius: '3px', minWidth: '60px' }}>
                        <div style={{ width: `${p.completion_rate || 0}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #22d3ee)', borderRadius: '3px', transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{p.completion_rate || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => { setEditProject(p); setShowForm(true); }}
                        title="Edit project"
                        style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setQrProject(qrProject?.id === p.id ? null : p)}
                        title="QR Code"
                        style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        QR
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Panel */}
      {qrProject && (
        <div style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 5000 }}>
          <QRCodeComponent projectId={qrProject.id} projectTitle={qrProject.title} />
        </div>
      )}

      {/* Project Form Modal */}
      {showForm && (
        <ProjectForm
          project={editProject}
          onClose={() => { setShowForm(false); setEditProject(null); }}
          onSave={() => { fetchProjects(); }}
        />
      )}
    </div>
  );
}
