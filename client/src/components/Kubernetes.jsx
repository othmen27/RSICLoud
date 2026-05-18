import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCubes, FaPlus, FaTrash, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import { getKubernetesClusters } from '../services/opennebulaApi';
import axios from 'axios';

const Kubernetes = () => {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addonInstalled, setAddonInstalled] = useState(null);
  const [addonLoading, setAddonLoading] = useState(true);

  useEffect(() => {
    const fetchAddonStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/addons/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setAddonInstalled(response.data.data['kubernetes']?.installed || false);
        }
      } catch (error) {
        console.error('Error fetching addon status:', error);
      } finally {
        setAddonLoading(false);
      }
    };

    fetchAddonStatus();
  }, []);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const clusterData = await getKubernetesClusters();
        setClusters(clusterData);
      } catch (error) {
        console.error('Error fetching Kubernetes clusters:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (addonInstalled) {
      fetchClusters();
    } else {
      setLoading(false);
    }
  }, [addonInstalled]);

  if (loading || addonLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading Kubernetes...</div>
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
            <FaCubes className="mr-3 text-blue-500" />
            Kubernetes Clusters
          </h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 rounded-lg p-8 text-center"
          >
            <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">
              Kubernetes Addon Not Installed
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-6 max-w-md mx-auto">
              The Kubernetes addon is required to manage Kubernetes clusters. Please install it from the Addons page.
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaCubes className="mr-3 text-blue-500" />
            Kubernetes Clusters
          </h1>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center">
            <FaPlus className="mr-2" />
            Create Cluster
          </button>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded mb-6">
          <strong>Note:</strong> Kubernetes integration requires OpenNebula's Kubernetes addon to be properly configured.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster, index) => (
            <motion.div
              key={cluster.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 transition-shadow duration-300"
            >
              <div className="flex items-center mb-2">
                <FaCubes className="text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {cluster.name}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">Version: <span className="font-medium">{cluster.version || 'v1.0'}</span></p>
              <p className="text-gray-600 dark:text-gray-300 mb-2">Nodes: <span className="font-medium">{cluster.nodes}</span></p>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                  <div>CPU</div>
                  <div>{/* show percent if available */}{(cluster.cpuUtil ?? cluster.utilization) ? `${Math.round((cluster.cpuUtil ?? cluster.utilization) * 100)}%` : `${50 + (index * 5)}%`}</div>
                </div>
                {(() => {
                  const util = cluster.cpuUtil ?? cluster.utilization ?? (0.5 + (index * 0.05));
                  const pct = Math.min(100, Math.round(util * 100));
                  const danger = pct >= 75;
                  return (
                    <>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded overflow-hidden">
                        <div className={`h-3 ${danger ? 'bg-amber-500' : 'bg-[#1A3A6B]'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {danger && <div className="text-xs text-amber-600 dark:text-amber-300 mt-2">CPU utilization high — scale recommended</div>}
                    </>
                  );
                })()}
              </div>
              <div className="flex space-x-2">
                <button className="bg-[#1A3A6B] hover:opacity-90 text-white font-medium py-1 px-3 rounded text-sm transition duration-300 flex items-center">
                  <FaEye className="mr-1" />
                  View
                </button>
                <button className="bg-red-600 hover:bg-red-800 text-white font-medium py-1 px-3 rounded text-sm transition duration-300 flex items-center">
                  <FaTrash className="mr-1" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {clusters.length === 0 && (
          <div className="text-center py-12">
            <FaCubes className="mx-auto text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Kubernetes clusters found
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Kubernetes clusters will appear here once the Kubernetes addon is configured.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Kubernetes;