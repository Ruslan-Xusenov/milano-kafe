import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Info, Sparkles } from 'lucide-react';

const ProductModal = ({ item, onClose, addToCart, removeFromCart, quantity }) => {
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    // Esc bosilganda yopish
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    // Tarkibini backenddan yuklash
    const fetchIngredients = async () => {
      try {
        const res = await fetch(`/api/menu/${item.id}/ingredients`);
        if (res.ok) {
          setIngredients(await res.json());
        }
      } catch (e) {
        console.error("Tarkib yuklanmadi", e);
      }
    };
    fetchIngredients();

    return () => window.removeEventListener('keydown', handleEsc);
  }, [item.id, onClose]);

  // Modal orqasidagi qora fonga bosganda yopish
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#A79277]/60 z-[100] flex items-end md:items-center justify-center backdrop-blur-md transition-opacity p-0 md:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[#FFF2E1] w-full md:w-[540px] md:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 fade-in duration-300 relative flex flex-col max-h-[92vh] md:max-h-[85vh] border border-[#A79277]/20"
      >
        {/* Yuqori qism: Rasm/Emoji va Yopish tugmasi */}
        <div className={`relative w-full h-72 md:h-96 flex items-center justify-center ${item.color || 'bg-[#F7E998]'} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#A79277]/20 to-transparent z-10 pointer-events-none"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 bg-[#FFF2E1]/80 backdrop-blur-xl rounded-full flex items-center justify-center text-[#A79277] hover:bg-[#FFF2E1] hover:text-[#FF4747] transition-colors z-20 shadow-sm border border-[#A79277]/30"
          >
            <X size={24} />
          </button>
          
          <div className="absolute top-6 left-6 z-20">
             <span className="bg-[#FFF2E1]/90 backdrop-blur-md text-[#A79277] px-4 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2">
               <Sparkles size={16} className="text-[#FF4747]" /> Premium
             </span>
          </div>
          
          <div className="absolute w-[400px] h-[400px] bg-[#FFF2E1]/30 rounded-full blur-3xl mix-blend-overlay"></div>
          
          <div className="text-[140px] md:text-[180px] drop-shadow-2xl transform hover:scale-110 transition-transform duration-700 ease-out z-10">
            {item.emoji?.startsWith('http') ? (
              <img src={item.emoji} alt={item.name} className="w-56 h-56 md:w-72 md:h-72 object-cover rounded-full shadow-2xl border-4 border-[#FFF2E1]/50" />
            ) : (
              item.emoji
            )}
          </div>
        </div>

        {/* Ma'lumotlar qismi */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex justify-between items-start gap-4 mb-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#A79277] leading-tight">{item.name}</h2>
          </div>
          
          <div className="flex items-end gap-3 mb-8 pb-6 border-b border-[#A79277]/20">
            <span className="text-4xl font-extrabold text-[#FF4747]">{item.price.toLocaleString()}</span>
            <span className="text-xl font-bold text-[#A79277] mb-1">so'm</span>
            {item.weight && (
              <span className="ml-auto bg-[#F7E998] text-[#A79277] px-4 py-1.5 rounded-full text-sm font-bold border border-[#A79277]/20">
                {item.weight}
              </span>
            )}
          </div>

          <div className="space-y-8">
            {item.description && (
              <div>
                <h3 className="text-xl font-bold text-[#A79277] mb-3 flex items-center gap-2">
                  <Info size={22} className="text-[#FF4747]" />
                  Ta'rif
                </h3>
                <p className="text-[#A79277]/90 leading-relaxed text-base md:text-lg">
                  {item.description}
                </p>
              </div>
            )}

            {ingredients.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[#A79277] mb-4">Tarkibi</h3>
                <div className="flex flex-wrap gap-2.5">
                  {ingredients.map(ing => (
                    <span key={ing.id} className="bg-[#F7E998]/50 text-[#A79277] border border-[#A79277]/30 px-4 py-2 rounded-xl text-sm font-semibold hover:border-[#FF4747] hover:bg-[#F7E998] hover:text-[#FF4747] transition-colors cursor-default">
                      {ing.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pastki qism: Tugma */}
        <div className="p-6 border-t border-[#A79277]/20 bg-[#FFF2E1]/95 backdrop-blur-lg">
          {quantity === 0 ? (
            <button 
              onClick={() => addToCart(item)}
              className="w-full bg-[#FF4747] hover:bg-[#FF4747]/90 text-[#FFF2E1] font-bold py-5 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#FF4747]/30 flex items-center justify-center gap-3"
            >
              <Plus size={24} /> Savatchaga qo'shish
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#F7E998] p-2 rounded-3xl border border-[#A79277]/30">
              <button 
                onClick={() => removeFromCart(item.id)}
                className="w-16 h-14 bg-[#FFF2E1] rounded-2xl shadow-sm flex items-center justify-center hover:bg-[#FFF2E1]/80 active:scale-95 transition-all text-[#A79277]"
              >
                <Minus size={24} strokeWidth={2.5} />
              </button>
              <span className="text-3xl font-extrabold w-20 text-center text-[#A79277]">{quantity}</span>
              <button 
                onClick={() => addToCart(item)}
                className="w-16 h-14 bg-[#FF4747] rounded-2xl shadow-sm flex items-center justify-center hover:bg-[#FF4747]/90 active:scale-95 transition-all text-[#FFF2E1]"
              >
                <Plus size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
