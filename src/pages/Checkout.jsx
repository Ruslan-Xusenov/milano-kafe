import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, CheckCircle, ShoppingCart, MapPin, Phone, User, Check, Info } from 'lucide-react';
import { CartContext } from '../context/CartContext';
import { useTranslation } from 'react-i18next';

const Checkout = () => {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart, user, updateUser, address } = useContext(CartContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(user.phone || '+998');
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('naqd'); // 'naqd' | 'click'
  const [orderAddress, setOrderAddress] = useState(address || '');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (user.isLoggedIn && user.phone) {
      setPhone(user.phone);
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');

  const totalAmount = getTotal();

  // Simple phone validation
  const isValidPhone = phone.replace(/[^0-9]/g, '').length >= 12; // e.g. 998901234567

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    
    if (deliveryType === 'delivery' && orderAddress.trim().length < 3) {
      setError("Iltimos, yetkazish manzilini to'liq kiriting");
      return;
    }
    
    if (!isValidPhone) {
      setError("Telefon raqam noto'g'ri");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: name || 'Mijoz', // Make name optional if we want it like Milano, but keep it for now
          phone: phone,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total: totalAmount,
          address: deliveryType === 'delivery' ? orderAddress : 'Olib ketish',
          user_id: user?.isLoggedIn ? user?.id : null,
          payment_method: paymentMethod,
          comment: comment
        })
      });

      if (!response.ok) {
        throw new Error("Server xatosi, qaytadan urinib ko'ring");
      }

      const resData = await response.json();
      setOrderId(resData.id || Math.floor(Math.random() * 1000000).toString(16).toUpperCase());

      // Refresh user balance if logged in
      if (user?.isLoggedIn && user?.id) {
        fetch('/api/auth/client/me/' + user.id)
          .then(res => res.json())
          .then(data => {
            if (data && updateUser) {
              updateUser(data);
            }
          })
          .catch(err => console.error(err));
      }

      setIsSuccess(true);
      clearCart();

    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FFF2E1] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[#A79277] mb-6">Buyurtma qabul qilindi!</h2>
          
          <div className="bg-white rounded-2xl p-6 border border-[#A79277]/20 mb-8 shadow-sm">
            <p className="text-[#A79277]/70 mb-2">Sizning buyurtmangiz raqami</p>
            <div className="text-[#FF4747] text-3xl font-extrabold tracking-wider">#{orderId}</div>
          </div>

          <button 
            onClick={() => navigate('/')}
            className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 text-white font-bold py-4 px-4 rounded-[14px] transition-colors text-[15px]"
          >
            ← Bosh sahifa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF2E1] font-sans pb-32">
      <header className="bg-white sticky top-0 z-10 px-4 py-4 flex items-center border-b border-[#A79277]/20 shadow-sm">
        <button onClick={() => navigate('/')} className="mr-4 p-2 text-[#A79277] hover:bg-[#F7E998]/50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-[#A79277]">Buyurtmani rasmiylashtirish</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 lg:py-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#A79277] mb-2">Savatingiz bo'sh</h2>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 bg-[#FF4747] text-white px-8 py-3 rounded-[14px] font-bold hover:bg-[#FF4747]/90 transition-colors"
            >
              Menyuga qaytish
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Buyurtma tarkibi */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#A79277]/20">
              <h3 className="font-bold text-[#A79277] mb-4 text-lg">Buyurtma tarkibi</h3>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center pb-4 border-b border-[#A79277]/20 last:border-0 last:pb-0">
                    <div className="flex-1 pr-4">
                      <div className="font-medium text-[#A79277]">{item.name}</div>
                      <div className="text-[#A79277]/70 text-sm mt-1">{item.quantity} x {item.price.toLocaleString()} so'm</div>
                    </div>
                    <div className="font-bold text-[#A79277]">
                      {(item.price * item.quantity).toLocaleString()} so'm
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#A79277]/20">
                <span className="font-medium text-[#A79277]/70">Jami:</span>
                <span className="font-bold text-lg text-[#A79277]">{totalAmount.toLocaleString()} so'm</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#A79277]/20 space-y-5">
              
              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-[#A79277] mb-2">Telefon raqami <span className="text-[#FF4747]">*</span></label>
                <div className="relative">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 000 00 00"
                    className={`w-full p-4 rounded-xl border outline-none transition-colors ${
                      phone.length > 4 && !isValidPhone 
                        ? 'border-[#FF4747] focus:border-[#FF4747] text-[#A79277] bg-white' 
                        : isValidPhone 
                          ? 'border-[#FF4747] focus:border-[#FF4747] text-[#A79277] bg-white' 
                          : 'border-[#A79277]/20 focus:border-[#FF4747] text-[#A79277] bg-[#FFF2E1] focus:bg-white'
                    }`}
                    required
                  />
                  {isValidPhone && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FF4747]">
                      <Check size={20} />
                    </div>
                  )}
                </div>
                {phone.length > 4 && !isValidPhone && (
                  <p className="text-[#FF4747] text-[11px] mt-1.5">Telefon raqam noto'g'ri</p>
                )}
                {isValidPhone && (
                  <p className="text-[#FF4747] text-[11px] mt-1.5">{phone.replace(/[^0-9]/g, '')}</p>
                )}
              </div>

              {/* Buyurtma turi */}
              <div>
                <label className="block text-sm font-medium text-[#A79277] mb-2">Buyurtma turi</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-medium border transition-all ${
                      deliveryType === 'pickup' 
                        ? 'bg-[#F7E998]/50 border-[#FF4747] text-[#FF4747]' 
                        : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                    }`}
                  >
                    O'zi olib ketish
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-medium border transition-all ${
                      deliveryType === 'delivery' 
                        ? 'bg-[#F7E998]/50 border-[#FF4747] text-[#FF4747]' 
                        : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                    }`}
                  >
                    Yetkazish
                  </button>
                </div>
              </div>

              {/* Yetkazish manzili */}
              {deliveryType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-[#A79277] mb-2">Yetkazish manzili <span className="text-[#FF4747]">*</span></label>
                  <textarea 
                    value={orderAddress}
                    onChange={(e) => setOrderAddress(e.target.value)}
                    placeholder="Ko'cha, uy, xonadon raqami..."
                    rows={3}
                    className="w-full p-4 rounded-xl border border-[#A79277]/20 focus:border-[#FF4747] outline-none transition-colors bg-[#FFF2E1] focus:bg-white text-[#A79277] resize-none"
                    required
                  />
                </div>
              )}

              {/* To'lov usuli */}
              <div>
                <label className="block text-sm font-medium text-[#A79277] mb-2">To'lov usuli</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('naqd')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-medium border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'naqd' 
                        ? 'bg-[#F7E998]/50 border-[#FF4747] text-[#FF4747]' 
                        : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                    }`}
                  >
                    💵 Naqd pul {paymentMethod === 'naqd' && <Check size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('click')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-medium border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'click' 
                        ? 'bg-[#F7E998]/50 border-[#FF4747] text-[#FF4747]' 
                        : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                    }`}
                  >
                    📱 Click {paymentMethod === 'click' && <Check size={16} />}
                  </button>
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-[#A79277] mb-2">Izoh</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  rows={2}
                  className="w-full p-4 rounded-xl border border-[#A79277]/20 focus:border-[#FF4747] outline-none transition-colors bg-[#FFF2E1] focus:bg-white text-[#A79277] resize-none"
                />
              </div>

            </div>

            {error && (
              <div className="bg-[#FF4747]/10 text-[#FF4747] p-4 rounded-xl text-sm text-center font-medium">
                {error}
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#A79277]/20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="flex-col hidden sm:flex">
                  <span className="text-[#A79277]/70 text-xs font-medium">Buyurtma summasi</span>
                  <span className="font-extrabold text-[#A79277] text-xl">{totalAmount.toLocaleString()} so'm</span>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || (deliveryType === 'delivery' && orderAddress.trim().length < 3) || !isValidPhone}
                  className="flex-1 bg-[#FF4747] hover:bg-[#FF4747]/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-[14px] px-6 rounded-[14px] transition-colors text-[15px] shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Yuborilmoqda...' : 'Buyurtma berish →'}
                </button>
              </div>
            </div>

          </form>
        )}
      </main>
    </div>
  );
};

export default Checkout;
