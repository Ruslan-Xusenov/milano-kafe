import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Save, Edit3, Star, LogOut, MapPin, Phone, Info, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../context/AuthContext';

const formatNumber = (num) => Number(num || 0).toLocaleString('uz-UZ');

/**
 * UserProfileModal — Foydalanuvchi profil modali
 * Ma'lumotlar tahrirlash + buyurtmalar tarixi + keshbek
 */
const UserProfileModal = ({
  user,
  logout,
  address,
  updateAddress,
  updateUser,
  isOpen,
  onClose,
  handleGetLocation,
  isLocating,
}) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = React.useState('profil');
  const [userOrders, setUserOrders] = React.useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({ name: '', phone: '', email: '' });
  const [saveSuccess, setSaveSuccess] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [ratingOrder, setRatingOrder] = React.useState(null);
  const [ratingScore, setRatingScore] = React.useState(5);
  const [ratingComment, setRatingComment] = React.useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user?.isLoggedIn) {
      setFormData({ name: user.name || '', phone: user.phone || '+998', email: user.email || '' });
      fetchOrders();
    }
  }, [user?.id, user?.isLoggedIn]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setIsLoadingOrders(true);
    try {
      const res = await apiFetch(`/api/orders/user/${user.id}`);
      if (res.ok) setUserOrders(await res.json());
    } catch (e) {
      console.error('Buyurtmalarni yuklashda xatolik:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/auth/client/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...formData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
      updateUser(data);
      setIsEditing(false);
      setSaveSuccess("Ma'lumotlar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const submitRating = async () => {
    if (!ratingOrder || ratingScore === 0) return;
    setIsRatingSubmitting(true);
    try {
      const res = await apiFetch(`/api/orders/${ratingOrder.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingScore, comment: ratingComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Baholashda xatolik');
      setRatingOrder(null);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': return { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Yangi' };
      case 'preparing': return { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Tayyorlanmoqda' };
      case 'delivering': return { bg: 'bg-pink-100 text-pink-800 border-pink-200', label: 'Yetkazilmoqda' };
      case 'completed': return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Bajarildi' };
      default: return { bg: 'bg-[#F7E998]/50 text-[#A79277] border-[#A79277]/20', label: "Noma'lum" };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-[#1f2937]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#ffffff] rounded-[2rem] w-full max-w-lg max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden border border-[#1f2937]/20" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#1f2937]/10 flex items-center justify-between bg-white/80">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f6] border-2 border-[#1f2937]/30 flex items-center justify-center text-lg font-black text-[#1f2937]">
                {user?.name ? user.name[0].toUpperCase() : 'M'}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#1f2937]">{user?.name || t('guest', 'Mijoz')}</h3>
                <p className="text-xs font-semibold text-[#1f2937]/70">{user?.phone}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-[#F7E998]/50 hover:bg-[#f3f4f6] text-[#1f2937] rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1f2937]/10 bg-white">
            <button
              onClick={() => setActiveTab('profil')}
              className={`flex-1 py-3 font-bold text-sm text-center border-b-2 transition-all ${activeTab === 'profil' ? 'border-[#FF4747] text-[#1f2937]' : 'border-transparent text-[#1f2937]/50'}`}
            >
              {t('my_details', "Ma'lumotlarim")}
            </button>
            <button
              onClick={() => { setActiveTab('buyurtmalar'); fetchOrders(); }}
              className={`flex-1 py-3 font-bold text-sm text-center border-b-2 transition-all ${activeTab === 'buyurtmalar' ? 'border-[#FF4747] text-[#1f2937]' : 'border-transparent text-[#1f2937]/50'}`}
            >
              {t('orders', 'Buyurtmalar')}
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {activeTab === 'profil' ? (
              <>
                {saveSuccess && <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold border border-emerald-200">{saveSuccess}</div>}
                {saveError && <div className="p-3 bg-red-100 text-red-800 rounded-xl text-sm font-semibold border border-red-200">{saveError}</div>}

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-4">
                  <div className="flex justify-between items-center border-b border-[#1f2937]/10 pb-3">
                    <h4 className="font-extrabold text-[#1f2937]">{t('personal_info', "Shaxsiy Ma'lumotlar")}</h4>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#FF4747] bg-[#FF4747]/10 hover:bg-[#FF4747]/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                      {isEditing ? t('cancel', 'Bekor qilish') : t('edit', 'Tahrirlash')}
                    </button>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('your_name', 'Ismingiz')}</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('phone', 'Telefon raqam')}</label>
                        <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('email_address', 'Email manzil')}</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder={t('optional', 'Ixtiyoriy')} className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]" />
                      </div>
                      <button type="submit" disabled={isSaving} className="w-full bg-[#111827] text-white font-bold py-2.5 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm">
                        <Save size={16} />
                        {isSaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2 text-sm font-semibold text-[#1f2937]">
                      <div className="flex justify-between"><span className="text-[#1f2937]/70 font-normal">{t('name_label', 'Ism:')}</span><span>{user?.name || t('not_entered', 'Kiritilmagan')}</span></div>
                      <div className="flex justify-between"><span className="text-[#1f2937]/70 font-normal">{t('phone_label', 'Telefon:')}</span><span>{user?.phone || t('not_entered', 'Kiritilmagan')}</span></div>
                      <div className="flex justify-between"><span className="text-[#1f2937]/70 font-normal">{t('email_label', 'Email:')}</span><span>{user?.email || t('not_entered', 'Kiritilmagan')}</span></div>
                    </div>
                  )}
                </div>

                {/* Cashback */}
                <div className="bg-[#f3f4f6]/40 p-5 rounded-2xl border border-[#f3f4f6] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1f2937]">{t('cashback_balance', 'Keshbek Balansingiz')}</span>
                    <p className="text-2xl font-black text-[#1f2937]">{formatNumber(user?.cashback_balance)} <span className="text-xs font-bold">tanga</span></p>
                  </div>
                  <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center text-amber-600 font-extrabold text-xl">🪙</div>
                </div>

                {/* Delivery Address */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-3">
                  <h4 className="font-extrabold text-[#1f2937]">{t('delivery_address', 'Yetkazib Berish Manzili')}</h4>
                  <div className="flex items-center gap-2">
                    <input type="text" value={address} onChange={e => updateAddress(e.target.value)} placeholder={t('enter_address', 'Manzilni kiriting...')} className="flex-1 px-4 py-2.5 rounded-xl border border-[#1f2937]/20 text-sm font-semibold text-[#1f2937] outline-none" />
                    <button type="button" onClick={handleGetLocation} disabled={isLocating} className="p-2.5 bg-[#f3f4f6] hover:bg-[#f3f4f6]/80 rounded-xl text-[#1f2937] transition-colors" title={t('detect_location', 'Joriy joylashuvni aniqlash')}>
                      <MapPin size={20} className="text-[#FF4747]" />
                    </button>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  {t('logout', 'Tizimdan chiqish')}
                </button>
              </>
            ) : (
              <div>
                {isLoadingOrders ? (
                  <div className="py-12 text-center text-sm font-bold text-[#1f2937]">{t('orders_loading', 'Buyurtmalar yuklanmoqda...')}</div>
                ) : userOrders.length === 0 ? (
                  <div className="py-12 text-center text-sm font-semibold text-[#1f2937]/70">{t('no_orders', 'Sizda hali hechnarsa buyurtma qilinmagan.')}</div>
                ) : (
                  <div className="space-y-4">
                    {userOrders.map((order) => {
                      const badge = getStatusBadge(order.status);
                      return (
                        <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-[#1f2937] text-base">{t('order_number', 'Buyurtma')} #{order.id}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>{badge.label}</span>
                          </div>
                          <p className="text-xs text-[#1f2937]/60 font-semibold">{new Date(order.created_at).toLocaleString('uz-UZ')}</p>
                          <div className="bg-[#ffffff]/40 p-3 rounded-xl space-y-1 text-xs font-semibold text-[#1f2937]">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span>{formatNumber((item.price || 0) * item.quantity)} so'm</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <div>
                              <span className="text-xs text-[#1f2937]/70 block">{t('total_amount', 'Jami summa:')}</span>
                              <span className="font-black text-[#FF4747] text-base">{formatNumber(order.total)} so'm</span>
                            </div>
                            {order.status === 'completed' && !order.is_rated && (
                              <button
                                onClick={() => { setRatingOrder(order); setRatingScore(5); setRatingComment(''); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs hover:bg-amber-200 transition-colors"
                              >
                                <Star size={14} className="fill-amber-500 text-amber-500" />
                                {t('rate', 'Baholash')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {ratingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setRatingOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#A79277]/20" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-center text-[#A79277] mb-2">{t('rate_order', 'Buyurtmani Baholash')}</h3>
            <p className="text-xs text-center text-[#A79277]/70 mb-6">Buyurtma #{ratingOrder.id}</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingScore(star)} className="focus:outline-none transition-transform active:scale-125">
                  <Star size={36} className={star <= ratingScore ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                </button>
              ))}
            </div>
            <textarea rows={3} value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder={t('comment_optional', "Qo'shimcha izoh qoldiring (ixtiyoriy)...")} className="w-full p-3 bg-[#FFF2E1] border border-[#A79277]/20 rounded-xl text-sm outline-none focus:border-amber-400 mb-6 font-medium" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setRatingOrder(null)} className="flex-1 py-3 bg-[#F7E998]/50 text-[#A79277] font-bold rounded-xl text-sm hover:bg-[#F7E998] transition-colors">{t('cancel', 'Bekor qilish')}</button>
              <button type="button" onClick={submitRating} disabled={isRatingSubmitting} className="flex-1 py-3 bg-amber-400 text-amber-950 font-extrabold rounded-xl text-sm hover:bg-amber-500 transition-colors">{isRatingSubmitting ? t('sending', 'Yuborilmoqda...') : t('send', 'Yuborish')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfileModal;
