const request = require('supertest');
const app = require('../index');

describe('OpenNebula API Backend', () => {
  describe('GET /api/vms', () => {
    it('should return VM list', async () => {
      const response = await request(app)
        .get('/api/vms')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/vms/:id', () => {
    it('should return VM details', async () => {
      const response = await request(app)
        .get('/api/vms/1')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      // Note: This will fail with real OpenNebula API until properly configured
    });
  });

  describe('POST /api/vms', () => {
    it('should create a new VM', async () => {
      const vmData = {
        name: 'Test VM',
        cpu: 2,
        memory: 4,
        os: 'ubuntu'
      };

      const response = await request(app)
        .post('/api/vms')
        .send(vmData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/images', () => {
    it('should return image list', async () => {
      const response = await request(app)
        .get('/api/images')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/networks', () => {
    it('should return network list', async () => {
      const response = await request(app)
        .get('/api/networks')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/docker/containers', () => {
    it('should return Docker containers', async () => {
      const response = await request(app)
        .get('/api/docker/containers')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/kubernetes/clusters', () => {
    it('should return Kubernetes clusters', async () => {
      const response = await request(app)
        .get('/api/kubernetes/clusters')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});