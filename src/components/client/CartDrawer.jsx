import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Plus, Minus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formatNumber = (num) => Number(num || 0).toLocaleString('uz-UZ');

/**
 * CartDrawer — Desktop o'ng tomondagi savatcha panel
 */
const CartDrawer = ({ cartItems, updateQuantity, removeFromCart, getTotal }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = getTotal();

  return (
    <aside className="w-[360px] flex-shrink-0 bg-white border-l border-[#A79277]/20 hidden lg:flex flex-col z-30 relative">
      <div className="p-6 border-b border-[#A79277]/20 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#A79277]">{t('cart', 'Savat')}</h2>
          {totalItems > 0 && (
            <span className="bg-[#F7E998]/50 text-[#A79277]/70 text-[13px] font-bold px-2 py-1 rounded-[8px]">{totalItems} ta</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#FFF2E1]/50 p-4 custom-scrollbar">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-24 h-24 bg-[#F7E998]/50 rounded-full mb-4 flex justify-center items-center">
              <ShoppingCart size={32} className="text-[#A79277]/70" />
            </div>
            <h3 className="text-[15px] font-bold text-[#A79277] mb-1">{t('cart_empty', "Savatingiz bo'sh")}</h3>
            <p className="text-[13px] text-[#A79277]/70">{t('cart_empty_desc', "Premium taomlarimizdan tatib ko'rish uchun menyudan tanlang.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-[14px] border border-[#A79277]/20 flex gap-3 group">
                <div className="w-16 h-16 bg-[#FFF2E1] rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.emoji?.startsWith('http') ? (
                    <img src={item.emoji} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{item.emoji}</span>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-[14px] text-[#A79277] leading-tight">{item.name}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-[#A79277]/70 hover:text-[#FF4747] transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-bold text-[#FF4747] text-[15px]">
                      {formatNumber(item.price * item.quantity)} <span className="text-[11px] text-[#A79277]/70 font-medium">so'm</span>
                    </span>
                    <div className="flex items-center bg-[#FFF2E1] rounded-[8px] p-0.5 border border-[#A79277]/20">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-white text-[#A79277] transition-all">
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <span className="font-bold text-[13px] w-6 text-center text-[#A79277]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-white text-[#A79277] transition-all">
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer */}
      <div className="p-4 bg-white border-t border-[#A79277]/20 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-[#A79277]/70 text-[15px] font-medium">{t('total_amount', 'Jami:')}</span>
          <span className="text-xl font-extrabold text-[#FF4747]">{formatNumber(totalAmount)} so'm</span>
        </div>
        {cartItems.length === 0 ? (
          <button className="w-full bg-[#F7E998]/50 text-[#A79277]/70 font-bold py-3.5 rounded-[14px] cursor-not-allowed text-[15px]">
            {t('order_now', 'Buyurtma berish')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 text-white font-bold py-3.5 rounded-[14px] transition-colors flex justify-center items-center gap-2 text-[15px]"
          >
            {t('checkout', 'Buyurtma berish')} <ChevronRight size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default CartDrawer;
