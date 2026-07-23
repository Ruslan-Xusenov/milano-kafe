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

  useEffect(() => {
    if (user.isLoggedIn && user.phone) {
      setPhone(user.phone);
    }
  }, [user]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = getTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    
    if (name.trim().length < 3) {
      setError(t('error_name', 'Iltimos, ismingizni kiriting'));
      return;
    }
    
    if (phone.length < 9) {
      setError(t('error_phone', 'To\'g\'ri telefon raqamini kiriting'));
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
          customer_name: name,
          phone: phone,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total: totalAmount,
          address: address || 'Kiritilmagan',
          user_id: user?.isLoggedIn ? user?.id : null
        })
      });

      if (!response.ok) {
        throw new Error(t('error_server', 'Server xatosi, qaytadan urinib ko\'ring'));
      }

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
      setTimeout(() => {
        navigate('/');
      }, 4000);

    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FFF2E1] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl shadow-[#A79277]/20 border border-[#A79277]/20 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-[#F7E998] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-[#FF4747]" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#A79277] mb-3">{t('order_received', 'Buyurtma Qabul Qilindi!')}</h2>
          <p className="text-[#A79277]/80 mb-8 text-lg leading-relaxed">{t('order_thanks', 'Rahmat! Buyurtmangiz oshxonaga yuborildi. Tez orada siz bilan bog\'lanamiz.')}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 text-[#FFF2E1] font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-[#FF4747]/20 active:scale-[0.98] text-lg"
          >
            {t('back_to_home', 'Bosh sahifaga qaytish')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF2E1] font-sans">
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 px-4 py-4 flex items-center border-b border-[#A79277]/20">
        <button onClick={() => navigate('/')} className="mr-4 p-2.5 bg-[#F7E998]/50 rounded-full hover:bg-[#F7E998] transition-colors text-[#A79277]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-extrabold text-[#A79277]">{t('checkout_title', 'Buyurtmani Rasmiylashtirish')}</h1>
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-8 pb-32">
        {cartItems.length === 0 ? (
          <div className="text-center py-32 max-w-md mx-auto">
            <div className="bg-[#F7E998] w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <ShoppingCart size={48} className="text-[#FF4747]" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#A79277] mb-3">{t('cart_empty', 'Savatingiz bo\'sh')}</h2>
            <p className="text-[#A79277]/80 mb-8 text-lg">{t('cart_empty_desc', 'Premium menyumizdan o\'zingizga yoqqan taomlarni tanlang va buyurtma bering.')}</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-[#FF4747] text-[#FFF2E1] px-8 py-4 rounded-2xl font-bold hover:bg-[#FF4747]/90 transition-colors shadow-lg shadow-[#FF4747]/20 text-lg w-full"
            >
              {t('back_to_menu', 'Menyuga qaytish')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Ma'lumotlaringiz (Chap tomon) */}
            <div className="lg:col-span-7">
              <h3 className="text-2xl font-extrabold text-[#A79277] mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF4747] text-[#FFF2E1] flex items-center justify-center text-sm">1</span>
                {t('your_info', 'Ma\'lumotlaringiz')}
              </h3>
              <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-[#A79277]/10 border border-[#A79277]/20">
                {error && (
                  <div className="mb-6 bg-[#FF4747]/10 text-[#FF4747] p-4 rounded-xl text-sm border border-[#FF4747]/20 flex items-start gap-3">
                    <Info size={20} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="mb-6 relative">
                  <label className="block text-sm font-bold text-[#A79277] mb-2">{t('your_name', 'Ismingiz')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A79277]/50" size={20} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('name_placeholder', 'Masalan: Alisher')}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-[#A79277]/20 focus:border-[#FF4747] focus:ring-4 focus:ring-[#FF4747]/10 outline-none transition-all bg-[#FFF2E1]/30 focus:bg-white text-lg font-medium text-[#A79277]"
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-6 relative">
                  <label className="block text-sm font-bold text-[#A79277] mb-2">{t('your_phone', 'Telefon raqamingiz')}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A79277]/50" size={20} />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-[#A79277]/20 focus:border-[#FF4747] focus:ring-4 focus:ring-[#FF4747]/10 outline-none transition-all bg-[#FFF2E1]/30 focus:bg-white text-lg font-medium text-[#A79277]"
                      required
                    />
                  </div>
                </div>

                <div className="mb-8 relative">
                  <label className="block text-sm font-bold text-[#A79277] mb-2">{t('delivery_address', 'Yetkazib berish manzili')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF4747]" size={20} />
                    <div className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-[#F7E998] bg-[#F7E998]/20 text-lg font-medium text-[#A79277]">
                      {address || t('address_not_found', 'Manzil aniqlanmagan')}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full font-bold py-4 md:py-5 rounded-2xl text-[#FFF2E1] transition-all shadow-lg text-lg flex items-center justify-center gap-2 ${isSubmitting ? 'bg-[#A79277] cursor-not-allowed' : 'bg-[#FF4747] hover:bg-[#FF4747]/90 shadow-[#FF4747]/20 active:scale-[0.98]'}`}
                >
                  {isSubmitting ? t('sending', 'Yuborilmoqda...') : (
                    <>
                      {t('confirm', 'Tasdiqlash')} <Check size={24} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Buyurtma Xulosasi (O'ng tomon) */}
            <div className="lg:col-span-5">
              <div className="sticky top-28">
                <h3 className="text-2xl font-extrabold text-[#A79277] mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#FF4747] text-[#FFF2E1] flex items-center justify-center text-sm">2</span>
                  {t('summary', 'Xulosa')}
                </h3>
                
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-[#A79277]/10 border border-[#A79277]/20">
                  <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className={`w-16 h-16 bg-[#F7E998] rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-[#A79277]/10 relative overflow-hidden`}>
                          {item.emoji?.startsWith('http') ? (
                            <img src={item.emoji} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            item.emoji
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#A79277] leading-tight mb-1">{item.name}</h4>
                          <div className="text-[#A79277]/70 text-sm font-medium">{item.price.toLocaleString()} so'm x {item.quantity}</div>
                        </div>
                        <div className="font-extrabold text-[#FF4747]">
                          {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-[#A79277]/20 pt-6">
                    <div className="flex justify-between items-center mb-4 text-[#A79277]/80">
                      <span className="font-medium text-lg">{t('products', 'Mahsulotlar:')}</span>
                      <span className="font-bold text-lg text-[#A79277]">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('pieces', 'ta')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#F7E998]/40 p-4 rounded-2xl border border-[#F7E998]">
                      <span className="text-[#A79277] font-bold text-lg">{t('total_amount', 'Jami summa:')}</span>
                      <span className="text-3xl font-extrabold text-[#FF4747]">{totalAmount.toLocaleString()} <span className="text-lg text-[#A79277] font-medium">so'm</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default Checkout;
