import { apiFetch } from '../context/AuthContext';
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, MapPin, User, ChevronRight,
  Utensils, X, Home, Phone, Info
} from 'lucide-react';
import { CartContext } from '../context/CartContext';
import ProductModal from '../components/ProductModal';
import { useTranslation } from 'react-i18next';

// Extracted components
import CartDrawer from '../components/client/CartDrawer';
import BannersSlider from '../components/client/BannersSlider';
import MenuSection from '../components/client/MenuSection';
import UserProfileModal from '../components/client/UserProfileModal';

const ClientHome = () => {
  const { cartItems, addToCart, removeFromCart, updateQuantity, getTotal, user, login, updateUser, logout, address, updateAddress } = useContext(CartContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [isLocating, setIsLocating] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'uz' ? 'ru' : 'uz');
  };

  // Auth state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ name: '', phone: '+998', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Telegram login
  const [botUsername, setBotUsername] = useState(null);
  const [telegramStep, setTelegramStep] = useState('idle');
  const [telegramCode, setTelegramCode] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');

  // Data
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textModalTitle, setTextModalTitle] = useState('');
  const [textModalContent, setTextModalContent] = useState('');

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes, banRes, setRes, cfgRes] = await Promise.all([
          apiFetch('/api/menu'),
          apiFetch('/api/categories'),
          apiFetch('/api/banners'),
          apiFetch('/api/settings'),
          apiFetch('/api/config')
        ]);
        if (menuRes.ok) setMenuItems((await menuRes.json()).filter(item => item.available));
        if (catRes.ok) setCategories((await catRes.json()).filter(cat => cat.available));
        if (banRes.ok) setBanners(await banRes.json());
        if (setRes.ok) setSettings(await setRes.json());
        if (cfgRes.ok) { const cfg = await cfgRes.json(); if (cfg.bot_username) setBotUsername(cfg.bot_username); }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  // Banner auto-rotate
  useEffect(() => {
    if (!banners.length) return;
    const timer = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi."); return; }
    setIsLocating(true);
    updateAddress("Aniqlanmoqda...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await r.json();
          if (data?.address) {
            const street = data.address.road || data.address.suburb || data.address.neighbourhood || '';
            const city = data.address.city || data.address.town || data.address.village || '';
            const short = `${street} ${city}`.trim();
            updateAddress(short.length > 2 ? short : 'Sizning joylashuvingiz');
          } else updateAddress('Topilmadi');
        } catch { updateAddress('Xatolik yuz berdi'); }
        finally { setIsLocating(false); }
      },
      () => { setIsLocating(false); updateAddress("Ruxsat berilmadi"); }
    );
  };

  // Auth
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    const endpoint = authMode === 'login' ? '/api/auth/client/login' : '/api/auth/client/register';
    const payload = authMode === 'login'
      ? { email: authData.phone, password: authData.password }
      : { name: authData.name, email: authData.email, phone: authData.phone, password: authData.password };
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      if (authMode === 'login') { login(data.user, data.token); setIsLoginModalOpen(false); }
      else { setAuthMode('login'); setAuthError("Muvaffaqiyatli ro'yxatdan o'tdingiz! Endi tizimga kiring."); }
    } catch (err) { setAuthError(err.message); }
    finally { setIsAuthLoading(false); }
  };

  const handleTelegramVerify = async (e) => {
    e.preventDefault();
    if (!telegramCode.trim()) return;
    setTelegramLoading(true);
    setTelegramError('');
    try {
      const res = await apiFetch('/api/auth/client/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: telegramCode.trim(), device: navigator.userAgent, os: navigator.platform, location: 'Web', time: new Date().toLocaleString('uz-UZ') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      login(data.user, data.token);
      setIsLoginModalOpen(false);
      setTelegramStep('idle');
      setTelegramCode('');
    } catch (err) { setTelegramError(err.message); }
    finally { setTelegramLoading(false); }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = getTotal();
  const getItemQuantity = (id) => { const item = cartItems.find(i => i.id === id); return item ? item.quantity : 0; };

  return (
    <div className="flex h-screen bg-[#FFF2E1] font-sans overflow-hidden text-[#A79277]">

      {/* CENTER CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FFF2E1] overflow-hidden relative">

        {/* HEADER */}
        <header className="h-[60px] sm:h-[80px] flex-shrink-0 flex items-center justify-between px-4 lg:px-10 bg-white border-b border-[#A79277]/20 z-40 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-6 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <img src="/milano_icon_512.png" alt="Milano Foods" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md" />
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight hidden sm:block text-[#A79277]">Milano Foods</span>
            </div>
            <div className="hidden md:flex flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A79277]/70" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActiveCategory(null); }}
                placeholder={t('search_placeholder', 'Sevimli taomingizni qidiring...')}
                className="w-full bg-[#F7E998]/50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#FF4747] focus:bg-white transition-all outline-none text-[#A79277]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A79277]/50 hover:text-[#FF4747] transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 ml-2 sm:ml-4">
            <button onClick={handleGetLocation} disabled={isLocating} className="flex items-center gap-1 sm:gap-2 bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] transition-colors py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm disabled:opacity-70 border-none">
              <MapPin size={16} className="text-[#FF4747]" />
              <span className="truncate max-w-[100px] sm:max-w-[200px]">{address || t('detect_location', 'Manzil')}</span>
            </button>
            <button onClick={toggleLanguage} className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] font-bold text-xs sm:text-sm transition-colors">
              {i18n.language === 'uz' ? 'UZ' : 'RU'}
            </button>
            {!user.isLoggedIn ? (
              <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center justify-center px-4 py-2 sm:px-6 sm:py-2.5 rounded-[14px] bg-[#FF4747] text-white hover:bg-[#FF4747]/90 transition-all font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm">
                {t('login', 'Kirish')}
              </button>
            ) : (
              <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#F7E998]/50 hover:bg-[#F7E998] transition-all font-semibold text-sm cursor-pointer">
                <User size={16} className="text-[#A79277]/70" />
                <span className="truncate max-w-[80px] sm:max-w-[120px] text-[#A79277]">{user.name || user.phone}</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Area */}
        <div id="main-scroll" className="flex-1 overflow-y-auto pb-32 scroll-smooth custom-scrollbar">

          {/* HORIZONTAL CATEGORIES BAR */}
          <div className="sticky top-0 z-30 bg-white border-b border-[#A79277]/20 py-3 px-4 lg:px-10 overflow-x-auto no-scrollbar shadow-sm">
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all border ${activeCategory === null ? 'bg-[#F7E998]/50 text-[#FF4747] border-[#FF4747]' : 'bg-white border-[#A79277]/20 text-[#A79277]/70'}`}
              >
                {t('all', 'Barchasi')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all border ${activeCategory === cat.name ? 'bg-[#F7E998]/50 text-[#FF4747] border-[#FF4747]' : 'bg-white border-[#A79277]/20 text-[#A79277]/70'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 lg:p-10 max-w-7xl mx-auto">
            {/* Banner Slider */}
            {!activeCategory && (
              <BannersSlider
                banners={banners}
                currentBanner={currentBanner}
                setCurrentBanner={setCurrentBanner}
                setActiveCategory={setActiveCategory}
              />
            )}

            {/* Quick Categories */}
            {categories.filter(c => c.is_quick).length > 0 && !activeCategory && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-[#1f2937]">Tezkor Tanlovlar</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {categories.filter(c => c.is_quick).map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                      className="bg-[#f3f4f6]/40 rounded-3xl p-6 flex flex-col justify-between h-44 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-[#f3f4f6] relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                      <span className="font-bold text-lg z-10 text-[#1f2937]">{cat.name}</span>
                      <div className="self-end text-6xl drop-shadow-md z-10 group-hover:scale-110 transition-transform duration-300">
                        {cat.emoji?.startsWith('http') ? (
                          <img src={cat.emoji} alt={cat.name} className="w-16 h-16 object-cover rounded-full" />
                        ) : cat.emoji}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Catalog */}
            <MenuSection
              menuItems={menuItems}
              categories={categories}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              addToCart={addToCart}
              updateQuantity={updateQuantity}
              getItemQuantity={getItemQuantity}
              setSelectedProduct={setSelectedProduct}
            />
          </div>
        </div>
      </main>

      {/* DESKTOP CART SIDEBAR */}
      <CartDrawer
        cartItems={cartItems}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        getTotal={getTotal}
      />

      {/* MOBILE BOTTOM CART */}
      {totalItems > 0 && (
        <div className="fixed bottom-[80px] left-4 right-4 lg:hidden z-40">
          <button onClick={() => navigate('/checkout')} className="w-full bg-[#FF4747] text-white font-bold py-3.5 rounded-[14px] shadow-lg flex justify-between items-center px-5 border border-[#FF4747]/90]">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-7 h-7 rounded-[8px] flex items-center justify-center font-bold text-[13px]">{totalItems}</div>
              <span className="text-[15px]">{t('go_to_cart', "Savatni ko'rish")}</span>
            </div>
            <span className="text-[15px] font-extrabold">{Number(totalAmount).toLocaleString('uz-UZ')} so'm</span>
          </button>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#A79277]/20 flex justify-around items-center h-[70px] pb-safe z-50 px-2 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
        <button onClick={() => { const el = document.getElementById('main-scroll'); if (el) el.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors">
          <Home size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('home', 'Asosiy')}</span>
        </button>
        <button onClick={() => { const el = document.getElementById('main-scroll'); const cat = document.getElementById('catalog-section'); if (el && cat) el.scrollTo({ top: cat.offsetTop - 80, behavior: 'smooth' }); }} className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors">
          <Utensils size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('catalog', 'Menyu')}</span>
        </button>
        <button onClick={() => navigate('/checkout')} className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors relative">
          <ShoppingCart size={22} className="mb-1" strokeWidth={2.5} />
          {totalItems > 0 && (
            <span className="absolute top-1.5 right-5 bg-[#FF4747] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>
          )}
          <span className="text-[10px] font-bold">{t('cart', 'Savat')}</span>
        </button>
        <button onClick={() => user.isLoggedIn ? setIsProfileModalOpen(true) : setIsLoginModalOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors">
          <User size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('profile', 'Profil')}</span>
        </button>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          quantity={getItemQuantity(selectedProduct.id)}
        />
      )}

      {/* Login / Register Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-[#1f2937]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setIsLoginModalOpen(false)}>
          <div className="bg-[#ffffff] rounded-[2rem] w-full max-w-sm p-8 relative shadow-2xl transform scale-100 transition-transform animate-in fade-in zoom-in-95 duration-200 border border-[#1f2937]/20" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white hover:bg-[#f3f4f6] text-[#1f2937] rounded-full transition-colors shadow-sm">
              <X size={18} />
            </button>
            <div className="w-20 h-20 bg-[#FF4747]/10 text-[#FF4747] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF4747]/20">
              <User size={36} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-extrabold mb-2 text-center text-[#1f2937]">{authMode === 'login' ? t('login', 'Tizimga kirish') : t('register', "Ro'yxatdan o'tish")}</h2>
            <p className="text-[#1f2937]/80 mb-6 text-sm text-center leading-relaxed">
              {authMode === 'login' ? t('login_desc', 'Telefon raqam yoki elektron pochta va parolni kiriting') : t('register_desc', "Barcha maydonlarni to'ldirib ro'yxatdan o'ting")}
            </p>

            {authError && (
              <div className={`mb-6 p-3 rounded-xl text-sm font-semibold ${authError.includes('Muvaffaqiyatli') ? 'bg-green-100 text-green-700' : 'bg-[#FF4747]/10 text-[#FF4747]'}`}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-[#1f2937] mb-1">{t('name', 'Ism familiya')}</label>
                    <input type="text" required value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})} placeholder="Masalan: Sardor Toirov" className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-semibold text-[#1f2937] bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1f2937] mb-1">Email</label>
                    <input type="email" required value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} placeholder="example@gmail.com" className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-semibold text-[#1f2937] bg-white" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1">{authMode === 'login' ? t('phone_or_email', 'Telefon yoki Email') : t('phone', 'Telefon raqam')}</label>
                <input type="text" required value={authData.phone} onChange={e => setAuthData({...authData, phone: e.target.value})} placeholder="+998" className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-bold text-lg text-[#1f2937] bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1">{t('password', 'Parol')}</label>
                <input type="password" required value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} placeholder="••••••••" className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-bold text-[#1f2937] bg-white" />
              </div>
              <button type="submit" disabled={isAuthLoading} className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 disabled:opacity-50 text-[#ffffff] font-bold py-4 mt-2 rounded-2xl transition-all shadow-lg shadow-[#FF4747]/20 active:scale-[0.98] text-lg">
                {isAuthLoading ? t('loading', 'Kuting...') : (authMode === 'login' ? t('login', 'Kirish') : t('register', "Ro'yxatdan o'tish"))}
              </button>
            </form>

            {telegramStep === 'idle' ? (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#1f2937]/10" />
                  <span className="text-xs font-bold text-[#1f2937]/40">YOKI</span>
                  <div className="flex-1 h-px bg-[#1f2937]/10" />
                </div>
                {botUsername ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await apiFetch('/api/auth/telegram/init-login', { method: 'POST' });
                        const { token } = await res.json();
                        setTelegramStep('waiting_code');
                        setTelegramError('');
                        setTelegramCode('');
                        window.open(`https://t.me/${botUsername}?start=web_${token}`, '_blank');
                      } catch { setTelegramError("Serverga ulanib bo'lmadi. Qaytadan urinib ko'ring."); }
                    }}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#229ED9] hover:bg-[#1a8fc4] text-white font-bold transition-all shadow-lg shadow-[#229ED9]/20 active:scale-[0.98]"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                    Telegram orqali kirish
                  </button>
                ) : (
                  <div className="text-center text-xs text-[#1f2937]/40 py-2">Telegram bot ulanmagan</div>
                )}
              </>
            ) : (
              <div className="mt-5">
                <div className="bg-[#229ED9]/10 border border-[#229ED9]/30 rounded-2xl p-4 mb-4 text-sm text-[#229ED9] font-semibold">
                  📱 <strong>@{botUsername}</strong> botga o'tib, raqamingizni yuboring. Bot sizga 6 raqamli kod yuboradi.
                </div>
                {telegramError && <div className="mb-3 p-3 rounded-xl text-sm font-semibold bg-[#FF4747]/10 text-[#FF4747]">{telegramError}</div>}
                <form onSubmit={handleTelegramVerify} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-[#1f2937] mb-1">Telegram kod</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={telegramCode} onChange={e => setTelegramCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full px-5 py-3 rounded-xl border-2 border-[#229ED9]/30 focus:border-[#229ED9] outline-none font-bold text-2xl text-center text-[#1f2937] bg-white tracking-[0.5em]" autoFocus />
                  </div>
                  <button type="submit" disabled={telegramLoading || telegramCode.length < 6} className="w-full bg-[#229ED9] hover:bg-[#1a8fc4] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] text-lg">
                    {telegramLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                  </button>
                  <button type="button" onClick={() => { setTelegramStep('idle'); setTelegramCode(''); setTelegramError(''); }} className="w-full py-2 text-sm font-semibold text-[#1f2937]/50 hover:text-[#FF4747] transition-colors">
                    ← Orqaga
                  </button>
                </form>
              </div>
            )}

            <div className="mt-5 text-center">
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setTelegramStep('idle'); }} className="text-[#1f2937] font-semibold hover:text-[#FF4747] transition-colors">
                {authMode === 'login' ? t('no_account', "Akkauntingiz yo'qmi? Ro'yxatdan o'ting") : t('has_account', "Akkauntingiz bormi? Tizimga kiring")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        logout={logout}
        address={address}
        updateAddress={updateAddress}
        updateUser={updateUser}
        handleGetLocation={handleGetLocation}
        isLocating={isLocating}
      />

      {/* More Modal */}
      {isMoreModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end justify-center sm:items-center" onClick={() => setIsMoreModalOpen(false)}>
          <div className="bg-[#ffffff] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1f2937]/20 flex justify-between items-center bg-white">
              <h2 className="text-xl font-extrabold text-[#1f2937]">{t('more', 'Yana')}</h2>
              <button onClick={() => setIsMoreModalOpen(false)} className="p-2 bg-[#F7E998]/50 rounded-full text-[#A79277]/70 hover:bg-[#F7E998]"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              {[
                { key: 'about_us', icon: <Info size={20} />, bg: 'bg-emerald-50', color: 'text-emerald-500' },
                { key: 'contact_admin', icon: <Phone size={20} />, bg: 'bg-blue-50', color: 'text-blue-500' },
              ].map(item => (
                <button key={item.key} onClick={() => { const lang = i18n.language || 'uz'; setTextModalTitle(t(item.key)); setTextModalContent(settings[`${item.key}_${lang}`] || ''); setIsTextModalOpen(true); }} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-[#1f2937]/10 hover:border-[#1f2937]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
                    <span className="font-bold text-[#A79277]">{t(item.key)}</span>
                  </div>
                  <ChevronRight size={20} className="text-[#A79277]/70" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Text Modal */}
      {isTextModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex justify-center items-center p-4" onClick={() => setIsTextModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#A79277]/20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1f2937]">{textModalTitle}</h2>
              <button onClick={() => setIsTextModalOpen(false)} className="p-2 bg-[#FFF2E1] rounded-full hover:bg-[#F7E998]/50"><X size={20} className="text-[#A79277]/70" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-[#A79277]/70 leading-relaxed whitespace-pre-wrap">{textModalContent || t('not_entered', 'Kiritilmagan')}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientHome;
