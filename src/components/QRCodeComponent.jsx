import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react';

export default function QRCodeComponent({ projectId, projectTitle, size = 180 }) {
  const [copied, setCopied]   = useState(false);
  const qrRef                 = useRef(null);

  const projectUrl = projectId
    ? `${window.location.origin}/project/${projectId}`
    : window.location.href;

  function handleCopy() {
    navigator.clipboard.writeText(projectUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;

    // Convert SVG to PNG via canvas
    const canvas = document.createElement('canvas');
    const scale  = 3; // high-res
    canvas.width  = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `qr-project-${projectId || 'link'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px',
      padding: '20px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      maxWidth: '260px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <QrCode size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Quick Access QR
          </span>
        </div>
        {projectTitle && (
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectTitle}
          </p>
        )}
      </div>

      {/* QR Code */}
      <div ref={qrRef} style={{
        padding: '12px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <QRCodeSVG
          value={projectUrl}
          size={size}
          level="M"
          includeMargin={false}
          imageSettings={{
            src: '',
            excavate: false
          }}
          fgColor="#0f172a"
          bgColor="#ffffff"
        />
      </div>

      {/* URL display */}
      <div style={{
        width: '100%',
        padding: '7px 10px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        cursor: 'default'
      }}>
        {projectUrl}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          onClick={handleCopy}
          title="Copy link"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            background: copied ? 'rgba(34,197,94,0.15)' : 'var(--glass-bg)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'var(--glass-border)'}`,
            color: copied ? '#22c55e' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <button
          onClick={handleDownload}
          title="Download QR as PNG"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          <Download size={13} /> Save
        </button>

        <button
          onClick={() => window.open(projectUrl, '_blank')}
          title="Open link"
          style={{
            width: '36px',
            padding: '8px',
            borderRadius: '8px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );
}
