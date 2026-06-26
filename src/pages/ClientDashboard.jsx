import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, FileVideo, Download, MessageSquare,
  Signature, QrCode, Star, AlertTriangle, AlertCircle,
  FileText, Send, X
} from 'lucide-react';

export default function ClientDashboard({ activeTab = 'client_dashboard' }) {
  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [versions, setVersions]               = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [revisions, setRevisions]             = useState([]);
  const [loading, setLoading]                 = useState(true);

  const sigRef   = useRef(null);
  const scribRef = useRef(null);

  const [drawingSig,   setDrawingSig]   = useState(false);
  const [drawingScrib, setDrawingScrib] = useState(false);
  const [scribOpen,    setScribOpen]    = useState(false);
  const [sigName,      setSigName]      = useState('');
  const [sigComment,   setSigComment]   = useState('');

  const [revForm, setRevForm] = useState({ category: 'Color Grading', comment: '' });

  const [pinOpen,         setPinOpen]         = useState(false);
  const [pinInput,        setPinInput]         = useState('');
  const [pinError,        setPinError]         = useState('');
  const [pendingDownload, setPendingDownload]  = useState(null);

  const [feedbackDone, setFeedbackDone]   = useState(false);
  const [feedForm, setFeedForm]           = useState({ rating: 5, comments: '', satisfied: true });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', notes: '', priority: 'Medium', deadline: '' });

  const token   = () => localStorage.getItem('token');
  const authH   = (extra = {}) => ({ Authorization: `Bearer ${token()}`, ...extra });

  /* ── Fetch ── */
  const fetchProjects = async () => {
    try {
      const res  = await fetch('/api/projects', { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(prev => data.find(p => p.id === prev?.id) || data[0]);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchDetails = async (pid) => {
    try {
      const [vR, rR] = await Promise.all([
        fetch(`/api/projects/${pid}/versions`,  { headers: authH() }),
        fetch(`/api/projects/${pid}/revisions`, { headers: authH() }),
      ]);
      if (vR.ok) { const vd = await vR.json(); setVersions(vd); if (vd.length) setSelectedVersion(vd[0]); }
      if (rR.ok) setRevisions(await rR.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (selectedProject) { fetchDetails(selectedProject.id); setFeedbackDone(false); } }, [selectedProject?.id]);

  const submitNewProject = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) { alert('Title is required'); return; }
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title: createForm.title, notes: createForm.notes, priority: createForm.priority, deadline: createForm.deadline, client_id: user.id })
      });
      if (res.ok) {
        const d = await res.json();
        alert('Project created: ' + d.title);
        setShowCreate(false);
        fetchProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to create project');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  /* ── Canvas Helpers ── */
  const canvas = (ref) => ref.current;
  const ctx    = (ref) => ref.current?.getContext('2d');

  const startDraw = (ref, setFlag, color, width) => (e) => {
    const c   = canvas(ref); if (!c) return;
    const cx  = ctx(ref);
    cx.strokeStyle = color; cx.lineWidth = width; cx.lineCap = 'round';
    const r   = c.getBoundingClientRect();
    const x   = (e.clientX ?? e.touches[0].clientX) - r.left;
    const y   = (e.clientY ?? e.touches[0].clientY) - r.top;
    cx.beginPath(); cx.moveTo(x, y);
    setFlag(true);
  };

  const draw = (ref, flag) => (e) => {
    if (!flag) return;
    const c  = canvas(ref); if (!c) return;
    const cx = ctx(ref);
    const r  = c.getBoundingClientRect();
    const x  = (e.clientX ?? e.touches?.[0].clientX) - r.left;
    const y  = (e.clientY ?? e.touches?.[0].clientY) - r.top;
    cx.lineTo(x, y); cx.stroke();
  };

  const clearCanvas = (ref) => {
    const c = canvas(ref); if (!c) return;
    ctx(ref).clearRect(0, 0, c.width, c.height);
  };

  const clearScribble = () => {
    const c = canvas(scribRef); if (!c) return;
    const cx = ctx(scribRef);
    cx.fillStyle = '#070b14'; cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#4a5568'; cx.font = '11px sans-serif';
    cx.fillText('Draw your revision instructions here…', 14, 22);
  };

  useEffect(() => { if (scribOpen && scribRef.current) clearScribble(); }, [scribOpen]);

  /* ── Actions ── */
  const submitRevision = async (e) => {
    e.preventDefault();
    if (!revForm.comment.trim()) return;
    const screenshot = scribRef.current?.toDataURL('image/png') || null;
    const res = await fetch(`/api/projects/${selectedProject.id}/revisions`, {
      method: 'POST',
      headers: authH({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ version_id: selectedVersion?.id, category: revForm.category, comment: revForm.comment, screenshot_data: screenshot })
    });
    if (res.ok) { alert('Revision request submitted. Team notified.'); setRevForm({ category: 'Color Grading', comment: '' }); setScribOpen(false); fetchDetails(selectedProject.id); fetchProjects(); }
  };

  const submitApproval = async (status) => {
    if (!sigName) { alert('Please enter the signatory full name.'); return; }
    const sig = sigRef.current?.toDataURL('image/png') || '';
    const res = await fetch(`/api/projects/${selectedProject.id}/approve`, {
      method: 'POST',
      headers: authH({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ version_id: selectedVersion?.id, signed_by: sigName, signature_svg: sig, status, feedback: sigComment })
    });
    if (res.ok) { alert(`Project ${status === 'Approved' ? 'approved and signed off' : 'revision requested'}.`); setSigName(''); setSigComment(''); clearCanvas(sigRef); fetchProjects(); }
  };

  const handleDownload = (type, file) => {
    if (selectedVersion?.password_protected === 1) {
      setPendingDownload({ type, file }); setPinInput(''); setPinError(''); setPinOpen(true);
    } else { doDownload(type, file); }
  };

  const verifyPin = async (e) => {
    e.preventDefault(); setPinError('');
    const res = await fetch(`/api/versions/${selectedVersion.id}/verify-pin`, {
      method: 'POST',
      headers: authH({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pin: pinInput })
    });
    if (res.ok) { setPinOpen(false); doDownload(pendingDownload.type, pendingDownload.file); }
    else setPinError('Incorrect PIN. Access denied.');
  };

  const doDownload = async (type, file) => {
    try {
      await fetch(`/api/projects/${selectedProject.id}/downloads`, {
        method: 'POST',
        headers: authH({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ version_id: selectedVersion?.id, file_type: type, file_name: file })
      });
    } catch { /* silent */ }
    
    // Instead of a fake text file, actually open the URL
    if (file && file.startsWith('http')) {
      window.open(file, '_blank');
    } else {
      // It's a generated PDF
      window.open(`/api/pdf/summary/${selectedProject.id}?token=${token()}`, '_blank');
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: authH({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ project_id: selectedProject.id, ...feedForm })
    });
    if (res.ok) setFeedbackDone(true);
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="loading-center">
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p className="loading-text">Loading your projects…</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="loading-center">
        <div style={{ textAlign: 'center' }}>
          <p className="loading-text">No projects available for this account.</p>
          <p style={{ opacity: 0.8 }}>If you expect projects, please ensure you're logged in with the correct account or contact your admin.</p>
        </div>
      </div>
    );
  }

  const ensureObj = (val) => typeof val === 'string' ? { status: val } : (val || { status: 'Pending' });
  const steps = selectedProject ? [
    { key: 'color_grading', label: 'Color Grading', val: ensureObj(selectedProject.color_grading) },
    { key: 'audio_mix', label: 'Audio Mix',     val: ensureObj(selectedProject.audio_mix) },
    { key: 'subtitle', label: 'Subtitle SRT',  val: ensureObj(selectedProject.subtitle) },
    { key: 'final_qc', label: 'Final QC',      val: ensureObj(selectedProject.final_qc) },
    { key: 'client_signoff', label: 'Client Sign-off', val: ensureObj(selectedProject.client_signoff) },
  ] : [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── MAIN DASHBOARD ── */}
      {activeTab === 'client_dashboard' && (
        <>
          {/* Hero banner */}
          <div className="glass-panel client-hero">
        <div className="client-hero-left">
          <span>Client Access Portal</span>
          <h2>{selectedProject.title}</h2>
        </div>
        <div className="hero-project-select">
          <label>Active Project:</label>
          <select value={selectedProject.id} onChange={e => { const p = projects.find(x => x.id === parseInt(e.target.value)); if (p) setSelectedProject(p); }} className="form-input">
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button onClick={() => setShowCreate(true)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>New Project</button>
        </div>

      {/* Progress timeline */}
      <div className="glass-panel timeline-strip">
        <div className="timeline-strip-header">
          <h3>Post-Production Progress</h3>
          <div className="timeline-strip-deadline">
            Deadline: <strong>{selectedProject.deadline || 'TBD'}</strong>
          </div>
        </div>
        <div className="timeline-steps">
          {steps.map((s, i) => {
            const done = s.val.status === 'Completed' || s.val.status === 'N/A';
            const prog = s.val.status === 'In Progress' || s.val.status === 'Review';
            return (
              <div key={i} className={`step-card${done ? ' completed' : prog ? ' in-progress' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="step-circle">{done ? '✓' : i + 1}</div>
                  <div>
                    <div className="step-label">{s.label}</div>
                    <div className="step-val">{s.val.status || 'Pending'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '32px' }}>
                  {s.val.assigned_team && <div>Team: {s.val.assigned_team}</div>}
                  {s.val.due_date && <div>Due: {s.val.due_date}</div>}
                  {s.val.notes && <div style={{ fontStyle: 'italic', marginTop: '4px' }}>"{s.val.notes}"</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <div className="progress-bar-header">
            <span>Overall Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedProject.completion_rate}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${selectedProject.completion_rate}%` }} />
          </div>
        </div>
      </div>

      {/* Main 2-col review grid */}
      <div className="review-grid">

        {/* ── LEFT ── */}
        <div className="review-left">



          {/* Revisions */}
          <div className="glass-panel revisions-panel">
            <div className="revisions-header">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <MessageSquare size={14} /> Revision Requests
              </div>
              <button onClick={() => setScribOpen(v => !v)} className={`btn btn-sm ${scribOpen ? 'btn-danger' : 'btn-secondary'}`}>
                {scribOpen ? <><X size={12} /> Cancel</> : '+ Request Revision'}
              </button>
            </div>

            {scribOpen && (
              <form onSubmit={submitRevision} className="revision-form animate-fade-in">
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                  Submitting for {selectedVersion ? `Version V${selectedVersion.version_number}` : 'Project'}
                </div>
                <div className="revision-form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category</label>
                    <select value={revForm.category} onChange={e => setRevForm({ ...revForm, category: e.target.value })} className="form-input">
                      <option>Color Grading</option><option>Audio Mix</option><option>Subtitles</option><option>Editing</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Instructions</label>
                    <input type="text" required value={revForm.comment} onChange={e => setRevForm({ ...revForm, comment: e.target.value })} placeholder="e.g. Lower BGM at 0:15" className="form-input" />
                  </div>
                </div>

                <div>
                  <div className="scribble-header">
                    <label className="form-label" style={{ marginBottom: 0 }}>Visual Scribble Pad</label>
                    <button type="button" onClick={clearScribble} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
                  </div>
                  <div className="scribble-area">
                    <canvas ref={scribRef} width={700} height={200}
                      onMouseDown={startDraw(scribRef, setDrawingScrib, '#f43f5e', 3)}
                      onMouseMove={draw(scribRef, drawingScrib)}
                      onMouseUp={() => setDrawingScrib(false)}
                      onMouseLeave={() => setDrawingScrib(false)}
                      onTouchStart={startDraw(scribRef, setDrawingScrib, '#f43f5e', 3)}
                      onTouchMove={draw(scribRef, drawingScrib)}
                      onTouchEnd={() => setDrawingScrib(false)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Send size={12} /> Submit Revision
                  </button>
                </div>
              </form>
            )}

            <div className="revision-list">
              {revisions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>No revision requests yet.</p>
              ) : revisions.map(r => (
                <div key={r.id} className="revision-item">
                  <div className="revision-item-body">
                    <div className="revision-item-meta">
                      <span className="badge badge-high" style={{ fontSize: '0.58rem' }}>{r.category}</span>
                      <span>V{r.version_number}</span>
                    </div>
                    <p className="revision-comment">{r.comment}</p>
                    {r.screenshot_data && (
                      <div className="revision-screenshot">
                        <img src={r.screenshot_data} alt="Scribble" />
                      </div>
                    )}
                  </div>
                  <span className={`badge ${r.status === 'Resolved' ? 'badge-completed' : r.status === 'In Progress' ? 'badge-progress' : 'badge-pending'}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="review-right">

          {/* Approval Center */}
          <div className="glass-panel right-box">
            <div className="right-box-title"><Signature size={14} /> Approval Center</div>
            {selectedProject.status === 'Completed' ? (
              <div className="approval-done">
                <CheckCircle size={24} />
                <strong>Project Signed Off</strong>
                <p>This project has been approved and completed. Downloads are active.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Signatory Full Name</label>
                  <input type="text" value={sigName} onChange={e => setSigName(e.target.value)} placeholder="e.g. Sarah Connor" className="form-input" />
                </div>
                <div>
                  <div className="scribble-header">
                    <label className="form-label" style={{ marginBottom: 0 }}>Digital Signature</label>
                    <button type="button" onClick={() => clearCanvas(sigRef)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
                  </div>
                  <div className="sig-canvas-wrap">
                    <canvas ref={sigRef} width={400} height={160}
                      onMouseDown={startDraw(sigRef, setDrawingSig, '#6366f1', 2.5)}
                      onMouseMove={draw(sigRef, drawingSig)}
                      onMouseUp={() => setDrawingSig(false)}
                      onMouseLeave={() => setDrawingSig(false)}
                      onTouchStart={startDraw(sigRef, setDrawingSig, '#6366f1', 2.5)}
                      onTouchMove={draw(sigRef, drawingSig)}
                      onTouchEnd={() => setDrawingSig(false)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Comments (optional)</label>
                  <input type="text" value={sigComment} onChange={e => setSigComment(e.target.value)} placeholder="Feedback or notes…" className="form-input" />
                </div>
                <div className="g2">
                  <button onClick={() => submitApproval('Rejected')} className="btn btn-danger" style={{ padding: '10px' }}>Reject Cut</button>
                  <button onClick={() => submitApproval('Approved')} className="btn btn-success" style={{ padding: '10px' }}>Approve ✓</button>
                </div>
              </div>
            )}
          </div>



          {/* QR Access */}
          <div className="glass-panel right-box">
            <div className="right-box-title"><QrCode size={14} /> Mobile Quick Access</div>
            <div className="qr-box">
              <img src={selectedProject.qr_code_url} alt="QR Code" className="qr-img" />
              <div className="qr-body">
                <h5>Scan to Open on Mobile</h5>
                <p>Access this project review portal directly from your phone or tablet.</p>
              </div>
            </div>
          </div>

          {/* Feedback (only on completed projects) */}
          {selectedProject.status === 'Completed' && (
            <div className="glass-panel right-box">
              <div className="right-box-title"><Star size={14} /> Project Feedback</div>
              {feedbackDone ? (
                <div className="approval-done" style={{ padding: '16px' }}>
                  <CheckCircle size={20} />
                  <strong>Thank you!</strong>
                  <p>Your feedback has been recorded.</p>
                </div>
              ) : (
                <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="stars-row">
                    <span>Rating:</span>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setFeedForm({ ...feedForm, rating: s })} className={`star-btn ${s <= feedForm.rating ? 'on' : 'off'}`}>★</button>
                    ))}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Comments</label>
                    <textarea value={feedForm.comments} onChange={e => setFeedForm({ ...feedForm, comments: e.target.value })} placeholder="How was the experience?" className="form-input" style={{ height: '60px' }} />
                  </div>
                  <button type="submit" className="btn btn-primary w-full btn-sm">Submit Feedback</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* ── DOCUMENTS CENTER ── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="section-header">
              <div className="section-title"><FileText size={15} /> Official Documents</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Download official delivery documents and generated PDFs for: <strong>{selectedProject.title}</strong>
            </p>
            
            <div className="download-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {[
                { type: 'Summary', label: 'Project Delivery Summary', desc: 'Summary of project deliverables and status.' },
              ].filter(doc => doc !== null).map(doc => (
                <div key={doc.type} className="project-card glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{doc.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.desc}</div>
                    </div>
                    <FileText size={20} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                  </div>
                  <button onClick={() => doDownload(doc.type, `${doc.type}.pdf`)} className="btn btn-primary btn-sm" style={{ marginTop: '16px', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <Download size={13} /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {pinOpen && (
        <div className="modal-overlay">
          <div className="modal-box glass-panel animate-fade-in" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🔐 Secure Download</h3>
              <button className="modal-close" onClick={() => setPinOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={verifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                This file is protected. Enter the security PIN provided by DigiQuest Studio to proceed.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Security PIN</label>
                <input type="password" required value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(''); }} placeholder="••••" className="form-input" style={{ letterSpacing: '0.2em', fontSize: '1.2rem', textAlign: 'center' }} autoFocus />
                {pinError && <p style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '6px' }}>{pinError}</p>}
              </div>
              <div className="modal-footer" style={{ marginTop: 0 }}>
                <button type="button" onClick={() => setPinOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Unlock Download</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
