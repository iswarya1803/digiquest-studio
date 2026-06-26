import request from 'supertest';
import { app } from '../server/index.js';
import { dbData, saveDB } from '../server/db.js';

describe('Revision API Endpoints', () => {
  let token;
  let originalRevisions;

  beforeAll(async () => {
    originalRevisions = JSON.parse(JSON.stringify(dbData.revision_requests || []));

    // Get auth token for client or admin
    const client = dbData.users.find(u => u.role === 'client') || {
      email: 'client@digiquest.com',
      password: 'client123'
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: client.email,
        password: 'client123'
      });
    
    token = res.body.token;
  });

  afterAll(() => {
    dbData.revision_requests = originalRevisions;
    saveDB();
  });

  test('GET /api/revisions - Retrieve all revisions', async () => {
    const res = await request(app)
      .get('/api/revisions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/revisions - Unauthorized without token', async () => {
    const res = await request(app)
      .post('/api/revisions')
      .send({
        project_id: 1,
        category: 'Color Grading',
        comment: 'Too warm'
      });

    expect(res.statusCode).toEqual(401);
  });
});
