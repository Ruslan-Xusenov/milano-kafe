import { apiFetch } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, X, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '', name_ru: '', emoji: '', color: 'text-gray-500', bg: 'bg-gray-100', is_quick: false
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null); // null = add, object = edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // ---- Open Add ----
  const openAddModal = () => {
    setEditingCat(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  // ---- Open Edit ----
  const openEditModal = (cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || '',
      name_ru: cat.name_ru || '',
      emoji: cat.emoji || '',
      color: cat.color || 'text-gray-500',
      bg: cat.bg || 'bg-gray-100',
      is_quick: !!cat.is_quick
    });
    setShowModal(true);
  };

  // ---- Submit (Add / Edit) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCat) {
        await apiFetch(`/api/categories/${editingCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, available: editingCat.available })
        });
      } else {
        await apiFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      fetchCategories();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/categories/${deleteConfirm}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  // ---- Toggle Available ----
  const handleToggleAvailable = async (cat) => {
    setTogglingId(cat.id);
    try {
      await apiFetch(`/api/categories/${cat.id}/toggle-available`, { method: 'PATCH' });
      fetchCategories();
    } catch (e) { console.error(e); }
    finally { setTogglingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-500">Yuklanmoqda...</div>
  );

  const BG_OPTIONS = [
    { value: 'bg-gray-100', label: 'Kulrang' },
    { value: 'bg-red-100', label: 'Qizil' },
    { value: 'bg-yellow-100', label: 'Sariq' },
    { value: 'bg-green-100', label: 'Yashil' },
    { value: 'bg-blue-100', label: "Ko'k" },
    { value: 'bg-amber-100', label: 'Tilla' },
    { value: 'bg-orange-100', label: 'Sabzirang' },
    { value: 'bg-pink-100', label: 'Pushti' },
    { value: 'bg-purple-100', label: 'Binafsha' },
  ];

  const COLOR_OPTIONS = [
    { value: 'text-gray-500', label: 'Kulrang' },
    { value: 'text-red-500', label: 'Qizil' },
    { value: 'text-yellow-500', label: 'Sariq' },
    { value: 'text-green-500', label: 'Yashil' },
    { value: 'text-blue-500', label: "Ko'k" },
    { value: 'text-amber-600', label: 'Tilla' },
    { value: 'text-orange-500', label: 'Sabzirang' },
    { value: 'text-pink-500', label: 'Pushti' },
    { value: 'text-purple-500', label: 'Binafsha' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Kategoriyalar Boshqaruvi</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-5 h-5" /> Yangi kategoriya
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Kategoriya</th>
              <th className="p-4 font-medium">Ko'rinish</th>
              <th className="p-4 font-medium">Holati</th>
              <th className="p-4 font-medium">Bosh sahifa</th>
              <th className="p-4 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map(cat => (
              <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${!cat.available ? 'opacity-60' : ''}`}>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{cat.name}</div>
                  <div className="text-xs text-gray-400">{cat.name_ru}</div>
                </td>
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
                  {cat.available ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" /> Faol
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <EyeOff className="w-3 h-3" /> Yashirilgan
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {cat.is_quick ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Ha</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Yo'q</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(cat)}
                      title="Tahrirlash"
                      className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Toggle Available */}
                    <button
                      onClick={() => handleToggleAvailable(cat)}
                      disabled={togglingId === cat.id}
                      title={cat.available ? 'Vaqtincha yashirish' : 'Qayta faollashtirish'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        cat.available
                          ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                    >
                      {cat.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteConfirm(cat.id)}
                      title="O'chirish"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-sm text-gray-400">
                  Kategoriyalar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCat ? 'Kategoriyani tahrirlash' : "Yangi kategoriya qo'shish"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nomi (UZ) *</label>
                  <input required type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nomi (RU) *</label>
                  <input required type="text" value={formData.name_ru}
                    onChange={e => setFormData({ ...formData, name_ru: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Emoji yoki Rasm URL *</label>
                <input required type="text" value={formData.emoji}
                  onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🍕 yoki https://..."
                  className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fon rangi</label>
                  <select value={formData.bg}
                    onChange={e => setFormData({ ...formData, bg: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400">
                    {BG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Matn rangi</label>
                  <select value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400">
                    {COLOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden ${formData.bg} ${formData.color}`}>
                  {formData.emoji?.startsWith('http') ? (
                    <img src={formData.emoji} alt="" className="w-full h-full object-cover" />
                  ) : formData.emoji || '?'}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{formData.name || 'Nomi'}</div>
                  <div className="text-xs text-gray-400">{formData.name_ru || 'Rus nomi'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="is_quick"
                  checked={formData.is_quick}
                  onChange={e => setFormData({ ...formData, is_quick: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                />
                <label htmlFor="is_quick" className="text-sm text-gray-700 font-medium">
                  Bosh sahifada (Tayyor ovqatlar) ko'rsatish
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRM MODAL ===================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Haqiqatan o'chirasizmi?</h2>
            <p className="text-sm text-gray-500 mb-6">Bu kategoriya o'chiriladi. Undagi taomlar saqlanib qoladi.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Bekor qilish
              </button>
              <button onClick={handleDelete}
                className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
