import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const BannersManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ 
    title: '', subtitle: '', bg_color: 'bg-sky-200', text_color: 'text-white', 
    sub_text_color: 'text-sky-50', emoji1: '🍔', emoji2: '🍕', emoji3: '🥤',
    link_type: 'none', link_id: ''
  });

  const fetchData = async () => {
    try {
      const [banRes, catRes] = await Promise.all([
        fetch('/api/banners'),
        fetch('/api/categories')
      ]);
      if (banRes.ok) setBanners(await banRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ 
        title: '', subtitle: '', bg_color: 'bg-sky-200', text_color: 'text-white', 
        sub_text_color: 'text-sky-50', emoji1: '🍔', emoji2: '🍕', emoji3: '🥤',
        link_type: 'none', link_id: ''
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Bannerlar Boshqaruvi</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600">
          <Plus className="w-5 h-5" /> Yangi banner qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map(banner => (
          <div key={banner.id} className={`relative overflow-hidden rounded-3xl min-h-[220px] ${banner.bg_color} p-8 flex flex-col justify-center shadow-sm`}>
            <div className="relative z-20 max-w-[60%]">
              <h2 className={`text-2xl lg:text-3xl font-extrabold ${banner.text_color} drop-shadow-md leading-tight mb-2`}>{banner.title}</h2>
              <p className={`${banner.sub_text_color} text-sm font-medium drop-shadow-sm`}>{banner.subtitle}</p>
            </div>
            
            <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-6 opacity-90 pointer-events-none">
              <div className="flex gap-2 items-center">
                <div className="w-16 h-16 text-3xl bg-white/20 rounded-full flex items-center justify-center shadow-md rotate-12">{banner.emoji1}</div>
                <div className="w-24 h-24 text-5xl bg-white/20 rounded-full flex items-center justify-center shadow-lg -rotate-12 -translate-y-2">{banner.emoji2}</div>
                <div className="w-12 h-12 text-2xl bg-white/20 rounded-full flex items-center justify-center shadow-sm rotate-6">{banner.emoji3}</div>
              </div>
            </div>
            
            <button 
              onClick={() => handleDelete(banner.id)} 
              className="absolute top-4 right-4 z-30 p-2 bg-white/80 text-red-500 rounded-full hover:bg-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200">
            Hali hech qanday banner qo'shilmagan
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Yangi banner qo'shish</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sarlavha (Katta matn)</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Masalan: Issiq Pishiriqlar" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Qisqa matn</label>
                <input required type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Ertalabki choy uchun maxsus nonlar" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">1-Emoji/Rasm</label>
                  <input required type="text" value={formData.emoji1} onChange={e => setFormData({...formData, emoji1: e.target.value})} className="w-full p-2 border text-center rounded-lg text-2xl" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">2-Emoji/Rasm</label>
                  <input required type="text" value={formData.emoji2} onChange={e => setFormData({...formData, emoji2: e.target.value})} className="w-full p-2 border text-center rounded-lg text-2xl" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">3-Emoji/Rasm</label>
                  <input required type="text" value={formData.emoji3} onChange={e => setFormData({...formData, emoji3: e.target.value})} className="w-full p-2 border text-center rounded-lg text-2xl" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fon rangi</label>
                  <select value={formData.bg_color} onChange={e => setFormData({...formData, bg_color: e.target.value})} className="w-full p-2 border text-sm rounded-lg">
                    <option value="bg-sky-200">Havorang</option>
                    <option value="bg-amber-200">Sariq</option>
                    <option value="bg-emerald-200">Yashil</option>
                    <option value="bg-pink-200">Pushti</option>
                    <option value="bg-indigo-200">Binafsha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sarlavha rangi</label>
                  <select value={formData.text_color} onChange={e => setFormData({...formData, text_color: e.target.value})} className="w-full p-2 border text-sm rounded-lg">
                    <option value="text-white">Oq</option>
                    <option value="text-amber-900">To'q sariq</option>
                    <option value="text-emerald-900">To'q yashil</option>
                    <option value="text-sky-900">To'q havorang</option>
                    <option value="text-gray-900">Qora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Qisqa matn rangi</label>
                  <select value={formData.sub_text_color} onChange={e => setFormData({...formData, sub_text_color: e.target.value})} className="w-full p-2 border text-sm rounded-lg">
                    <option value="text-sky-50">Oqish havorang</option>
                    <option value="text-amber-800">Sariq</option>
                    <option value="text-emerald-800">Yashil</option>
                    <option value="text-gray-600">Kulrang</option>
                    <option value="text-white">Oq</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-sm text-gray-600 mb-1">Banner bosilganda qayerga o'tsin?</label>
                <div className="flex gap-2">
                  <select value={formData.link_type} onChange={e => setFormData({...formData, link_type: e.target.value, link_id: ''})} className="w-1/3 p-2 border text-sm rounded-lg">
                    <option value="none">Hech qayerga</option>
                    <option value="category">Kategoriyaga o'tish</option>
                  </select>
                  {formData.link_type === 'category' && (
                    <select value={formData.link_id} onChange={e => setFormData({...formData, link_id: e.target.value})} className="w-2/3 p-2 border text-sm rounded-lg">
                      <option value="">Kategoriyani tanlang...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannersManagement;
