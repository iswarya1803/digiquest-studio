import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { initDB, dbData, saveDB } from './db.js';
import { authenticateToken, requireAdmin, requireClientOrAdmin } from './middleware/auth.js';
import { logAudit, createNotification } from './helpers.js';
import authRoutes from './authRoutes.js';
import reportRoutes from './reportRoutes.js';
import revisionRoutes from './revisionRoutes.js';
import * as pdfService from './pdfService.js';

// ==========================================
// SETUP
// ==========================================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'digiquest_jwt_secret_key_2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// HTTP server + Socket.io
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', socket => {
  console.log('Client connected via socket:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

function socketEmit(event, payload) {
  io.emit(event, payload);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
  res.json({
    status: 'DigiQuest backend is running',
    api: '/api',
    message: 'Open the frontend URL to use the application. This endpoint is only for the API server.'
  });
});

// Init Database
initDB();

// ==========================================
// HELPERS (imported from helpers.js)
// ==========================================
// logAudit and createNotification are imported from ./helpers.js

function calculateCompletionRate(checklist) {
  if (!checklist) return 0;
  let total = 0;
  const topics = ['color_grading', 'audio_mix', 'subtitle', 'final_qc', 'client_signoff'];
  topics.forEach(t => {
    let status = 'Pending';
    if (typeof checklist[t] === 'string') status = checklist[t];
    else if (checklist[t] && checklist[t].status) status = checklist[t].status;
    
    if (status === 'Completed') total += 20;
    else if (status === 'In Progress' || status === 'Review') total += 10;
  });
  return Math.min(100, Math.round(total));
}

// ==========================================
// REPORT ROUTES
// ==========================================
app.use('/api/reports', reportRoutes);

// ==========================================
// REVISION ROUTES
// ==========================================
app.use('/api/revisions', authenticateToken, revisionRoutes);



// ==========================================
// AUTHENTICATION
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = dbData.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logAudit(user.id, 'Login', `User ${user.email} successfully logged in.`);

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name }
    });
  } catch (err) {
    res.status(500).json({ error: 'Auth error during login: ' + err.message });
  }
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName || !role) return res.status(400).json({ error: 'All fields are required' });

  const existing = dbData.users.find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const newId = dbData.users.length > 0 ? Math.max(...dbData.users.map(u => u.id)) + 1 : 1;
  const newUser = {
    id: newId,
    email,
    password_hash: hash,
    role: role === 'admin' ? 'admin' : 'client',
    full_name: fullName,
    created_at: new Date().toISOString()
  };
  dbData.users.push(newUser);
  if (newUser.role === 'client') {
    const clientId = dbData.clients.length > 0 ? Math.max(...dbData.clients.map(c => c.id)) + 1 : 1;
    dbData.clients.push({ id: clientId, user_id: newId, company_name: '', phone: '', created_at: new Date().toISOString() });
  }
  saveDB();
  logAudit(newId, 'User Creation', `Created new ${newUser.role} account ${email}`);
  res.status(201).json({ message: 'User created successfully' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = dbData.users.find(u => u.email === email);
    if (!user) return res.json({ message: 'If the email exists, a reset code has been sent.' });
    res.json({ message: 'Password reset code generated.', resetCode: 'DIGI-9982' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields are required' });

  try {
    const user = dbData.users.find(u => u.email === email);
    if (!user || code !== 'DIGI-9982') return res.status(400).json({ error: 'Invalid email or reset code' });

    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(newPassword, salt);
    saveDB();
    logAudit(user.id, 'Project Update', 'User password reset using security code.');
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  logAudit(req.user.id, 'Logout', 'User logged out.');
  res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// PROJECTS & CHECKLISTS
// ==========================================

app.get('/api/projects', authenticateToken, (req, res) => {
  try {
    const list = dbData.projects.filter(p =>
      req.user.role === 'admin' ? true : p.client_id === req.user.id
    );
    const formatted = list.map(p => {
      const clientUser = dbData.users.find(u => u.id === p.client_id);
      const clientInfo = dbData.clients.find(c => c.user_id === p.client_id);
      const checklist = dbData.project_checklists.find(ch => ch.project_id === p.id);
      return {
        ...p,
        client_name: clientUser ? clientUser.full_name : 'Unknown Client',
        company_name: clientInfo ? clientInfo.company_name : 'Unknown Company',
        color_grading: checklist ? checklist.color_grading : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
        audio_mix: checklist ? checklist.audio_mix : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
        subtitle: checklist ? checklist.subtitle : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
        final_qc: checklist ? checklist.final_qc : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
        client_signoff: checklist ? checklist.client_signoff : { status: 'Pending', assigned_team: '', due_date: '', notes: '' }
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const p = dbData.projects.find(proj => proj.id === projectId);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && p.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const clientUser = dbData.users.find(u => u.id === p.client_id);
    const clientInfo = dbData.clients.find(c => c.user_id === p.client_id);
    const checklist = dbData.project_checklists.find(ch => ch.project_id === p.id);

    res.json({
      ...p,
      client_name: clientUser ? clientUser.full_name : 'Unknown Client',
      company_name: clientInfo ? clientInfo.company_name : 'Unknown Company',
      client_email: clientUser ? clientUser.email : '',
      client_phone: clientInfo ? clientInfo.phone : '',
      color_grading: checklist ? checklist.color_grading : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
      audio_mix: checklist ? checklist.audio_mix : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
      subtitle: checklist ? checklist.subtitle : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
      final_qc: checklist ? checklist.final_qc : { status: 'Pending', assigned_team: '', due_date: '', notes: '' },
      client_signoff: checklist ? checklist.client_signoff : { status: 'Pending', assigned_team: '', due_date: '', notes: '' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Project
app.post('/api/projects', authenticateToken, requireClientOrAdmin, async (req, res) => {
  const { title, client_id, priority, deadline, assigned_team, notes } = req.body;
  if (!title || !client_id) return res.status(400).json({ error: 'Title and client_id are required' });

  try {
    const isClient = req.user.role === 'client';
    const targetClientId = isClient ? req.user.id : parseInt(client_id);
    const initialStatus = isClient ? 'Pending Approval' : 'Pending';

    const projectId = dbData.projects.length > 0 ? Math.max(...dbData.projects.map(p => p.id)) + 1 : 1;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://localhost:5175/project/${projectId}`;

    const newProj = {
      id: projectId,
      title,
      client_id: targetClientId,
      status: initialStatus,
      priority: priority || 'Medium',
      deadline,
      completion_rate: 0,
      assigned_team: isClient ? '' : assigned_team,
      notes,
      qr_code_url: qrUrl,
      created_at: new Date().toISOString()
    };

    dbData.projects.push(newProj);

    const newChId = dbData.project_checklists.length > 0 ? Math.max(...dbData.project_checklists.map(c => c.id)) + 1 : 1;
    const defaultTopic = { status: 'Pending', assigned_team: '', due_date: '', notes: '', updated_at: new Date().toISOString() };
    dbData.project_checklists.push({
      id: newChId,
      project_id: projectId,
      color_grading: { ...defaultTopic },
      audio_mix: { ...defaultTopic },
      subtitle: { ...defaultTopic },
      final_qc: { ...defaultTopic },
      client_signoff: { ...defaultTopic },
      updated_at: new Date().toISOString()
    });

    saveDB();
    logAudit(req.user.id, 'Project Creation', `Proposed/created project "${title}" with ID ${projectId} (Status: ${initialStatus}).`);

    if (isClient) {
      // Notify all admins of the new proposal
      const admins = dbData.users.filter(u => u.role === 'admin');
      admins.forEach(admin => {
        createNotification(admin.id, 'New Project Proposal', `Client proposed a new project "${title}".`, 'info');
      });
      socketEmit('projectProposed', { projectId, title });
    } else {
      createNotification(targetClientId, 'Project Created', `A new project "${title}" has been created for you.`, 'info');
      socketEmit('projectCreated', { projectId, title });
      const clientUser = dbData.users.find(u => u.id === targetClientId);
    }

    res.json({ id: projectId, title, status: initialStatus, message: 'Project created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve or Decline Project Proposal (Admin Only)
app.put('/api/projects/:id/approve-proposal', authenticateToken, requireAdmin, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { action } = req.body; // 'approve' | 'decline'

  try {
    const pIndex = dbData.projects.findIndex(p => p.id === projectId);
    if (pIndex === -1) return res.status(404).json({ error: 'Project not found' });

    const project = dbData.projects[pIndex];
    if (project.status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Project is not pending approval' });
    }

    if (action === 'approve') {
      project.status = 'Pending';
      saveDB();
      logAudit(req.user.id, 'Project Approval', `Approved project proposal "${project.title}" (ID ${projectId}).`);
      createNotification(project.client_id, 'Project Proposal Approved', `Your project "${project.title}" has been approved and is now active.`, 'success');
      socketEmit('projectApproved', { projectId, title: project.title });
      
      const clientUser = dbData.users.find(u => u.id === project.client_id);

      res.json({ message: 'Project proposal approved successfully.' });
    } else {
      // Delete proposal or mark as declined
      dbData.projects.splice(pIndex, 1);
      // Clean up checklist too
      const chIndex = dbData.project_checklists.findIndex(c => c.project_id === projectId);
      if (chIndex !== -1) dbData.project_checklists.splice(chIndex, 1);
      saveDB();

      logAudit(req.user.id, 'Project Rejection', `Declined project proposal "${project.title}" (ID ${projectId}).`);
      createNotification(project.client_id, 'Project Proposal Declined', `Your project proposal "${project.title}" was declined.`, 'alert');
      res.json({ message: 'Project proposal declined and removed.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Edit Project
app.put('/api/projects/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { title, client_id, priority, deadline, status, assigned_team, notes } = req.body;
  const projectId = parseInt(req.params.id);

  try {
    const pIndex = dbData.projects.findIndex(p => p.id === projectId);
    if (pIndex === -1) return res.status(404).json({ error: 'Project not found' });

    dbData.projects[pIndex] = { ...dbData.projects[pIndex], title, client_id: parseInt(client_id), priority, deadline, status, assigned_team, notes };
    saveDB();
    logAudit(req.user.id, 'Project Update', `Updated project properties for ID ${projectId}.`);

    if (status && status !== dbData.projects[pIndex].status) {
      createNotification(parseInt(client_id), 'Project Updated', `Your project "${title}" status is now: ${status}.`, 'info');
      const clientUser = dbData.users.find(u => u.id === parseInt(client_id));
    }

    res.json({ message: 'Project updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Project
app.delete('/api/projects/:id', authenticateToken, requireAdmin, (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const p = dbData.projects.find(p => p.id === projectId);
    if (!p) return res.status(404).json({ error: 'Project not found' });

    dbData.projects = dbData.projects.filter(p => p.id !== projectId);
    dbData.project_checklists = dbData.project_checklists.filter(c => c.project_id !== projectId);
    dbData.project_versions = dbData.project_versions.filter(v => v.project_id !== projectId);
    dbData.revision_requests = dbData.revision_requests.filter(r => r.project_id !== projectId);
    dbData.approvals = dbData.approvals.filter(a => a.project_id !== projectId);
    dbData.downloads = dbData.downloads.filter(d => d.project_id !== projectId);
    saveDB();

    logAudit(req.user.id, 'Project Update', `Deleted project "${p.title}" (ID ${projectId}).`);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Checklist Specific Topic
app.put('/api/projects/:id/checklist/:topic', authenticateToken, requireAdmin, (req, res) => {
  const projectId = parseInt(req.params.id);
  const { topic } = req.params;
  const { status, assigned_team, due_date, notes } = req.body;

  const validTopics = ['color_grading', 'audio_mix', 'subtitle', 'final_qc', 'client_signoff'];
  if (!validTopics.includes(topic)) return res.status(400).json({ error: 'Invalid topic' });

  try {
    const chIndex = dbData.project_checklists.findIndex(c => c.project_id === projectId);
    if (chIndex === -1) return res.status(404).json({ error: 'Checklist not found' });

    // Migrate old string data if necessary
    if (typeof dbData.project_checklists[chIndex][topic] === 'string') {
      dbData.project_checklists[chIndex][topic] = {
        status: dbData.project_checklists[chIndex][topic],
        assigned_team: '', due_date: '', notes: '', updated_at: new Date().toISOString()
      };
    }

    dbData.project_checklists[chIndex][topic] = {
      ...dbData.project_checklists[chIndex][topic],
      status: status || dbData.project_checklists[chIndex][topic].status,
      assigned_team: assigned_team !== undefined ? assigned_team : dbData.project_checklists[chIndex][topic].assigned_team,
      due_date: due_date !== undefined ? due_date : dbData.project_checklists[chIndex][topic].due_date,
      notes: notes !== undefined ? notes : dbData.project_checklists[chIndex][topic].notes,
      updated_at: new Date().toISOString()
    };
    dbData.project_checklists[chIndex].updated_at = new Date().toISOString();

    const progress = calculateCompletionRate(dbData.project_checklists[chIndex]);
    const pIndex = dbData.projects.findIndex(p => p.id === projectId);
    if (pIndex !== -1) dbData.projects[pIndex].completion_rate = progress;
    saveDB();

    const project = dbData.projects.find(p => p.id === projectId);
    
    logAudit(req.user.id, 'Checklist Update', `Updated ${topic} to ${status} on project ID ${projectId}. Progress: ${progress}%`);
    socketEmit('checklistUpdated', { projectId, topic, progress });

    res.json({ message: 'Topic updated successfully.', completion_rate: progress, checklist: dbData.project_checklists[chIndex] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FILE UPLOAD
// ==========================================

app.post('/api/projects/:id/upload', authenticateToken, requireClientOrAdmin, upload.single('file'), (req, res) => {
  const projectId = parseInt(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const project = dbData.projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (!project.files) project.files = [];
  project.files.push({
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: req.file.path,
    uploaded_at: new Date().toISOString()
  });
  saveDB();

  logAudit(req.user.id, 'Project Update', `Uploaded file ${req.file.originalname} to project ID ${projectId}.`);
  socketEmit('fileUploaded', { projectId, filename: req.file.originalname });
  res.json({ message: 'File uploaded successfully', file: req.file.filename });
});

// ==========================================
// VERSION MANAGEMENT
// ==========================================

app.get('/api/projects/:id/versions', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && project.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const versions = dbData.project_versions
      .filter(v => v.project_id === projectId)
      .sort((a, b) => b.version_number - a.version_number);

    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/versions', authenticateToken, requireAdmin, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { title, video_url, audio_url, color_grading_url, audio_mix_url, format_conversion_url, subtitle_url, password_protected, password_pin, expiration_date, type, status, release_date, notes, download_enabled, notify_client } = req.body;

  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const versions = dbData.project_versions.filter(v => v.project_id === projectId);
    const maxVer = versions.reduce((max, v) => v.version_number > max ? v.version_number : max, 0);
    const nextVer = maxVer + 1;
    const nextVerId = dbData.project_versions.length > 0 ? Math.max(...dbData.project_versions.map(v => v.id)) + 1 : 1;

    const newVer = {
      id: nextVerId,
      project_id: projectId,
      version_number: nextVer,
      title,
      video_url,
      audio_url: audio_mix_url || audio_url || null,
      color_grading_url: color_grading_url || null,
      audio_mix_url: audio_mix_url || audio_url || null,
      format_conversion_url: format_conversion_url || null,
      subtitle_url: subtitle_url || null,
      password_protected: password_protected ? 1 : 0,
      password_pin: password_pin || null,
      expiration_date: expiration_date || null,
      type: type || 'Preview',
      status: status || 'Uploaded',
      release_date: release_date || null,
      notes: notes || '',
      download_enabled: download_enabled === undefined ? true : download_enabled,
      created_at: new Date().toISOString()
    };

    dbData.project_versions.push(newVer);
    
    // Workflow connections
    if (newVer.type === 'Preview' && project.status !== 'Review') {
      project.status = 'Review';
    } else if (newVer.type === 'Final' && project.status !== 'Final Delivery') {
      project.status = 'Final Delivery';
    }

    saveDB();

    logAudit(req.user.id, 'Project Update', `Uploaded version v${nextVer} for project "${project.title}" (ID ${projectId}).`);
    
    if (notify_client !== false) {
      createNotification(project.client_id, 'New Version Uploaded', `Version V${nextVer} ("${title}") is now ready for preview.`, 'success');
      socketEmit('versionUploaded', { projectId, versionNumber: nextVer, title });

      const clientUser = dbData.users.find(u => u.id === project.client_id);
    }

    res.json({ message: 'Version uploaded successfully.', version: newVer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Version
app.put('/api/projects/:id/versions/:vid', authenticateToken, requireAdmin, async (req, res) => {
  const versionId = parseInt(req.params.vid);
  const { title, video_url, audio_url, color_grading_url, audio_mix_url, format_conversion_url, subtitle_url, type, status, release_date, notes, download_enabled } = req.body;

  try {
    const version = dbData.project_versions.find(v => v.id === versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    version.title = title !== undefined ? title : version.title;
    version.video_url = video_url !== undefined ? video_url : version.video_url;
    version.audio_url = audio_mix_url !== undefined ? audio_mix_url : (audio_url !== undefined ? audio_url : version.audio_url);
    version.color_grading_url = color_grading_url !== undefined ? color_grading_url : version.color_grading_url;
    version.audio_mix_url = audio_mix_url !== undefined ? audio_mix_url : version.audio_mix_url;
    version.format_conversion_url = format_conversion_url !== undefined ? format_conversion_url : version.format_conversion_url;
    version.subtitle_url = subtitle_url !== undefined ? subtitle_url : version.subtitle_url;
    version.type = type || version.type;
    version.status = status || version.status;
    version.release_date = release_date !== undefined ? release_date : version.release_date;
    version.notes = notes !== undefined ? notes : version.notes;
    version.download_enabled = download_enabled !== undefined ? download_enabled : version.download_enabled;

    saveDB();
    logAudit(req.user.id, 'Version Update', `Updated version v${version.version_number} for project ID ${version.project_id}.`);
    res.json({ message: 'Version updated.', version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Version
app.delete('/api/projects/:id/versions/:vid', authenticateToken, requireAdmin, async (req, res) => {
  const versionId = parseInt(req.params.vid);
  try {
    const idx = dbData.project_versions.findIndex(v => v.id === versionId);
    if (idx === -1) return res.status(404).json({ error: 'Version not found' });

    dbData.project_versions.splice(idx, 1);
    saveDB();
    logAudit(req.user.id, 'Version Deleted', `Deleted version ID ${versionId}.`);
    res.json({ message: 'Version deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/versions/:id/verify-pin', authenticateToken, (req, res) => {
  const versionId = parseInt(req.params.id);
  const { pin } = req.body;

  try {
    const version = dbData.project_versions.find(v => v.id === versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    if (version.password_protected === 1) {
      if (version.password_pin !== pin) return res.status(401).json({ error: 'Incorrect pin' });
    }
    res.json({ success: true, message: 'Pin verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REVISION REQUESTS
// ==========================================

app.get('/api/projects/:id/revisions', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && project.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const revisions = dbData.revision_requests
      .filter(r => r.project_id === projectId)
      .map(r => {
        const v = dbData.project_versions.find(ver => ver.id === r.version_id);
        return { ...r, version_number: v ? v.version_number : 0, version_title: v ? v.title : 'Unknown Version' };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(revisions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/revisions', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.id);
  const { version_id, category, comment, screenshot_data } = req.body;

  if (!category || !comment) return res.status(400).json({ error: 'Category and comment are required' });

  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && project.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const newRevId = dbData.revision_requests.length > 0 ? Math.max(...dbData.revision_requests.map(r => r.id)) + 1 : 1;
    const newRev = {
      id: newRevId,
      project_id: projectId,
      version_id: version_id ? parseInt(version_id) : null,
      category,
      comment,
      screenshot_data: screenshot_data || null,
      status: 'Open',
      created_at: new Date().toISOString()
    };

    dbData.revision_requests.push(newRev);

    const pIndex = dbData.projects.findIndex(p => p.id === projectId);
    if (pIndex !== -1) dbData.projects[pIndex].status = 'Review';
    saveDB();

    logAudit(req.user.id, 'Revision Request', `Client submitted revision request on project "${project.title}" (ID ${projectId}).`);

    const admins = dbData.users.filter(u => u.role === 'admin');
    admins.forEach(admin => createNotification(admin.id, 'New Revision Request', `Client requested a revision for "${project.title}".`, 'alert'));
    socketEmit('revisionSubmitted', { projectId, category });

    res.json({ message: 'Revision request submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/revisions/:id', authenticateToken, requireAdmin, (req, res) => {
  const revisionId = parseInt(req.params.id);
  const { status } = req.body;

  try {
    const rIndex = dbData.revision_requests.findIndex(r => r.id === revisionId);
    if (rIndex === -1) return res.status(404).json({ error: 'Revision request not found' });

    dbData.revision_requests[rIndex].status = status;
    saveDB();

    const revision = dbData.revision_requests[rIndex];
    const project = dbData.projects.find(p => p.id === revision.project_id);

    logAudit(req.user.id, 'Project Update', `Updated revision request ID ${revisionId} status to ${status}.`);

    if (status === 'Resolved') {
      createNotification(project.client_id, 'Revision Resolved', `Your revision request for "${project.title}" has been completed.`, 'success');
    }

    res.json({ message: 'Revision status updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// APPROVAL CENTER
// ==========================================

app.post('/api/projects/:id/approve', authenticateToken, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { version_id, signed_by, signature_svg, status, feedback } = req.body;

  if (!signed_by || !signature_svg) return res.status(400).json({ error: 'Missing signature details' });

  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && project.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const newAppId = dbData.approvals.length > 0 ? Math.max(...dbData.approvals.map(a => a.id)) + 1 : 1;
    const newApproval = {
      id: newAppId,
      project_id: projectId,
      version_id: version_id ? parseInt(version_id) : null,
      signed_by,
      signature_svg,
      status,
      feedback: feedback || null,
      created_at: new Date().toISOString()
    };

    dbData.approvals.push(newApproval);

    if (status === 'Approved') {
      const chIndex = dbData.project_checklists.findIndex(c => c.project_id === projectId);
      if (chIndex !== -1) {
        dbData.project_checklists[chIndex].client_signoff = 'Completed';
        const progress = calculateCompletionRate(dbData.project_checklists[chIndex]);
        const pIndex = dbData.projects.findIndex(p => p.id === projectId);
        if (pIndex !== -1) {
          dbData.projects[pIndex].status = 'Completed';
          dbData.projects[pIndex].completion_rate = progress;
        }
      }
      saveDB();

      logAudit(req.user.id, 'Approval', `Client signed off and approved project "${project.title}" (ID ${projectId}).`);
      const admins = dbData.users.filter(u => u.role === 'admin');
      admins.forEach(admin => createNotification(admin.id, 'New Client Approval', `${signed_by} approved project "${project.title}".`, 'success'));
      socketEmit('projectApproved', { projectId, signedBy: signed_by });

      const clientUser = dbData.users.find(u => u.id === project.client_id);
    } else {
      const pIndex = dbData.projects.findIndex(p => p.id === projectId);
      if (pIndex !== -1) dbData.projects[pIndex].status = 'Review';
      saveDB();

      logAudit(req.user.id, 'Approval', `Client rejected final render on project "${project.title}" (ID ${projectId}).`);
      const admins = dbData.users.filter(u => u.role === 'admin');
      admins.forEach(admin => createNotification(admin.id, 'Project Sign-off Rejected', `${signed_by} rejected project "${project.title}".`, 'alert'));
      socketEmit('projectRejected', { projectId, signedBy: signed_by });
    }

    res.json({ message: `Project successfully ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DOWNLOAD CENTER
// ==========================================

app.post('/api/projects/:id/downloads', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.id);
  const { version_id, file_type, file_name } = req.body;

  if (!version_id || !file_type || !file_name) return res.status(400).json({ error: 'Missing download details' });

  try {
    const newDownId = dbData.downloads.length > 0 ? Math.max(...dbData.downloads.map(d => d.id)) + 1 : 1;
    const newDown = {
      id: newDownId,
      project_id: projectId,
      version_id: parseInt(version_id),
      file_type,
      file_name,
      downloaded_by: req.user.id,
      downloaded_at: new Date().toISOString()
    };

    dbData.downloads.push(newDown);
    saveDB();

    logAudit(req.user.id, 'Download', `Downloaded ${file_type} file "${file_name}" for project ID ${projectId}.`);
    res.json({ message: 'Download logged successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ANALYTICS & ADMIN REPORTS
// ==========================================

app.get('/api/analytics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalProjects = dbData.projects.length;
    const activeProjects = dbData.projects.filter(p => ['Pending', 'In Progress', 'Review', 'Client Approval Pending'].includes(p.status)).length;
    const completedProjects = dbData.projects.filter(p => p.status === 'Completed').length;
    const pendingSignoffs = dbData.projects.filter(p => p.status === 'Client Approval Pending').length;

    const today = new Date().toISOString().split('T')[0];
    const overdueDeliveries = dbData.projects.filter(p => p.deadline < today && p.status !== 'Completed').length;
    const totalClients = dbData.users.filter(u => u.role === 'client').length;
    const pendingRevisions = dbData.revision_requests.filter(r => r.status !== 'Resolved').length;
    const totalComp = dbData.projects.reduce((sum, p) => sum + (p.completion_rate || 0), 0);
    const avgCompletion = totalProjects > 0 ? totalComp / totalProjects : 0;

    const statusCounts = {};
    dbData.projects.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
    const statusDist = Object.keys(statusCounts).map(k => ({ status: k, count: statusCounts[k] }));

    const catCounts = {};
    dbData.revision_requests.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const revisionCategories = Object.keys(catCounts).map(k => ({ category: k, count: catCounts[k] }));

    const ratings = dbData.feedback.map(f => f.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 5.0;

    const actCounts = {};
    dbData.audit_logs.forEach(l => { actCounts[l.action_type] = (actCounts[l.action_type] || 0) + 1; });
    const activityTypes = Object.keys(actCounts).map(k => ({ action_type: k, count: actCounts[k] }));

    res.json({
      kpis: { totalProjects, activeProjects, completedProjects, pendingSignoffs, overdueDeliveries, totalClients, pendingRevisions, projectCompletionPercentage: Math.round(avgCompletion) },
      statusDistribution: statusDist,
      revisionCategories,
      satisfactionRating: Math.round(avgRating * 10) / 10,
      activityTypes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADVANCED LOGGING & PDFs
// ==========================================

app.get('/api/logs/emails', authenticateToken, (req, res) => {
  try {
    const list = dbData.email_logs.filter(l => req.user.role === 'admin' ? true : l.recipient === req.user.email);
    res.json(list.sort((a,b) => new Date(b.sent_at) - new Date(a.sent_at)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/logs/pdf', authenticateToken, requireAdmin, (req, res) => {
  try { res.json(dbData.pdf_logs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pdf/summary/:id', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.role === 'client' && project.client_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const clientUser = dbData.users.find(u => u.id === project.client_id);
    const checklist = dbData.project_checklists.find(c => c.project_id === projectId) || {};
    const revisions = dbData.revision_requests.filter(r => r.project_id === projectId) || [];
    
    pdfService.generateProjectDeliverySummaryPDF(res, project, clientUser, checklist, revisions, req.user.email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/reports/projects', authenticateToken, requireAdmin, (req, res) => {
  try {
    pdfService.generateProjectReportPDF(res, dbData.projects, 'All Projects Report', req.user.email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/emails/reminder/:id', authenticateToken, requireAdmin, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { type } = req.body;
  try {
    const project = dbData.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const clientUser = dbData.users.find(u => u.id === project.client_id);
    res.json({ message: 'Reminder email sent successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const logs = dbData.audit_logs.map(a => {
      const u = dbData.users.find(usr => usr.id === a.user_id);
      return { ...a, email: u ? u.email : '', role: u ? u.role : '', full_name: u ? u.full_name : 'System' };
    });

    res.json(logs.slice(0, 100));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client-specific audit logs
app.get('/api/logs/client', authenticateToken, (req, res) => {
  try {
    const logs = dbData.audit_logs
      .filter(a => a.user_id === req.user.id)
      .map(a => ({
        ...a,
        email: req.user.email,
        role: req.user.role,
        full_name: req.user.fullName
      }));
    res.json(logs.slice(0, 100));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients', authenticateToken, requireAdmin, (req, res) => {
  try {
    const clientList = dbData.clients.map(c => {
      const u = dbData.users.find(usr => usr.id === c.user_id);
      const userProjects = dbData.projects.filter(p => p.client_id === c.user_id);
      const completed = userProjects.filter(p => p.status === 'Completed').length;
      return { ...c, email: u ? u.email : '', full_name: u ? u.full_name : '', total_projects: userProjects.length, completed_projects: completed };
    });
    res.json(clientList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

app.post('/api/notifications', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title, and message are required' });
    }
    const notif = createNotification(user_id, title, message, type || 'info');
    if (notif) {
      io.emit('notification', notif);
      res.status(201).json(notif);
    } else {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const list = dbData.notifications.filter(n => n.user_id === req.user.id);
    res.json(list.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, (req, res) => {
  try {
    dbData.notifications.forEach(n => {
      if (n.user_id === req.user.id) {
        n.is_read = 1;
      }
    });
    saveDB();
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    const nIndex = dbData.notifications.findIndex(n => n.id === notifId && n.user_id === req.user.id);
    if (nIndex !== -1) {
      dbData.notifications[nIndex].is_read = 1;
      saveDB();
    }
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {

    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CHATBOT (DIGIASSIST)
// ==========================================

app.post('/api/chatbot', authenticateToken, (req, res) => {
  const { query, projectId } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    let responseText = '';
    const qLower = query.toLowerCase();

    let project = null;
    if (projectId) {
      project = dbData.projects.find(p => p.id === parseInt(projectId));
    } else {
      project = dbData.projects.filter(p => p.client_id === req.user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    if (project) {
      const ch = dbData.project_checklists.find(c => c.project_id === project.id) || {};
      project = { ...project, ...ch };
    }

    if (qLower.includes('status') || qLower.includes('progress') || qLower.includes('how is')) {
      if (project) {
        responseText = `Project "${project.title}" is ${project.completion_rate}% complete. Status: "${project.status}".\n\nChecklist stages:\n`;
        responseText += `- Color Grading: ${project.color_grading || 'Pending'}\n`;
        responseText += `- Audio Mix: ${project.audio_mix || 'Pending'}\n`;
        responseText += `- Subtitle Status: ${project.subtitle || 'Pending'}\n`;
        responseText += `- Format Conversion: ${project.format_conversion || 'Pending'}\n`;
        responseText += `- Quality Check: ${project.final_qc || 'Pending'}\n`;
        responseText += `- Client Approval: ${project.client_signoff || 'Pending'}\n\n`;
        responseText += `AI Summary: "Project ${project.title} is ${project.completion_rate}% complete. Expected delivery is ${project.deadline || 'not scheduled yet'}."`;
      } else {
        responseText = "I couldn't find any active projects associated with your profile. Please contact DigiQuest support.";
      }
    } else if (qLower.includes('delivery') || qLower.includes('deadline') || qLower.includes('when')) {
      responseText = project
        ? `The scheduled delivery date for "${project.title}" is ${project.deadline || 'not set yet'}.`
        : "I couldn't find an expected delivery date. Let me check with our scheduling team.";
    } else if (qLower.includes('approve') || qLower.includes('approval') || qLower.includes('signoff') || qLower.includes('sign')) {
      responseText = "To approve this project:\n1. Scroll down to the Approval Center.\n2. Draw your signature in the Canvas Pad.\n3. Type your name in the signatory field.\n4. Click 'Approve Project'.";
    } else if (qLower.includes('change') || qLower.includes('revision') || qLower.includes('modify') || qLower.includes('reject')) {
      responseText = "To request revisions:\n1. Select the relevant version number.\n2. Click 'Request Revision'.\n3. Select a category and write your feedback.\n4. Click submit to alert the editors.";
    } else if (qLower.includes('download') || qLower.includes('mp4') || qLower.includes('mov')) {
      responseText = project
        ? `To download files for "${project.title}":\n1. Navigate to the Download Center.\n2. Click the file format you need (MP4, MOV, Subtitles).\n3. Enter the PIN if password protected.`
        : "You can download approved assets in the Download Center at the bottom of the details page once they are ready.";
    } else {
      responseText = "Hello! I am DigiAssist, your DigiQuest delivery companion. I can help you with:\n" +
        "- Check project status: *\"What is my project status?\"*\n" +
        "- Find delivery dates: *\"When is delivery?\"*\n" +
        "- Guide for approvals: *\"How do I approve the project?\"*\n" +
        "- Help with revisions: *\"How do I request changes?\"*\n" +
        "- Support downloading files: *\"How do I download?\"*";
    }

    const newChatLogId = dbData.chatbot_logs.length > 0 ? Math.max(...dbData.chatbot_logs.map(l => l.id)) + 1 : 1;
    dbData.chatbot_logs.push({ id: newChatLogId, user_id: req.user.id, query, response: responseText, created_at: new Date().toISOString() });
    saveDB();

    res.json({ response: responseText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chatbot/logs', authenticateToken, (req, res) => {
  try {
    let logs;
    if (req.user.role === 'admin') {
      logs = dbData.chatbot_logs.map(l => {
        const u = dbData.users.find(usr => usr.id === l.user_id);
        return { ...l, email: u ? u.email : '', full_name: u ? u.full_name : 'Unknown User' };
      });
    } else {
      logs = dbData.chatbot_logs.filter(l => l.user_id === req.user.id);
    }
    res.json(logs.slice(0, 100));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SYSTEM LOGS
// ==========================================



app.get('/api/logs/pdf', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(dbData.pdf_logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLIENT FEEDBACK
// ==========================================

app.post('/api/feedback', authenticateToken, (req, res) => {
  const { project_id, rating, comments, satisfied } = req.body;
  if (!project_id || !rating) return res.status(400).json({ error: 'Project ID and rating are required' });

  try {
    const newFeedId = dbData.feedback.length > 0 ? Math.max(...dbData.feedback.map(f => f.id)) + 1 : 1;
    dbData.feedback.push({
      id: newFeedId,
      project_id: parseInt(project_id),
      rating: parseInt(rating),
      comments,
      satisfied: satisfied ? 1 : 0,
      created_at: new Date().toISOString()
    });
    saveDB();

    logAudit(req.user.id, 'Project Update', `Submitted feedback for project ID ${project_id}. Rating: ${rating}/5.`);
    res.json({ message: 'Feedback submitted successfully. Thank you!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 DigiQuest Express Server running on port ${PORT}`);
  });
}

export { app, server };
