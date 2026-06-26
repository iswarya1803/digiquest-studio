import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Plus, X, AlertCircle, Calendar, User, Folder,
  Clock, CheckCircle2, XCircle, Loader2, FileEdit, Sparkles
} from 'lucide-react';
import './revision.css';

const PRIORITY_COLORS = {
  Low: '#22d3ee',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444'
};

const STATUS_META = {
  Pending:     { icon: Clock,         color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'In Progress':{ icon: Loader2,      color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  Resolved:    { icon: CheckCircle2,  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  Rejected:    { icon: XCircle,       color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
};

export default function Revision() {
  const [revisions, setRevisions]   = useState([]);
  const [projects, setProjects]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editModal, setEditModal]   = useState(null); // { revision }
  const [filterStatus, setFilter]   = useState('All');
  const [toast, setToast]           = useState(null);

  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [form, setForm] = useState({
    project_id: '', title: '', description: '', priority: 'Medium', version_id: ''
  });
  const [projectVersions, setProjectVersions] = useState([]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchRevisions() {
    setLoading(true);
    try {
      const res = await fetch('/api/revisions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRevisions(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function fetchProjects() {
    try {
      let res;
      try {
        res = await fetch('http://localhost:5001/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      } catch (netErr) {
        res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      }
      const pdata = res.ok ? await res.json() : [];
      if (res.status === 401) {
        showToast('You must be logged in to load projects.', 'error');
        setProjects([]);
        return;
      }
      if (res.ok) setProjects(pdata);
    } catch (err) {
      showToast('Failed to load projects. Check your connection.', 'error');
      setProjects([]);
    }
  }

  useEffect(() => {
    fetchRevisions();
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.project_id) { showToast('Please select a project.', 'error'); return; }
    if (!form.version_id) { showToast('Please select a version.', 'error'); return; }
    if (!form.description && !form.title) { showToast('Please provide a description or title for the revision.', 'error'); return; }

    const payload = {
      version_id: parseInt(form.version_id),
      category: form.priority || 'Medium',
      comment: form.description || form.title,
      screenshot_data: null
    };

    try {
      const res = await fetch(`/api/projects/${parseInt(form.project_id)}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast('Revision request submitted!');
        setShowForm(false);
        setForm({ project_id: '', title: '', description: '', priority: 'Medium', version_id: '' });
        setProjectVersions([]);
        fetchRevisions();
      } else {
        showToast(data.error || 'Failed to submit revision.', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  }

  async function handleStatusUpdate(e) {
    e.preventDefault();
    const { id, status, admin_notes } = editModal;
    try {
      const res = await fetch(`/api/revisions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, admin_notes })
      });
      if (res.ok) {
        showToast('Status updated successfully!');
        setEditModal(null);
        fetchRevisions();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    }
  }

  const displayed = filterStatus === 'All'
    ? revisions
    : revisions.filter(r => r.status === filterStatus);

  const statuses = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];

  const handleProjectSelect = async (e) => {
    const pid = e.target.value;
    setForm(f => ({ ...f, project_id: pid, version_id: '' }));
    if (!pid) {
      setProjectVersions([]);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${pid}/versions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const vdata = await res.json();
        setProjectVersions(vdata);
        if (vdata.length > 0) {
          setForm(f => ({ ...f, project_id: pid, version_id: vdata[0].id }));
        }
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="revision-page">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
          color: '#fff', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: '14px', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '340px',
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)',
          animation: 'slideUpFade 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="revision-header">
        <div>
          <h1 className="revision-header-title">
            <Sparkles size={28} color="var(--accent-primary)" />
            Revision Requests
          </h1>
          <p className="revision-header-subtitle">
            {isAdmin ? 'Manage and resolve client revision tickets efficiently' : 'Submit feedback and track your requested changes'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchRevisions}>
            <RefreshCw size={16} /> Refresh
          </button>
          {!isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="revision-filters">
        {statuses.map(s => (
          <button
            key={s}
            className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
            {s !== 'All' && (
              <span className="filter-count" style={{
                background: filterStatus === s ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: filterStatus === s ? '#fff' : 'var(--text-secondary)'
              }}>
                {revisions.filter(r => r.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid Layout for Revisions */}
      {loading ? (
        <div className="state-container">
          <Loader2 size={40} className="state-icon spinner" />
          <h3 style={{ margin: '12px 0 4px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Loading Revisions</h3>
          <p>Fetching the latest updates from the server...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="state-container">
          <FileEdit size={48} className="state-icon" />
          <h3 style={{ margin: '12px 0 4px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>No Requests Found</h3>
          <p>{isAdmin ? 'All clear! No revisions match this filter.' : 'You haven\'t submitted any revision requests yet.'}</p>
          {!isAdmin && filterStatus === 'All' && (
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create Your First Request
            </button>
          )}
        </div>
      ) : (
        <div className="revision-grid">
          {displayed.map((r, index) => {
            const meta = STATUS_META[r.status] || STATUS_META.Pending;
            const StatusIcon = meta.icon;
            return (
              <div key={r.id} className="revision-card" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="revision-card-header">
                  <h3 className="revision-card-title">{r.title}</h3>
                  <span className="badge" style={{
                    background: `${PRIORITY_COLORS[r.priority]}22`,
                    color: PRIORITY_COLORS[r.priority],
                    border: `1px solid ${PRIORITY_COLORS[r.priority]}44`
                  }}>
                    {r.priority}
                  </span>
                </div>
                
                <p className="revision-card-desc">{r.description}</p>
                
                <div className="revision-card-meta">
                  <span title="Project"><Folder size={14} /> {r.projectTitle}</span>
                  {isAdmin && <span title="Requester"><User size={14} /> {r.requesterName}</span>}
                  <span title="Created At"><Calendar size={14} /> {new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                {r.admin_notes && (
                  <div className="admin-notes-box">
                    <strong style={{ color: 'var(--text-primary)' }}>Admin Notes:</strong><br/>
                    {r.admin_notes}
                  </div>
                )}

                <div className="revision-card-actions">
                  <span className="badge" style={{ background: meta.bg, color: meta.color }}>
                    <StatusIcon size={14} className={r.status === 'In Progress' ? 'spinner' : ''} />
                    {r.status}
                  </span>
                  
                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => setEditModal({ id: r.id, status: r.status, admin_notes: r.admin_notes || '' })}
                    >
                      Update Status
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">New Revision Request</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            
            {projects.length === 0 ? (
              <div className="state-container" style={{ padding: '40px 20px', border: 'none', background: 'transparent' }}>
                <Folder size={48} className="state-icon" />
                <h3 style={{ margin: '12px 0 4px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>No Projects Available</h3>
                <p>You need to be part of a project before you can submit a revision request.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Project</label>
                  <select className="form-input" value={form.project_id} onChange={handleProjectSelect} required>
                    <option value="">Select a project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Version</label>
                  <select className="form-input" value={form.version_id} onChange={e => setForm(f => ({ ...f, version_id: e.target.value }))} required>
                    <option value="">Select a version…</option>
                    {projectVersions.length > 0 ? projectVersions.map(v => <option key={v.id} value={v.id}>V{v.version_number} - {v.title}</option>) : (
                      <>
                        <option value="1">V1 - Initial Cut</option>
                        <option value="2">V2 - Second Revision</option>
                        <option value="3">V3 - Final Polish</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="E.g., Color grading adjustments needed" />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={4} placeholder="Describe exactly what changes are required..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Request</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Update Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Update Status</h2>
              <button className="modal-close" onClick={() => setEditModal(null)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleStatusUpdate}>
              <div className="form-group">
                <label className="form-label">Current Status</label>
                <select className="form-input" value={editModal.status} onChange={e => setEditModal(m => ({ ...m, status: e.target.value }))}>
                  {['Pending','In Progress','Resolved','Rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Admin Notes (visible to client)</label>
                <textarea className="form-input" value={editModal.admin_notes} onChange={e => setEditModal(m => ({ ...m, admin_notes: e.target.value }))} rows={4} placeholder="Add notes for the client regarding this status update..." />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
