import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, DollarSign, Download } from 'lucide-react';

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) setOrders(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, []);

  if (loading) return <div>Yuklanmoqda...</div>;

  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = completedOrders.length;
  
  // Calculate top items
  const itemCounts = {};
  completedOrders.forEach(order => {
    let items = [];
    try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch(e) {}
    items.forEach(item => {
      if (!itemCounts[item.name]) itemCounts[item.name] = { count: 0, revenue: 0 };
      itemCounts[item.name].count += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Sotuvlar Hisoboti</h1>
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
          <Download className="w-5 h-5" /> Excel ga yuklash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Jami Tushum</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalRevenue.toLocaleString()} UZS</h3>
            <p className="text-sm text-green-500 flex items-center mt-2 font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> Umuman
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Jami Buyurtmalar</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalOrders} ta</h3>
            <p className="text-sm text-gray-400 mt-2">Tasdiqlangan va yakunlangan</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">O'rtacha chek</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0} UZS
            </h3>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Eng ko'p sotilgan taomlar (TOP 5)</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Taom nomi</th>
              <th className="p-4 font-medium">Sotilgan soni</th>
              <th className="p-4 font-medium">Keltirgan daromad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topItems.map(([name, data]) => (
              <tr key={name} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{name}</td>
                <td className="p-4 text-gray-600">{data.count} ta</td>
                <td className="p-4 text-gray-900 font-semibold">{data.revenue.toLocaleString()} UZS</td>
              </tr>
            ))}
            {topItems.length === 0 && (
              <tr><td colSpan="3" className="p-4 text-center text-gray-500">Hali sotuvlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
