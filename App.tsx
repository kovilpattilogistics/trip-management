import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initStorage, loginUser, getSession, logoutUser } from './services/storageService';
import { User, UserRole, Notification } from './types';
import { Layout } from './components/Layout';
import { AdminDashboard } from './pages/AdminDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { Truck, Leaf, Lock, Mail } from 'lucide-react';

// Initialize data
initStorage();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loginForm, setLoginForm] = useState({ id: '', pass: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
    setLoading(false);

    // Request Notification Permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUser(loginForm.id, loginForm.pass);
    if (u) {
      setUser(u);
      addNotification(`Welcome back, ${u.name}!`, 'success');
      setLoginForm({ id: '', pass: '' }); // Clear form
    } else {
      addNotification('Invalid credentials', 'error');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    addNotification('Logged out successfully', 'success');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface text-primary"><Truck className="animate-bounce mr-2"/> Loading...</div>;

  return (
    <Router>
      <Layout user={user} notifications={notifications} clearNotification={clearNotification} onLogout={handleLogout}>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : (
              <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6 animate-fade-in">
                <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-soft border border-green-50">
                  {/* Logo Area */}
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-3">
                       <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                         <Truck className="h-8 w-8 text-secondary" strokeWidth={1.5} />
                       </div>
                       <Leaf className="h-8 w-8 text-primary absolute -top-1 -right-2 fill-primary drop-shadow-sm" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">EcoExpress</h1>
                    <p className="text-sm text-gray-500 uppercase tracking-widest">Logistics</p>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-800 font-medium transition-all"
                        placeholder="Email or Phone"
                        value={loginForm.id}
                        onChange={e => setLoginForm({...loginForm, id: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                      <input 
                        type="password" 
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-800 font-medium transition-all"
                        placeholder="Password"
                        value={loginForm.pass}
                        onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="w-full py-4 bg-primary text-white font-bold text-lg rounded-xl hover:bg-primaryDark transition-all shadow-lg shadow-green-200 active:scale-98">
                      Login
                    </button>
                  </form>
                </div>
              </div>
            )
          } />

          <Route path="/" element={
            !user ? <Navigate to="/login" /> : (
              user.role === UserRole.ADMIN 
                ? <AdminDashboard user={user} onNotify={addNotification} />
                : <DriverDashboard user={user} onNotify={addNotification} />
            )
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;