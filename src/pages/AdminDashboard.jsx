import React, { useState, useEffect } from 'react';
import {
  FolderPlus, Edit, Trash2, Search, Filter, Calendar,
  Layers, AlertCircle, FileDown, Bell,
  CheckCircle, Plus, X, ListTodo, Activity, AlertTriangle,
  BarChart3, Users, TrendingUp, FileText, Mail
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

// Status badge helper
function StatusBadge({ status }) {
  const map = {
    'Pending Approval':       'badge-pending',
    Pending:                  'badge-pending',
    'In Progress':            'badge-progress',
    Review:                   'badge-review',
    'Client Approval Pending':'badge-review',
    Completed:                'badge-completed',
    Archived:                 'badge-pending',
    Resolved:                 'badge-completed',
  };
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
}

export default function AdminDashboard({ activeTab, setActiveTab }) {
  const [projects,  setProjects]  = useState([]);
  const [clients,   setClients]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [pdfLogs,   setPdfLogs]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [logsSearch,   setLogsSearch]   = useState('');
  const [pdfPage,      setPdfPage]      = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalMode,    setModalMode]    = useState('create');
  const [selProjectId, setSelProjectId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [pcSelectedProject, setPcSelectedProject] = useState(null);
  const [form, setForm] = useState({ title: '', client_id: '', priority: 'Medium', deadline: '', assigned_team: '', notes: '', status: 'Pending' });

  const [expandedChecklist, setExpandedChecklist] = useState({});
  const [localChecklist, setLocalChecklist] = useState({});

  const checklistTopics = [
    { key: 'color_grading', label: 'Color Grading' },
    { key: 'audio_mix', label: 'Audio Mix' },
    { key: 'subtitle', label: 'Subtitle SRT' },
    { key: 'final_qc', label: 'Final QC' },
    { key: 'client_signoff', label: 'Client Sign-off' }
  ];

  const [verModalOpen, setVerModalOpen] = useState(false);
  const [verForm, setVerForm] = useState({ title: '', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', audio_url: '', subtitle_url: '', password_protected: false, password_pin: '1234', expiration_date: '' });

  const token   = () => localStorage.getItem('token');
  const headers = (extra = {}) => ({ Authorization: `Bearer ${token()}`, ...extra });

  const fetchData = async () => {
    setLoading(true);
    try {
      const h = headers();
      const [pR, cR, aR, lR, pfR] = await Promise.all([
        fetch('https://digiquest-studio.onrender.com/api/projects',  { headers: h }),
        fetch('https://digiquest-studio.onrender.com/api/clients',   { headers: h }),
        fetch('https://digiquest-studio.onrender.com/api/analytics', { headers: h }),
        fetch('https://digiquest-studio.onrender.com/api/logs',      { headers: h }),
        fetch('https://digiquest-studio.onrender.com/api/logs/pdf',   { headers: h })
      ]);
      if (pR.ok) setProjects (await pR.json());
      if (cR.ok) setClients  (await cR.json());
      if (aR.ok) setAnalytics(await aR.json());
      if (lR.ok) setLogs     (await lR.json());
      if (pfR.ok) setPdfLogs (await pfR.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const openCreate = () => {
    setModalMode('create');
    setForm({ title: '', client_id: clients[0]?.user_id || '', priority: 'Medium', deadline: '', assigned_team: '', notes: '', status: 'Pending' });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setModalMode('edit');
    setSelProjectId(p.id);
    setForm({ title: p.title, client_id: p.client_id, priority: p.priority, deadline: p.deadline || '', assigned_team: p.assigned_team || '', notes: p.notes || '', status: p.status });
    setModalOpen(true);
  };

  const saveProject = async (e) => {
    e.preventDefault();
    const url    = modalMode === 'create' ? '/api/projects' : `/api/projects/${selProjectId}`;
    const method = modalMode === 'create' ? 'POST' : 'PUT';
    const res    = await fetch(url, { method, headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(form) });
    if (res.ok) { setModalOpen(false); fetchData(); }
    else { const e = await res.json(); alert(e.error || 'Failed'); }
  };

  const deleteProject = async () => {
    if (!deleteConfirmId) return;
    const res = await fetch(`/api/projects/${deleteConfirmId}`, { method: 'DELETE', headers: headers() });
    if (res.ok) fetchData();
    setDeleteConfirmId(null);
  };

  const toggleChecklist = (pid, p) => {
    setExpandedChecklist(prev => ({ ...prev, [pid]: !prev[pid] }));
    if (!localChecklist[pid]) {
      setLocalChecklist(prev => ({ 
        ...prev, 
        [pid]: { 
          color_grading: p.color_grading, audio_mix: p.audio_mix, subtitle: p.subtitle, 
          final_qc: p.final_qc, client_signoff: p.client_signoff 
        } 
      }));
    }
  };

  const handleTopicChange = (pid, topic, field, val) => {
    setLocalChecklist(prev => {
      let pData = prev[pid];
      if (!pData) {
        const p = projects.find(x => x.id === pid) || {};
        pData = { 
          color_grading: typeof p.color_grading === 'string' ? { status: p.color_grading } : (p.color_grading || { status: 'Pending' }), 
          audio_mix: typeof p.audio_mix === 'string' ? { status: p.audio_mix } : (p.audio_mix || { status: 'Pending' }), 
          subtitle: typeof p.subtitle === 'string' ? { status: p.subtitle } : (p.subtitle || { status: 'Pending' }), 
          final_qc: typeof p.final_qc === 'string' ? { status: p.final_qc } : (p.final_qc || { status: 'Pending' }), 
          client_signoff: typeof p.client_signoff === 'string' ? { status: p.client_signoff } : (p.client_signoff || { status: 'Pending' }) 
        };
      }
      const tData = pData[topic] || { status: 'Pending' };
      return {
        ...prev,
        [pid]: { ...pData, [topic]: { ...tData, [field]: val } }
      };
    });
  };

  const saveTopic = async (pid, topic, directStatus) => {
    let data;
    if (directStatus !== undefined) {
      const p = projects.find(x => x.id === pid) || {};
      const tData = localChecklist[pid]?.[topic] || (typeof p[topic] === 'string' ? { status: p[topic] } : p[topic]) || { status: 'Pending' };
      data = { ...tData, status: directStatus };
    } else {
      data = localChecklist[pid]?.[topic] || { status: 'Pending' };
    }

    const res = await fetch(`/api/projects/${pid}/checklist/${topic}`, {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const upd = await res.json();
      setProjects(prev => prev.map(p => p.id === pid ? { ...p, [topic]: upd.checklist[topic], completion_rate: upd.completion_rate } : p));
      if (directStatus === undefined) alert('Topic saved!');
    } else {
      alert('Failed to save topic');
    }
  };

  const handleApproval = async (id, action) => {
    if (action === 'decline' && !window.confirm('Are you sure you want to decline this project proposal?')) return;
    const res = await fetch(`/api/projects/${id}/approve-proposal`, {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action })
    });
    if (res.ok) fetchData();
    else { const e = await res.json(); alert(e.error || 'Failed to ' + action + ' project'); }
  };

  const openVersion = (p) => {
    setSelProjectId(p.id);
    setVerForm({ title: '', video_url: '', audio_url: '', subtitle: '', password_protected: false, password_pin: '', expiration_date: '' });
    setVerModalOpen(true);
  };

  const uploadVersion = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${selProjectId}/versions`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(verForm) });
    if (res.ok) { setVerModalOpen(false); alert('Version released.'); fetchData(); }
  };

  const sendReminder = async (p) => {
    try {
      const res = await fetch(`/api/notifications`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          user_id: p.client_id,
          type: 'reminder',
          title: 'Project Reminder',
          message: `Reminder for project: ${p.title}. Please check your dashboard for updates.`
        })
      });
      if (res.ok) {
        alert('Reminder sent to client.');
      } else {
        alert('Failed to send reminder.');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending reminder.');
    }
  };

  const downloadReportPDF = () => {
    window.location.href = `/api/pdf/reports/projects?token=${token()}`;
  };

  const handleExportCSV = () => {
    if (projects.length === 0) {
      alert("No projects to export.");
      return;
    }
    const headers = ["ID", "Title", "Client Name", "Company", "Priority", "Status", "Completion Rate", "Deadline", "Created At"];
    const rows = projects.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${(p.client_name || '').replace(/"/g, '""')}"`,
      `"${(p.company_name || '').replace(/"/g, '""')}"`,
      p.priority,
      p.status,
      `${p.completion_rate}%`,
      p.deadline || 'None',
      p.created_at
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "projects_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (p.title.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q)) && (statusFilter === 'All' || p.status === statusFilter);
  });

  if (loading && !projects.length) {
    return (
      <div className="loading-center">
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p className="loading-text">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ──────────── OVERVIEW TAB ──────────── */}
      {activeTab === 'dashboard' && analytics && (
        <>
          {/* KPI cards */}
          <div className="kpi-grid">
            <div className="kpi-card glass-panel">
              <div>
                <div className="kpi-label">Total Projects</div>
                <div className="kpi-value">{analytics.kpis.totalProjects}</div>
                <div className="kpi-sub">All registered records</div>
              </div>
              <div className="kpi-icon"><Layers size={22} /></div>
            </div>
            <div className="kpi-card glass-panel">
              <div>
                <div className="kpi-label">Active Deliveries</div>
                <div className="kpi-value">{analytics.kpis.activeProjects}</div>
                <div className="kpi-sub" style={{ color: 'var(--warning)' }}>
                  <AlertTriangle size={11} /> {analytics.kpis.pendingSignoffs} pending sign-off
                </div>
              </div>
              <div className="kpi-icon"><Activity size={22} /></div>
            </div>
            <div className="kpi-card glass-panel">
              <div>
                <div className="kpi-label">Completed Sign-offs</div>
                <div className="kpi-value">{analytics.kpis.completedProjects}</div>
                <div className="kpi-sub" style={{ color: 'var(--success)' }}>
                  <CheckCircle size={11} /> Fully finalized
                </div>
              </div>
              <div className="kpi-icon"><CheckCircle size={22} /></div>
            </div>
            <div className="kpi-card glass-panel">
              <div>
                <div className="kpi-label">Overdue Deadlines</div>
                <div className="kpi-value" style={{ color: 'var(--danger)' }}>{analytics.kpis.overdueDeliveries}</div>
                <div className="kpi-sub" style={{ color: 'var(--danger)' }}>Requires immediate action</div>
              </div>
              <div className="kpi-icon"><AlertCircle size={22} /></div>
            </div>
          </div>

          {/* Charts row */}
          <div className="charts-row">
            {/* Circular completion gauge */}
            <div className="chart-panel glass-panel">
              <div className="chart-panel-title"><TrendingUp size={14} /> Completion Rate</div>
              <div className="donut-center">
                <div className="donut-figure">
                  <svg>
                    <circle cx="70" cy="70" r="60" stroke="var(--bg-tertiary)" strokeWidth="8" fill="transparent" />
                    <circle cx="70" cy="70" r="60"
                      stroke="url(#grd)"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - analytics.kpis.projectCompletionPercentage / 100)}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="grd" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--secondary)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="donut-label">
                    <span className="donut-percent" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {analytics.kpis.projectCompletionPercentage}%
                    </span>
                    <span className="donut-sublabel">Avg Progress</span>
                  </div>
                </div>

                <div className="donut-stats">
                  <div className="donut-stat-row">
                    <span>Active Clients</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{analytics.kpis.totalClients}</span>
                  </div>
                  <div className="donut-stat-row">
                    <span>Open Revisions</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{analytics.kpis.pendingRevisions}</span>
                  </div>
                  <div className="donut-stat-row">
                    <span>Satisfaction</span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>{analytics.satisfactionRating}/5.0 ⭐</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie: status distribution */}
            <div className="chart-panel glass-panel">
              <div className="chart-panel-title"><BarChart3 size={14} /> Status Distribution</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3}>
                      {analytics.statusDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar: revisions by category */}
            <div className="chart-panel glass-panel">
              <div className="chart-panel-title"><Activity size={14} /> Revisions by Category</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revisionCategories} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                    <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Timeline + Satisfaction */}
          <div className="timeline-section">
            <div className="glass-panel satisfaction-panel">
              <div className="chart-panel-title" style={{ marginBottom: '8px' }}>Customer Satisfaction</div>
              <div className="sat-big-score">{analytics.satisfactionRating}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>out of 5.0</div>
              <div className="sat-stars">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className="sat-star" style={{ color: s <= Math.round(analytics.satisfactionRating) ? 'var(--warning)' : 'var(--text-muted)' }}>★</span>
                ))}
              </div>
              <p className="sat-quote">
                "Calculated from client-submitted feedback surveys. High scores reflect color-grading accuracy and turnaround efficiency."
              </p>
            </div>

            <div className="glass-panel activity-panel">
              <div className="activity-panel-title">Live Activity Timeline</div>
              <div className="activity-list">
                {logs.slice(0, 6).map(log => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-dot" />
                    <div>
                      <div className="activity-action">{log.action_type} — <span>{log.description}</span></div>
                      <div className="activity-meta">By {log.full_name} · {new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ──────────── PROJECTS TAB ──────────── */}
      {activeTab === 'projects' && (
        <>
          {/* Toolbar */}
          <div className="page-toolbar">
            <div className="toolbar-left">
              <div className="search-box">
                <Search size={15} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or clients…" className="form-input" style={{ minWidth: '240px' }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ minWidth: '160px' }}>
                <option value="All">All Statuses</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Client Approval Pending">Client Approval Pending</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div className="toolbar-right">
              <button onClick={handleExportCSV} className="btn btn-secondary">
                <FileDown size={14} /> Export CSV
              </button>
              <button onClick={openCreate} className="btn btn-primary">
                <Plus size={14} /> New Project
              </button>
            </div>
          </div>

          {/* Project Cards */}
          <div className="projects-grid">
            {filtered.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No projects match your filters.
              </div>
            ) : filtered.map(p => (
              <div key={p.id} className="project-card glass-panel">
                <div>
                  <div className="project-card-top">
                    <div className="project-card-badges">
                      <span className={`badge badge-${(p.priority || 'Medium').toLowerCase()}`}>{p.priority || 'Medium'}</span>
                      <StatusBadge status={p.status || 'Pending'} />
                    </div>
                    <div className="project-card-actions">
                      {p.status === 'Pending Approval' ? (
                        <>
                          <button onClick={() => handleApproval(p.id, 'approve')} className="btn btn-success btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>Approve</button>
                          <button onClick={() => handleApproval(p.id, 'decline')} className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>Decline</button>
                        </>
                      ) : (
                          <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                            <button onClick={() => sendReminder(p)} className="btn btn-secondary action-btn" title="Send Reminder"><Bell size={13} color="var(--text-secondary)" /> <span className="action-label">Reminder</span></button>
                            <button onClick={() => openEdit(p)}    className="btn btn-secondary action-btn" title="Edit project" ><Edit size={13} color="var(--text-secondary)" /> <span className="action-label">Edit</span></button>
                            <button onClick={() => setDeleteConfirmId(p.id)} className="btn btn-danger action-btn" title="Delete Project"><Trash2 size={13} color="#fff" /> <span className="action-label" style={{ color: '#fff' }}>Delete</span></button>
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="project-title">{p.title}</div>
                  <div className="project-client">
                    <Users size={12} /> {p.client_name} · {p.company_name}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div><span style={{color: 'var(--text-secondary)'}}>Assigned:</span> {p.assigned_team || 'Unassigned'}</div>
                    <div><span style={{color: 'var(--text-secondary)'}}>Updated:</span> {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                <div className="progress-section">
                  <div className="progress-header">
                    <span>Checklist Progress</span>
                    <span className="progress-pct">{p.completion_rate || 0}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${p.completion_rate || 0}%` }} />
                  </div>
                  <button onClick={() => toggleChecklist(p.id, p)} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}>
                    {expandedChecklist[p.id] ? 'Hide Checklist Progress' : 'View Checklist Progress'}
                  </button>

                  {expandedChecklist[p.id] && localChecklist[p.id] && (
                    <div className="animate-fade-in" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {checklistTopics.map(step => {
                        const tData = localChecklist[p.id][step.key];
                        return (
                          <div key={step.key} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{step.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status</label>
                                <select value={tData.status} onChange={e => handleTopicChange(p.id, step.key, 'status', e.target.value)} className={`status-dropdown badge-${tData.status === 'Completed' ? 'completed' : tData.status === 'In Progress' ? 'progress' : tData.status === 'Review' ? 'review' : 'pending'}`}>
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Review">Review</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Assigned Team</label>
                                <input type="text" value={tData.assigned_team} onChange={e => handleTopicChange(p.id, step.key, 'assigned_team', e.target.value)} className="form-input" style={{ fontSize: '0.8rem', padding: '4px' }} placeholder="Team/Member" />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Due Date</label>
                                <input type="date" value={tData.due_date} onChange={e => handleTopicChange(p.id, step.key, 'due_date', e.target.value)} className="form-input" style={{ fontSize: '0.8rem', padding: '4px' }} />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Notes</label>
                                <input type="text" value={tData.notes} onChange={e => handleTopicChange(p.id, step.key, 'notes', e.target.value)} className="form-input" style={{ fontSize: '0.8rem', padding: '4px' }} placeholder="Notes" />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Updated: {tData.updated_at ? new Date(tData.updated_at).toLocaleString() : 'N/A'}</span>
                              <button onClick={() => saveTopic(p.id, step.key)} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Save Task</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="project-card-footer">
                  <div className="project-card-date">
                    <Calendar size={12} /> {p.deadline || 'No deadline'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* All Clients Post-Production Progress Bottom Section */}
          <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
            <div className="section-header">
              <div className="section-title"><ListTodo size={16} /> All Clients Post-Production Progress</div>
            </div>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '1000px', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Client / Project</th>
                    <th>Color Grading</th>
                    <th>Audio Mix</th>
                    <th>Subtitle SRT</th>
                    <th>Final QC</th>
                    <th>Client Sign-off</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const safeObj = (val) => typeof val === 'string' ? { status: val } : (val || { status: 'Pending' });
                    const rowData = localChecklist[p.id] || { 
                      color_grading: safeObj(p.color_grading), 
                      audio_mix: safeObj(p.audio_mix), 
                      subtitle: safeObj(p.subtitle), 
                      final_qc: safeObj(p.final_qc), 
                      client_signoff: safeObj(p.client_signoff) 
                    };
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.client_name}</div>
                        </td>
                        {checklistTopics.map(step => {
                          const tData = rowData[step.key];
                          return (
                            <td key={step.key} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                              <select 
                                value={tData?.status || 'Pending'} 
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  handleTopicChange(p.id, step.key, 'status', newVal);
                                  saveTopic(p.id, step.key, newVal);
                                }}
                                className={`status-dropdown badge-${tData?.status === 'Completed' ? 'completed' : tData?.status === 'In Progress' ? 'progress' : tData?.status === 'Review' ? 'review' : 'pending'}`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Completed">Completed</option>
                              </select>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>{tData?.assigned_team || 'Unassigned'}</div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {/* ──────────── CUSTOMERS TAB ──────────── */}
      {activeTab === 'customers' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="section-header">
            <div className="section-title"><Users size={15} /> Client Database</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{clients.length} registered clients</span>
          </div>
          <div className="clients-grid">
            {clients.map(c => (
              <div key={c.id} className="client-card glass-panel">
                <div className="client-avatar">{c.full_name[0]}</div>
                <div className="client-info">
                  <div className="client-name">{c.full_name}</div>
                  <div className="client-company">{c.company_name}</div>
                  <div className="client-meta">{c.email} · {c.phone}</div>
                </div>
                <div className="client-stats">
                  <div className="client-stat-main">{c.total_projects} Projects</div>
                  <div className="client-stat-sub">{c.completed_projects} finalized</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────── REPORTS TAB ──────────── */}
      {activeTab === 'reports' && analytics && (
        <>
          <div className="reports-grid">
            {/* KPI Summary */}
            <div className="glass-panel report-card">
              <div className="report-card-title"><BarChart3 size={15} style={{ color: 'var(--primary)' }} /> Delivery Summary</div>
              {[
                ['Total Projects',     analytics.kpis.totalProjects,     'var(--text-primary)'],
                ['Active Deliveries',  analytics.kpis.activeProjects,    'var(--primary)'],
                ['Completed Sign-offs',analytics.kpis.completedProjects, 'var(--success)'],
                ['Pending Sign-offs',  analytics.kpis.pendingSignoffs,   'var(--warning)'],
                ['Overdue Deadlines',  analytics.kpis.overdueDeliveries, 'var(--danger)'],
                ['Open Revisions',     analytics.kpis.pendingRevisions,  'var(--warning)'],
              ].map(([label, val, color]) => (
                <div key={label} className="report-stat-row">
                  <span className="report-stat-label">{label}</span>
                  <span className="report-stat-value" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Status distribution chart */}
            <div className="glass-panel report-card" style={{ minHeight: '320px' }}>
              <div className="report-card-title"><Activity size={15} style={{ color: 'var(--secondary)' }} /> Project Status Breakdown</div>
              <div style={{ flex: 1, minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={analytics.statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85} paddingAngle={3}>
                      {analytics.statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revisions chart */}
            <div className="glass-panel report-card" style={{ minHeight: '320px' }}>
              <div className="report-card-title"><AlertTriangle size={15} style={{ color: 'var(--warning)' }} /> Revisions by Category</div>
              <div style={{ flex: 1, minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.revisionCategories} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                    <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    <Bar dataKey="count" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Satisfaction */}
            <div className="glass-panel report-card">
              <div className="report-card-title"><CheckCircle size={15} style={{ color: 'var(--success)' }} /> Client Satisfaction</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--success)', lineHeight: 1 }}>{analytics.satisfactionRating}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '6px 0 12px' }}>out of 5.0</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '1.5rem' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.round(analytics.satisfactionRating) ? 'var(--warning)' : 'var(--text-muted)' }}>★</span>)}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button onClick={downloadReportPDF} className="btn btn-primary btn-sm">
                  <FileDown size={13} /> Export PDF Report
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ──────────── LOGS TAB ──────────── */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, maxWidth: '400px' }}>
              <Search size={16} />
              <input type="text" placeholder="Search logs by recipient, subject, or project ID..." value={logsSearch} onChange={e => setLogsSearch(e.target.value)} />
            </div>
          </div>

          {/* PDF LOGS */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="section-header">
              <div className="section-title"><FileText size={15} /> PDF Generation Logs</div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Doc Type</th><th>Project ID</th><th>Timestamp</th><th>Triggered By</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {pdfLogs.filter(l => (l.doc_type?.toLowerCase() || '').includes(logsSearch.toLowerCase()) || (l.project_id?.toString() || '').includes(logsSearch.toLowerCase())).length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No PDF Logs Available</td></tr>
                  ) : (
                    pdfLogs.filter(l => (l.doc_type?.toLowerCase() || '').includes(logsSearch.toLowerCase()) || (l.project_id?.toString() || '').includes(logsSearch.toLowerCase()))
                    .slice((pdfPage - 1) * ITEMS_PER_PAGE, pdfPage * ITEMS_PER_PAGE)
                    .map(l => (
                      <tr key={l.id}>
                        <td><span className="badge badge-review">{l.doc_type}</span></td>
                        <td>{l.project_id || 'Global'}</td>
                        <td>{new Date(l.created_at).toLocaleString()}</td>
                        <td>{l.requested_by || 'System'}</td>
                        <td><span className="badge badge-completed">Success</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => window.open(`/api/pdf/reports/projects?token=${token()}`, '_blank')} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>View PDF</button>
                            <button onClick={() => window.location.href = `/api/pdf/reports/projects?token=${token()}`} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>Regenerate</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px' }}>
                <button className="btn btn-secondary btn-sm" disabled={pdfPage === 1} onClick={() => setPdfPage(p => p - 1)}>Previous</button>
                <span style={{ color: 'var(--text-muted)' }}>Page {pdfPage}</span>
                <button className="btn btn-secondary btn-sm" disabled={pdfPage * ITEMS_PER_PAGE >= pdfLogs.length} onClick={() => setPdfPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CREATE / EDIT PROJECT ══ */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'create' ? 'Create New Project' : 'Edit Project'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={saveProject} className="modal-form">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Project Title</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Commercial Ad, Trailer…" className="form-input" />
              </div>

              <div className="modal-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Client</label>
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="form-input">
                    {clients.map(c => <option key={c.id} value={c.user_id}>{c.full_name} ({c.company_name})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="form-input">
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Delivery Deadline</label>
                  <input type="date" required value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="form-input" />
                </div>
                {modalMode === 'edit' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input">
                      <option>Pending</option><option>In Progress</option><option>Review</option><option>Client Approval Pending</option><option>Completed</option><option>Archived</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Production Team</label>
                <input type="text" value={form.assigned_team} onChange={e => setForm({ ...form, assigned_team: e.target.value })} placeholder="e.g. VFX Unit B, Audio Team" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Codec specs, audio level notes…" className="form-input" style={{ height: '72px' }} />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Create Project' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: UPLOAD VERSION ══ */}
      {verModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Upload Preview Version</h3>
              <button className="modal-close" onClick={() => setVerModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={uploadVersion} className="modal-form">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Version Description</label>
                <input type="text" required value={verForm.title} onChange={e => setVerForm({ ...verForm, title: e.target.value })} placeholder="e.g. Color Pass 2 — Sound Mix Revised" className="form-input" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Video URL (preview link)</label>
                <input type="text" required value={verForm.video_url} onChange={e => setVerForm({ ...verForm, video_url: e.target.value })} className="form-input" />
              </div>
              <div className="modal-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Audio Track URL</label>
                  <input type="text" value={verForm.audio_url} onChange={e => setVerForm({ ...verForm, audio_url: e.target.value })} placeholder="https://…" className="form-input" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Subtitle Track URL</label>
                  <input type="text" value={verForm.subtitle_url} onChange={e => setVerForm({ ...verForm, subtitle_url: e.target.value })} placeholder="https://…" className="form-input" />
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '12px' }}>
                <div className="modal-checkbox-row">
                  <input type="checkbox" id="prot" checked={verForm.password_protected} onChange={e => setVerForm({ ...verForm, password_protected: e.target.checked })} />
                  <label htmlFor="prot" style={{ fontSize: '0.82rem', cursor: 'pointer' }}>Password-protect downloads</label>
                </div>
                {verForm.password_protected && (
                  <div className="modal-grid animate-fade-in" style={{ marginTop: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">PIN Code</label>
                      <input type="text" required maxLength={6} value={verForm.password_pin} onChange={e => setVerForm({ ...verForm, password_pin: e.target.value })} className="form-input" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Link Expiry</label>
                      <input type="date" required value={verForm.expiration_date} onChange={e => setVerForm({ ...verForm, expiration_date: e.target.value })} className="form-input" />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setVerModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Release Version</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-box glass-panel animate-fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Delete Project?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Are you sure you want to delete this project? This action cannot be undone and all associated data will be lost.
            </p>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={deleteProject} className="btn btn-danger">Yes, Delete Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
