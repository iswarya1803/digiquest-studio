import React, { useState, useEffect } from 'react';
import { Video, Plus, Edit, Trash2, CheckCircle, AlertCircle, Eye, EyeOff, Save, X } from 'lucide-react';

export default function AdminPreviewCenter({ projects, pcSelectedProject, setPcSelectedProject }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [form, setForm] = useState({
    title: '', video_url: '', color_grading_url: '', audio_mix_url: '', subtitle_url: '',
    type: 'Preview', status: 'Uploaded', release_date: new Date().toISOString().split('T')[0],
    notes: '', download_enabled: true, notify_client: true
  });

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchVersions = async () => {
    if (!pcSelectedProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${pcSelectedProject}/versions`, { headers: headers() });
      if (res.ok) setVersions(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVersions(); }, [pcSelectedProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/projects/${pcSelectedProject}/versions/${editId}` : `/api/projects/${pcSelectedProject}/versions`;
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: headers(),
      body: JSON.stringify(form)
    });

    if (res.ok) {
      alert(editId ? 'Version updated successfully' : 'Version uploaded successfully');
      setShowForm(false);
      setEditId(null);
      fetchVersions();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  };

  const handleEdit = (v) => {
    setForm({
      title: v.title, video_url: v.video_url || '', color_grading_url: v.color_grading_url || '', 
      audio_mix_url: v.audio_mix_url || v.audio_url || '', subtitle_url: v.subtitle_url || '', 

      type: v.type || 'Preview', status: v.status || 'Uploaded', release_date: v.release_date || new Date().toISOString().split('T')[0],
      notes: v.notes || '', download_enabled: v.download_enabled, notify_client: false
    });
    setEditId(v.id);
    setShowForm(true);
  };

  const handleDelete = async (vid) => {
    if (!window.confirm('Are you sure you want to delete this version?')) return;
    const res = await fetch(`/api/projects/${pcSelectedProject}/versions/${vid}`, { method: 'DELETE', headers: headers() });
    if (res.ok) fetchVersions();
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div className="section-header">
        <div className="section-title"><Video size={15} /> Admin Preview Center</div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Select Project</label>
          <select 
            className="form-input" 
            value={pcSelectedProject || ''} 
            onChange={e => setPcSelectedProject(e.target.value)}
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        {pcSelectedProject && (
          <button onClick={() => { 
            setEditId(null); 
            setForm({ title: '', video_url: '', color_grading_url: '', audio_mix_url: '', subtitle_url: '', type: 'Preview', status: 'Uploaded', release_date: new Date().toISOString().split('T')[0], notes: '', download_enabled: true, notify_client: true });
            setShowForm(!showForm); 
          }} className="btn btn-primary" style={{ marginTop: '22px' }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Upload New Version'}
          </button>
        )}
      </div>

      {showForm && pcSelectedProject && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>{editId ? 'Edit Version' : 'Upload New Version'}</h3>
          <div className="modal-grid">
            <div>
              <label className="form-label">Version Name / Title</label>
              <input required className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. V1, Final Cut" />
            </div>
            <div>
              <label className="form-label">Video URL / File Path</label>
              <input required className="form-input" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Color Grading URL</label>
              <input className="form-input" value={form.color_grading_url} onChange={e => setForm({...form, color_grading_url: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Audio Mix URL</label>
              <input className="form-input" value={form.audio_mix_url} onChange={e => setForm({...form, audio_mix_url: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Subtitle URL</label>
              <input className="form-input" value={form.subtitle_url} onChange={e => setForm({...form, subtitle_url: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Preview</option>
                <option>Final</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option>Uploaded</option>
                <option>Under Review</option>
                <option>Revision Requested</option>
                <option>Approved</option>
                <option>Final Delivered</option>
              </select>
            </div>
            <div>
              <label className="form-label">Release Date</label>
              <input type="date" className="form-input" value={form.release_date} onChange={e => setForm({...form, release_date: e.target.value})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '28px' }}>
              <label className="modal-checkbox-row">
                <input type="checkbox" checked={form.download_enabled} onChange={e => setForm({...form, download_enabled: e.target.checked})} />
                Client can download
              </label>
              {!editId && (
                <label className="modal-checkbox-row">
                  <input type="checkbox" checked={form.notify_client} onChange={e => setForm({...form, notify_client: e.target.checked})} />
                  Send email notification
                </label>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Admin Notes for Client</label>
              <textarea className="form-input" rows="3" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes to display in Preview Center..."></textarea>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', paddingBottom: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '1.05rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}><Save size={16} style={{ marginRight: '6px' }} /> {editId ? 'Save Changes' : 'Upload & Publish'}</button>
          </div>
        </form>
      )}

      {pcSelectedProject && !loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Type</th>
                <th>Status</th>
                <th>Release Date</th>
                <th>Download</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No versions uploaded yet.</td></tr>
              ) : versions.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.title}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>V{v.version_number}</div>
                  </td>
                  <td><span className={`badge ${v.type === 'Final' ? 'badge-completed' : 'badge-progress'}`}>{v.type || 'Preview'}</span></td>
                  <td><span className="badge badge-pending">{v.status || 'Uploaded'}</span></td>
                  <td>{v.release_date || new Date(v.created_at).toLocaleDateString()}</td>
                  <td>{v.download_enabled ? <Eye size={14} color="var(--success)" /> : <EyeOff size={14} color="var(--danger)" />}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="project-card-actions" style={{ justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(v)} className="btn btn-secondary action-btn" title="Edit"><Edit size={12} /> <span className="action-label">Edit</span></button>
                      <button onClick={() => handleDelete(v.id)} className="btn btn-danger action-btn" title="Delete"><Trash2 size={12} /> <span className="action-label">Delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!pcSelectedProject && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '8px', marginTop: '24px' }}>
          <Video size={32} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Project Selected</div>
          <div>Please select a project from the dropdown above to view and manage its versions.</div>
        </div>
      )}
    </div>
  );
}
