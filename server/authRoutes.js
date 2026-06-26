import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbData, saveDB } from './db.js';
import { logAudit, createNotification } from './helpers.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'digiquest_jwt_secret_key_2026';

// Signup
router.post('/signup', (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
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

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = dbData.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
  logAudit(user.id, 'Login', `User ${user.email} logged in`);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name } });
});

// Logout
router.post('/logout', (req, res) => {
  // Assuming token validation middleware was used before calling this route
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  logAudit(req.user.id, 'Logout', 'User logged out');
  res.json({ message: 'Logged out successfully' });
});

// Forgot password (mock implementation)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // In a real app, generate and email a reset code. Here we return a dummy code.
  res.json({ message: 'Password reset code generated.', resetCode: 'DIGI-9982' });
});

// Reset password
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields required' });
  const user = dbData.users.find(u => u.email === email);
  if (!user || code !== 'DIGI-9982') return res.status(400).json({ error: 'Invalid email or code' });
  const salt = bcrypt.genSaltSync(10);
  user.password_hash = bcrypt.hashSync(newPassword, salt);
  saveDB();
  logAudit(user.id, 'Password Reset', 'User reset password via code');
  res.json({ message: 'Password has been reset successfully' });
});

export default router;
