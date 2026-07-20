import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Flame, Tag, XCircle } from 'lucide-react';

const QuickAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (error) {
        console.error('Error fetching orders for analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 1000); // Poll every 2s to keep it live
    return () => clearInterval(interval);
  }, []);

  // Bugungi sanani olish
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validStatuses = ['preparing', 'delivering', 'completed'];

  // Bugungi buyurtmalarni filtrlash
  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= today && validStatuses.includes(order.status);
  });

  // Kunlik tushum
  const dailyRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  
  // O'tgan kunga nisbatan tushum trendini hisoblash uchun kechagi kun (soddalashtirilgan)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= yesterday && orderDate < today && validStatuses.includes(order.status);
  });
  const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.total, 0);
  
  let revenueTrend = '+0%';
  let isRevenuePositive = true;
  if (yesterdayRevenue > 0) {
    const diff = ((dailyRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    revenueTrend = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    isRevenuePositive = diff >= 0;
  } else if (dailyRevenue > 0) {
    revenueTrend = '+100%';
  }

  // Top taom
  const itemCounts = {};
  todayOrders.forEach(order => {
    order.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  
  let topItemName = "Hali yo'q";
  let topItemCount = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > topItemCount) {
      topItemCount = count;
      topItemName = name;
    }
  });
  // Bekor qilinganlar
  const cancelledOrders = orders.filter(order => order.status === 'rejected');
  const cancelledToday = cancelledOrders.filter(order => new Date(order.created_at) >= today).length;

  const stats = [
    { 
      title: "Kunlik Tushum", 
      value: isLoading ? "..." : `${dailyRevenue.toLocaleString()} so'm`, 
      trend: isLoading ? "..." : revenueTrend, 
      isPositive: isRevenuePositive,
      icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
      bg: "bg-emerald-50"
    },
    { 
      title: "Buyurtmalar", 
      value: isLoading ? "..." : `${todayOrders.length}`, 
      trend: isLoading ? "..." : "bugun", 
      isPositive: true,
      icon: <ShoppingBag className="w-6 h-6 text-amber-500" />,
      bg: "bg-amber-50"
    },
    { 
      title: "Top Taom", 
      value: isLoading ? "..." : topItemName, 
      trend: isLoading ? "..." : `${topItemCount} ta sotildi`, 
      isPositive: true,
      icon: <Flame className="w-6 h-6 text-red-500" />,
      bg: "bg-red-50"
    },
    { 
      title: "Bekor qilingan", 
      value: isLoading ? "..." : `${cancelledOrders.length}`, 
      trend: isLoading ? "..." : `${cancelledToday} ta bugun`, 
      isPositive: false,
      icon: <XCircle className="w-6 h-6 text-red-500" />,
      bg: "bg-red-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
            <div className={`${stat.bg} p-2 rounded-lg`}>
              {stat.icon}
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className={`font-medium ${stat.isPositive ? 'text-emerald-500' : 'text-gray-500'}`}>
              {stat.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickAnalytics;
