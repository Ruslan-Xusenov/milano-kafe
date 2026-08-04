import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * BannersSlider — Hero banner rotatsiyasi
 */
const BannersSlider = ({ banners, currentBanner, setCurrentBanner, setActiveCategory }) => {
  if (!banners.length) return null;

  return (
    <div className="relative mb-12 overflow-hidden rounded-[2rem] min-h-[280px] lg:min-h-[340px] shadow-xl shadow-[#1f2937]/10 border border-[#1f2937]/5">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          onClick={() => {
            if (banner.link_type === 'category' && banner.link_id) {
              setActiveCategory(banner.link_id);
            }
          }}
          className={`absolute inset-0 bg-[#1f2937] p-8 md:p-12 flex items-center transition-opacity duration-1000 ease-in-out ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'} ${banner.link_type === 'category' ? 'cursor-pointer' : ''}`}
        >
          <div className="relative z-20 max-w-xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#f3f4f6]/30 backdrop-blur-md text-[#ffffff] text-xs font-bold uppercase tracking-wider mb-4 border border-[#f3f4f6]/50">
              Premium Tatib Ko'ring
            </span>
            <h2 className="text-4xl lg:text-6xl font-extrabold text-[#ffffff] drop-shadow-sm leading-[1.1] mb-4">{banner.title}</h2>
            <p className="text-[#ffffff]/90 text-lg md:text-xl font-medium leading-relaxed max-w-md">{banner.subtitle}</p>
            <button className="mt-8 px-8 py-3.5 bg-[#FF4747] text-[#ffffff] rounded-full font-bold shadow-xl hover:bg-[#FF4747]/90 transition-transform">
              Buyurtma berish
            </button>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-8 md:pr-16 opacity-95 pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute w-[300px] h-[300px] bg-[#f3f4f6]/20 rounded-full blur-3xl"></div>
              <div className="w-32 h-32 md:w-48 md:h-48 text-7xl md:text-9xl drop-shadow-2xl hover:scale-110 transition-transform duration-700 ease-out">
                {banner.emoji2}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 bg-black/10 backdrop-blur-md px-4 py-2 rounded-full">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === currentBanner ? 'w-8 bg-[#f3f4f6]' : 'w-2 bg-[#ffffff]/50 hover:bg-[#ffffff]/80'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannersSlider;
