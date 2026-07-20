import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: 'Kassir', phone: '', username: '', password: '', salary: '' });

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) setStaff(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ name: '', role: 'Kassir', phone: '', username: '', password: '', salary: '' });
      fetchStaff();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      fetchStaff();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Hodimlar Boshqaruvi</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600">
          <Plus className="w-5 h-5" /> Yangi hodim qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Ismi Familiyasi</th>
              <th className="p-4 font-medium">Lavozimi</th>
              <th className="p-4 font-medium">Telefon raqami</th>
              <th className="p-4 font-medium">Login/Parol</th>
              <th className="p-4 font-medium">Soatbay ish haqi</th>
              <th className="p-4 font-medium">Bu oy ishlagan puli</th>
              <th className="p-4 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.map(person => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">{person.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {person.role}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{person.phone || '-'}</td>
                <td className="p-4">
                  <div className="text-sm font-medium text-gray-900">{person.username}</div>
                  <div className="text-sm text-gray-500">******</div>
                </td>
                <td className="p-4 font-semibold text-gray-900">
                  {person.salary ? `${Number(person.salary).toLocaleString()} UZS` : 'Belgilanmagan'}
                </td>
                <td className="p-4 font-bold text-emerald-600">
                  {person.current_month_earned ? `${Math.round(person.current_month_earned).toLocaleString()} UZS` : '0 UZS'}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(person.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  Hodimlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Yangi hodim qo'shish</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ismi Familiyasi</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telefon</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Lavozimi</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded-lg">
                  <option value="Admin">Admin</option>
                  <option value="Kassir">Kassir</option>
                  <option value="Kuryer">Kuryer</option>
                  <option value="Oshpaz">Oshpaz</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tizimga kirish Logini</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Masalan: sardor" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tizimga kirish Paroli</label>
                  <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Kamida 4ta belgi" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Soatbay ish haqi (1 soatiga, UZS)</label>
                <input required type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Masalan: 20000" />
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

export default Staff;
