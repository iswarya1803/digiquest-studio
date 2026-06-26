import request from 'supertest';
import { app } from '../server/index.js';
import { dbData, saveDB } from '../server/db.js';

describe('Authentication API Endpoints', () => {
  let originalUsers;

  beforeAll(() => {
    // Save state of users to restore later
    originalUsers = JSON.parse(JSON.stringify(dbData.users));
  });

  afterAll(() => {
    // Restore users database state
    dbData.users = originalUsers;
    saveDB();
  });

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'password123';
  const testName = 'Test User';

  test('POST /api/auth/signup - Success', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: testName,
        role: 'client'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('User created successfully');
  });

  test('POST /api/auth/signup - Fail due to missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/login - Success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual(testEmail);
  });

  test('POST /api/auth/login - Fail due to invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });
});
