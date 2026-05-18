import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaPlus, FaServer, FaEllipsisV } from 'react-icons/fa';
import { getVMs, startVM, stopVM } from '../services/opennebulaApi';

const Dashboard = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const containerCount = vms.filter((vm) => vm.type === 'container').length;
  const runningCount = vms.filter((vm) => vm.status === 'running').length;
  const stopCount = vms.filter((vm) => vm.status !== 'running').length;
  const vcpuUsed = 68;

  const fetchVMs = async () => {
    try {
      const vmData = await getVMs();
      setVms(vmData);
    } catch (error) {
      console.error('Error fetching VMs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVMs();
  }, []);

  const handleStart = async (id) => {
    setActionLoading(id);
    try {
      await startVM(id);
      // Refresh VMs list to get updated status
      await fetchVMs();
      alert('VM started successfully!');
    } catch (error) {
      console.error('Error starting VM:', error);
      alert(`Failed to start VM: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id) => {
    setActionLoading(id);
    try {
      await stopVM(id);
      // Refresh VMs list to get updated status
      await fetchVMs();
      alert('VM stopped successfully!');
    } catch (error) {
      console.error('Error stopping VM:', error);
      alert(`Failed to stop VM: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading VMs...</div>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-slate-900 dark:text-white">RSICLoud Overview</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">eu-west-1 · Frankfurt</div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn-sm"><span className="mr-2">⟳</span>Refresh</button>
            <button className="btn-sm"><span className="mr-2">⚙</span>Filter</button>
            <Link to="/create-vm" className="btn-primary"><FaPlus /> New Resource ↗</Link>
          </div>
        </div>
      </motion.div>

      <div className="stats-row mb-8">
        <div className="stat-card">
          <div className="stat-label"><span className="stat-dot dot-green"></span>Virtual Machines</div>
          <div className="stat-val">{vms.length}</div>
          <div className="stat-sub">{runningCount} running · {stopCount} stopped</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><span className="stat-dot dot-amber"></span>Containers</div>
          <div className="stat-val">{containerCount}</div>
          <div className="stat-sub">Active container workloads</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><span className="stat-dot dot-blue"></span>Platform Health</div>
          <div className="stat-val">Stable</div>
          <div className="stat-sub">All services operational</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><span className="stat-dot dot-amber"></span>vCPU Used</div>
          <div className="stat-val">{vcpuUsed}<span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}> / 96</span></div>
          <div className="stat-sub">Current compute utilization</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.65fr_0.95fr] gap-8">
        <div className="dashboard-table-card bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Spec</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {vms.map((vm) => (
                  <tr key={vm.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-[#eef5ff] text-[#1A3A6B] flex items-center justify-center text-xs font-bold">{vm.name?.charAt(0) ?? 'V'}</div><div>{vm.name}</div></div></td>
                    <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700">{vm.type || 'VM'}</span></td>
                    <td className="px-3 py-3"><span className={`text-xs px-2 py-1 rounded-full ${vm.status === 'running' ? 'pill-green' : 'pill-red'}`}>{vm.status}</span></td>
                    <td className="px-3 py-3">{vm.cpu || 0} vCPU · {vm.memory || 0} GB</td>
                    <td className="px-3 py-3" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{vm.ip || '—'}</td>
                    <td className="px-3 py-3">eu-west-1</td>
                    <td className="px-3 py-3 text-right"><button className="px-2 py-1 rounded text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => window.sendPrompt && window.sendPrompt(`Open actions for ${vm.name}`)}><FaEllipsisV /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="cluster-card">
            <div className="cluster-top">
              <div className="cluster-icon"><span>P</span></div>
              <div>
                <div className="cluster-name">Platform Overview</div>
                <div className="cluster-env">Current uptime 99.98% · No incidents</div>
              </div>
            </div>
            <div className="cluster-meta">
              <div className="meta-item">Active nodes<div className="meta-val">18</div></div>
              <div className="meta-item">Active pods<div className="meta-val">124</div></div>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: '74%' }}></div></div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px' }}>Resource utilization 74%</div>
          </div>

          <div className="sec-header">
            <span className="sec-title">Add-ons & marketplace</span>
            <span className="sec-link">Browse all ↗</span>
          </div>
          <div className="addon-grid">
            <div className="addon-card installed">
              <div className="addon-ico" style={{ background: '#E1F5EE' }}><span style={{ color: '#085041' }}>P</span></div>
              <div>
                <div className="addon-title">Prometheus</div>
                <div className="addon-desc">Metrics & alerting</div>
                <span className="addon-badge ab-installed">Installed</span>
              </div>
            </div>
            <div className="addon-card installed">
              <div className="addon-ico" style={{ background: '#FAEEDA' }}><span style={{ color: '#BA7517' }}>G</span></div>
              <div>
                <div className="addon-title">Grafana</div>
                <div className="addon-desc">Dashboards & viz</div>
                <span className="addon-badge ab-installed">Installed</span>
              </div>
            </div>
            <div className="addon-card">
              <div className="addon-ico" style={{ background: '#E6F1FB' }}><span style={{ color: '#185FA5' }}>V</span></div>
              <div>
                <div className="addon-title">Vault</div>
                <div className="addon-desc">Secret management</div>
                <span className="addon-badge ab-available">Available</span>
              </div>
            </div>
            <div className="addon-card">
              <div className="addon-ico" style={{ background: '#EEEDFE' }}><span style={{ color: '#534AB7' }}>I</span></div>
              <div>
                <div className="addon-title">Istio</div>
                <div className="addon-desc">Service mesh</div>
                <span className="addon-badge ab-new">New</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
