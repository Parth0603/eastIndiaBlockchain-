import request from 'supertest';
import express from 'express';
import authRoutes from '../../backend/routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /api/auth/connect', () => {
    it('should return validation errors for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          address: 'invalid-address',
          signature: '',
          message: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    // Add more tests as needed
  });
});