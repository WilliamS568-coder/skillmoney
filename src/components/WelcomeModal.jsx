import React from 'react';
import { X, Gift, Users, Clock, TrendingUp } from 'lucide-react';

export default function WelcomeModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#10111a] border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-900/80 flex justify-between items-center bg-[#0d0e16]">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-lg text-white">Welcome to Skill Money!</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

         {/* Modal Body */}
         <div className="p-6 space-y-4 text-gray-300 text-sm leading-relaxed">
           <div className="text-center mb-3">
             <p className="text-white font-semibold text-base">🎉 You've received ₦1,000 welcome bonus!</p>
           </div>

           <div className="space-y-2.5">
             <div className="flex items-start gap-2.5">
               <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
                 <Gift className="h-3.5 w-3.5" />
               </div>
               <p className="text-gray-300 text-xs">
                 <span className="text-emerald-400 font-bold">•</span> Earn <span className="text-emerald-400 font-bold">35%-1%-1%</span> commission from referrals
               </p>
             </div>

             <div className="flex items-start gap-2.5">
               <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                 <TrendingUp className="h-3.5 w-3.5" />
               </div>
               <p className="text-gray-300 text-xs">
                 <span className="text-indigo-400 font-bold">•</span> Invest & earn daily returns for up to 100 days
               </p>
             </div>

             <div className="flex items-start gap-2.5">
               <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-500 shrink-0">
                 <Clock className="h-3.5 w-3.5" />
               </div>
               <p className="text-gray-300 text-xs">
                 <span className="text-yellow-400 font-bold">•</span> 24/7 deposits & withdrawals
               </p>
             </div>
           </div>
         </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-900/80 bg-[#0d0e16] flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            Get Started
          </button>
        </div>

      </div>
    </div>
  );
}