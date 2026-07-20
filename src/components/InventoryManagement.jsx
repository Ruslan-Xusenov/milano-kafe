import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Save } from 'lucide-react';

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', unit: 'kg', quantity: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) setInventory(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`/api/inventory/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', unit: 'kg', quantity: '' });
      fetchInventory();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, unit: item.unit, quantity: item.quantity });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      fetchInventory();
    } catch (e) { console.error(e); }
  };

  const handleQuickQuantityUpdate = async (item, change) => {
    const newQty = Number(item.quantity) + change;
    if (newQty < 0) return;
    try {
      await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, quantity: newQty })
      });
      fetchInventory();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ombor Boshqaruvi</h1>
          <p className="text-sm text-gray-500 mt-1">Xom-ashyolar va qoldiqlarni nazorat qilish</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', unit: 'kg', quantity: '' }); setShowModal(true); }} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
          <Plus className="w-5 h-5" /> Yangi Mahsulot Qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Mahsulot nomi</th>
              <th className="p-4 font-medium text-center">O'lchov birligi</th>
              <th className="p-4 font-medium text-center">Qoldiq miqdor</th>
              <th className="p-4 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  {item.name}
                </td>
                <td className="p-4 text-center">
                  <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold uppercase">{item.unit}</span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => handleQuickQuantityUpdate(item, -1)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 font-bold">-</button>
                    <span className={`font-bold text-lg ${item.quantity <= 0 ? 'text-red-500' : 'text-gray-900'}`}>{item.quantity}</span>
                    <button onClick={() => handleQuickQuantityUpdate(item, 1)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-100 font-bold">+</button>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      Tahrirlash
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td colSpan="4" className="p-12 text-center text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  Omborda mahsulotlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mahsulot nomi (Masalan: Go'sht)</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">O'lchov birligi</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="kg">Kg</option>
                    <option value="litr">Litr</option>
                    <option value="dona">Dona</option>
                    <option value="gramm">Gramm</option>
                    <option value="pors">Porsiya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Boshlang'ich qoldiq</label>
                  <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="0" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" /> Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
