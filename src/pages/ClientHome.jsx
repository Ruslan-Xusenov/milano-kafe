import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, MapPin, User, ChevronRight,
  Menu as MenuIcon, Heart, Percent, Utensils, Coffee,
  Apple, Milk, Croissant, Droplets, Candy, Beef, Snowflake,
  Plus, Minus, Trash2, Home, List, X, Info, Star, Edit3, Save, LogOut
} from 'lucide-react';
import { CartContext } from '../context/CartContext';
import ProductModal from '../components/ProductModal';
import { useTranslation } from 'react-i18next';

const ClientHome = () => {
  const { cartItems, addToCart, removeFromCart, updateQuantity, getTotal, user, login, updateUser, logout, address, updateAddress } = useContext(CartContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isLocating, setIsLocating] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'uz' ? 'ru' : 'uz';
    i18n.changeLanguage(newLang);
  };

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('uz-UZ');
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ name: '', phone: '+998', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textModalTitle, setTextModalTitle] = useState('');
  const [textModalContent, setTextModalContent] = useState('');

  // Profile Modal & Tabs
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('profil'); // 'profil' | 'buyurtmalar'
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', phone: '', email: '' });
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Rating Modal state
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  useEffect(() => {
    if (user?.isLoggedIn) {
      setProfileFormData({
        name: user.name || '',
        phone: user.phone || '+998',
        email: user.email || ''
      });
      fetchUserOrders();
    }
  }, [user?.id, user?.isLoggedIn]);

  const fetchUserOrders = async () => {
    if (!user?.id) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserOrders(data);
      }
    } catch (e) {
      console.error('Buyurtmalarni yuklashda xatolik:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaveError('');
    setProfileSaveSuccess('');
    setIsProfileSaving(true);
    try {
      const res = await fetch('/api/auth/client/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileFormData.name,
          phone: profileFormData.phone,
          email: profileFormData.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
      updateUser(data);
      setIsEditingProfile(false);
      setProfileSaveSuccess('Ma\'lumotlar muvaffaqiyatli saqlandi!');
      setTimeout(() => setProfileSaveSuccess(''), 3000);
    } catch (err) {
      setProfileSaveError(err.message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const submitRating = async () => {
    if (!ratingOrder || ratingScore === 0) return;
    setIsRatingSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${ratingOrder.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingScore,
          comment: ratingComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Baholashda xatolik yuz berdi');
      setRatingOrder(null);
      fetchUserOrders();
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
      default: return { bg: 'bg-[#F7E998]/50 text-[#A79277] border-[#A79277]/20', label: 'Noma\'lum' };
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    const endpoint = authMode === 'login' ? '/api/auth/client/login' : '/api/auth/client/register';
    const payload = authMode === 'login'
      ? { email: authData.phone, password: authData.password }
      : { name: authData.name, email: authData.email, phone: authData.phone, password: authData.password };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      if (authMode === 'login') {
        login(data.user, data.token);
        setIsLoginModalOpen(false);
      } else {
        setAuthMode('login');
        setAuthError('Muvaffaqiyatli ro\'yxatdan o\'tdingiz! Endi tizimga kiring.');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes, banRes, setRes] = await Promise.all([
          fetch('/api/menu'),
          fetch('/api/categories'),
          fetch('/api/banners'),
          fetch('/api/settings')
        ]);
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data.filter(item => item.available));
        }
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data.filter(cat => cat.available));
        }
        if (banRes.ok) {
          setBanners(await banRes.json());
        }
        if (setRes.ok) {
          setSettings(await setRes.json());
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = getTotal();

  const getItemQuantity = (id) => {
    const item = cartItems.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      return;
    }

    setIsLocating(true);
    updateAddress("Aniqlanmoqda...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();

          if (data && data.address) {
            const street = data.address.road || data.address.suburb || data.address.residential || data.address.neighbourhood || '';
            const city = data.address.city || data.address.town || data.address.village || '';

            let shortAddress = `${street} ${city}`.trim();
            if (shortAddress.length < 3) {
              shortAddress = "Sizning joylashuvingiz";
            }
            updateAddress(shortAddress);
          } else {
            updateAddress("Topilmadi");
          }
        } catch (error) {
          updateAddress("Xatolik yuz berdi");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        updateAddress("Ruxsat berilmadi");
      }
    );
  };

  return (
    <div className="flex h-screen bg-[#FFF2E1] font-sans overflow-hidden text-[#A79277]">

      {/* CENTER CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FFF2E1] overflow-hidden relative">

        {/* PREMIUM HEADER */}
        <header className="h-[60px] sm:h-[80px] flex-shrink-0 flex items-center justify-between px-4 lg:px-10 bg-white border-b border-[#A79277]/20 z-40 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-6 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF4747] rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-md">M</div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight hidden sm:block text-[#A79277]">Milano Kafe</span>
            </div>
            <div className="hidden md:flex flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A79277]/70" size={18} />
              <input
                type="text"
                placeholder={t('search_placeholder', 'Sevimli taomingizni qidiring...')}
                className="w-full bg-[#F7E998]/50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#FF4747] focus:bg-white transition-all outline-none text-[#A79277]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 ml-2 sm:ml-4">
            <button
              onClick={handleGetLocation}
              disabled={isLocating}
              className="flex items-center gap-1 sm:gap-2 bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] transition-colors py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm disabled:opacity-70 border-none"
            >
              <MapPin size={16} className="text-[#FF4747]" />
              <span className="truncate max-w-[100px] sm:max-w-[200px]">{address || t('detect_location', 'Manzil')}</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] font-bold text-xs sm:text-sm transition-colors"
            >
              {i18n.language === 'uz' ? 'UZ' : 'RU'}
            </button>
            {!user.isLoggedIn ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 sm:px-6 sm:py-2.5 rounded-[14px] bg-[#FF4747] text-white hover:bg-[#FF4747]/90 transition-all font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm"
              >
                {t('login', 'Kirish')}
              </button>
            ) : (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#F7E998]/50 hover:bg-[#F7E998] transition-all font-semibold text-sm cursor-pointer"
              >
                <User size={16} className="text-[#A79277]/70" />
                <span className="truncate max-w-[80px] sm:max-w-[120px] text-[#A79277]">{user.name || user.phone}</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <div id="main-scroll" className="flex-1 overflow-y-auto pb-32 scroll-smooth custom-scrollbar">

          {/* HORIZONTAL CATEGORIES BAR */}
          <div className="sticky top-0 z-30 bg-white border-b border-[#A79277]/20 py-3 px-4 lg:px-10 overflow-x-auto no-scrollbar shadow-sm">
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all border ${activeCategory === null
                    ? 'bg-[#F7E998]/50 text-[#FF4747] border-[#FF4747]'
                    : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                  }`}
              >
                {t('all', 'Barchasi')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all border ${activeCategory === cat.name
                      ? 'bg-[#F7E998]/50 text-[#FF4747] border-[#FF4747]'
                      : 'bg-white border-[#A79277]/20 text-[#A79277]/70 hover:border-[#A79277]/20'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 lg:p-10 max-w-7xl mx-auto">
            {/* Banner Slider */}
            {banners.length > 0 && !activeCategory && (
              <div className="relative mb-12 overflow-hidden rounded-[2rem] min-h-[280px] lg:min-h-[340px] shadow-xl shadow-[#1f2937]/10 border border-[#1f2937]/5">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    onClick={() => {
                      if (banner.link_type === 'category' && banner.link_id) {
                        setActiveCategory(banner.link_id);
                      }
                    }}
                    className={`absolute inset-0 bg-[#1f2937] p-8 md:p-12 flex items-center transition-opacity duration-1000 ease-in-out ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'} ${banner.link_type === 'category' ? 'cursor-pointer' : ''}`}
                  >
                    <div className="relative z-20 max-w-xl">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-[#f3f4f6]/30 backdrop-blur-md text-[#ffffff] text-xs font-bold uppercase tracking-wider mb-4 border border-[#f3f4f6]/50">Premium Tatib Ko'ring</span>
                      <h2 className={`text-4xl lg:text-6xl font-extrabold text-[#ffffff] drop-shadow-sm leading-[1.1] mb-4`}>{banner.title}</h2>
                      <p className={`text-[#ffffff]/90 text-lg md:text-xl font-medium leading-relaxed max-w-md`}>{banner.subtitle}</p>
                      <button className="mt-8 px-8 py-3.5 bg-[#FF4747] text-[#ffffff] rounded-full font-bold shadow-xl hover:bg-[#FF4747]/90 transition-transform">
                        Buyurtma berish
                      </button>
                    </div>

                    <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-8 md:pr-16 opacity-95 pointer-events-none">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute w-[300px] h-[300px] bg-[#f3f4f6]/20 rounded-full blur-3xl"></div>
                        <div className="w-32 h-32 md:w-48 md:h-48 text-7xl md:text-9xl drop-shadow-2xl hover:scale-110 transition-transform duration-700 ease-out">{banner.emoji2}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 bg-black/10 backdrop-blur-md px-4 py-2 rounded-full">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBanner(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${index === currentBanner ? 'w-8 bg-[#f3f4f6]' : 'w-2 bg-[#ffffff]/50 hover:bg-[#ffffff]/80'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Categories grid */}
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
                      className={`bg-[#f3f4f6]/40 rounded-3xl p-6 flex flex-col justify-between h-44 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-[#f3f4f6]/40 transition-all duration-300 border border-[#f3f4f6] relative overflow-hidden group`}
                    >
                      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                      <span className={`font-bold text-lg z-10 text-[#1f2937]`}>{cat.name}</span>
                      <div className="self-end text-6xl drop-shadow-md z-10 group-hover:scale-110 transition-transform duration-300">
                        {cat.emoji?.startsWith('http') ? (
                          <img src={cat.emoji} alt={cat.name} className="w-16 h-16 object-cover rounded-full" />
                        ) : (
                          cat.emoji
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog items */}
            <div className="flex items-center justify-between mb-6 pt-4 px-4 lg:px-0">
              <h3 id="catalog-section" className="text-2xl font-bold text-[#A79277]">
                {activeCategory ? activeCategory : t('all_dishes', 'Barcha taomlar')}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-4 lg:px-0">
              {menuItems.filter(item => activeCategory ? item.category === activeCategory : true).map((item) => {
                const qty = getItemQuantity(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedProduct(item)}
                    className="bg-white rounded-[14px] p-3 border border-[#A79277]/20 flex flex-col h-full cursor-pointer relative transition-colors hover:border-[#A79277]/20"
                  >
                    <div className="bg-[#FFF2E1] rounded-[12px] h-32 sm:h-40 mb-3 flex items-center justify-center text-[4rem] sm:text-[5rem] overflow-hidden relative">
                      <div className="z-10 w-full h-full flex items-center justify-center mix-blend-multiply">
                        {item.emoji?.startsWith('http') ? (
                          <img src={item.emoji} alt={item.name} className="w-full h-full object-cover rounded-[12px]" />
                        ) : (
                          item.emoji
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 px-1">
                      <div className="mb-1">
                        <h4 className="text-[15px] font-bold text-[#A79277] leading-tight line-clamp-2">
                          {i18n.language === 'ru' ? item.name_ru || item.name : item.name}
                        </h4>
                      </div>

                      {(item.description || item.description_ru) && (
                        <p className="text-[13px] text-[#A79277]/70 line-clamp-2 mb-3 leading-snug">
                          {i18n.language === 'ru' ? item.description_ru || item.description : item.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-[15px] sm:text-[17px] font-bold text-[#A79277] leading-none tracking-tight">
                          {formatNumber(item.price)} <span className="text-[12px] font-medium text-[#A79277]/70">so'm</span>
                        </span>

                        {qty === 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                            className="w-10 h-10 bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] rounded-[10px] transition-colors flex items-center justify-center flex-shrink-0"
                          >
                            <Plus size={20} strokeWidth={2.5} />
                          </button>
                        ) : (
                          <div
                            className="flex items-center justify-between bg-white rounded-[10px] p-1 w-[90px] border border-[#A79277]/20 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-[8px] bg-[#FFF2E1] flex items-center justify-center text-[#A79277] hover:bg-[#F7E998]/50 transition-colors"
                            >
                              <Minus size={16} strokeWidth={2.5} />
                            </button>
                            <span className="font-bold text-[14px] text-[#A79277]">{qty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-[8px] bg-[#FF4747] flex items-center justify-center text-white hover:bg-[#FF4747]/90 transition-colors"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR (Cart for Desktop) */}
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
                      <span className="font-bold text-[#FF4747] text-[15px]">{formatNumber(item.price * item.quantity)} <span className="text-[11px] text-[#A79277]/70 font-medium">so'm</span></span>

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

      {/* MOBILE BOTTOM CART (Hidden on Desktop) */}
      {totalItems > 0 && (
        <div className="fixed bottom-[80px] left-4 right-4 lg:hidden z-40">
          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-[#FF4747] text-white font-bold py-3.5 rounded-[14px] shadow-lg flex justify-between items-center px-5 border border-[#FF4747]/90]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-7 h-7 rounded-[8px] flex items-center justify-center font-bold text-[13px]">
                {totalItems}
              </div>
              <span className="text-[15px]">{t('go_to_cart', "Savatni ko'rish")}</span>
            </div>
            <span className="text-[15px] font-extrabold">{formatNumber(totalAmount)} so'm</span>
          </button>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#A79277]/20 flex justify-around items-center h-[70px] pb-safe z-50 px-2 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => {
            const scrollArea = document.getElementById('main-scroll');
            if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors"
        >
          <Home size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('home', 'Asosiy')}</span>
        </button>
        <button
          onClick={() => {
            const scrollArea = document.getElementById('main-scroll');
            const catalog = document.getElementById('catalog-section');
            if (scrollArea && catalog) {
              scrollArea.scrollTo({ top: catalog.offsetTop - 80, behavior: 'smooth' });
            }
          }}
          className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors"
        >
          <Utensils size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('catalog', 'Menyu')}</span>
        </button>
        <button onClick={() => navigate('/checkout')} className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors relative">
          <ShoppingCart size={22} className="mb-1" strokeWidth={2.5} />
          {totalItems > 0 && (
            <span className="absolute top-1.5 right-5 bg-[#FF4747] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
          <span className="text-[10px] font-bold">{t('cart', 'Savat')}</span>
        </button>
        <button
          onClick={() => {
            if (user.isLoggedIn) {
              setIsProfileModalOpen(true);
            } else {
              setIsLoginModalOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center w-full h-full text-[#A79277]/70 hover:text-[#A79277] transition-colors"
        >
          <User size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold">{t('profile', 'Profil')}</span>
        </button>
      </div>

      {/* Product Details Modal */}
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
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white hover:bg-[#f3f4f6] text-[#1f2937] rounded-full transition-colors shadow-sm"
            >
              <X size={18} />
            </button>
            <div className="w-20 h-20 bg-[#FF4747]/10 text-[#FF4747] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF4747]/20">
              <User size={36} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-extrabold mb-2 text-center text-[#1f2937]">{authMode === 'login' ? t('login', 'Tizimga kirish') : t('register', 'Ro\'yxatdan o\'tish')}</h2>
            <p className="text-[#1f2937]/80 mb-6 text-sm text-center leading-relaxed">
              {authMode === 'login' ? t('login_desc', 'Telefon raqam yoki elektron pochta va parolni kiriting') : t('register_desc', 'Barcha maydonlarni to\'ldirib ro\'yxatdan o\'ting')}
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
                    <input
                      type="text"
                      required
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                      placeholder="Masalan: Sardor Toirov"
                      className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-semibold text-[#1f2937] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1f2937] mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      placeholder="example@gmail.com"
                      className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-semibold text-[#1f2937] bg-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1">{authMode === 'login' ? t('phone_or_email', 'Telefon yoki Email') : t('phone', 'Telefon raqam')}</label>
                <input
                  type="text"
                  required
                  value={authData.phone}
                  onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                  placeholder="+998"
                  className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-bold text-lg text-[#1f2937] bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#1f2937] mb-1">{t('password', 'Parol')}</label>
                <input
                  type="password"
                  required
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-5 py-3 rounded-xl border-2 border-[#1f2937]/20 focus:border-[#FF4747] outline-none font-bold text-[#1f2937] bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 disabled:opacity-50 text-[#ffffff] font-bold py-4 mt-2 rounded-2xl transition-all shadow-lg shadow-[#FF4747]/20 active:scale-[0.98] text-lg"
              >
                {isAuthLoading ? t('loading', 'Kuting...') : (authMode === 'login' ? t('login', 'Kirish') : t('register', 'Ro\'yxatdan o\'tish'))}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
                className="text-[#1f2937] font-semibold hover:text-[#FF4747] transition-colors"
              >
                {authMode === 'login' ? t('no_account', 'Akkauntingiz yo\'qmi? Ro\'yxatdan o\'ting') : t('has_account', 'Akkauntingiz bormi? Tizimga kiring')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-[#1f2937]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setIsProfileModalOpen(false)}>
          <div className="bg-[#ffffff] rounded-[2rem] w-full max-w-lg max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden border border-[#1f2937]/20" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
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
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center bg-[#F7E998]/50 hover:bg-[#f3f4f6] text-[#1f2937] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-[#1f2937]/10 bg-white">
              <button
                onClick={() => setActiveProfileTab('profil')}
                className={`flex-1 py-3 font-bold text-sm text-center border-b-2 transition-all ${
                  activeProfileTab === 'profil' ? 'border-[#FF4747] text-[#1f2937]' : 'border-transparent text-[#1f2937]/50 hover:text-[#1f2937]'
                }`}
              >
                {t('my_details', 'Ma\'lumotlarim')}
              </button>
              <button
                onClick={() => {
                  setActiveProfileTab('buyurtmalar');
                  fetchUserOrders();
                }}
                className={`flex-1 py-3 font-bold text-sm text-center border-b-2 transition-all ${
                  activeProfileTab === 'buyurtmalar' ? 'border-[#FF4747] text-[#1f2937]' : 'border-transparent text-[#1f2937]/50 hover:text-[#1f2937]'
                }`}
              >
                {t('orders', 'Buyurtmalar')}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {activeProfileTab === 'profil' ? (
                <>
                  {profileSaveSuccess && (
                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold border border-emerald-200">
                      {profileSaveSuccess}
                    </div>
                  )}

                  {profileSaveError && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-xl text-sm font-semibold border border-red-200">
                      {profileSaveError}
                    </div>
                  )}

                  {/* Profile Info Card */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#1f2937]/10 pb-3">
                      <h4 className="font-extrabold text-[#1f2937]">{t('personal_info', 'Shaxsiy Ma\'lumotlar')}</h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#FF4747] bg-[#FF4747]/10 hover:bg-[#FF4747]/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Edit3 size={14} />
                        {isEditingProfile ? t('cancel', 'Bekor qilish') : t('edit', 'Tahrirlash')}
                      </button>
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('your_name', 'Ismingiz')}</label>
                          <input
                            type="text"
                            required
                            value={profileFormData.name}
                            onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('phone', 'Telefon raqam')}</label>
                          <input
                            type="text"
                            required
                            value={profileFormData.phone}
                            onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1f2937] mb-1">{t('email_address', 'Email manzil')}</label>
                          <input
                            type="email"
                            value={profileFormData.email}
                            onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                            placeholder={t('optional', 'Ixtiyoriy')}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#1f2937]/20 focus:border-[#FF4747] outline-none text-sm font-semibold text-[#1f2937]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isProfileSaving}
                          className="w-full bg-[#111827] text-white font-bold py-2.5 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Save size={16} />
                          {isProfileSaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-2 text-sm font-semibold text-[#1f2937]">
                        <div className="flex justify-between">
                          <span className="text-[#1f2937]/70 font-normal">{t('name_label', 'Ism:')}</span>
                          <span>{user?.name || t('not_entered', 'Kiritilmagan')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#1f2937]/70 font-normal">{t('phone_label', 'Telefon:')}</span>
                          <span>{user?.phone || t('not_entered', 'Kiritilmagan')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#1f2937]/70 font-normal">{t('email_label', 'Email:')}</span>
                          <span>{user?.email || t('not_entered', 'Kiritilmagan')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cashback Card */}
                  <div className="bg-[#f3f4f6]/40 p-5 rounded-2xl border border-[#f3f4f6] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1f2937]">{t('cashback_balance', 'Keshbek Balansingiz')}</span>
                      <p className="text-2xl font-black text-[#1f2937]">{formatNumber(user?.cashback_balance)} <span className="text-xs font-bold">tanga</span></p>
                    </div>
                    <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center text-amber-600 font-extrabold text-xl">
                      🪙
                    </div>
                  </div>

                  {/* Delivery Location Section */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-3">
                    <h4 className="font-extrabold text-[#1f2937]">{t('delivery_address', 'Yetkazib Berish Manzili')}</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => updateAddress(e.target.value)}
                        placeholder={t('enter_address', 'Manzilni kiriting...')}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#1f2937]/20 text-sm font-semibold text-[#1f2937] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="p-2.5 bg-[#f3f4f6] hover:bg-[#f3f4f6]/80 rounded-xl text-[#1f2937] transition-colors"
                        title={t('detect_location', 'Joriy joylashuvni aniqlash')}
                      >
                        <MapPin size={20} className="text-[#FF4747]" />
                      </button>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileModalOpen(false);
                    }}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    {t('logout', 'Tizimdan chiqish')}
                  </button>
                </>
              ) : (
                /* Buyurtmalarim Tab */
                <div>
                  {isLoadingOrders ? (
                    <div className="py-12 text-center text-sm font-bold text-[#1f2937]">{t('orders_loading', 'Buyurtmalar yuklanmoqda...')}</div>
                  ) : userOrders.length === 0 ? (
                    <div className="py-12 text-center text-sm font-semibold text-[#1f2937]/70">
                      {t('no_orders', 'Sizda hali hechnarsa buyurtma qilinmagan.')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOrders.map((order) => {
                        const statusBadge = getStatusBadge(order.status);
                        return (
                          <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#1f2937]/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-[#1f2937] text-base">{t('order_number', 'Buyurtma')} #{order.id}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                                {statusBadge.label}
                              </span>
                            </div>

                            <p className="text-xs text-[#1f2937]/60 font-semibold">
                              {new Date(order.created_at).toLocaleString('uz-UZ')}
                            </p>

                            {/* Order Items */}
                            <div className="bg-[#ffffff]/40 p-3 rounded-xl space-y-1 text-xs font-semibold text-[#1f2937]">
                              {order.items && order.items.map((item, idx) => (
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
                                  onClick={() => {
                                    setRatingOrder(order);
                                    setRatingScore(5);
                                    setRatingComment('');
                                  }}
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
      )}

      {/* Rating Modal */}
      {ratingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setRatingOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#A79277]/20" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-center text-[#A79277] mb-2">{t('rate_order', 'Buyurtmani Baholash')}</h3>
            <p className="text-xs text-center text-[#A79277]/70 mb-6">{t('rate_order_desc', 'Buyurtma #{{id}} xizmat ko\'rsatish sifatini baholang', { id: ratingOrder.id })}</p>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRatingScore(star)} className="focus:outline-none transition-transform active:scale-125">
                  <Star
                    size={36}
                    className={star <= ratingScore ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder={t('comment_optional', 'Qo\'shimcha izoh qoldiring (ixtiyoriy)...')}
              className="w-full p-3 bg-[#FFF2E1] border border-[#A79277]/20 rounded-xl text-sm outline-none focus:border-amber-400 mb-6 font-medium"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRatingOrder(null)}
                className="flex-1 py-3 bg-[#F7E998]/50 text-[#A79277] font-bold rounded-xl text-sm hover:bg-[#F7E998] transition-colors"
              >
                {t('cancel', 'Bekor qilish')}
              </button>
              <button
                type="button"
                onClick={submitRating}
                disabled={isRatingSubmitting}
                className="flex-1 py-3 bg-amber-400 text-amber-950 font-extrabold rounded-xl text-sm hover:bg-amber-500 transition-colors"
              >
                {isRatingSubmitting ? t('sending', 'Yuborilmoqda...') : t('send', 'Yuborish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Modal */}
      {isMoreModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end justify-center sm:items-center" onClick={() => setIsMoreModalOpen(false)}>
          <div className="bg-[#ffffff] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1f2937]/20 flex justify-between items-center bg-white">
              <h2 className="text-xl font-extrabold text-[#1f2937]">{t('more', 'Yana')}</h2>
              <button onClick={() => setIsMoreModalOpen(false)} className="p-2 bg-[#F7E998]/50 rounded-full text-[#A79277]/70 hover:bg-[#F7E998]">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              <button 
                onClick={() => {
                  const lang = i18n.language || 'uz';
                  setTextModalTitle(t('about_us', 'Biz haqimizda'));
                  setTextModalContent(settings[`about_us_${lang}`] || '');
                  setIsTextModalOpen(true);
                }} 
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-[#1f2937]/10 hover:border-[#1f2937]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                    <Info size={20} />
                  </div>
                  <span className="font-bold text-[#A79277]">{t('about_us', 'Biz haqimizda')}</span>
                </div>
                <ChevronRight size={20} className="text-[#A79277]/70" />
              </button>

              <button 
                onClick={() => {
                  const lang = i18n.language || 'uz';
                  setTextModalTitle(t('contact_admin', 'Admin bilan bog\'lanish'));
                  setTextModalContent(settings[`contact_admin_${lang}`] || '');
                  setIsTextModalOpen(true);
                }} 
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-[#1f2937]/10 hover:border-[#1f2937]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                    <Phone size={20} />
                  </div>
                  <span className="font-bold text-[#A79277]">{t('contact_admin', 'Admin bilan bog\'lanish')}</span>
                </div>
                <ChevronRight size={20} className="text-[#A79277]/70" />
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Text Modal (Settings) */}
      {isTextModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex justify-center items-center p-4" onClick={() => setIsTextModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#A79277]/20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1f2937]">{textModalTitle}</h2>
              <button onClick={() => setIsTextModalOpen(false)} className="p-2 bg-[#FFF2E1] rounded-full hover:bg-[#F7E998]/50">
                <X size={20} className="text-[#A79277]/70" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-[#A79277]/70 leading-relaxed whitespace-pre-wrap">
                {textModalContent || t('not_entered', 'Kiritilmagan')}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientHome;
