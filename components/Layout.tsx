import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Bell, Truck, Leaf } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  notifications: any[];
  clearNotification: (id: string) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, notifications, clearNotification, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-clear notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotification(notifications[0].id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notifications, clearNotification]);

  const isAuthPage = location.pathname === '/login';

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* EcoExpress Logo Composition */}
          <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative mr-2">
               <Truck className="h-7 w-7 text-secondary" strokeWidth={1.5} />
               <Leaf className="h-5 w-5 text-primary absolute -top-2 -right-1 drop-shadow-sm fill-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg tracking-tight text-secondary group-hover:text-primary transition-colors">
                Eco<span className="text-primary">Express</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Logistics</span>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-sm font-bold text-gray-700 leading-none">{user.name}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">{user.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-all active:scale-95"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Notifications Toast */}
      <div className="fixed top-20 left-4 right-4 z-50 pointer-events-none flex flex-col items-center space-y-2">
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`pointer-events-auto w-full max-w-sm shadow-soft rounded-xl p-4 flex items-start animate-fade-in-down transform transition-all ${
              n.type === 'error' ? 'bg-white text-red-600 border-l-4 border-red-500' :
              n.type === 'success' ? 'bg-white text-primary border-l-4 border-primary' :
              'bg-white text-gray-700 border-l-4 border-blue-400'
            }`}
          >
            <Bell className={`h-5 w-5 mr-3 flex-shrink-0 ${n.type === 'success' ? 'fill-primary text-primary' : ''}`} />
            <p className="text-sm font-semibold">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 pb-24">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-green-50 py-6 text-center text-xs text-gray-400">
        <div className="flex justify-center items-center gap-1 mb-1">
          <Leaf className="w-3 h-3 text-primary" />
          <span>Sustainable Delivery Solutions</span>
        </div>
        &copy; {new Date().getFullYear()} EcoExpress Logistics
      </footer>
    </div>
  );
};