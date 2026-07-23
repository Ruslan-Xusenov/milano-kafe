import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';

const SettingsManagement = () => {
  const [settings, setSettings] = useState({
    about_us_uz: '',
    about_us_ru: '',
    contact_admin_uz: '',
    contact_admin_ru: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data) {
        setSettings(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Sozlamalarni yuklashda xatolik yuz berdi');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await axios.put('/api/settings', settings);
      toast.success('Sozlamalar muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Sozlamalarni saqlashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sozlamalar</h1>
          <p className="text-gray-500 mt-1">Ilova uchun umumiy ma'lumotlarni tahrirlash</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 bg-[#A79277] text-white px-6 py-2.5 rounded-xl hover:bg-[#8a765c] transition-colors shadow-sm disabled:opacity-50"
        >
          <Save size={20} />
          {isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* About Us */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Biz haqimizda</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">O'zbek tilida</label>
              <textarea
                value={settings.about_us_uz}
                onChange={(e) => handleChange('about_us_uz', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A79277]/20 focus:border-[#A79277]"
                placeholder="Biz haqimizda ma'lumotlarni kiriting..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rus tilida (На русском)</label>
              <textarea
                value={settings.about_us_ru}
                onChange={(e) => handleChange('about_us_ru', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A79277]/20 focus:border-[#A79277]"
                placeholder="Введите информацию о нас..."
              />
            </div>
          </div>
        </div>

        {/* Contact Admin */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Admin bilan bog'lanish</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">O'zbek tilida</label>
              <textarea
                value={settings.contact_admin_uz}
                onChange={(e) => handleChange('contact_admin_uz', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A79277]/20 focus:border-[#A79277]"
                placeholder="Masalan: Telegram: @admin, Tel: +998901234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rus tilida (На русском)</label>
              <textarea
                value={settings.contact_admin_ru}
                onChange={(e) => handleChange('contact_admin_ru', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A79277]/20 focus:border-[#A79277]"
                placeholder="Например: Telegram: @admin, Тел: +998901234567"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;
