import { apiFetch } from '../context/AuthContext';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Edit2, CheckCircle2, XCircle, FileText,
  EyeOff, Eye, Tag, Search, X, Save, AlertTriangle
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', name_ru: '', description: '', description_ru: '',
  price: '', category: '', emoji: '', color: 'bg-gray-100', weight: '', variants: []
};

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);   // add/edit
  const [editingItem, setEditingItem] = useState(null); // null = add, object = edit
  const [discountModal, setDiscountModal] = useState(null); // item for discount
  const [discountValue, setDiscountValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // item id to delete
  const [recipeModalItem, setRecipeModalItem] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newVariant, setNewVariant] = useState({ name: '', price: '' });

  // Recipe state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ inventory_id: '', amount: '' });

  // Search & filter
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterAvail, setFilterAvail] = useState('all'); // all | active | hidden

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        apiFetch('/api/menu'),
        apiFetch('/api/categories')
      ]);
      if (menuRes.ok) setItems(await menuRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ---- Filtered list ----
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.name_ru || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCat || item.category === filterCat;
      const matchAvail = filterAvail === 'all' ? true
        : filterAvail === 'active' ? item.available
        : !item.available;
      return matchSearch && matchCat && matchAvail;
    });
  }, [items, search, filterCat, filterAvail]);

  // ---- Open Add Modal ----
  const openAddModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  // ---- Open Edit Modal ----
  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      name_ru: item.name_ru || '',
      description: item.description || '',
      description_ru: item.description_ru || '',
      price: item.price || '',
      category: item.category || '',
      emoji: item.emoji || '',
      color: item.color || 'bg-gray-100',
      weight: item.weight || '',
      variants: Array.isArray(item.variants) ? item.variants : []
    });
    setNewVariant({ name: '', price: '' });
    setShowModal(true);
  };

  const addVariant = () => {
    if (!newVariant.name || !newVariant.price) return;
    const updated = [...(formData.variants || []), { name: newVariant.name, name_ru: newVariant.name, price: Number(newVariant.price) }];
    setFormData({ ...formData, variants: updated });
    setNewVariant({ name: '', price: '' });
  };

  const removeVariant = (idx) => {
    const updated = (formData.variants || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, variants: updated });
  };

  // ---- Submit (Add / Edit) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        // UPDATE
        await apiFetch(`/api/menu/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, available: editingItem.available })
        });
      } else {
        // INSERT
        await apiFetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/menu/${deleteConfirm}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  // ---- Toggle Available ----
  const handleToggleAvailable = async (item) => {
    setTogglingId(item.id);
    try {
      await apiFetch(`/api/menu/${item.id}/toggle-available`, { method: 'PATCH' });
      fetchData();
    } catch (e) { console.error(e); }
    finally { setTogglingId(null); }
  };

  // ---- Discount ----
  const openDiscountModal = (item) => {
    setDiscountModal(item);
    setDiscountValue(item.discount_percent ? String(item.discount_percent) : '');
  };

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    if (!discountModal) return;
    try {
      await apiFetch(`/api/menu/${discountModal.id}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_percent: parseInt(discountValue, 10) || 0 })
      });
      setDiscountModal(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  // ---- Recipe Modal ----
  const openRecipeModal = async (item) => {
    setRecipeModalItem(item);
    try {
      const [invRes, recRes] = await Promise.all([
        apiFetch('/api/inventory'),
        apiFetch(`/api/menu/${item.id}/ingredients`)
      ]);
      if (invRes.ok) setInventoryItems(await invRes.json());
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  const addIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.inventory_id || !newIngredient.amount) return;
    try {
      await apiFetch(`/api/menu/${recipeModalItem.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient)
      });
      setNewIngredient({ inventory_id: '', amount: '' });
      const recRes = await apiFetch(`/api/menu/${recipeModalItem.id}/ingredients`);
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  const deleteIngredient = async (id) => {
    try {
      await apiFetch(`/api/menu/ingredients/${id}`, { method: 'DELETE' });
      const recRes = await apiFetch(`/api/menu/${recipeModalItem.id}/ingredients`);
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-500">Yuklanmoqda...</div>
  );

  const discountedPrice = (item) => {
    if (!item.discount_percent) return null;
    return Math.round(item.price * (1 - item.discount_percent / 100));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Menyu Boshqaruvi</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-5 h-5" /> Yangi qo'shish
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom bo'yicha qidirish..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-400"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-400"
        >
          <option value="">Barcha kategoriyalar</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        <select
          value={filterAvail}
          onChange={e => setFilterAvail(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-400"
        >
          <option value="all">Barcha holatlar</option>
          <option value="active">Faol</option>
          <option value="hidden">Vaqtincha yashirilgan</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filteredItems.length} ta taom</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Taom</th>
              <th className="p-4 font-medium">Kategoriya</th>
              <th className="p-4 font-medium">Narxi</th>
              <th className="p-4 font-medium">Holati</th>
              <th className="p-4 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map(item => (
              <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${!item.available ? 'opacity-60' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl overflow-hidden ${item.color}`}>
                      {item.emoji?.startsWith('http') ? (
                        <img src={item.emoji} alt="img" className="w-full h-full object-cover" />
                      ) : (
                        item.emoji
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.name_ru}</div>
                      {item.variants && item.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.variants.map((v, idx) => (
                            <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] px-1.5 py-0.5 rounded font-medium">
                              {v.name}: {Number(v.price).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-600 text-sm">{item.category}</td>
                <td className="p-4">
                  {item.discount_percent > 0 ? (
                    <div>
                      <div className="text-xs line-through text-gray-400">{item.price.toLocaleString()} UZS</div>
                      <div className="font-semibold text-green-600">{discountedPrice(item).toLocaleString()} UZS</div>
                      <span className="inline-block text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">-{item.discount_percent}%</span>
                    </div>
                  ) : (
                    <div className="font-semibold text-gray-900">{item.price.toLocaleString()} UZS</div>
                  )}
                </td>
                <td className="p-4">
                  {item.available ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" /> Faol
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <EyeOff className="w-3 h-3" /> Yashirilgan
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1.5 flex-wrap">
                    {/* Recipe */}
                    <button
                      onClick={() => openRecipeModal(item)}
                      title="Retsept"
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(item)}
                      title="Tahrirlash"
                      className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Discount */}
                    <button
                      onClick={() => openDiscountModal(item)}
                      title="Aksiya"
                      className="p-1.5 text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    {/* Toggle Available */}
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      disabled={togglingId === item.id}
                      title={item.available ? 'Vaqtincha yashirish' : 'Qayta faollashtirish'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.available
                          ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                    >
                      {item.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      title="O'chirish"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-sm text-gray-400">
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {editingItem ? 'Taomni tahrirlash' : "Yangi taom qo'shish"}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Ta'rifi (UZ)</label>
                  <input type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Ta'rifi (RU)</label>
                  <input type="text" value={formData.description_ru}
                    onChange={e => setFormData({ ...formData, description_ru: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Narxi (UZS) *</label>
                  <input required type="number" value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Og'irligi (Masalan: 400g)</label>
                  <input type="text" value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kategoriya</label>
                <select value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:border-amber-400">
                  <option value="">Tanlang...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Emoji yoki Rasm URL *</label>
                <input required type="text" value={formData.emoji}
                  onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🍔 yoki https://..."
                  className="w-full p-2 border rounded-lg outline-none focus:border-amber-400" />
              </div>

              {/* Variantlar boshqaruvi */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/70 mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mahsulot variantlari (Porsi, dona, litr, sm, xl)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Agar taom turli hajm yoki miqdorda (masalan: 0.5l, 1 porsiya, 4 dona, 30sm) sotilsa, bu yerdan belgilashingiz mumkin:
                </p>
                
                {/* Mavjud variantlar */}
                {formData.variants && formData.variants.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {formData.variants.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                        <span className="font-medium text-sm text-gray-800">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-amber-600 font-semibold">{Number(v.price).toLocaleString()} UZS</span>
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yangi variant qo'shish inputlari */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Nomi: 0.5L, 1 pors..."
                    value={newVariant.name}
                    onChange={e => setNewVariant({ ...newVariant, name: e.target.value })}
                    className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-400"
                  />
                  <input
                    type="number"
                    placeholder="Narxi (UZS)"
                    value={newVariant.price}
                    onChange={e => setNewVariant({ ...newVariant, price: e.target.value })}
                    className="w-32 p-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Qo'shish
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
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

      {/* ===================== DISCOUNT MODAL ===================== */}
      {discountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-500" /> Aksiya elon qilish
              </h2>
              <button onClick={() => setDiscountModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold">{discountModal.name}</span> uchun chegirma foizini kiriting.
              <br />0 kiritsangiz — aksiya olib tashlanadi.
            </p>
            <form onSubmit={handleSaveDiscount} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Chegirma foizi (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="99" required
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder="Masalan: 20"
                    className="flex-1 p-2 border rounded-lg outline-none focus:border-pink-400 text-xl font-bold"
                  />
                  <span className="text-2xl font-bold text-gray-400">%</span>
                </div>
                {discountValue > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    Yangi narx: <strong>{Math.round(discountModal.price * (1 - discountValue / 100)).toLocaleString()} UZS</strong>
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDiscountModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Bekor qilish
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
                  Saqlash
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
            <p className="text-sm text-gray-500 mb-6">Bu taom va uning retsepti butunlay o'chiriladi.</p>
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

      {/* ===================== RECIPE MODAL ===================== */}
      {recipeModalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{recipeModalItem.name} — Retsept</h2>
              <button onClick={() => setRecipeModalItem(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <form onSubmit={addIngredient} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Xom-ashyo (Skladdan)</label>
                  <select
                    value={newIngredient.inventory_id}
                    onChange={e => setNewIngredient({ ...newIngredient, inventory_id: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-amber-400"
                    required
                  >
                    <option value="">Tanlang...</option>
                    {inventoryItems.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">Miqdori</label>
                  <input
                    type="number" step="0.001" required
                    value={newIngredient.amount}
                    onChange={e => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-amber-400"
                    placeholder="0.2"
                  />
                </div>
                <button type="submit" className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[150px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-2 font-medium">Mahsulot</th>
                    <th className="pb-2 font-medium text-center">Sarflanadi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipeIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-gray-50">
                      <td className="py-2.5 text-sm text-gray-800">{ing.name}</td>
                      <td className="py-2.5 text-sm font-semibold text-center text-amber-600">
                        {ing.amount} {ing.unit}
                      </td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => deleteIngredient(ing.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recipeIngredients.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-sm text-gray-400">
                        Hali retsept biriktirilmagan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setRecipeModalItem(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
