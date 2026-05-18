import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDocker, FaPlay, FaStop, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { getDockerContainers, getDockerNetworks, createDockerContainer, createDockerNetwork, uploadFilesToDockerContainer, startDockerContainer, stopDockerContainer, deleteDockerContainer } from '../services/opennebulaApi';
import axios from 'axios';

function CreateContainerForm({ onCreated, networks }) {
  const [image, setImage] = useState('nginx:latest');
  const [name, setName] = useState('');
  const [ports, setPorts] = useState('');
  const [volumes, setVolumes] = useState('');
  const [network, setNetwork] = useState('');
  const [privateIp, setPrivateIp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!network && networks.length > 0) {
      setNetwork(networks[0].name);
    }
  }, [networks, network]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const portList = ports.split(',').map(p => p.trim()).filter(Boolean);
      const volumeList = volumes
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      await createDockerContainer({
        name: name || undefined,
        image,
        ports: portList,
        volumes: volumeList,
        detach: true,
        network: network || undefined,
        privateIp: privateIp || undefined,
      });
      if (onCreated) await onCreated();
      setName('');
      setPorts('');
      setPrivateIp('');
    } catch (error) {
      const msg = error?.response?.data?.error || error.message || 'Unknown error';
      const suggestion = error?.response?.data?.suggestion;
      const full = suggestion ? `${msg} — ${suggestion}` : msg;
      setSubmitError(full);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
        <input value={image} onChange={(e) => setImage(e.target.value)} className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Network</label>
        <select value={network} onChange={(e) => setNetwork(e.target.value)} className="mt-1 block w-full rounded border-gray-300 shadow-sm">
          <option value="">Default bridge</option>
          {networks.map((net) => (
            <option key={net.name} value={net.name}>
              {net.name} {net.subnet ? `(${net.subnet})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Private IP (optional, requires custom network)</label>
        <input value={privateIp} onChange={(e) => setPrivateIp(e.target.value)} placeholder="172.18.0.10" className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Volumes (comma-separated, host:container[:ro])</label>
        <input value={volumes} onChange={(e) => setVolumes(e.target.value)} placeholder="/host/data:/data, /host/logs:/logs:ro" className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Example: <code>/tmp/app:/app</code> or <code>/tmp/log:/var/log/app:ro</code>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ports (comma-separated, host:container)</label>
        <input value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="8080:80,8443:443" className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>

      <div>
        <button disabled={submitting} type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          {submitting ? 'Creating...' : 'Create Container'}
        </button>
      </div>

      {submitError && (
        <div className="text-red-600 mt-2">{submitError}</div>
      )}
    </form>
  );
}

function CreateNetworkForm({ onCreated }) {
  const [name, setName] = useState('vpc-net');
  const [subnet, setSubnet] = useState('172.18.0.0/16');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await createDockerNetwork({ name, subnet });
      if (onCreated) await onCreated();
      setName('docker-net');
      setSubnet('172.18.0.0/16');
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to create Docker network';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Network Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subnet</label>
        <input value={subnet} onChange={(e) => setSubnet(e.target.value)} className="mt-1 block w-full rounded border-gray-300 shadow-sm" />
      </div>
      <div>
        <button disabled={creating} type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
          {creating ? 'Creating network...' : 'Create Network'}
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  );
}

const Docker = () => {
  const [containers, setContainers] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addonInstalled, setAddonInstalled] = useState(null);
  const [addonLoading, setAddonLoading] = useState(true);
  const [uploadData, setUploadData] = useState({});
  const [uploadingContainerId, setUploadingContainerId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const fetchAddonStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/addons/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAddonInstalled(response.data.data['docker-machine']?.installed || false);
      }
    } catch (error) {
      console.error('Error fetching addon status:', error);
    } finally {
      setAddonLoading(false);
    }
  };

  const fetchContainers = async () => {
    try {
      const containerData = await getDockerContainers();
      setContainers(containerData);
    } catch (error) {
      console.error('Error fetching Docker containers:', error);
      setContainers([]);
    }
  };

  const fetchNetworks = async () => {
    try {
      const dockerNetworks = await getDockerNetworks();
      setNetworks(dockerNetworks);
    } catch (error) {
      console.error('Error fetching Docker networks:', error);
      setNetworks([]);
    }
  };

  useEffect(() => {
    fetchAddonStatus();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchContainers(), fetchNetworks()]);
      setLoading(false);
    };

    if (addonInstalled) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [addonInstalled]);

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchContainers(), fetchNetworks()]);
    setLoading(false);
  };

  const getDefaultDestinationPath = (image) => {
    const lower = (image || '').toLowerCase();
    if (lower.includes('nginx')) return '/usr/share/nginx/html';
    if (lower.includes('httpd') || lower.includes('apache')) return '/var/www/html';
    return '/home';
  };

  const handleUploadChange = (containerId, files) => {
    setUploadData((prev) => ({
      ...prev,
      [containerId]: {
        ...prev[containerId],
        files,
      },
    }));
  };

  const handleDestinationChange = (containerId, destinationPath) => {
    setUploadData((prev) => ({
      ...prev,
      [containerId]: {
        ...prev[containerId],
        destinationPath,
      },
    }));
  };

  const handleContainerAction = async (container, action) => {
    const actionVerb = action === 'start' ? 'Starting' : 'Stopping';
    setActionLoading((prev) => ({ ...prev, [container.id]: action }));

    try {
      if (action === 'start') {
        await startDockerContainer(container.id);
      } else {
        await stopDockerContainer(container.id);
      }
      await refreshAll();
    } catch (error) {
      const message = error?.response?.data?.error || error.message || `${actionVerb} failed`;
      window.alert(`${actionVerb} container failed: ${message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [container.id]: null }));
    }
  };

  const handleDeleteContainer = async (container) => {
    if (!window.confirm(`Delete container ${container.name || container.id}? This cannot be undone.`)) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, [container.id]: 'delete' }));
    try {
      await deleteDockerContainer(container.id);
      await refreshAll();
    } catch (error) {
      const message = error?.response?.data?.error || error.message || 'Delete failed';
      window.alert(`Delete container failed: ${message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [container.id]: null }));
    }
  };

  const handleUploadFiles = async (container) => {
    if (!container) return;
    const data = uploadData[container.id] || {};
    const files = data.files || [];
    const destinationPath = data.destinationPath || getDefaultDestinationPath(container.image);

    if (!files.length) {
      setUploadStatus((prev) => ({ ...prev, [container.id]: 'Choose one or more files before uploading.' }));
      return;
    }

    setUploadingContainerId(container.id);
    setUploadStatus((prev) => ({ ...prev, [container.id]: 'Uploading files...' }));

    try {
      await uploadFilesToDockerContainer(container.id, destinationPath, files);
      setUploadStatus((prev) => ({ ...prev, [container.id]: `Files uploaded to ${destinationPath}` }));
      await refreshAll();
      setUploadData((prev) => ({ ...prev, [container.id]: { files: null, destinationPath } }));
    } catch (error) {
      const message = error?.response?.data?.error || error.message || 'Upload failed';
      setUploadStatus((prev) => ({ ...prev, [container.id]: message }));
    } finally {
      setUploadingContainerId(null);
    }
  };

  if (loading || addonLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading Docker...</div>
      </div>
    );
  }

  if (!addonInstalled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
            <FaDocker className="mr-3 text-blue-500" />
            Docker Containers
          </h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 rounded-lg p-8 text-center"
          >
            <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">
              Docker Machine Addon Not Installed
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-6 max-w-md mx-auto">
              The Docker Machine addon is required to manage Docker containers. Please install it from the Addons page.
            </p>
            <Link
              to="/addons"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
            >
              Go to Addons Page
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
          <FaDocker className="mr-3 text-blue-500" />
          Docker Containers
        </h1>

        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded mb-6">
          <strong>Note:</strong> Docker integration requires OpenNebula's Docker Machine addon to be properly configured.
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Create Container</h3>
            <CreateContainerForm onCreated={refreshAll} networks={networks} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Create Private Docker Network</h3>
            <CreateNetworkForm onCreated={refreshAll} />
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Existing Networks</h4>
              {networks.length === 0 ? (
                <p className="text-sm text-gray-500">No custom Docker networks found.</p>
              ) : (
                <ul className="space-y-2">
                  {networks.map((net) => (
                    <li key={net.name} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{net.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Driver: {net.driver}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Subnet: {net.subnet || 'default'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containers.map((container, index) => (
            <motion.div
              key={container.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center mb-2">
                <FaDocker className="text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {container.name || container.id}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Image: <span className="font-medium">{container.image}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Ports: <span className="font-medium">{container.ports || 'none'}</span>
              </p>
              {container.mounts && container.mounts.length > 0 && (
                <div className="mb-4">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Mounted Volumes</div>
                  {container.mounts.map((mount, index) => (
                    <div key={`${container.id}-mount-${index}`} className="text-sm text-gray-600 dark:text-gray-400">
                      {mount.source} → {mount.destination} {mount.mode ? `(${mount.mode})` : ''}
                    </div>
                  ))}
                </div>
              )}
              {container.networks && container.networks.length > 0 && (
                <div className="mb-4">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Private IPs</div>
                  {container.networks.map((net) => (
                    <div key={`${container.id}-${net.network}`} className="text-sm text-gray-600 dark:text-gray-400">
                      {net.network}: {net.ip || 'n/a'}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Status: <span className={`font-medium ${container.status?.toLowerCase().includes('up') ? 'text-green-500' : 'text-red-500'}`}>
                  {container.status}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleContainerAction(container, container.status?.toLowerCase().includes('up') ? 'stop' : 'start')}
                  disabled={!!actionLoading[container.id]}
                  className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-2 px-3 rounded"
                >
                  {actionLoading[container.id] === 'start' && 'Starting...'}
                  {actionLoading[container.id] === 'stop' && 'Stopping...'}
                  {actionLoading[container.id] === 'delete' && 'Working...'}
                  {!actionLoading[container.id] && (
                    container.status?.toLowerCase().includes('up') ? (
                      <><FaStop /> Stop</>
                    ) : (
                      <><FaPlay /> Start</>
                    )
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteContainer(container)}
                  disabled={!!actionLoading[container.id]}
                  className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-2 px-3 rounded"
                >
                  <FaTrash /> Delete
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Upload files directly into the container. For web servers, the default destination is auto-selected.
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Files</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleUploadChange(container.id, Array.from(e.target.files))}
                  className="mt-1 block w-full text-sm text-slate-900 dark:text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">Destination Path</label>
                <input
                  value={(uploadData[container.id]?.destinationPath) || getDefaultDestinationPath(container.image)}
                  onChange={(e) => handleDestinationChange(container.id, e.target.value)}
                  placeholder={getDefaultDestinationPath(container.image)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handleUploadFiles(container)}
                  disabled={uploadingContainerId === container.id}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded transition duration-300 disabled:opacity-60"
                >
                  {uploadingContainerId === container.id ? 'Uploading...' : 'Upload Files'}
                </button>
                {uploadStatus[container.id] && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {uploadStatus[container.id]}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {containers.length === 0 && (
          <div className="text-center py-12">
            <FaDocker className="mx-auto text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Docker containers found
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Docker containers will appear here once the Docker Machine addon is configured.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Docker;
