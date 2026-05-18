import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VMDetails from './components/VMDetails';
import CreateVM from './components/CreateVM';
import Images from './components/Images';
import Docker from './components/Docker';
import Kubernetes from './components/Kubernetes';
import Addons from './components/Addons';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
        {isAuthenticated ? (
          <div className="shell">
            <Sidebar />
            <div className="main">
              <Navbar theme={theme} onToggleTheme={toggleTheme} />
              <div className="content">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/vm/:id" element={<ProtectedRoute><VMDetails /></ProtectedRoute>} />
                  <Route path="/create-vm" element={<ProtectedRoute><CreateVM /></ProtectedRoute>} />
                  <Route path="/images" element={<ProtectedRoute><Images /></ProtectedRoute>} />
                  <Route path="/docker" element={<ProtectedRoute><Docker /></ProtectedRoute>} />
                  <Route path="/kubernetes" element={<ProtectedRoute><Kubernetes /></ProtectedRoute>} />
                  <Route path="/addons" element={<ProtectedRoute><Addons /></ProtectedRoute>} />
                </Routes>
              </div>
            </div>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
