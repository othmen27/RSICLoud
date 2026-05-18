const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const xml2js = require('xml2js');
const expressWs = require('express-ws');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, execSync } = require('child_process');
require('dotenv').config();

const app = express();
expressWs(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ensureUploadsStorage = () => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to ensure uploads storage:', e.message || e);
  }
};

ensureUploadsStorage();
const upload = multer({ dest: UPLOADS_DIR });

// In-memory user storage (in production, use a database)
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    email: 'admin@example.com',
    opennebulaUser: 'oneadmin',
    opennebulaPassword: '3uwF2NjfJJ'
  }
];

// In-memory VM ownership tracking (userId -> [vmIds])
const userVMs = {
  1: [7, 8] // admin owns VMs 7 and 8
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
console.log('Registering auth routes...');
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      email,
      opennebulaUser: username, // For demo, use same username
      opennebulaPassword: password // In production, generate or ask for separate credentials
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// OpenNebula API configuration
const ON_ENDPOINT = process.env.ON_ENDPOINT || 'http://localhost:2633/RPC2';

// Function to parse XML response to JSON
const parseXMLResponse = async (xmlData) => {
  const parser = new xml2js.Parser({ explicitArray: false });
  try {
    const result = await parser.parseStringPromise(xmlData);
    return result;
  } catch (error) {
    console.error('XML parsing error:', error);
    throw error;
  }
};

// Function to create a proper OpenNebula VM template
const createVMTemplate = (vmData) => {
  const { name, cpu, memory, os, diskSize = 10, networkId = 0, sshPublicKey, imageId = 0 } = vmData;

  // Convert memory from GB to MB
  const memoryMB = memory * 1024;

  const contextEntries = ['NETWORK="YES"'];
  if (sshPublicKey) {
    const safeKey = sshPublicKey.trim().replace(/"/g, '\\"');
    contextEntries.push(`SSH_PUBLIC_KEY="${safeKey}"`);
  }

  return `NAME="${name}"
CPU="${cpu}"
MEMORY="${memoryMB}"
DISK=[
  IMAGE_ID="${imageId}"
]
NIC=[
  NETWORK_ID="${networkId}"
]
OS=[
  ARCH="x86_64"
]
GRAPHICS=[
  TYPE="VNC",
  LISTEN="0.0.0.0"
]
CONTEXT=[
  ${contextEntries.join(',\n  ')}
]`;
};

const generateSSHKeyPair = (comment = 'opennebula-ui-key') => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sshkey-'));
  const keyPath = path.join(tempDir, 'id_ed25519');

  try {
    execSync(`ssh-keygen -t ed25519 -N "" -C "${comment}" -f "${keyPath}"`, {
      stdio: ['ignore', 'ignore', 'ignore']
    });

    const privateKey = fs.readFileSync(keyPath, 'utf8');
    const publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf8');

    return { privateKey, publicKey };
  } catch (error) {
    console.error('SSH key generation failed:', error.message || error);
    throw new Error('Failed to generate SSH key pair. Ensure ssh-keygen is installed.');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // ignore cleanup errors
    }
  }
};

const callMethod = async (method, params = [], userCredentials = null) => {
  const username = userCredentials?.username || process.env.ON_USERNAME || 'oneadmin';
  const password = userCredentials?.password || process.env.ON_PASSWORD || '3uwF2NjfJJ';

  const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    <param><value><string>${username}:${password}</string></value></param>
    ${params.map(param => {
      if (typeof param === 'number') {
        return `<param><value><i4>${param}</i4></value></param>`;
      } else {
        return `<param><value><string>${param}</string></value></param>`;
      }
    }).join('')}
  </params>
</methodCall>`;

  try {
    const response = await axios.post(ON_ENDPOINT, xmlRequest, {
      auth: { username, password },
      headers: { 'Content-Type': 'application/xml' }
    });
    return response.data;
  } catch (error) {
    console.error('OpenNebula API Error:', error.message);
    throw error;
  }
};

// VM Routes
app.get('/api/vms', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const xmlResponse = await callMethod('one.vmpool.info', [-2, -1, -1, -1], userCredentials);
    const parsedResponse = await parseXMLResponse(xmlResponse);

    // Parse VM pool data - the XML is embedded as a string
    const vmPoolXml = parsedResponse?.methodResponse?.params?.param?.value?.array?.data?.value[1]?.string;
    const vms = [];

    if (vmPoolXml) {
      // Parse the embedded XML
      const vmPoolParsed = await parseXMLResponse(vmPoolXml);
      const vmPool = vmPoolParsed?.VM_POOL;

      if (vmPool?.VM) {
        const vmList = Array.isArray(vmPool.VM) ? vmPool.VM : [vmPool.VM];

        // Get VMs owned by this user
        const userVmIds = userVMs[req.user.id] || [];

        vmList.forEach(vm => {
          const vmId = parseInt(vm.ID);
          // Only include VMs owned by this user
          if (userVmIds.includes(vmId)) {
            vms.push({
              id: vmId,
              name: vm.NAME,
              status: (() => {
                const state = vm.STATE;
                const lcmState = vm.LCM_STATE;
            
                // OpenNebula VM states
                if (state === '3') { // ACTIVE
                  if (lcmState === '3') return 'running'; // RUNNING
                  if (lcmState === '1' || lcmState === '2') return 'starting'; // PROLOG or BOOT
                  return 'active';
                } else if (state === '1') { // PENDING
                  return 'pending';
                } else if (state === '5') { // SUSPENDED
                  return 'suspended';
                } else if (state === '4' || state === '8') { // STOPPED or POWEROFF
                  return 'stopped';
                }
                return 'unknown';
              })(),
              cpu: parseFloat(vm.TEMPLATE?.CPU || 1),
              memory: Math.round(parseInt(vm.TEMPLATE?.MEMORY || 1024) / 1024), // Convert MB to GB
              ip: vm.TEMPLATE?.NIC?.IP || 'N/A'
            });
          }
        });
      }
    }

    res.json({ success: true, data: vms });
  } catch (error) {
    console.error('VM listing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vms/:id', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user owns this VM
    const userVmIds = userVMs[req.user.id] || [];
    if (!userVmIds.includes(parseInt(req.params.id))) {
      return res.status(403).json({ success: false, error: 'Access denied - VM not owned by user' });
    }

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const xmlResponse = await callMethod('one.vm.info', [parseInt(req.params.id)], userCredentials);
    const parsedResponse = await parseXMLResponse(xmlResponse);

    // The VM data is embedded as a string in the response
    const vmXml = parsedResponse?.methodResponse?.params?.param?.value?.array?.data?.value[1]?.string;
    if (!vmXml) {
      return res.status(404).json({ success: false, error: 'VM not found' });
    }

    // Parse the embedded VM XML
    const vmParsed = await parseXMLResponse(vmXml);
    const vm = vmParsed?.VM;

    if (!vm) {
      return res.status(404).json({ success: false, error: 'VM not found' });
    }

    const vmDetails = {
      id: parseInt(vm.ID),
      name: vm.NAME,
      status: (() => {
        const state = vm.STATE;
        const lcmState = vm.LCM_STATE;
        
        // OpenNebula VM states
        if (state === '3') { // ACTIVE
          if (lcmState === '3') return 'running'; // RUNNING
          if (lcmState === '1' || lcmState === '2') return 'starting'; // PROLOG or BOOT
          return 'active';
        } else if (state === '1') { // PENDING
          return 'pending';
        } else if (state === '5') { // SUSPENDED
          return 'suspended';
        } else if (state === '4' || state === '8') { // STOPPED or POWEROFF
          return 'stopped';
        }
        return 'unknown';
      })(),
      cpu: parseFloat(vm.TEMPLATE?.CPU || 1),
      memory: Math.round(parseInt(vm.TEMPLATE?.MEMORY || 1024) / 1024), // Convert MB to GB
      ip: vm.TEMPLATE?.NIC?.IP || 'N/A',
      os: vm.TEMPLATE?.OS?.ARCH || 'x86_64',
      created: vm.STIME ? new Date(parseInt(vm.STIME) * 1000).toISOString() : null,
      connections: {
        vnc: vm.TEMPLATE?.GRAPHICS?.TYPE === 'VNC' || vm.TEMPLATE?.GRAPHICS?.TYPE === 'vnc' ? {
          host: 'localhost', // OpenNebula host
          port: parseInt(vm.TEMPLATE?.GRAPHICS?.PORT) || null,
          type: 'vnc'
        } : null,
        ssh: vm.TEMPLATE?.NIC?.IP ? {
          host: vm.TEMPLATE?.NIC?.IP,
          port: 22,
          username: 'root' // Default for Alpine
        } : null
      }
    };

    res.json({ success: true, data: vmDetails });
  } catch (error) {
    console.error('VM details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/keys', authenticateToken, async (req, res) => {
  try {
    const keyPair = generateSSHKeyPair();
    res.json({ success: true, data: keyPair });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Images API
app.get('/api/images', authenticateToken, async (req, res) => {
  try {
    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const xmlResponse = await callMethod('one.imagepool.info', [-2, -1, -1, -1], userCredentials);
    const parsedResponse = await parseXMLResponse(xmlResponse);

    // Parse image pool data - the XML is embedded as a string
    const imagePoolXml = parsedResponse?.methodResponse?.params?.param?.value?.array?.data?.value[1]?.string;
    const images = [];

    if (imagePoolXml) {
      // Decode HTML entities in the XML string
      const decodedXml = imagePoolXml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Parse the embedded XML
      const imagePoolParsed = await parseXMLResponse(decodedXml);
      const imagePool = imagePoolParsed?.IMAGE_POOL;

      if (imagePool?.IMAGE) {
        const imageList = Array.isArray(imagePool.IMAGE) ? imagePool.IMAGE : [imagePool.IMAGE];

        imageList.forEach(image => {
          images.push({
            id: parseInt(image.ID),
            name: image.NAME,
            type: image.TYPE || 'OS',
            size: `${Math.round(parseInt(image.SIZE || 0) / (1024 * 1024))}MB`, // Convert bytes to MB
            state: image.STATE === '2' ? 'ready' : image.STATE === '1' ? 'locked' : 'unknown'
          });
        });
      }
    }

    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Images listing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vms', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { name, cpu, memory, os, diskSize, networkId, sshPublicKey, imageId } = req.body;

    // Create proper OpenNebula VM template
    const template = createVMTemplate({ name, cpu, memory, os, diskSize, networkId, sshPublicKey, imageId });
    console.log('Generated VM template:', template);

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const xmlResponse = await callMethod('one.vm.allocate', [template], userCredentials);
    console.log('OpenNebula VM allocate response:', xmlResponse);
    const parsedResponse = await parseXMLResponse(xmlResponse);
    console.log('Parsed response:', JSON.stringify(parsedResponse, null, 2));

    // Extract VM ID from response
    const responseArray = parsedResponse?.methodResponse?.params?.param?.value?.array?.data?.value;
    if (!responseArray || responseArray.length < 2) {
      throw new Error('Failed to create VM - invalid response format');
    }

    const success = responseArray[0]?.boolean === '1' || responseArray[0]?.boolean === true;
    if (!success) {
      const errorMessage = responseArray[1]?.string || 'Unknown error';
      throw new Error(`Failed to create VM: ${errorMessage}`);
    }

    const vmId = responseArray[1]?.i4;
    if (!vmId) {
      throw new Error('Failed to create VM - no ID returned');
    }

    // Track VM ownership
    if (!userVMs[req.user.id]) {
      userVMs[req.user.id] = [];
    }
    userVMs[req.user.id].push(parseInt(vmId));

    res.json({
      success: true,
      data: { id: parseInt(vmId), name, status: 'pending' }
    });
  } catch (error) {
    console.error('VM creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vms/:id/action', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user owns this VM
    const userVmIds = userVMs[req.user.id] || [];
    if (!userVmIds.includes(parseInt(req.params.id))) {
      return res.status(403).json({ success: false, error: 'Access denied - VM not owned by user' });
    }

    const { action } = req.body;
    const vmId = parseInt(req.params.id);

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    // Map actions to OpenNebula action names
    const actionMap = {
      'start': 'start',
      'stop': 'stop',
      'restart': 'reboot',
      'suspend': 'suspend',
      'resume': 'resume'
    };

    const onAction = actionMap[action] || action;

    const xmlResponse = await callMethod('one.vm.action', [onAction, vmId], userCredentials);
    console.log('OpenNebula VM action response:', xmlResponse);
    const parsedResponse = await parseXMLResponse(xmlResponse);
    console.log('Parsed action response:', JSON.stringify(parsedResponse, null, 2));
    
    // For now, assume success if we got a response without exceptions
    // The actual validation will depend on OpenNebula's response format
    // Check for obvious errors first
    if (parsedResponse?.methodResponse?.fault) {
      throw new Error(parsedResponse.methodResponse.fault.value?.struct?.member?.[1]?.value?.string || 'OpenNebula error');
    }

    // Give OpenNebula a moment to process the action
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({ success: true, data: { action: onAction } });
  } catch (error) {
    console.error('VM action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// VNC Routes
app.get('/api/vms/:id/vnc', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user owns this VM
    const userVmIds = userVMs[req.user.id] || [];
    if (!userVmIds.includes(parseInt(req.params.id))) {
      return res.status(403).json({ success: false, error: 'Access denied - VM not owned by user' });
    }

    const vmId = parseInt(req.params.id);
    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const xmlResponse = await callMethod('one.vm.info', [vmId], userCredentials);
    const parsedResponse = await parseXMLResponse(xmlResponse);

    const vm = parsedResponse?.methodResponse?.params?.param?.value;
    if (!vm) {
      return res.status(404).json({ success: false, error: 'VM not found' });
    }

    const vncInfo = {
      host: 'localhost', // OpenNebula host
      port: parseInt(vm.TEMPLATE?.GRAPHICS?.PORT) || null,
      password: '', // Usually no password for OpenNebula VNC
      path: `/vnc/?host=${encodeURIComponent('localhost')}&port=${vm.TEMPLATE?.GRAPHICS?.PORT || ''}&password=&autoconnect=true`
    };

    res.json({ success: true, data: vncInfo });
  } catch (error) {
    console.error('VNC info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve VNC client
app.use('/vnc', express.static('/home/cloud/opennebula-ui/server/public/vnc'));

app.get('/api/images/:id', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const data = await callMethod('one.image.info', [parseInt(req.params.id)], userCredentials);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/images', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { name, path, type } = req.body;
    const template = `NAME="${name}"\\nPATH="${path}"\\nTYPE="${type}"`;

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const data = await callMethod('one.image.allocate', [template, parseInt(req.body.datastore || 1)], userCredentials);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Network Routes
app.get('/api/networks', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userCredentials = {
      username: 'oneadmin',
      password: '3uwF2NjfJJ'
    };

    const data = await callMethod('one.vnpool.info', [-2, -1, -1, -1], userCredentials);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// ADDON MANAGEMENT SYSTEM
// ========================

// Determine addon directory - try standard path first, fall back to user home
let ADDONS_DIR = process.env.ADDONS_DIR || path.join('/var/lib/opennebula', 'addons');

// Check if we can write to the default directory
const checkAddonsDir = () => {
  try {
    // Test if directory exists and is writable
    if (fs.existsSync(ADDONS_DIR)) {
      fs.accessSync(ADDONS_DIR, fs.constants.W_OK);
      return true;
    }
    // Try to create it
    fs.mkdirSync(ADDONS_DIR, { recursive: true });
    return true;
  } catch (error) {
    // Can't use default path, fall back to home directory
    ADDONS_DIR = path.join(os.homedir(), '.opennebula', 'addons');
    console.log(`Default addon directory not writable, using fallback: ${ADDONS_DIR}`);
    return false;
  }
};

const ADDONS_DATA = {
  'docker-machine': {
    name: 'Docker Machine',
    description: 'Enables Docker container management as virtual machines. Integrates Docker with OpenNebula VM management.',
    longDescription: 'The Docker Machine addon allows you to deploy and manage Docker containers through OpenNebula. It provides seamless integration between Docker and OpenNebula\'s VM lifecycle management.',
    version: '1.2.0',
    url: 'https://github.com/OpenNebula/docker-machine-opennebula/archive/refs/heads/master.zip',
    installed: false,
    type: 'container',
    requirements: ['Docker installed on host', 'Write permissions to addon directory'],
    documentation: 'https://docs.opennebula.io/stable/reference/addons/docker.html'
  },
  'kubernetes': {
    name: 'OneKE - Kubernetes',
    description: 'Deploy and manage Kubernetes (K8s) clusters. Complete Kubernetes lifecycle management integrated with OpenNebula.',
    longDescription: 'OneKE is OpenNebula\'s Kubernetes addon providing automated deployment, scaling, and management of Kubernetes clusters. It integrates fully with OpenNebula\'s orchestration capabilities.',
    version: '1.3.0',
    url: 'https://github.com/OpenNebula/oneke/archive/refs/heads/master.zip',
    installed: false,
    type: 'orchestration',
    requirements: ['Ruby and development tools', 'Git', 'kubectl CLI', 'Kubernetes knowledge'],
    documentation: 'https://docs.opennebula.io/stable/reference/addons/oneke.html'
  }
};

// Initialize addons directory
const initAddonsDirectory = () => {
  try {
    if (!fs.existsSync(ADDONS_DIR)) {
      fs.mkdirSync(ADDONS_DIR, { recursive: true });
    }
    
    // Check which addons are installed
    for (const [key, addon] of Object.entries(ADDONS_DATA)) {
      const addonPath = path.join(ADDONS_DIR, key);
      ADDONS_DATA[key].installed = fs.existsSync(addonPath);
    }
    
    console.log(`Addons directory initialized: ${ADDONS_DIR}`);
  } catch (error) {
    console.error(`Failed to initialize addons directory: ${error.message}`);
  }
};

// Download addon
const downloadAddon = async (addonKey, url) => {
  const addonPath = path.join(ADDONS_DIR, addonKey);
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(ADDONS_DIR)) {
      fs.mkdirSync(ADDONS_DIR, { recursive: true });
    }

    const response = await axios.get(url, { responseType: 'stream' });
    const zipPath = path.join(ADDONS_DIR, `${addonKey}.zip`);
    
    // Create write stream and pipe response
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(zipPath);
      response.data.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Extract zip (use -o to overwrite without prompting)
    try {
      execSync(`cd ${ADDONS_DIR} && unzip -o -q ${addonKey}.zip`, { stdio: 'pipe' });
    } catch (e) {
      // If unzip fails, surface a clearer error
      throw new Error(`unzip failed: ${e.message}`);
    }

    // Move extracted folder to addon path. Match any extracted dir that contains the addonKey.
    const extractedDirs = fs.readdirSync(ADDONS_DIR).filter(f =>
      fs.statSync(path.join(ADDONS_DIR, f)).isDirectory() && f.includes(addonKey)
    );

    if (extractedDirs.length > 0) {
      const extractedDir = path.join(ADDONS_DIR, extractedDirs[0]);
      if (fs.existsSync(addonPath)) {
        fs.rmSync(addonPath, { recursive: true });
      }
      fs.renameSync(extractedDir, addonPath);
    }
    
    // Cleanup zip
    fs.rmSync(zipPath);
    
    ADDONS_DATA[addonKey].installed = true;
    return true;
  } catch (error) {
    console.error(`Failed to download addon ${addonKey}:`, error.message);
    throw error;
  }
};

// Uninstall addon
const uninstallAddon = (addonKey) => {
  const addonPath = path.join(ADDONS_DIR, addonKey);
  if (fs.existsSync(addonPath)) {
    fs.rmSync(addonPath, { recursive: true });
    ADDONS_DATA[addonKey].installed = false;
    return true;
  }
  return false;
};

// Check and initialize addons directory with fallback
checkAddonsDir();
// Initialize addons on startup
initAddonsDirectory();

// GET /api/addons - List all available addons
app.get('/api/addons', authenticateToken, (req, res) => {
  try {
    const addons = Object.entries(ADDONS_DATA).map(([key, addon]) => ({
      id: key,
      ...addon
    }));
    res.json({ success: true, data: addons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/addons/status - Check addon installation status
app.get('/api/addons/status', authenticateToken, (req, res) => {
  try {
    initAddonsDirectory();
    const status = Object.entries(ADDONS_DATA).reduce((acc, [key, addon]) => {
      acc[key] = {
        installed: addon.installed,
        version: addon.version
      };
      return acc;
    }, {});
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/addons/:name/install - Download and install addon
app.post('/api/addons/:name/install', authenticateToken, async (req, res) => {
  try {
    const addonKey = req.params.name;
    const addon = ADDONS_DATA[addonKey];
    
    if (!addon) {
      return res.status(404).json({ success: false, error: 'Addon not found' });
    }
    
    if (addon.installed) {
      return res.status(400).json({ success: false, error: 'Addon already installed' });
    }
    
    res.json({ success: true, message: `Installing ${addon.name}...` });
    
    // Download in background
    setImmediate(async () => {
      try {
        await downloadAddon(addonKey, addon.url);
        console.log(`Successfully installed addon: ${addonKey}`);
      } catch (error) {
        console.error(`Failed to install addon ${addonKey}:`, error.message);
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/addons/:name - Uninstall addon
app.delete('/api/addons/:name', authenticateToken, (req, res) => {
  try {
    const addonKey = req.params.name;
    const addon = ADDONS_DATA[addonKey];
    
    if (!addon) {
      return res.status(404).json({ success: false, error: 'Addon not found' });
    }
    
    if (!addon.installed) {
      return res.status(400).json({ success: false, error: 'Addon not installed' });
    }
    
    uninstallAddon(addonKey);
    res.json({ success: true, message: `${addon.name} uninstalled` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Docker/Kubernetes Integration (with addon status checking)
const runCommand = (cmd) => new Promise((resolve, reject) => {
  exec(cmd, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      return reject(new Error((stderr || error.message || '').toString()));
    }
    resolve(stdout.trim());
  });
});

const isDockerSocketPermissionError = (err) => {
  const msg = (err && err.message) ? err.message.toString().toLowerCase() : '';
  return /permission denied while trying to connect to the docker api/i.test(msg)
    || /permission denied.*docker.sock/i.test(msg)
    || msg.includes('permission denied') && msg.includes('docker');
};

const VPCS_DIR = path.join(__dirname, 'data');
const VPCS_FILE = path.join(VPCS_DIR, 'vpcs.json');

const ensureVpcsStorage = () => {
  try {
    if (!fs.existsSync(VPCS_DIR)) fs.mkdirSync(VPCS_DIR, { recursive: true });
    if (!fs.existsSync(VPCS_FILE)) fs.writeFileSync(VPCS_FILE, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to ensure vpcs storage:', e.message || e);
  }
};

const readVpcs = () => {
  ensureVpcsStorage();
  try {
    return JSON.parse(fs.readFileSync(VPCS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
};

const writeVpcs = (list) => {
  ensureVpcsStorage();
  fs.writeFileSync(VPCS_FILE, JSON.stringify(list, null, 2));
};

const getDockerContainersInfo = async () => {
  const output = await runCommand('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"');
  if (!output) return [];
  const lines = output.split('\n').filter(Boolean);
  const containers = [];

  for (const line of lines) {
    const [id, name, image, status, ports] = line.split('|');
    let networks = [];
    let mounts = [];

    try {
      const networkJson = await runCommand(`docker inspect --format '{{json .NetworkSettings.Networks}}' ${id}`);
      const parsed = JSON.parse(networkJson || '{}');
      networks = Object.entries(parsed).map(([network, details]) => ({
        network,
        ip: details?.IPAddress || details?.GlobalIPv6Address || ''
      }));
    } catch (err) {
      // ignore inspect errors
    }

    try {
      const mountsJson = await runCommand(`docker inspect --format '{{json .Mounts}}' ${id}`);
      const parsedMounts = JSON.parse(mountsJson || '[]');
      if (Array.isArray(parsedMounts)) {
        mounts = parsedMounts.map((mount) => ({
          source: mount.Source || '',
          destination: mount.Destination || '',
          mode: mount.Mode || '',
        }));
      }
    } catch (err) {
      // ignore inspect errors
    }

    containers.push({ id, name, image, status, ports, networks, mounts });
  }

  return containers;
};

const getDockerNetworksInfo = async () => {
  const output = await runCommand('docker network ls --format "{{.ID}}|{{.Name}}|{{.Driver}}|{{.Scope}}"');
  if (!output) return [];
  const lines = output.split('\n').filter(Boolean);
  const networks = [];

  for (const line of lines) {
    const [id, name, driver, scope] = line.split('|');
    let subnet = null;
    try {
      const ipamJson = await runCommand(`docker network inspect --format '{{json .IPAM.Config}}' ${name}`);
      const parsed = JSON.parse(ipamJson || '[]');
      subnet = Array.isArray(parsed) && parsed[0] ? parsed[0]?.Subnet || null : null;
    } catch (err) {
      // ignore network inspect errors
    }
    networks.push({ id, name, driver, scope, subnet });
  }

  return networks;
};

app.get('/api/docker/containers', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.json({ 
        success: false, 
        error: 'Docker Machine addon not installed',
        addonRequired: 'docker-machine'
      });
    }

    let containers;
    try {
      containers = await getDockerContainersInfo();
      return res.json({ success: true, data: containers });
    } catch (err) {
      if (isDockerSocketPermissionError(err)) {
        return res.status(403).json({
          success: false,
          error: 'Docker socket not accessible from server process',
          suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/docker/networks', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.json({
        success: false,
        error: 'Docker Machine addon not installed',
        addonRequired: 'docker-machine'
      });
    }

    try {
      const networks = await getDockerNetworksInfo();
      res.json({ success: true, data: networks });
    } catch (err) {
      if (isDockerSocketPermissionError(err)) {
        return res.status(403).json({
          success: false,
          error: 'Docker socket not accessible from server process',
          suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/docker/networks', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.status(400).json({ success: false, error: 'Docker Machine addon not installed' });
    }

    const { name, subnet } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Network name is required' });
    }

    try {
      const networkArg = subnet ? `--subnet ${subnet}` : '';
      const cmd = `docker network create --driver bridge ${networkArg} ${name}`.trim();
      const networkId = await runCommand(cmd);
      const networks = await getDockerNetworksInfo();
      const createdNetwork = networks.find((n) => n.name === name) || { id: networkId, name, driver: 'bridge', subnet };

      res.json({ success: true, data: createdNetwork });
    } catch (err) {
      console.error('Docker network create error:', err.message || err);
      if (isDockerSocketPermissionError(err)) {
        return res.status(403).json({
          success: false,
          error: 'Docker socket not accessible from server process',
          suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/docker/containers', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.status(400).json({ success: false, error: 'Docker Machine addon not installed' });
    }

    const { name, image, detach = true, ports = [], network, privateIp, volumes = [] } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    if (privateIp && !network) {
      return res.status(400).json({ success: false, error: 'A custom network is required to assign a private IP' });
    }

    const nameArg = name ? `--name ${name}` : '';
    const networkArg = network ? `--network ${network}` : '';
    const ipArg = privateIp ? `--ip ${privateIp}` : '';
    const portArgs = Array.isArray(ports) ? ports.map((p) => `-p ${p}`).join(' ') : '';
    const volumeArgs = Array.isArray(volumes)
      ? volumes.filter(Boolean).map((v) => `-v ${v}`).join(' ')
      : typeof volumes === 'string'
      ? volumes.split(',').map((v) => v.trim()).filter(Boolean).map((v) => `-v ${v}`).join(' ')
      : '';
    const detachArg = detach ? '-d' : '';

    const cmd = `docker run ${detachArg} ${nameArg} ${networkArg} ${ipArg} ${portArgs} ${volumeArgs} ${image}`.trim();
    let containerId;
    try {
      containerId = await runCommand(cmd);
    } catch (err) {
      console.error('Docker run error:', err.message || err, err.stack);
      if (isDockerSocketPermissionError(err)) {
        return res.status(403).json({
          success: false,
          error: 'Docker socket not accessible from server process',
          suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
        });
      }
      throw err;
    }

    let networks = [];
    try {
      const networkJson = await runCommand(`docker inspect --format '{{json .NetworkSettings.Networks}}' ${containerId}`);
      const parsed = JSON.parse(networkJson || '{}');
      networks = Object.entries(parsed).map(([networkName, details]) => ({
        network: networkName,
        ip: details?.IPAddress || details?.GlobalIPv6Address || ''
      }));
    } catch (err) {
      // ignore inspect errors
    }

    res.json({ success: true, data: { id: containerId, name: name || null, image, networks } });
  } catch (error) {
    console.error('Docker run error:', error.message || error, error.stack);
    const errMsg = (error.message || '').toString();
    if (/permission denied while trying to connect to the docker API/i.test(errMsg) || /permission denied.*docker.sock/i.test(errMsg)) {
      return res.status(403).json({
        success: false,
        error: 'Docker socket not accessible from server process',
        suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
      });
    }
    res.status(500).json({ success: false, error: errMsg || error.message });
  }
});

app.post('/api/docker/containers/:id/action', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.status(400).json({ success: false, error: 'Docker Machine addon not installed' });
    }

    const containerId = req.params.id;
    const { action } = req.body;
    if (!['start', 'stop'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid Docker action. Use start or stop.' });
    }

    const cmd = action === 'start'
      ? `docker start "${containerId}"`
      : `docker stop "${containerId}"`;

    const output = await runCommand(cmd);
    return res.json({ success: true, data: { id: containerId, action, output: output.trim() } });
  } catch (err) {
    console.error('Docker container action error:', err.message || err);
    if (isDockerSocketPermissionError(err)) {
      return res.status(403).json({
        success: false,
        error: 'Docker socket not accessible from server process',
        suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
      });
    }
    res.status(500).json({ success: false, error: err.message || 'Failed to perform Docker action' });
  }
});

app.delete('/api/docker/containers/:id', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.status(400).json({ success: false, error: 'Docker Machine addon not installed' });
    }

    const containerId = req.params.id;
    await runCommand(`docker rm -f "${containerId}"`);
    res.json({ success: true, data: { id: containerId } });
  } catch (err) {
    console.error('Docker container delete error:', err.message || err);
    if (isDockerSocketPermissionError(err)) {
      return res.status(403).json({
        success: false,
        error: 'Docker socket not accessible from server process',
        suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
      });
    }
    res.status(500).json({ success: false, error: err.message || 'Failed to delete Docker container' });
  }
});

app.post('/api/docker/containers/:id/upload', authenticateToken, upload.array('files', 50), async (req, res) => {
  try {
    if (!ADDONS_DATA['docker-machine'].installed) {
      return res.status(400).json({ success: false, error: 'Docker Machine addon not installed' });
    }

    const containerId = req.params.id;
    const files = req.files || [];
    let { destinationPath } = req.body;
    if (!files.length) {
      return res.status(400).json({ success: false, error: 'At least one file is required' });
    }

    if (!destinationPath || typeof destinationPath !== 'string' || !destinationPath.trim()) {
      let imageName = '';
      try {
        imageName = await runCommand(`docker inspect --format '{{.Config.Image}}' ${containerId}`);
      } catch (e) {
        imageName = '';
      }
      const lowerImage = (imageName || '').toLowerCase();
      if (lowerImage.includes('nginx')) {
        destinationPath = '/usr/share/nginx/html';
      } else if (lowerImage.includes('httpd') || lowerImage.includes('apache')) {
        destinationPath = '/var/www/html';
      } else {
        destinationPath = '/home';
      }
    }

    if (!destinationPath.startsWith('/')) {
      destinationPath = `/${destinationPath}`;
    }

    const uploadPromises = files.map((file) => {
      const targetFile = `${destinationPath}/${file.originalname}`;
      return runCommand(`docker cp ${path.join(UPLOADS_DIR, file.filename)} ${containerId}:${targetFile}`);
    });

    try {
      await Promise.all(uploadPromises);
    } catch (err) {
      console.error('Docker upload error:', err.message || err);
      return res.status(500).json({ success: false, error: 'Upload failed while copying files into the container' });
    }

    files.forEach((file) => {
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, file.filename));
      } catch (err) {
        console.warn('Unable to delete temp upload file:', err.message || err);
      }
    });

    res.json({ success: true, data: { containerId, destinationPath, uploadedFiles: files.map((file) => file.originalname) } });
  } catch (error) {
    const errMsg = (error.message || '').toString();
    res.status(500).json({ success: false, error: errMsg || error.message });
  }
});

app.get('/api/kubernetes/clusters', authenticateToken, async (req, res) => {
  try {
    if (!ADDONS_DATA['kubernetes'].installed) {
      return res.json({ 
        success: false, 
        error: 'Kubernetes addon not installed',
        addonRequired: 'kubernetes'
      });
    }
    
    // This would fetch Kubernetes clusters if addon is installed
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// VPC endpoints: logical grouping that creates Docker networks and stores mappings
app.get('/api/vpcs', authenticateToken, async (req, res) => {
  try {
    const vpcs = readVpcs();
    res.json({ success: true, data: vpcs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/vpcs', authenticateToken, async (req, res) => {
  try {
    const { name, subnet, createOpenNebula = false } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'VPC name is required' });

    // Create Docker network
    try {
      const networkArg = subnet ? `--subnet ${subnet}` : '';
      const cmd = `docker network create --driver bridge ${networkArg} ${name}`.trim();
      const networkId = await runCommand(cmd);

      // Record VPC metadata
      const vpcs = readVpcs();
      const vpc = { id: Date.now(), name, subnet: subnet || null, dockerNetwork: name, dockerNetworkId: networkId, createdAt: new Date().toISOString() };
      vpcs.push(vpc);
      writeVpcs(vpcs);

      // Optionally attempt to create an OpenNebula virtual network (best-effort)
      if (createOpenNebula) {
        try {
          const template = `NAME="${name}"
BRIDGE="${name}"
NETWORK_ADDRESS="${subnet || ''}"`;
          const xmlResponse = await callMethod('one.vnet.allocate', [template]);
          const parsed = await parseXMLResponse(xmlResponse);
          // Try to extract vnet id if present
          const respArray = parsed?.methodResponse?.params?.param?.value?.array?.data?.value;
          const success = respArray && (respArray[0]?.boolean === '1' || respArray[0] === true);
          if (success) {
            vpc.opennebulaVnet = respArray[1]?.i4 || null;
            writeVpcs(vpcs);
          }
        } catch (e) {
          console.warn('OpenNebula vnet creation failed (non-fatal):', e.message || e);
        }
      }

      res.json({ success: true, data: vpc });
    } catch (err) {
      if (isDockerSocketPermissionError(err)) {
        return res.status(403).json({
          success: false,
          error: 'Docker socket not accessible from server process',
          suggestion: 'Add the server user to the docker group (sudo usermod -aG docker $USER) and restart the server, or run this server with sufficient privileges.'
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenNebula endpoint: ${ON_ENDPOINT}`);
});

module.exports = app;