import express from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { dbData } from './db.js';

const router = express.Router();

// Helper to fetch all projects with related data
function getProjectsData() {
  return dbData.projects.map(p => {
    const client = dbData.users.find(u => u.id === p.client_id);
    const checklist = dbData.project_checklists.find(c => c.project_id === p.id) || {};
    return {
      id: p.id,
      title: p.title,
      clientName: client ? client.full_name : 'Unknown',
      status: p.status,
      priority: p.priority,
      deadline: p.deadline,
      completionRate: p.completion_rate,
      ...checklist
    };
  });
}

// PDF Export
router.get('/projects', async (req, res) => {
  const projects = getProjectsData();
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_report.pdf"');
  doc.pipe(res);

  doc.fontSize(20).text('DigiQuest Projects Report', { align: 'center' });
  doc.moveDown();

  projects.forEach(p => {
    doc.fontSize(12).text(`Project ID: ${p.id}`);
    doc.text(`Title: ${p.title}`);
    doc.text(`Client: ${p.clientName}`);
    doc.text(`Status: ${p.status}`);
    doc.text(`Priority: ${p.priority}`);
    doc.text(`Deadline: ${p.deadline || 'N/A'}`);
    doc.text(`Completion: ${p.completionRate}%`);
    doc.moveDown();
  });

  doc.end();
});

// Excel Export
router.get('/projects/excel', async (req, res) => {
  const projects = getProjectsData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Projects');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Client', key: 'clientName', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Deadline', key: 'deadline', width: 15 },
    { header: 'Completion %', key: 'completionRate', width: 15 }
  ];

  projects.forEach(p => sheet.addRow(p));

  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
