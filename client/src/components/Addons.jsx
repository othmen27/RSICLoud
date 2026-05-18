import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlug, FaDownload, FaTrash, FaCheck, FaClock, FaExclamation } from 'react-icons/fa';
import axios from 'axios';

const Addons = () => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState({});
  const [uninstalling, setUninstalling] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAddons();
    const interval = setInterval(fetchAddons, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchAddons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/addons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAddons(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (addonId) => {
    try {
      setInstalling(prev => ({ ...prev, [addonId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:3001/api/addons/${addonId}/install`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessage(`Installing ${addonId}... This may take a few moments.`);
        setTimeout(() => {
          fetchAddons();
          setMessage('');
        }, 3000);
      }
    } catch (error) {
      setMessage(`Error installing addon: ${error.response?.data?.error || error.message}`);
    } finally {
      setInstalling(prev => ({ ...prev, [addonId]: false }));
    }
  };

  const handleUninstall = async (addonId) => {
    if (!window.confirm(`Are you sure you want to uninstall ${addonId}?`)) {
      return;
    }

    try {
      setUninstalling(prev => ({ ...prev, [addonId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:3001/api/addons/${addonId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessage(`${addonId} uninstalled successfully`);
        fetchAddons();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`Error uninstalling addon: ${error.response?.data?.error || error.message}`);
    } finally {
      setUninstalling(prev => ({ ...prev, [addonId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading addons...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <FaPlug className="mr-3 text-[#1A3A6B]" />
          RSICLoud Add-ons
        </h1>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-200 px-4 py-3 rounded mb-6"
          >
            {message}
          </motion.div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Addon Management</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Install OpenNebula addons to enable Docker and Kubernetes container management features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addons.map((addon) => {
            const category = addon.category || addon.type || 'other';
            const colorMap = {
              monitoring: { bg: 'bg-teal-100', icon: 'text-teal-600' },
              visualization: { bg: 'bg-amber-100', icon: 'text-amber-600' },
              security: { bg: 'bg-blue-100', icon: 'text-blue-600' },
              'service-mesh': { bg: 'bg-purple-100', icon: 'text-purple-600' },
              container: { bg: 'bg-blue-100', icon: 'text-blue-600' },
            };
            const color = colorMap[category] || { bg: 'bg-slate-100', icon: 'text-slate-600' };

            return (
              <motion.div
                key={addon.id}
                whileHover={{ y: -4 }}
                className={`rounded-lg border-2 p-6 transition-all ${
                  addon.installed
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${color.bg}`}>
                      <FaPlug className={color.icon} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{addon.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">v{addon.version}</p>
                    </div>
                  </div>

                  {addon.installed && (
                    <div className="flex items-center bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm">
                      <FaCheck className="mr-2" /> Installed
                    </div>
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4">{addon.description}</p>

                {addon.longDescription && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">{addon.longDescription}</p>
                )}

                {addon.requirements && addon.requirements.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Requirements:</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                      {addon.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  {!addon.installed ? (
                    <button
                      onClick={() => handleInstall(addon.id)}
                      disabled={installing[addon.id]}
                      className={`flex-1 py-2 px-4 rounded font-semibold flex items-center justify-center transition-all ${
                        installing[addon.id]
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {installing[addon.id] ? (
                        <><FaClock className="mr-2 animate-spin" /> Installing...</>
                      ) : (
                        <><FaDownload className="mr-2" /> Install Addon</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUninstall(addon.id)}
                      disabled={uninstalling[addon.id]}
                      className={`flex-1 py-2 px-4 rounded font-semibold flex items-center justify-center transition-all ${
                        uninstalling[addon.id]
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {uninstalling[addon.id] ? (
                        <><FaClock className="mr-2 animate-spin" /> Uninstalling...</>
                      ) : (
                        <><FaTrash className="mr-2" /> Uninstall</>
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm mb-3">
                    <span className="text-gray-600 dark:text-gray-400">Type: </span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{addon.type}</span>
                  </div>
                  {addon.documentation && (
                    <a href={addon.documentation} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline">📚 View Documentation</a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded"
        >
          <div className="flex items-start">
            <FaExclamation className="text-yellow-600 dark:text-yellow-400 mr-4 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Requirements</h3>
              <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>Write permissions to /var/lib/opennebula/addons</li>
                <li>Stable internet connection for downloading addons</li>
                <li>Sufficient disk space for addon installation</li>
                <li>OpenNebula system must be configured and running</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Addons;
