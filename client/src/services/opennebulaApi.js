import axios from 'axios';

// Backend API configuration
const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize auth token from localStorage if available
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
if (storedToken) {
  setAuthToken(storedToken);
}

// VM related functions
export const getVMs = async () => {
  try {
    const response = await api.get('/vms');
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching VMs:', error);
    // Fallback to mock data
    return [
      { id: 1, name: 'VM1', status: 'running', cpu: 2, memory: 4 },
      { id: 2, name: 'VM2', status: 'stopped', cpu: 1, memory: 2 },
      { id: 3, name: 'VM3', status: 'running', cpu: 4, memory: 8 },
    ];
  }
};

export const getVMDetails = async (id) => {
  try {
    const response = await api.get(`/vms/${id}`);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('Error fetching VM details:', error);
    // Fallback to mock data
    return {
      id,
      name: `VM${id}`,
      status: 'running',
      cpu: 2,
      memory: 4,
      ip: '192.168.1.100',
      os: 'Linux',
      connections: {
        vnc: { host: 'localhost', port: 5901, type: 'vnc' },
        ssh: { host: '192.168.1.100', port: 22, username: 'root' }
      }
    };
  }
};

export const getVNCConnection = async (id) => {
  try {
    const response = await api.get(`/vms/${id}/vnc`);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('Error fetching VNC connection:', error);
    return null;
  }
};

export const generateSSHKeyPair = async () => {
  try {
    const response = await api.post('/keys');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate SSH key pair');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error generating SSH key pair:', error);
    throw error;
  }
};

export const getImages = async () => {
  try {
    const response = await api.get('/images');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    console.warn('Images API returned invalid data:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
};

export const createVM = async (vmData) => {
  try {
    const response = await api.post('/vms', vmData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create VM');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error creating VM:', error);
    throw error;
  }
};

export const startVM = async (id) => {
  try {
    const response = await api.post(`/vms/${id}/action`, { action: 'start' });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start VM');
    }
    return true;
  } catch (error) {
    console.error('Error starting VM:', error);
    throw error;
  }
};

export const stopVM = async (id) => {
  try {
    const response = await api.post(`/vms/${id}/action`, { action: 'stop' });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to stop VM');
    }
    return true;
  } catch (error) {
    console.error('Error stopping VM:', error);
    throw error;
  }
};

// Image related functions

export const createImage = async (imageData) => {
  try {
    const response = await api.post('/images', imageData);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('Error creating image:', error);
    return { id: Date.now() };
  }
};

// Network related functions
export const getNetworks = async () => {
  try {
    const response = await api.get('/networks');
    return response.data.success ? parseNetworks(response.data.data) : [];
  } catch (error) {
    console.error('Error fetching networks:', error);
    return [
      { id: 1, name: 'Public Network', bridge: 'br0', state: 'ready' },
      { id: 2, name: 'Private Network', bridge: 'br1', state: 'ready' },
    ];
  }
};

// Docker related functions
export const getDockerContainers = async () => {
  try {
    const response = await api.get('/docker/containers');
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching Docker containers:', error);
    return [
      { id: 'abc123', name: 'web-server', image: 'nginx:latest', status: 'running', networks: [{ network: 'bridge', ip: '172.17.0.2' }], ports: '0.0.0.0:80->80/tcp' },
      { id: 'def456', name: 'database', image: 'postgres:13', status: 'running', networks: [{ network: 'bridge', ip: '172.17.0.3' }], ports: '0.0.0.0:5432->5432/tcp' },
    ];
  }
};

export const getDockerNetworks = async () => {
  try {
    const response = await api.get('/docker/networks');
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching Docker networks:', error);
    return [];
  }
};

export const createDockerNetwork = async (networkData) => {
  try {
    const response = await api.post('/docker/networks', networkData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create Docker network');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error creating Docker network:', error);
    throw error;
  }
};

export const getVpcs = async () => {
  try {
    const response = await api.get('/vpcs');
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching VPCs:', error);
    return [];
  }
};

export const createVpc = async (vpcData) => {
  try {
    const response = await api.post('/vpcs', vpcData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create VPC');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error creating VPC:', error);
    throw error;
  }
};

export const createDockerContainer = async (containerData) => {
  try {
    const response = await api.post('/docker/containers', containerData);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to create container');
    return response.data.data;
  } catch (error) {
    console.error('Error creating Docker container:', error);
    throw error;
  }
};

export const startDockerContainer = async (containerId) => {
  try {
    const response = await api.post(`/docker/containers/${containerId}/action`, { action: 'start' });
    if (!response.data.success) throw new Error(response.data.error || 'Failed to start Docker container');
    return response.data.data;
  } catch (error) {
    console.error('Error starting Docker container:', error);
    throw error;
  }
};

export const stopDockerContainer = async (containerId) => {
  try {
    const response = await api.post(`/docker/containers/${containerId}/action`, { action: 'stop' });
    if (!response.data.success) throw new Error(response.data.error || 'Failed to stop Docker container');
    return response.data.data;
  } catch (error) {
    console.error('Error stopping Docker container:', error);
    throw error;
  }
};

export const deleteDockerContainer = async (containerId) => {
  try {
    const response = await api.delete(`/docker/containers/${containerId}`);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to delete Docker container');
    return response.data.data;
  } catch (error) {
    console.error('Error deleting Docker container:', error);
    throw error;
  }
};

export const uploadFilesToDockerContainer = async (containerId, destinationPath, files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (destinationPath) {
      formData.append('destinationPath', destinationPath);
    }

    const response = await api.post(`/docker/containers/${containerId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data.success) throw new Error(response.data.error || 'Failed to upload files');
    return response.data.data;
  } catch (error) {
    console.error('Error uploading files to Docker container:', error);
    throw error;
  }
};

// Kubernetes related functions
export const getKubernetesClusters = async () => {
  try {
    const response = await api.get('/kubernetes/clusters');
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching Kubernetes clusters:', error);
    return [
      { id: 1, name: 'prod-cluster', nodes: 3, status: 'running' },
      { id: 2, name: 'dev-cluster', nodes: 1, status: 'running' },
    ];
  }
};

// Helper functions to parse XML responses (simplified)
const parseVMs = (xmlData) => {
  // In a real implementation, parse the XML
  // For now, return mock data
  return [
    { id: 1, name: 'VM1', status: 'running', cpu: 2, memory: 4 },
    { id: 2, name: 'VM2', status: 'stopped', cpu: 1, memory: 2 },
    { id: 3, name: 'VM3', status: 'running', cpu: 4, memory: 8 },
  ];
};

const parseVM = (xmlData) => {
  return {
    id: xmlData.id || 1,
    name: xmlData.name || 'VM1',
    status: xmlData.status || 'running',
    cpu: xmlData.cpu || 2,
    memory: xmlData.memory || 4,
    ip: xmlData.ip || '192.168.1.100',
    os: xmlData.os || 'Ubuntu 20.04',
  };
};

const parseImages = (xmlData) => {
  return [
    { id: 1, name: 'Ubuntu 20.04', type: 'OS', size: '2.5GB' },
    { id: 2, name: 'CentOS 8', type: 'OS', size: '1.8GB' },
    { id: 3, name: 'Docker Image', type: 'DOCKER', size: '500MB' },
  ];
};

const parseNetworks = (xmlData) => {
  return [
    { id: 1, name: 'Public Network', bridge: 'br0', state: 'ready' },
    { id: 2, name: 'Private Network', bridge: 'br1', state: 'ready' },
  ];
};

export default api;