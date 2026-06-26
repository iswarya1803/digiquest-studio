import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'server', 'data', 'db.json');

if (fs.existsSync(dbPath)) {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const mockProjectTitles = ['Nike Air Max Launch Ad', 'Wayne Manor Restoration Video', 'Terminator Chronicles Trailer', 'Gotham Charity Gala Recap'];
  const mockClientEmails = ['client@digiquest.com', 'warner@digiquest.com'];
  
  const mockUserIds = data.users.filter(u => mockClientEmails.includes(u.email)).map(u => u.id);
  const mockClientIds = data.clients.filter(c => mockUserIds.includes(c.user_id)).map(c => c.id);
  const mockProjectIds = data.projects.filter(p => mockProjectTitles.includes(p.title) || mockClientIds.includes(p.client_id)).map(p => p.id);
  
  data.users = data.users.filter(u => !mockUserIds.includes(u.id));
  data.clients = data.clients.filter(c => !mockClientIds.includes(c.id));
  data.projects = data.projects.filter(p => !mockProjectIds.includes(p.id));
  data.project_checklists = data.project_checklists.filter(c => !mockProjectIds.includes(c.project_id));
  data.project_versions = data.project_versions.filter(v => !mockProjectIds.includes(v.project_id));
  data.revision_requests = data.revision_requests.filter(r => !mockProjectIds.includes(r.project_id));
  data.approvals = data.approvals.filter(a => !mockProjectIds.includes(a.project_id));
  data.downloads = data.downloads.filter(d => !mockProjectIds.includes(d.project_id));
  data.notifications = data.notifications.filter(n => !mockUserIds.includes(n.user_id) && !(n.message && n.message.includes('Sarah Connor')) && !(n.message && n.message.includes('Wayne')) && !(n.title && n.title.includes('Gotham')) && !(n.title && n.title.includes('Nike')));
  data.chatbot_logs = data.chatbot_logs.filter(l => !mockUserIds.includes(l.user_id));
  data.feedback = data.feedback.filter(f => !mockProjectIds.includes(f.project_id));
  data.audit_logs = data.audit_logs.filter(a => !mockUserIds.includes(a.user_id));

  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Mock data wiped successfully.');
} else {
  console.log('No db.json found.');
}
