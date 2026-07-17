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
        <div className="p-6 space-y-5 text-gray-300 text-sm leading-relaxed">
          <div className="text-center mb-4">
            <p className="text-white font-semibold text-base">✔️ The most trusted wealth management and investment app!</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
                <Gift className="h-4 w-4" />
              </div>
              <p className="text-gray-300">
                <span className="text-emerald-400 font-bold">➤</span> New users receive <span className="text-emerald-400 font-bold">1000 NGN</span> upon registration.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-gray-300">
                <span className="text-indigo-400 font-bold">➤</span> Earn <span className="text-indigo-400 font-bold">35%-1%-1%</span> commission by referring friends.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-gray-300">
                <span className="text-yellow-400 font-bold">➤</span> 24/7 deposits and withdrawals.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-gray-300">
                <span className="text-purple-400 font-bold">➤</span> Earn stable returns on single investments for up to <span className="text-purple-400 font-bold">100 days</span>.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-white font-semibold">
              ↪️ Start building your wealth now!
            </p>
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