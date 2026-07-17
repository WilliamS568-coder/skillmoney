import React, { useState, useEffect } from 'react';
import { Wallet, MessageSquare, ExternalLink, TrendingUp, Wallet as WalletIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const nigerianNames = [
  "Emeka Nwosu", "Chinedu Okeke", "Abubakar Adeola", "Tunde Balogun", "Chioma Adebayo", 
  "Fatima Ibrahim", "Oluwaseun Ajayi", "Blessing Okon", "Yusuf Aliyu", "Funmi Awosika",
  "Ngozi Eze", "Ibrahim Bello", "Amina Dahiru", "Kelechi Onyeka", "Temitope Alao",
  "Fatima Musa", "Femi Johnson", "Uche Chukwu", "Adeola Adeniyi", "mathew Haruna"
];

const nigerianBanks = [
  "Zenith Bank", "GTBank", "Access Bank", "UBA", "First Bank", 
  "Fidelity Bank", "OPay", "Palmpay", "Kuda Bank", "Sterling Bank"
];

export default function HomeView({ profile, setProfile }) {
  const [claimed, setClaimed] = useState(false);
  const [openedChannel, setOpenedChannel] = useState(false);
  const [pendingRecharges, setPendingRecharges] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [dailyIncome, setDailyIncome] = useState(0);
  
  const [withdrawals, setWithdrawals] = useState([
    { id: 1, name: "Fatima Tomiwa", amount: 49000, bank: "Zenith Bank", time: "3 min ago" },
    { id: 2, name: "Femi Johnson", amount: 33000, bank: "GTBank", time: "7 min ago" },
    { id: 3, name: "Fatima Samuel", amount: 35000, bank: "GTBank", time: "1 min ago" },
    { id: 4, name: "Uche Chukwu", amount: 39000, bank: "OPay", time: "4 min ago" }
  ]);

  // Check if user has already claimed the telegram bonus
  useEffect(() => {
    if (profile?.telegram_claimed) {
      setClaimed(true);
    }
  }, [profile]);

  // Fetch purchases and calculate daily income
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: purchasesData, error } = await supabase
          .from('user_purchases')
          .select('*, products(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gte('expiry_date', new Date().toISOString());

        if (error) {
          // Silently handle if table doesn't exist
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return;
          }
          throw error;
        }
        setPurchases(purchasesData || []);
        
        const total = purchasesData?.reduce((sum, p) => sum + (p.products?.daily_income || 0), 0) || 0;
        setDailyIncome(total);
      } catch (error) {
        // Only log if it's not a "table doesn't exist" error
        if (!error.message?.includes('does not exist')) {
          console.debug('Purchases not available:', error.message);
        }
      }
    };
    fetchPurchases();
  }, [profile?.balance]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomName = nigerianNames[Math.floor(Math.random() * nigerianNames.length)];
      const randomBank = nigerianBanks[Math.floor(Math.random() * nigerianBanks.length)];
      const randomAmount = Math.floor(Math.random() * (850 - 150 + 1) + 150) * 100;
      
      const newWithdrawal = {
        id: Date.now(),
        name: randomName,
        amount: randomAmount,
        bank: randomBank,
        time: "Just now"
      };

      setWithdrawals((prev) => {
        const updatedPrev = prev.map(w => w.time === "Just now" ? { ...w, time: "1 min ago" } : w);
        return [newWithdrawal, ...updatedPrev].slice(0, 10);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenChannel = () => {
    setOpenedChannel(true);
    window.open("https://t.me/+bXqOsMT73P02YjI0", "_blank");
  };

  const handleClaimReward = async () => {
    if (!openedChannel || claimed) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to claim reward');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ telegram_claimed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error claiming reward:', error);
        toast.error('Failed to claim reward. Please try again.');
        return;
      }

      setClaimed(true);
      
      if (setProfile && profile) {
        setProfile({ ...profile, balance: (profile.balance || 0) + 500 });
      }
      
      toast.success("₦500 credited to your account!");
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-24 md:pb-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-indigo-500 tracking-wide">Skill Money</h1>
      </div>

      {/* Balance Card */}
      <div className="relative bg-[#3c44db]/85 p-6 rounded-3xl text-center shadow-[0_0_30px_rgba(60,68,219,0.25)] border border-indigo-500/20">
        <div className="flex items-center justify-center gap-2 text-indigo-200/90 text-[11px] font-semibold tracking-widest uppercase mb-1">
          <Wallet className="h-3.5 w-3.5" /> TOTAL BALANCE
        </div>
        <h2 className="text-4xl font-black text-white">
          ₦{(profile?.balance || 0).toLocaleString()} <span className="text-lg font-normal text-indigo-200">NGN</span>
        </h2>
        <p className="text-indigo-200/70 text-[11px] mt-2">
          Total earned: ₦{(profile?.balance || 0).toLocaleString()} NGN
        </p>
      </div>

      {/* Pending Recharges Alert */}
      {pendingRecharges.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-bold text-yellow-400">PENDING RECHARGE</h3>
          </div>
          {pendingRecharges.map(recharge => (
            <div key={recharge.id} className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-300">₦{recharge.amount.toLocaleString()} recharge request</p>
                <p className="text-[10px] text-gray-500">Waiting for admin approval</p>
              </div>
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                PENDING
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Personal Milestone Boxes */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-200">PERSONAL MILESTONE</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Income Box */}
          <div className="bg-[#10111a] border border-slate-900 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-semibold text-gray-300">Daily Income</span>
            </div>
            <div className="text-3xl font-black text-white">
              ₦ {dailyIncome.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-credited daily</p>
          </div>

          {/* Commission Box */}
          <div className="bg-[#10111a] border border-slate-900 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <WalletIcon className="h-5 w-5" />
              <span className="text-sm font-semibold text-gray-300">Commission</span>
            </div>
            <div className="text-3xl font-black text-white">
              ₦ {profile?.referral_earnings?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">From referrals</p>
          </div>
        </div>
      </div>

      {/* Active Products Section */}
      {purchases.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200">ACTIVE PRODUCTS</h3>
          <div className="space-y-2.5">
            {purchases.map((purchase) => (
<div key={purchase.id} className="bg-[#10111a] border border-slate-900 p-4 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-gray-200">{purchase.products?.vip_level}</h4>
                    <p className="text-xs text-gray-500">
                      {purchase.days_claimed}/{purchase.products?.validity_days} days claimed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                      ₦{purchase.products?.daily_income?.toLocaleString()}/day
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: ₦{purchase.total_earned?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
<div className="w-full bg-slate-900 rounded-full h-2 mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(purchase.days_claimed / purchase.products?.validity_days) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Expires: {new Date(purchase.expiry_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-200">Social tasks · Earn ₦500</h3>
        <div className="bg-[#10111a] border border-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-200">Join the Telegram channel</h4>
              <p className="text-emerald-400 text-xs font-bold">+₦500 · one time only</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleOpenChannel} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl">
              Open <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleClaimReward} disabled={claimed || !openedChannel} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl ${claimed ? 'bg-emerald-500/20 text-emerald-500/50' : openedChannel ? 'bg-indigo-600 text-white' : 'bg-indigo-950/40 text-indigo-400/30'}`}>
              {claimed ? "Claimed" : "Claim ₦500"}
            </button>
          </div>
        </div>
      </div>

      {/* Live Withdrawals Display Stack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live withdrawals
          </h3>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">LIVE</span>
        </div>

        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {withdrawals.map((w) => (
            <div key={w.id} className="bg-[#10111a] border border-slate-900/60 p-3 rounded-xl flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-200">{w.name} <span className="font-normal text-gray-400">withdrew</span></h4>
                  <p className="text-[10px] text-gray-500">via {w.bank} · {w.time}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-indigo-400 font-extrabold text-sm">₦{w.amount.toLocaleString()}</span>
                <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">NGN</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}