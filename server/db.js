import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'db.json');

// Global database object in memory
export let dbData = {
  users: [],
  clients: [],
  projects: [],
  project_checklists: [],
  project_versions: [],
  revision_requests: [],
  approvals: [],
  downloads: [],
  notifications: [],
  chatbot_logs: [],
  feedback: [],
  audit_logs: [],
  email_logs: [],
  pdf_logs: []
};

// Helper: Save memory db to disk
export function saveDB() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

// Initialize database
export function initDB() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      const parsedData = JSON.parse(data);
      Object.keys(dbData).forEach(key => {
        if (parsedData[key] !== undefined) {
          dbData[key] = parsedData[key];
        }
      });
      console.log('Database loaded from disk.');
      return;
    } catch (err) {
      console.error('Failed to read database, seeding default data instead:', err);
    }
  }
  
  console.log('Seeding initial data...');
  seedData();
}

function seedData() {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);

  // Users
  dbData.users = [
    { id: 1, email: 'admin@digiquest.com', password_hash: adminHash, role: 'admin', full_name: 'Alex Mercer (Owner)', created_at: new Date().toISOString() }
  ];

  // Empty everything else
  dbData.clients = [];
  dbData.projects = [];
  dbData.project_checklists = [];
  dbData.project_versions = [];
  dbData.revision_requests = [];
  dbData.approvals = [];
  dbData.downloads = [];
  dbData.notifications = [];
  dbData.chatbot_logs = [];
  dbData.feedback = [];
  dbData.audit_logs = [];

  saveDB();
  console.log('Seed completed successfully!');
}
