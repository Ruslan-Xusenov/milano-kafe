import React, { useContext, useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, LogOut, ChevronDown, Play, Square } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ setIsSidebarOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (response.ok) {
          const data = await response.json();
          const newOrders = data.filter(order => order.status === 'new').length;
          setNewOrdersCount(newOrders);
        }
      } catch (e) { console.error(e); }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchSessionData();
    }
  }, [user]);

  const fetchSessionData = async () => {
    try {
      const [sessionRes, earnedRes] = await Promise.all([
        fetch(`/api/work-sessions/current/${user.id}`),
        fetch(`/api/work-sessions/earned/${user.id}`)
      ]);
      if (sessionRes.ok) setCurrentSession(await sessionRes.json());
      if (earnedRes.ok) {
        const data = await earnedRes.json();
        setTotalEarned(data.total_earned || 0);
      }
    } catch (e) { console.error(e); }
  };

  const handleStartWork = async () => {
    try {
      await fetch('/api/work-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: user.id })
      });
      fetchSessionData();
    } catch (e) { console.error(e); }
  };

  const handleEndWork = async () => {
    if (!currentSession) return;
    try {
      await fetch('/api/work-sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSession.id, staff_id: user.id })
      });
      setCurrentSession(null);
      fetchSessionData();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="relative hidden sm:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Qidiruv..." 
              className="pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none w-64 text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-6 relative">
          <Link to="/admin" className="relative text-gray-500 hover:text-amber-500 transition-colors">
            <Bell className="w-6 h-6" />
            {newOrdersCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
                {newOrdersCount}
              </span>
            )}
          </Link>

          {user && (
            <div className="hidden sm:flex items-center">
              {currentSession ? (
                <button 
                  onClick={handleEndWork}
                  className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
                >
                  <Square className="w-4 h-4" /> Ishni tugatish
                </button>
              ) : (
                <button 
                  onClick={handleStartWork}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200"
                >
                  <Play className="w-4 h-4" /> Ishni boshlash
                </button>
              )}
            </div>
          )}
          
          <div className="relative pl-6 border-l border-gray-200" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)} 
              className="flex items-center gap-3 hover:bg-gray-50 p-1 rounded-lg transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{user?.name || 'Foydalanuvchi'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'Xodim'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-700 font-bold overflow-hidden">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>

                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  {currentSession ? (
                    <button onClick={handleEndWork} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Square className="w-4 h-4" /> Ishni tugatish
                    </button>
                  ) : (
                    <button onClick={handleStartWork} className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Play className="w-4 h-4" /> Ishni boshlash
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Soatbay ish haqi:</span>
                    <span className="text-xs font-semibold text-gray-700">{user?.salary ? Number(user.salary).toLocaleString() : 0} so'm</span>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Bu oylik ishlagan pulingiz:</p>
                    <p className="text-lg font-bold text-gray-900">{totalEarned.toLocaleString()} UZS</p>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Tizimdan chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
