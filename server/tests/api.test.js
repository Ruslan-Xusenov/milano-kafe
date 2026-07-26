const request = require('supertest');
jest.mock('expo-server-sdk', () => ({
  Expo: class Expo {
    sendPushNotificationsAsync() { return []; }
    chunkPushNotifications() { return []; }
  }
}));
const app = require('../index');

describe('CafeBot API Tests', () => {
  it('should return 401 for protected routes without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toEqual(401);
  });

  it('should not allow changing status of unauthenticated order request', async () => {
    const res = await request(app).put('/api/orders/1/status').send({ status: 'rejected' });
    expect(res.statusCode).toEqual(401);
  });
});
