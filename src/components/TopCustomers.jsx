import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, User, ShoppingBag, Gift, X, Check } from 'lucide-react';

const TopCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Gift Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [giftItem, setGiftItem] = useState('');
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [giftMessage, setGiftMessage] = useState("Milano Kafe tomonidan sizga bepul ovqat jo'natildi! Yoqimli ishtaha!");
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

    const fetchMenu = async () => {
      try {
        const response = await fetch('/api/menu');
        if (response.ok) {
          const data = await response.json();
          setMenuItems(data);
          if (data.length > 0) setGiftItem(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
      }
    };

    fetchTopCustomers();
    fetchMenu();
    const interval = setInterval(fetchTopCustomers, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('uz-UZ');
  };

  const openGiftModal = (customer) => {
    setSelectedCustomer(customer);
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSendGift = async () => {
    if (!selectedCustomer || !giftItem) return;
    setIsSending(true);
    
    const itemDetails = menuItems.find(i => i.id.toString() === giftItem.toString());
    const orderItems = [{
      id: itemDetails.id,
      name: itemDetails.name,
      price: itemDetails.price,
      quantity: parseInt(giftQuantity),
      emoji: itemDetails.emoji
    }];

    try {
      const response = await fetch('/api/orders/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedCustomer.user_id,
          customer_name: selectedCustomer.customer_name,
          phone: selectedCustomer.phone,
          items: orderItems,
          message_text: giftMessage,
          telegram_id: selectedCustomer.telegram_id,
          push_token: selectedCustomer.push_token
        })
      });

      if (response.ok) {
        setSuccessMsg("Sovg'a yuborildi va buyurtma rasmiylashtirildi!");
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg('');
        }, 2000);
      } else {
        alert("Xatolik yuz berdi!");
      }
    } catch (error) {
      console.error(error);
      alert("Xatolik yuz berdi!");
    } finally {
      setIsSending(false);
    }
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
    <>
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
                <th className="font-semibold py-3 px-6 text-center">Harakatlar</th>
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
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => openGiftModal(customer)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-sm font-semibold transition-colors border border-rose-100 shadow-sm"
                    >
                      <Gift size={16} /> Sovg'a yuborish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <Gift className="text-rose-500" /> Bepul Buyurtma
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {successMsg ? (
              <div className="py-8 flex flex-col items-center justify-center text-emerald-600">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <Check size={32} />
                </div>
                <p className="text-lg font-bold">{successMsg}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Mijoz:</p>
                  <p className="font-bold text-gray-800">{selectedCustomer.customer_name} ({selectedCustomer.phone})</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sovg'a qilinadigan taom</label>
                  <select 
                    value={giftItem}
                    onChange={(e) => setGiftItem(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.price.toLocaleString()} so'm)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soni</label>
                  <input 
                    type="number" 
                    min="1"
                    value={giftQuantity}
                    onChange={(e) => setGiftQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xabar matni (Push / Telegram)</label>
                  <textarea 
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSendGift}
                    disabled={isSending}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition-colors shadow-md shadow-rose-500/20"
                  >
                    {isSending ? 'Yuborilmoqda...' : <><Gift size={20} /> Sovg'ani rasmiylashtirish va Yuborish</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TopCustomers;
