import { motion } from 'framer-motion';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 shadow-md"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">RSICLoud Console</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">Control center</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 transition duration-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300">Welcome, {user?.username}</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition duration-300"
            >
              Logout
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;