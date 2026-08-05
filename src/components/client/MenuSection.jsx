import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formatNumber = (num) => Number(num || 0).toLocaleString('uz-UZ');

/**
 * MenuSection — Catalog grid: kategoriya filtr + search natijalarini ko'rsatish
 */
const MenuSection = ({ menuItems, categories, activeCategory, searchQuery, addToCart, updateQuantity, getItemQuantity, setSelectedProduct }) => {
  const { t, i18n } = useTranslation();

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategory ? item.category === activeCategory : true;
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery ||
      item.name.toLowerCase().includes(q) ||
      (item.name_ru || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6 pt-4 px-4 lg:px-0">
        <h3 id="catalog-section" className="text-2xl font-bold text-[#A79277]">
          {searchQuery
            ? `"${searchQuery}" bo'yicha natijalar`
            : activeCategory ? activeCategory : t('all_dishes', 'Barcha taomlar')}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-4 lg:px-0">
        {filtered.map((item) => {
          const qty = getItemQuantity(item.id);
          let variants = [];
          try {
            variants = typeof item.variants === 'string' ? JSON.parse(item.variants || '[]') : (item.variants || []);
          } catch (e) { variants = []; }
          const hasVariants = variants.length > 0;
          const displayPrice = hasVariants ? Math.min(...variants.map(v => Number(v.price) || Number(item.price))) : item.price;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedProduct(item)}
              className="bg-white rounded-[14px] p-3 border border-[#A79277]/20 flex flex-col h-full cursor-pointer relative transition-colors hover:border-[#A79277]/20"
            >
              <div className="bg-[#FFF2E1] rounded-[12px] h-32 sm:h-40 mb-3 flex items-center justify-center text-[4rem] sm:text-[5rem] overflow-hidden relative">
                <div className="z-10 w-full h-full flex items-center justify-center mix-blend-multiply">
                  {item.emoji?.startsWith('http') ? (
                    <img src={item.emoji} alt={item.name} className="w-full h-full object-cover rounded-[12px]" />
                  ) : (
                    item.emoji
                  )}
                </div>
              </div>

              <div className="flex flex-col flex-1 px-1">
                <div className="mb-1">
                  <h4 className="text-[15px] font-bold text-[#A79277] leading-tight line-clamp-2">
                    {i18n.language === 'ru' ? item.name_ru || item.name : item.name}
                  </h4>
                </div>

                {(item.description || item.description_ru) && (
                  <p className="text-[13px] text-[#A79277]/70 line-clamp-2 mb-3 leading-snug">
                    {i18n.language === 'ru' ? item.description_ru || item.description : item.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-[15px] sm:text-[17px] font-bold text-[#A79277] leading-none tracking-tight">
                    {formatNumber(displayPrice)} <span className="text-[12px] font-medium text-[#A79277]/70">so'm{hasVariants ? 'dan' : ''}</span>
                  </span>

                  {qty === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasVariants) {
                          setSelectedProduct(item);
                        } else {
                          addToCart(item);
                        }
                      }}
                      className="w-10 h-10 bg-[#F7E998]/50 hover:bg-[#F7E998] text-[#A79277] rounded-[10px] transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div
                      className="flex items-center justify-between bg-white rounded-[10px] p-1 w-[90px] border border-[#A79277]/20 shadow-sm cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasVariants) {
                          setSelectedProduct(item);
                        }
                      }}
                    >
                      {hasVariants ? (
                        <div className="w-full text-center py-0.5 text-xs font-black text-[#FF4747] flex items-center justify-center gap-1 hover:opacity-80">
                          <span>{qty} dona</span>
                          <span className="text-[10px] text-[#A79277]/70">(Tanlash)</span>
                        </div>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="w-7 h-7 rounded-[8px] bg-[#FFF2E1] flex items-center justify-center text-[#A79277] hover:bg-[#F7E998]/50 transition-colors">
                            <Minus size={16} strokeWidth={2.5} />
                          </button>
                          <span className="font-bold text-[14px] text-[#A79277]">{qty}</span>
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="w-7 h-7 rounded-[8px] bg-[#FF4747] flex items-center justify-center text-white hover:bg-[#FF4747]/90 transition-colors">
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MenuSection;
