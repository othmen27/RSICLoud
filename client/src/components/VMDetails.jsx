import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDesktop, FaCopy } from 'react-icons/fa';
import { getVMDetails, startVM, stopVM, getVNCConnection } from '../services/opennebulaApi';

const VMDetails = () => {
  const { id } = useParams();
  const [vm, setVm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [savedKey] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('sshKeyPair')) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const fetchVM = async () => {
      try {
        const vmData = await getVMDetails(id);
        setVm(vmData);
      } catch (error) {
        console.error('Error fetching VM details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVM();
  }, [id]);

  const handleStart = async () => {
    try {
      await startVM(id);
      // Refresh VM data to get updated status
      const updatedVM = await getVMDetails(id);
      setVm(updatedVM);
      alert('VM started successfully!');
    } catch (error) {
      console.error('Error starting VM:', error);
      alert(`Failed to start VM: ${error.message}`);
    }
  };

  const handleStop = async () => {
    try {
      await stopVM(id);
      // Refresh VM data to get updated status
      const updatedVM = await getVMDetails(id);
      setVm(updatedVM);
      alert('VM stopped successfully!');
    } catch (error) {
      console.error('Error stopping VM:', error);
      alert(`Failed to stop VM: ${error.message}`);
    }
  };

  const handleVNCConnect = async () => {
    try {
      const vncInfo = await getVNCConnection(id);
      if (vncInfo) {
        // Open VNC client connection page in new window
        const vncUrl = `http://localhost:3001/vnc/index.html?host=${vncInfo.host}&port=${vncInfo.port}&ssh_host=${vm.ip}`;
        window.open(vncUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting VNC connection:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  if (!vm) return <div className="container mx-auto px-4 py-8 text-center">VM not found</div>;

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
          VM Details: {vm.name}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">General Info</h2>
              <p><strong>Status:</strong> <span className={vm.status === 'running' ? 'text-green-500' : 'text-red-500'}>{vm.status}</span></p>
              <p><strong>CPU:</strong> {vm.cpu} cores</p>
              <p><strong>Memory:</strong> {vm.memory} GB</p>
              <p><strong>IP Address:</strong> {vm.ip}</p>
              <p><strong>OS:</strong> {vm.os}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleStart}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
                  disabled={vm.status === 'running'}
                >
                  Start
                </button>
                <button
                  onClick={handleStop}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
                  disabled={vm.status === 'stopped'}
                >
                  Stop
                </button>
                <button className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                  Restart
                </button>
              </div>

              {vm.status === 'running' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connect</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleVNCConnect}
                      className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300 inline-flex items-center justify-center"
                    >
                      <FaDesktop className="mr-2" />
                      Open Console (VNC)
                    </button>

                    {vm.ip !== 'N/A' && (
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">SSH Access:</span>
                          <button
                            onClick={() => copyToClipboard(savedKey ? `ssh -i id_ed25519 root@${vm.ip}` : `ssh root@${vm.ip}`)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                            title="Copy SSH command"
                          >
                            <FaCopy />
                          </button>
                        </div>
                        <code className="text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded block">
                          {savedKey ? `ssh -i id_ed25519 root@${vm.ip}` : `ssh root@${vm.ip}`}
                        </code>
                        {savedKey && (
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                            Use the private key you generated and saved locally. Run the command from the folder where <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">id_ed25519</code> is stored.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VMDetails;