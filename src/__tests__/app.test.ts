import request from 'supertest';
import app from '../index.js';  // app with routes already defined

describe('GET /', () => {
  it('should return API Running', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('API Running');
  });
});
