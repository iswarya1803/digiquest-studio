import PDFDocument from 'pdfkit';
import { dbData, saveDB } from './db.js';

function drawHeader(doc, title) {
  doc.rect(0, 0, 600, 100).fill('#1e1b4b');
  doc.fillColor('#ffffff').fontSize(28).text('DigiQuest Studio', 50, 35);
  doc.fontSize(12).fillColor('#a5b4fc').text('123 Media Boulevard, Creation City, CA 90210', 50, 65);
  
  doc.fontSize(18).fillColor('#ffffff').text(title, 350, 40, { align: 'right' });
  doc.moveDown(3);
}

function drawFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 50, 600, 50).fill('#f9fafb');
    doc.fillColor('#6b7280').fontSize(10).text(
      `Generated on ${new Date().toLocaleString()} | Page ${i + 1} of ${pages.count}`,
      50,
      doc.page.height - 30,
      { align: 'center' }
    );
  }
}

function logPDFGeneration(projectId, docType, requestedBy) {
  const newId = dbData.pdf_logs.length > 0 ? Math.max(...dbData.pdf_logs.map(e => e.id)) + 1 : 1;
  dbData.pdf_logs.unshift({
    id: newId,
    project_id: projectId,
    doc_type: docType,
    requested_by: requestedBy,
    created_at: new Date().toISOString()
  });
  saveDB();
}

export function generateProjectDeliverySummaryPDF(res, project, client, checklist, revisions, requestedBy) {
  const doc = new PDFDocument({ margin: 50, bufferPages: true });
  const filename = `Project_Summary_${project.id}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  doc.pipe(res);
  
  // Header
  drawHeader(doc, 'Project Delivery Summary');
  doc.y = 120; // reset Y after header

  // Section 1 & 2: Information
  const startY = doc.y;
  
  // Left column: Client Information
  doc.fillColor('#1e1b4b').fontSize(14).font('Helvetica-Bold').text('Client Information', 50, startY);
  doc.fontSize(11).font('Helvetica').fillColor('#000000');
  doc.text(`Name: ${client.full_name}`, 50, doc.y + 5);
  doc.text(`Company: ${client.company_name || 'N/A'}`, 50, doc.y + 2);
  doc.text(`Project ID: #${project.id}`, 50, doc.y + 2);
  doc.text(`Completion Date: ${project.status === 'Completed' ? new Date().toLocaleDateString() : 'Pending'}`, 50, doc.y + 2);
  
  // Right column: Project Details
  doc.fillColor('#1e1b4b').fontSize(14).font('Helvetica-Bold').text('Project Details', 320, startY);
  doc.fontSize(11).font('Helvetica').fillColor('#000000');
  doc.text(`Title: ${project.title}`, 320, doc.y + 5);
  doc.text(`Status: ${project.status}`, 320, doc.y + 2);
  doc.text(`Priority: ${project.priority}`, 320, doc.y + 2);
  doc.text(`Expected Delivery: ${project.deadline || 'N/A'}`, 320, doc.y + 2);
  doc.text(`Assigned Team: ${project.assigned_team || 'N/A'}`, 320, doc.y + 2);

  doc.moveDown(3);

  // Section 3: Deliverables Completed
  let curY = doc.y;
  doc.fillColor('#1e1b4b').fontSize(14).font('Helvetica-Bold').text('Deliverables Completed', 50, curY);
  curY += 20;
  
  doc.rect(50, curY, 500, 25).fill('#f3f4f6');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
  doc.text('Deliverable', 60, curY + 8);
  doc.text('Status', 450, curY + 8, { align: 'right', width: 90 });
  
  curY += 30;
  doc.font('Helvetica').fontSize(11);
  
  const checklistItems = [
    { label: 'Color Grading', val: checklist.color_grading },
    { label: 'Audio Mix', val: checklist.audio_mix },
    { label: 'Subtitles', val: checklist.subtitle },
    { label: 'Format Conversion', val: checklist.format_conversion },
    { label: 'Final QC', val: checklist.final_qc }
  ];
  
  checklistItems.forEach(item => {
    if (item.val && item.val !== 'N/A') {
      doc.text(item.label, 60, curY);
      doc.text(item.val, 450, curY, { align: 'right', width: 90 });
      doc.moveTo(50, curY + 15).lineTo(550, curY + 15).stroke('#e5e7eb');
      curY += 25;
    }
  });

  doc.y = curY + 10;
  
  // Section 4: Revision Summary
  if (doc.y > 600) { doc.addPage(); doc.y = 50; }
  doc.fillColor('#1e1b4b').fontSize(14).font('Helvetica-Bold').text('Revision Summary', 50, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  if (revisions && revisions.length > 0) {
    revisions.forEach(rev => {
      doc.text(`• [${rev.status}] ${rev.category}: ${rev.comment}`);
      doc.moveDown(0.2);
    });
  } else {
    doc.fillColor('#6b7280').text('No revisions recorded.');
  }
  doc.moveDown(2);

  // Section 5: Notes
  if (doc.y > 600) { doc.addPage(); doc.y = 50; }
  doc.fillColor('#1e1b4b').fontSize(14).font('Helvetica-Bold').text('Notes & Remarks', 50, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  doc.text(project.notes || 'No additional remarks.');
  doc.moveDown(3);

  // Section 6: Sign-off
  if (doc.y > 650) { doc.addPage(); doc.y = 50; }
  const signY = doc.y + 20;
  doc.moveTo(50, signY).lineTo(250, signY).stroke('#d1d5db');
  doc.moveTo(350, signY).lineTo(550, signY).stroke('#d1d5db');
  
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
  doc.text('Project Manager Approval', 50, signY + 10);
  doc.text('Client Approval', 350, signY + 10);
  
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
  doc.text(`Timestamp: ${new Date().toLocaleString()}`, 50, signY + 25);

  drawFooter(doc);
  doc.end();
  
  logPDFGeneration(project.id, 'Project Delivery Summary', requestedBy);
}

export function generateProjectReportPDF(res, projects, title, requestedBy) {
  const doc = new PDFDocument({ margin: 50, bufferPages: true, layout: 'landscape' });
  const filename = `${title.replace(/\s+/g, '_')}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  doc.pipe(res);
  
  drawHeader(doc, title);
  doc.y = 120;
  
  doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('Project Summary', 50, doc.y);
  doc.moveDown();
  
  // Table Header
  const startY = doc.y;
  doc.rect(50, startY, 700, 30).fill('#f3f4f6');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
  doc.text('ID', 60, startY + 10);
  doc.text('Title', 100, startY + 10);
  doc.text('Status', 300, startY + 10);
  doc.text('Progress', 400, startY + 10);
  
  let currentY = startY + 40;
  doc.font('Helvetica').fontSize(10);
  
  projects.forEach(p => {
    if (currentY > 450) {
      doc.addPage();
      currentY = 50;
    }
    doc.text(p.id.toString(), 60, currentY);
    doc.text(p.title, 100, currentY, { width: 190, height: 15, ellipsis: true });
    doc.text(p.status, 300, currentY);
    doc.text(`${p.completion_rate}%`, 400, currentY);
    
    currentY += 25;
  });
  
  drawFooter(doc);
  doc.end();
  
  logPDFGeneration(null, title, requestedBy);
}
