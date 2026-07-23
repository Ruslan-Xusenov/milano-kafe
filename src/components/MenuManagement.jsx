import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, FileText, Save } from 'lucide-react';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', name_ru: '', description: '', description_ru: '', price: '', category: '', emoji: '', color: 'bg-gray-100', weight: ''
  });
  const [recipeModalItem, setRecipeModalItem] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ inventory_id: '', amount: '' });

  const fetchData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/categories')
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ name: '', name_ru: '', description: '', description_ru: '', price: '', category: '', emoji: '', color: 'bg-gray-100', weight: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const openRecipeModal = async (item) => {
    setRecipeModalItem(item);
    try {
      const [invRes, recRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch(`/api/menu/${item.id}/ingredients`)
      ]);
      if (invRes.ok) setInventoryItems(await invRes.json());
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  const addIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.inventory_id || !newIngredient.amount) return;
    try {
      await fetch(`/api/menu/${recipeModalItem.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient)
      });
      setNewIngredient({ inventory_id: '', amount: '' });
      // Refresh ingredients
      const recRes = await fetch(`/api/menu/${recipeModalItem.id}/ingredients`);
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  const deleteIngredient = async (id) => {
    try {
      await fetch(`/api/menu/ingredients/${id}`, { method: 'DELETE' });
      const recRes = await fetch(`/api/menu/${recipeModalItem.id}/ingredients`);
      if (recRes.ok) setRecipeIngredients(await recRes.json());
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Menyu Boshqaruvi</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600">
          <Plus className="w-5 h-5" /> Yangi qo'shish
        </button>
      </div>

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
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
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
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{item.category}</td>
                <td className="p-4 font-semibold text-gray-900">{item.price.toLocaleString()} UZS</td>
                <td className="p-4">
                  {item.available ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" /> Mavjud
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3" /> Tugagan
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openRecipeModal(item)} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1">
                      <FileText className="w-4 h-4" /> Tarkib
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Yangi taom qo'shish</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nomi (UZ)</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nomi (RU)</label>
                  <input required type="text" value={formData.name_ru} onChange={e => setFormData({...formData, name_ru: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tarkibi/Ta'rifi (UZ)</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tarkibi/Ta'rifi (RU)</label>
                  <input type="text" value={formData.description_ru} onChange={e => setFormData({...formData, description_ru: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Narxi (UZS)</label>
                <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kategoriya</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded-lg">
                  <option value="">Tanlang...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Emoji yoki Rasm URL (link)</label>
                  <input required type="text" value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="🍔 yoki https://..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Og'irligi (Masalan: 400g)</label>
                  <input type="text" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full p-2 border rounded-lg" />
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
      {/* Recipe Modal */}
      {recipeModalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{recipeModalItem.name} tarkibi (Retsept)</h2>
              <button onClick={() => setRecipeModalItem(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6"/></button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <form onSubmit={addIngredient} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Xom-ashyo (Skladdan)</label>
                  <select 
                    value={newIngredient.inventory_id} 
                    onChange={e => setNewIngredient({...newIngredient, inventory_id: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-amber-500"
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
                    onChange={e => setNewIngredient({...newIngredient, amount: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:border-amber-500"
                    placeholder="Masalan: 0.2"
                  />
                </div>
                <button type="submit" className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[11px] text-gray-400 mt-2">* 1 porsiya taomga ketadigan miqdorni yozing.</p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-2 font-medium">Mahsulot nomi</th>
                    <th className="pb-2 font-medium text-center">Sarflanadi</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipeIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-800">{ing.name}</td>
                      <td className="py-3 text-sm font-semibold text-center text-amber-600">{ing.amount} {ing.unit}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => deleteIngredient(ing.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recipeIngredients.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-sm text-gray-500">
                        Hali retsept biriktirilmagan. Bu taom sotilganda ombordan hech narsa kamaymaydi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setRecipeModalItem(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
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
