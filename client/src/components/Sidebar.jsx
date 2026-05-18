import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaServer, FaPlus, FaImage, FaDocker, FaBox, FaPlug, FaChartLine, FaCog, FaUserCircle } from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navSections = [
    {
      label: 'Compute',
      items: [
        { path: '/dashboard', label: 'Overview', icon: <FaServer /> },
        { path: '/create-vm', label: 'Create VM', icon: <FaPlus /> },
        { path: '/images', label: 'Images', icon: <FaImage /> },
        { path: '/docker', label: 'Containers', icon: <FaDocker /> },
        { path: '/kubernetes', label: 'Kubernetes', icon: <FaBox /> },
      ],
    },
    {
      label: 'Platform',
      items: [
        { path: '/addons', label: 'Add-ons', icon: <FaPlug /> },
        { path: '/images', label: 'Marketplace', icon: <FaChartLine /> },
      ],
    },
  ];

  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-logo">R</div>
        <div>
          <div className="brand-name">RSICLoud</div>
          <div className="brand-tag">OpenNebula Console</div>
        </div>
      </div>

      {navSections.map((section) => (
        <div key={section.label}>
          <div className="nav-section">{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}

      <div className="sidebar-bottom">
        <div className="nav-item">
          <span>{<FaCog />}</span>
          <span>Settings</span>
        </div>
        <div className="nav-item">
          <span>{<FaUserCircle />}</span>
          <span>{user?.username || 'Guest'}</span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
