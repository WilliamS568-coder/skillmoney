import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { Play, CheckCircle2, AlertTriangle, Wallet, Clock, Sparkles } from 'lucide-react';

export default function Tasks() {
  const [dailyCompleted, setDailyCompleted] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentAdIndex, setCurrentAdIndex] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  const dailyLimit = 5;
  const rewardAmount = 200; // ₦200 reward money per task

  // Load the Adsterra Social Bar ONLY when they are on this screen
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://pl30370502.effectivecpmnetwork.com/23/c2/5e/23c25e4c735b73f0b6313505ad2dae3s.js";
    script.async = true;
    
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      const adElements = document.querySelectorAll('[id^="at_"]');
      adElements.forEach(el => el.remove());
    };
  }, []);

  // Fetch and handle the 24-hour daily reset logic
  useEffect(() => {
    const fetchUserProgressAndReset = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('daily_completed, last_task_reset')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          const now = new Date();
          const lastReset = new Date(profile.last_task_reset || now);
          const hoursPassed = (now - lastReset) / (1000 * 60 * 60);

          if (hoursPassed >= 24) {
            const { error: resetError } = await supabase
              .from('profiles')
              .update({
                daily_completed: 0,
                last_task_reset: now.toISOString()
              })
              .eq('id', user.id);

            if (resetError) throw resetError;
            setDailyCompleted(0);
          } else {
            setDailyCompleted(profile.daily_completed || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProgressAndReset();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    let timer;
    if (isWatching && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isWatching, timeLeft]);

  const startTask = (index) => {
    if (dailyCompleted >= dailyLimit) {
      toast.error("You've reached your daily limit! Come back tomorrow.");
      return;
    }
    setCurrentAdIndex(index);
    setTimeLeft(30);
    setIsWatching(true);
    toast.success("Task started! Keep this screen active.");
  };

  const claimReward = async () => {
    setClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('balance, daily_completed')
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const newBalance = (profile.balance || 0) + rewardAmount;
        const newDailyCompleted = (profile.daily_completed || 0) + 1;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            balance: newBalance,
            daily_completed: newDailyCompleted,
            last_task_reset: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        toast.success(`+₦${rewardAmount} successfully added to your balance! 💰`);
        setDailyCompleted(newDailyCompleted);
        setIsWatching(false);
        setCurrentAdIndex(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update balance. Try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080e] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080e] text-white p-4 sm:p-6 font-sans flex flex-col items-center">
      
      {/* Header Info */}
      <div className="w-full max-w-2xl text-center mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Earning Station 💰</h1>
        <p className="text-gray-450 text-xs sm:text-sm px-2">Interact with sponsored campaigns below to boost your earnings.</p>
        
        {/* Progress Tracker Card */}
        <div className="mt-4 sm:mt-6 bg-[#0d0e16] border border-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-300">Daily Tasks Completed</span>
          </div>
          <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold">
            {dailyCompleted} / {dailyLimit}
          </span>
        </div>
      </div>

      {/* ACTIVE TASK ENGAGEMENT CARD */}
      {isWatching ? (
        <div className="w-full max-w-2xl bg-[#0d0e16] border border-indigo-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-4 sm:space-y-6 shadow-2xl">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1">Active Engagement Offer</h2>
            <p className="text-[11px] sm:text-xs text-gray-450 max-w-sm px-2">
              Keep this tab active. Look at the dynamic floating smart offers appearing on your screen now!
            </p>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-indigo-400">
            {timeLeft > 0 ? `${timeLeft}s` : "Ready!"}
          </div>

          {/* CLAIM ACTION BUTTON */}
          <button
            onClick={claimReward}
            disabled={timeLeft > 0 || claiming}
            className="w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-gray-600 active:scale-95 transition-all text-white font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2"
          >
            {claiming ? "Processing..." : timeLeft > 0 ? "Unlock Reward after Countdown" : "Claim Reward →"}
          </button>
        </div>
      ) : (
        /* TASKS SELECTION GRID */
        <div className="w-full max-w-2xl space-y-3 sm:space-y-4">
          {[...Array(dailyLimit)].map((_, index) => {
            const isCompleted = index < dailyCompleted;
            const isLocked = index > dailyCompleted;

            return (
              <div 
                key={index} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all gap-3 sm:gap-0 ${
                  isCompleted 
                    ? 'bg-emerald-950/10 border-emerald-900/30' 
                    : isLocked 
                    ? 'bg-[#0d0e16]/40 border-slate-950 opacity-40' 
                    : 'bg-[#0d0e16] border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl ${isCompleted ? 'bg-emerald-500/20' : 'bg-indigo-600/10'}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                    ) : (
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-200">Sponsored Task Slot #{index + 1}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="h-3 sm:h-3.5 sm:w-3.5 w-3" /> 30-sec watch • <Sparkles className="h-3 sm:h-3.5 sm:w-3.5 w-3 text-indigo-400" /> Earn ₦{rewardAmount}
                    </p>
                  </div>
                </div>

                <div className="flex sm:block justify-end w-full sm:w-auto">
                  {isCompleted ? (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                      Completed
                    </span>
                  ) : isLocked ? (
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 bg-slate-900/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                      Locked
                    </span>
                  ) : (
                    <button
                      onClick={() => startTask(index)}
                      className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-[11px] sm:text-xs font-extrabold text-white rounded-lg sm:rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-600/15"
                    >
                      Start Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Notice Panel */}
      <div className="w-full max-w-2xl bg-[#0d0e16]/50 border border-amber-500/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-6 sm:p-8 flex gap-2.5 sm:gap-3 text-left">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
          <span className="font-bold text-amber-500">Security Rule:</span> Attempting to use script-blockers, running bots, or refreshing tabs to bypass timers will result in automatic account suspension.
        </div>
      </div>

    </div>
  );
}