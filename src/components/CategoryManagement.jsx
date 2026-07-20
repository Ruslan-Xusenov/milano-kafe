import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ListTree } from 'lucide-react';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', emoji: '', color: 'text-gray-500', bg: 'bg-gray-100', is_quick: false });

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ name: '', emoji: '', color: 'text-gray-500', bg: 'bg-gray-100', is_quick: false });
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Kategoriyalar Boshqaruvi</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600">
          <Plus className="w-5 h-5" /> Yangi kategoriya qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Kategoriya Nomi</th>
              <th className="p-4 font-medium">Emoji (Rasm)</th>
              <th className="p-4 font-medium">Bosh sahifa (Tayyor ovqatlar)</th>
              <th className="p-4 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{cat.name}</td>
                <td className="p-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl overflow-hidden ${cat.bg} ${cat.color}`}>
                    {cat.emoji?.startsWith('http') ? (
                      <img src={cat.emoji} alt="img" className="w-full h-full object-cover" />
                    ) : (
                      cat.emoji
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {cat.is_quick ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Ha</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Yo'q</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Yangi kategoriya qo'shish</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nomi</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Emoji yoki Rasm URL (link)</label>
                <input required type="text" value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Masalan: 🍕 yoki https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fon rangi (bg)</label>
                  <select value={formData.bg} onChange={e => setFormData({...formData, bg: e.target.value})} className="w-full p-2 border rounded-lg">
                    <option value="bg-gray-100">Kulrang</option>
                    <option value="bg-red-100">Qizil</option>
                    <option value="bg-yellow-100">Sariq</option>
                    <option value="bg-green-100">Yashil</option>
                    <option value="bg-blue-100">Ko'k</option>
                    <option value="bg-amber-100">Tilla</option>
                    <option value="bg-orange-100">Sabzirang</option>
                    <option value="bg-pink-100">Pushti</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Matn rangi</label>
                  <select value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full p-2 border rounded-lg">
                    <option value="text-gray-500">Kulrang</option>
                    <option value="text-red-500">Qizil</option>
                    <option value="text-yellow-500">Sariq</option>
                    <option value="text-green-500">Yashil</option>
                    <option value="text-blue-500">Ko'k</option>
                    <option value="text-amber-600">Tilla</option>
                    <option value="text-orange-500">Sabzirang</option>
                    <option value="text-pink-500">Pushti</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="is_quick" 
                  checked={formData.is_quick} 
                  onChange={e => setFormData({...formData, is_quick: e.target.checked})} 
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                />
                <label htmlFor="is_quick" className="text-sm text-gray-700 font-medium">
                  Bosh sahifaga (Tayyor ovqatlar) sifatida chiqarish
                </label>
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

export default CategoryManagement;
