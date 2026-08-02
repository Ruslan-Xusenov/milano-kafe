import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, apiFetch } from '../context/AuthContext';
import OrderCard from './OrderCard';

const KanbanBoard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState({
    new: [],
    preparing: [],
    delivering: [],
    completed: [],
    rejected: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const prevOrderIdsRef = useRef(new Set());

  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/api/orders');
      if (response.status === 401 || response.status === 403) {
        setFetchError('Sessiya muddati tugadi. Iltimos qayta kiring.');
        setIsLoading(false);
        return;
      }
      if (!response.ok) throw new Error(`Server xatosi: ${response.status}`);
      const data = await response.json();
      setFetchError('');
      
      // Yangi buyurtmalar kelganini tekshirish va ovoz chiqarish
      const currentOrderIds = new Set(data.map(o => o.id));
      if (prevOrderIdsRef.current.size > 0) { // Dastlabki yuklanishda ovoz chiqarmaslik
        const hasNewOrder = data.some(o => !prevOrderIdsRef.current.has(o.id) && o.status === 'new');
        if (hasNewOrder) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.loop = true;
          audio.play().catch(e => console.log("Ovoz chiqarishda xatolik (brauzer ruxsat so'rashi mumkin):", e));
          
          // 3 soniyadan keyin ovozni to'xtatish
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, 3000);
        }
      }
      prevOrderIdsRef.current = currentOrderIds;
      
      const categorized = {
        new: data.filter(o => o.status === 'new'),
        preparing: data.filter(o => o.status === 'preparing'),
        delivering: data.filter(o => o.status === 'delivering'),
        completed: data.filter(o => o.status === 'completed'),
        rejected: data.filter(o => o.status === 'rejected')
      };
      setOrders(categorized);
    } catch (err) {
      console.error(err);
      setFetchError(err.message || 'Buyurtmalarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 2 seconds for real-time feel
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await apiFetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.status === 401 || response.status === 403) {
        alert('Sessiya muddati tugadi. Sahifa yangilanadi...');
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(`Xatolik: ${errData.error || 'Status yangilashda muammo yuz berdi'}`);
        return;
      }
      // Update local state immediately
      fetchOrders();
    } catch (error) {
      console.error("Status update error", error);
      alert('Server bilan aloqa yo\'q. Internet ulanishingizni tekshiring.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium">Buyurtmalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-sm">
          <p className="text-red-600 font-bold mb-3">⚠️ {fetchError}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Qayta kirish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-10">
      {/* Yangi Ustuni */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-280px)]">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center border-b border-gray-100 pb-3">
          Yangi 
          <span className="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm shadow-inner">
            {orders.new.length}
          </span>
        </h2>
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300">
          {orders.new.map(order => (
            <OrderCard key={order.id} order={order} userRole={user?.role} onStatusChange={handleStatusChange} nextStatus="preparing" nextText="Tasdiqlash" />
          ))}
        </div>
      </div>
      
      {/* Tayyorlanmoqda Ustuni */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-280px)]">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center border-b border-gray-100 pb-3">
          Tayyorlanmoqda
          <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm shadow-inner">
            {orders.preparing.length}
          </span>
        </h2>
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300">
          {orders.preparing.map(order => (
            <OrderCard key={order.id} order={order} userRole={user?.role} onStatusChange={handleStatusChange} nextStatus="delivering" nextText="Yo'lga chiqarish" />
          ))}
        </div>
      </div>

      {/* Yo'lda Ustuni */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-280px)]">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center border-b border-gray-100 pb-3">
          Yo'lda
          <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-sm shadow-inner">
            {orders.delivering.length}
          </span>
        </h2>
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300">
          {orders.delivering.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>Buyurtmalar yo'q</p>
            </div>
          )}
          {orders.delivering.map(order => (
            <OrderCard key={order.id} order={order} userRole={user?.role} onStatusChange={handleStatusChange} nextStatus="completed" nextText="Yakunlash" />
          ))}
        </div>
      </div>

      {/* Yakunlandi Ustuni */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-280px)]">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center border-b border-gray-100 pb-3">
          Yakunlandi
          <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm shadow-inner">
            {orders.completed.length}
          </span>
        </h2>
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300">
          {orders.completed.map(order => (
            <OrderCard key={order.id} order={order} userRole={user?.role} isCompleted={true} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
