import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Save, AlertCircle } from 'lucide-react';

const INITIAL_FORM = {
  title: '',
  description: '',
  status: 'Planning',
  priority: 'Medium',
  deadline: '',
  client_id: '',
  service_type: ''
};

export default function ProjectForm({ project, onClose, onSave }) {
  const [form, setForm]     = useState(INITIAL_FORM);
  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');
  const isEdit = Boolean(project);

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'Planning',
        priority: project.priority || 'Medium',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        client_id: project.client_id || '',
        service_type: project.service_type || ''
      });
    }

    // Fetch clients list
    fetch('/api/users?role=client', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, [project]);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Project title is required';
    if (!form.client_id)    e.client_id = 'Please select a client';
    if (!form.deadline)     e.deadline = 'Deadline is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const url    = isEdit ? `/api/projects/${project.id}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          client_id: parseInt(form.client_id)
        })
      });
      if (res.ok) {
        const saved = await res.json();
        onSave && onSave(saved);
        onClose && onClose();
      } else {
        const err = await res.json();
        setErrors({ _general: err.error || 'Failed to save project.' });
      }
    } catch {
      setErrors({ _general: 'Network error. Please try again.' });
    }
    setSaving(false);
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'var(--glass-bg)',
    border: `1px solid ${errors[field] ? '#ef4444' : 'var(--glass-border)'}`,
    color: 'var(--text-primary)',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s'
  });

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '18px',
        padding: '28px 32px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEdit ? <Save size={16} color="#fff" /> : <FolderPlus size={16} color="#fff" />}
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Project' : 'Create New Project'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* General Error */}
        {errors._general && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px' }}>
            <AlertCircle size={14} /> {errors._general}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Project Title *</label>
            <input
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Brand Identity Redesign"
              style={inputStyle('title')}
            />
            {errors.title && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444' }}>{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Describe the project scope and goals…"
              style={{ ...inputStyle('description'), resize: 'vertical' }}
            />
          </div>

          {/* Row: Client + Service Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Client *</label>
              <select value={form.client_id} onChange={e => handleChange('client_id', e.target.value)} style={inputStyle('client_id')}>
                <option value="">Select client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                ))}
              </select>
              {errors.client_id && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444' }}>{errors.client_id}</p>}
            </div>
            <div>
              <label style={labelStyle}>Service Type</label>
              <select value={form.service_type} onChange={e => handleChange('service_type', e.target.value)} style={inputStyle('service_type')}>
                <option value="">Select…</option>
                {['Web Design','Mobile App','Branding','SEO','Video Production','Social Media','Other'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => handleChange('status', e.target.value)} style={inputStyle('status')}>
                {['Planning','In Progress','Review','Completed','On Hold'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} style={inputStyle('priority')}>
                {['Low','Medium','High','Critical'].map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Deadline *</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => handleChange('deadline', e.target.value)}
                style={inputStyle('deadline')}
              />
              {errors.deadline && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444' }}>{errors.deadline}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '9px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 2, padding: '12px', borderRadius: '9px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
