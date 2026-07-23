import React, { useState } from 'react';
import { Loader2, Phone, CheckCircle2, ChevronRight, XCircle, MapPin } from 'lucide-react';

const OrderCard = ({ order, isCompleted = false, onStatusChange, nextStatus, nextText, userRole }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAction = async (status) => {
    setIsProcessing(true);
    if (onStatusChange) {
      await onStatusChange(order.id, status);
    }
    setIsProcessing(false);
    setIsModalOpen(false); // Modalni yopish
  };

  const isNew = order.status === 'new';

  return (
    <>
      {/* COMPACT CARD */}
      <div 
        onClick={() => setIsModalOpen(true)}
        className={`cursor-pointer bg-white border-l-[4px] ${isNew ? 'border-amber-500 animate-[pulse-once_2s_ease-in-out]' : (isCompleted ? 'border-emerald-500' : 'border-blue-500')} shadow-sm hover:shadow-md rounded-xl p-3 transition-all duration-300 border border-y-gray-100 border-r-gray-100 flex justify-between items-center`}
      >
        <div className="flex flex-col">
          <span className="font-extrabold text-lg text-gray-900">#{order.id}</span>
          <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]">{order.customer_name}</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${isNew ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-100 border-gray-200'}`}>
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="font-bold text-gray-900 text-sm leading-none">{order.total.toLocaleString()} UZS</span>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal Sarlavha */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 pr-12">
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-gray-900">Buyurtma #{order.id}</span>
                <span className={`text-xs font-bold px-2 py-1 mt-1 rounded-md border w-fit ${isNew ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-white rounded-full p-1 shadow-sm border border-gray-100 transition-colors z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>

            {/* Modal Tana */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
              
              {/* Mijoz Ma'lumotlari */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-800 font-bold">
                  {order.customer_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                  <Phone className="w-4 h-4 text-blue-500" />
                  {order.phone}
                </div>
                {order.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-blue-600 font-medium leading-tight hover:underline cursor-pointer mt-1"
                  >
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{order.address}</span>
                  </a>
                )}
              </div>

              {/* Taomlar ro'yxati */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 text-sm">Buyurtma qilingan taomlar:</h3>
                <div className="space-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-700 items-center">
                      <span className="font-medium flex-1">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-bold bg-white px-2 py-0.5 rounded border border-gray-100">x{item.quantity}</span>
                        <span className="font-semibold text-gray-900 w-20 text-right">{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Jami narx va to'lov usuli */}
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500 font-medium">Jami hisob</span>
                  <span className="font-black text-xl text-[#FF4747]">{order.total.toLocaleString()} <span className="text-sm">UZS</span></span>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500 font-medium">To'lov turi</span>
                  {userRole === 'Admin' || userRole === 'Kassir' ? (
                    <select 
                      value={order.payment_method || 'naqd'}
                      onChange={async (e) => {
                        try {
                          await fetch(`/api/orders/${order.id}/payment`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ payment_method: e.target.value })
                          });
                          if (onStatusChange) onStatusChange(order.id, order.status);
                        } catch(err) { console.error(err); }
                      }}
                      className="text-sm border border-gray-200 rounded-lg py-1.5 px-2 bg-white font-bold focus:outline-none focus:border-[#FF4747] shadow-sm cursor-pointer"
                    >
                      <option value="naqd">Naqd pul</option>
                      <option value="karta">Plastik Karta</option>
                      <option value="click">Click / Payme</option>
                    </select>
                  ) : (
                    <span className="text-sm font-bold px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm">
                      {order.payment_method === 'karta' ? 'Karta' : order.payment_method === 'click' ? 'Click' : 'Naqd'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Modal Tugmalar (Footer) */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              {!isCompleted ? (
                <div className="flex gap-3">
                  {isNew && userRole === 'Oshpaz' ? (
                    <div className="w-full text-center text-sm font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm">
                      Kassir tasdig'i kutilmoqda...
                    </div>
                  ) : (
                    <>
                      {isNew && (
                        <button 
                          onClick={() => handleAction('rejected')}
                          disabled={isProcessing}
                          className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm flex justify-center items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <XCircle className="w-4 h-4" /> Rad etish
                        </button>
                      )}
                      <button 
                        onClick={() => handleAction(nextStatus)}
                        disabled={isProcessing}
                        className={`flex-[2] py-3 rounded-xl transition-all duration-200 flex justify-center items-center gap-2 font-bold text-sm shadow-md
                          ${isProcessing 
                            ? 'bg-blue-50 text-blue-500 cursor-wait border border-blue-200' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_14px_0_rgb(59,130,246,39%)] hover:shadow-[0_6px_20px_rgba(59,130,246,23%)] hover:-translate-y-0.5'
                          }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            {nextText} <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-center items-center gap-2 font-bold text-emerald-600 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Yakunlangan Buyurtma</span>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

export default OrderCard;
