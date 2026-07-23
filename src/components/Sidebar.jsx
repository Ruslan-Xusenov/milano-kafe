import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Utensils, BarChart3, Users, Tags, LogOut, Package, Image as ImageIcon, X, MessageSquare, Settings } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      {/* OVERLAY FOR MOBILE */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`w-64 bg-gray-900 text-white flex flex-col shadow-xl fixed md:relative z-50 h-full transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-gray-900" />
            </div>
            <span className="text-xl font-bold tracking-wider">CafeBot</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/admin" end className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <LayoutDashboard className="w-5 h-5" />
          {t('dashboard') || 'Dashboard'}
        </NavLink>
        {user?.role === 'Admin' && (
          <>
            <NavLink to="/admin/menu" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Utensils className="w-5 h-5" />
              {t('menu') || 'Menyu'}
            </NavLink>
            <NavLink to="/admin/categories" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Tags className="w-5 h-5" />
              {t('catalog') || 'Katalog'}
            </NavLink>
            <NavLink to="/admin/banners" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <ImageIcon className="w-5 h-5" />
              {t('banners') || 'Bannerlar'}
            </NavLink>
            <NavLink to="/admin/inventory" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Package className="w-5 h-5" />
              {t('inventory') || 'Ombor'}
            </NavLink>
          </>
        )}
        {(user?.role === 'Admin' || user?.role === 'Kassir') && (
          <NavLink to="/admin/reports" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <BarChart3 className="w-5 h-5" />
            {t('reports') || 'Hisobotlar'}
          </NavLink>
        )}
        {user?.role === 'Admin' && (
          <>
            <NavLink to="/admin/staff" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Users className="w-5 h-5" />
              {t('staff_menu') || 'Hodimlar'}
            </NavLink>
            <NavLink to="/admin/reviews" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <MessageSquare className="w-5 h-5" />
              {t('reviews') || 'Mijozlar Fikri'}
            </NavLink>
            <NavLink to="/admin/settings" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-500 text-gray-900 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Settings className="w-5 h-5" />
              {t('settings') || 'Sozlamalar'}
            </NavLink>
          </>
        )}
      </nav>
    </aside>
    </>
  );
};

export default Sidebar;
