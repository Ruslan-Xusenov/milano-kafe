import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, User, ShoppingBag } from 'lucide-react';

const TopCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopCustomers = async () => {
      try {
        const response = await fetch('/api/analytics/top-customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error('Error fetching top customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopCustomers();
    const interval = setInterval(fetchTopCustomers, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('uz-UZ');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
            <Trophy size={20} className="fill-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Top 5 Mijozlar (Keshbeksiz)</h2>
        </div>
        <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          <TrendingUp size={14} className="mr-1" />
          Umumiy Tushum
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
              <th className="font-semibold py-3 px-6">O'rin</th>
              <th className="font-semibold py-3 px-6">Mijoz</th>
              <th className="font-semibold py-3 px-6">Buyurtmalar</th>
              <th className="font-semibold py-3 px-6 text-right">Umumiy Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.map((customer, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6 text-center w-20">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm' :
                    index === 1 ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                    index === 2 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                    'bg-gray-50 text-gray-400 border border-gray-100'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {customer.customer_name ? customer.customer_name[0].toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{customer.customer_name || 'Noma\'lum'}</div>
                      <div className="text-xs text-gray-500 font-medium">{customer.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={16} className="text-gray-400" />
                    <span className="font-bold text-gray-700">{customer.order_count}</span>
                    <span className="text-xs text-gray-500">marta</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="font-bold text-emerald-600 text-lg">
                    {formatNumber(customer.total_spent)} <span className="text-sm font-semibold">so'm</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCustomers;
