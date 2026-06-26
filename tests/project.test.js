import request from 'supertest';
import { app } from '../server/index.js';
import { dbData, saveDB } from '../server/db.js';

describe('Projects and Deliverables API', () => {
  let token;
  let adminUserId;
  let originalProjects;
  let testProjectId;

  beforeAll(async () => {
    originalProjects = JSON.parse(JSON.stringify(dbData.projects));
    
    // Find an admin user or create one for testing
    let admin = dbData.users.find(u => u.role === 'admin');
    if (!admin) {
      admin = {
        id: 9999,
        email: 'testadmin@digiquest.com',
        role: 'admin',
        full_name: 'Test Admin',
        password_hash: 'mock_hash'
      };
      dbData.users.push(admin);
      saveDB();
    }
    adminUserId = admin.id;

    // Login to obtain authentication token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: admin.email,
        password: 'admin123' // fallback to admin password from seed data
      });
    
    token = res.body.token || 'mock_admin_token';
  });

  afterAll(() => {
    dbData.projects = originalProjects;
    saveDB();
  });

  test('GET /api/projects - Success', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/projects - Create new project', async () => {
    const newProject = {
      title: 'Unit Test Project Title',
      client_id: 2, // seeded client user
      priority: 'High',
      deadline: '2026-12-31'
    };

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(newProject);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toEqual(newProject.title);
    testProjectId = res.body.id;
  });

  test('GET /api/projects/:id/versions - Retrieve versions list', async () => {
    if (!testProjectId) return;
    const res = await request(app)
      .get(`/api/projects/${testProjectId}/versions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
