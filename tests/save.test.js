import { createMocks } from 'node-mocks-http';
import saveHandler from '../api/save.js';

describe('Save API Route', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV }; 
  });

  afterAll(() => {
    process.env = OLD_ENV; 
  });

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await saveHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 401 if x-admin-password is missing', async () => {
    process.env.ADMIN_PASSWORD = 'supersecret';
    const { req, res } = createMocks({
      method: 'POST',
      headers: {},
      body: { data: 'test' }
    });

    await saveHandler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 401 if x-admin-password is wrong', async () => {
    process.env.ADMIN_PASSWORD = 'supersecret';
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'x-admin-password': 'wrong' },
      body: { data: 'test' }
    });

    await saveHandler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  // Mocking Firebase or testing success path would require more setup 
  // since save.js imports firebase/database which requires a real DB connection or a full mock.
  // For now, we just test the auth boundary.
});
