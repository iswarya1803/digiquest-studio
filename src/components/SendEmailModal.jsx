import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

export default function SendEmailModal({ isOpen, onClose, clientEmail, projectTitle, emailType, onSend }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    await onSend(message);
    setIsSending(false);
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="modal-box glass-panel" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Send {emailType} Email</h3>
          <button className="modal-close" onClick={onClose} disabled={isSending}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSend} className="modal-form">
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Project</label>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem' }}>
              {projectTitle}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>To Client Email</label>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem' }}>
              {clientEmail}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Optional Message (Added to Email Body)</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Hi there, please find attached the latest..."
              className="form-input" 
              style={{ height: '90px', width: '100%', resize: 'vertical' }}
              disabled={isSending}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSending}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={isSending}>
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
