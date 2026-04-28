import { createMocks } from 'node-mocks-http';
import loginHandler from '../api/login.js';

describe('Login API Route', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old env
  });

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('returns 500 if ADMIN_PASSWORD is not configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: 'test' }
    });

    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });

  it('returns 400 for invalid password format', async () => {
    process.env.ADMIN_PASSWORD = 'supersecret';
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: null } // invalid format
    });

    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 200 on successful login', async () => {
    process.env.ADMIN_PASSWORD = 'supersecret';
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: 'supersecret' }
    });

    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ success: true });
  });

  it('returns 401 for wrong password after delay', async () => {
    process.env.ADMIN_PASSWORD = 'supersecret';
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: 'wrong' }
    });

    const start = Date.now();
    await loginHandler(req, res);
    const elapsed = Date.now() - start;

    expect(res._getStatusCode()).toBe(401);
    expect(elapsed).toBeGreaterThanOrEqual(1900); // Should delay for ~2s
  });
});
