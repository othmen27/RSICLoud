import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createVM, generateSSHKeyPair, getImages } from '../services/opennebulaApi';

const CreateVM = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    cpu: 1,
    memory: 2,
    diskSize: 10,
    networkId: 0,
    imageId: 0,
  });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [sshKeyPair, setSshKeyPair] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('sshKeyPair')) || null;
    } catch {
      return null;
    }
  });
  const [loadingKey, setLoadingKey] = useState(false);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imageList = await getImages();
        setImages(Array.isArray(imageList) ? imageList : []);
      } catch (error) {
        console.error('Error fetching images:', error);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createVM({
        ...formData,
        sshPublicKey: sshKeyPair?.publicKey
      });
      alert('VM created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating VM:', error);
      alert(error?.message || 'Error creating VM');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setLoadingKey(true);
    setKeyError('');
    try {
      const keyPair = await generateSSHKeyPair();
      setSshKeyPair(keyPair);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sshKeyPair', JSON.stringify(keyPair));
      }
    } catch (error) {
      setKeyError(error?.message || 'Failed to generate SSH key pair');
    } finally {
      setLoadingKey(false);
    }
  };

  const downloadPrivateKey = () => {
    if (!sshKeyPair?.privateKey) return;
    const blob = new Blob([sshKeyPair.privateKey], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'id_ed25519';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      alert('Copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Create New Virtual Machine
        </h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="name">
              VM Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="cpu">
              CPU Cores
            </label>
            <input
              type="number"
              id="cpu"
              name="cpu"
              value={formData.cpu}
              onChange={handleChange}
              min="1"
              max="16"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="memory">
              Memory (GB)
            </label>
            <input
              type="number"
              id="memory"
              name="memory"
              value={formData.memory}
              onChange={handleChange}
              min="1"
              max="64"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="imageId">
              Operating System
            </label>
            <select
              id="imageId"
              name="imageId"
              value={formData.imageId}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={loadingImages}
            >
              {loadingImages ? (
                <option>Loading images...</option>
              ) : Array.isArray(images) && images.length > 0 ? (
                images.map(image => (
                  <option key={image.id} value={image.id}>
                    {image.name} ({image.size})
                  </option>
                ))
              ) : (
                <option value="0">Default Alpine Linux</option>
              )}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="diskSize">
              Disk Size (GB)
            </label>
            <input
              type="number"
              id="diskSize"
              name="diskSize"
              value={formData.diskSize}
              onChange={handleChange}
              min="5"
              max="100"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="networkId">
              Network
            </label>
            <select
              id="networkId"
              name="networkId"
              value={formData.networkId}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="0">Default Network</option>
              <option value="1">Public Network</option>
              <option value="2">Private Network</option>
            </select>
          </div>

          <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">SSH Key Access</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generate an SSH key pair and inject the public key into the VM.</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateKey}
                disabled={loadingKey}
                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
              >
                {loadingKey ? 'Generating...' : 'Generate SSH Key'}
              </button>
            </div>
            {keyError && <p className="text-sm text-red-500 mb-2">{keyError}</p>}
            {sshKeyPair ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 dark:text-gray-300">SSH key pair generated and ready to inject.</p>
                  <button
                    type="button"
                    onClick={downloadPrivateKey}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Download private key
                  </button>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Public key</label>
                  <textarea
                    readOnly
                    value={sshKeyPair.publicKey}
                    rows={3}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 p-2 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Private key</label>
                  <textarea
                    readOnly
                    value={sshKeyPair.privateKey}
                    rows={6}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-black text-xs text-green-300 p-2 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sshKeyPair.privateKey)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Copy private key to clipboard
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  After VM creation, use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ssh -i id_ed25519 root@&lt;VM_IP&gt;</code> to connect.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No key generated yet. You can still create the VM without an injected SSH key.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 w-full disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create VM'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateVM;