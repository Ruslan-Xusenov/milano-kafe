import React, { useState } from 'react';
import { Printer, Loader2, Phone, CheckCircle2, ChevronRight, XCircle, MapPin } from 'lucide-react';

const OrderCard = ({ order, isCompleted = false, onStatusChange, nextStatus, nextText, userRole }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (status) => {
    setIsProcessing(true);
    if (onStatusChange) {
      await onStatusChange(order.id, status);
    }
    setIsProcessing(false);
  };

  const isNew = order.status === 'new';

  return (
    <div className={`bg-white border-l-[4px] ${isNew ? 'border-amber-500 animate-[pulse-once_2s_ease-in-out]' : (isCompleted ? 'border-emerald-500' : 'border-blue-500')} shadow-sm hover:shadow-md rounded-xl p-4 transition-all duration-300 border border-y-gray-100 border-r-gray-100`}>
      {/* Sarlavha */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-extrabold text-lg text-gray-900">#{order.id}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${isNew ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-100 border-gray-200'}`}>
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      {/* Taomlar */}
      <div className="space-y-2 mb-4 bg-gray-50/80 p-3 rounded-lg border border-gray-100">
        {order.items && order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-gray-700">
            <span className="font-medium">
              {item.name} <span className="text-gray-400 font-normal ml-1">x{item.quantity}</span>
            </span>
            <span className="font-semibold text-gray-900">{(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>
      
      {/* Pastki qism */}
      <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-xs text-gray-800 font-bold">
               {order.customer_name}
             </div>
             <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
               <Phone className="w-3.5 h-3.5" />
               {order.phone}
             </div>
             {order.address && (
               <a 
                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-start gap-1.5 text-xs text-blue-600 font-medium max-w-[160px] leading-tight hover:underline cursor-pointer"
               >
                 <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                 <span>{order.address}</span>
               </a>
             )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="font-bold text-gray-900 text-base">{order.total.toLocaleString()} UZS</p>
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
                    if (onStatusChange) onStatusChange(order.id, order.status); // to trigger a refresh
                  } catch(err) { console.error(err); }
                }}
                className="text-xs border border-gray-200 rounded p-1 bg-gray-50 font-medium focus:outline-none focus:border-amber-400"
              >
                <option value="naqd">Naqd pul</option>
                <option value="karta">Plastik Karta</option>
                <option value="click">Click / Payme</option>
              </select>
            ) : (
              <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                {order.payment_method === 'karta' ? 'Karta' : order.payment_method === 'click' ? 'Click' : 'Naqd'}
              </span>
            )}
          </div>
        </div>
        
        {/* Tugmalar */}
        {!isCompleted ? (
          <div className="flex gap-2 mt-2">
             {isNew && userRole === 'Oshpaz' ? (
               <div className="w-full text-center text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                 Kassir tasdig'i kutilmoqda...
               </div>
             ) : (
               <>
                 {isNew && (
               <button 
                 onClick={() => handleAction('rejected')}
                 disabled={isProcessing}
                 className="flex-1 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm flex justify-center items-center gap-1 transition-colors"
               >
                 <XCircle className="w-4 h-4" /> Rad etish
               </button>
             )}
            <button 
              onClick={() => handleAction(nextStatus)}
              disabled={isProcessing}
              className={`flex-[2] py-2.5 rounded-lg transition-all duration-200 flex justify-center items-center gap-2 font-bold text-sm
                ${isProcessing 
                  ? 'bg-blue-50 text-blue-500 cursor-wait border border-blue-200' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_14px_0_rgb(59,130,246,39%)] hover:shadow-[0_6px_20px_rgba(59,130,246,23%)] hover:-translate-y-0.5'
                }`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {nextText} <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
               </>
             )}
          </div>
        ) : (
          <div className="w-full py-2.5 rounded-lg bg-gray-50 border border-gray-200 flex justify-center items-center gap-2 font-bold text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Yakunlangan</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
