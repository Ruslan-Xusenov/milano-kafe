import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, total: 0 });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reviews');
      if (!res.ok) throw new Error('Tarmoq xatosi');
      const data = await res.json();
      setReviews(data);
      
      if (data.length > 0) {
        const totalScore = data.reduce((sum, rev) => sum + rev.rating, 0);
        setStats({
          average: (totalScore / data.length).toFixed(1),
          total: data.length
        });
      }
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} 
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Mijozlar Fikri</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="bg-orange-100 p-4 rounded-full">
            <Star size={32} className="text-orange-600 fill-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">O'rtacha Baho</p>
            <p className="text-3xl font-bold text-gray-900">{stats.average} <span className="text-lg text-gray-400 font-normal">/ 5.0</span></p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <MessageSquare size={32} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Umumiy Izohlar</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total} <span className="text-lg text-gray-400 font-normal">ta</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">So'nggi Fikr-mulohazalar (Anonim)</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Hozircha hech kim baho qoldirmagan.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex space-x-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleString('uz-UZ')}
                  </span>
                </div>
                {review.comment ? (
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                ) : (
                  <p className="text-gray-400 italic mt-2">Izohsiz baholangan</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagement;
