import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Wallet, RefreshCw, FileText, CreditCard, 
  Info, ShieldCheck, Headphones, LogOut, ChevronRight, Loader2,
  User, Mail, Calendar, TrendingUp, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0d0e16] border border-slate-800 p-6 rounded-2xl w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
        {children}
        <button onClick={onClose} className="mt-4 w-full text-gray-500 hover:text-white transition-colors">Close</button>
      </div>
    </div>
  );
};

export default function Mine({ profile, setProfile }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawPass, setWithdrawPass] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('PAY-1');
  const [rechargeAmount, setRechargeAmount] = useState('0.00');
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    const fetchProfileAndTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      // Add email from auth user to profile data
      const profileWithEmail = {
        ...profileData,
        email: user.email
      };
      setProfile(profileWithEmail);

      // Load bank details if exists
      if (profileData?.bank_name) {
        setBankDetails({
          bank_name: profileData.bank_name || '',
          account_number: profileData.account_number || '',
          account_name: profileData.account_name || ''
        });
      }

      // Fetch real transactions from database
      const allTransactions = [];

      // Fetch recharge requests
      const { data: rechargeData } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (rechargeData) {
        rechargeData.forEach(recharge => {
          allTransactions.push({
            id: recharge.id,
            type: 'recharge',
            description: `Recharge - ${recharge.payment_method}`,
            amount: recharge.amount,
            status: recharge.status,
            date: recharge.created_at
          });
        });
      }

      // Fetch withdrawals
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalData) {
        withdrawalData.forEach(withdrawal => {
          allTransactions.push({
            id: withdrawal.id,
            type: 'withdrawal',
            description: 'Withdrawal request',
            amount: -withdrawal.amount,
            status: withdrawal.status,
            date: withdrawal.created_at
          });
        });
      }

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(allTransactions);
      setLoading(false);
    };
    fetchProfileAndTransactions();
  }, []);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount < 5000) {
      toast.error("Minimum withdrawal amount is ₦5,000.");
      return;
    }
    
    if (!profile?.balance || amount > profile.balance) {
      toast.error("Insufficient balance for this withdrawal.");
      return;
    }
    
    if (withdrawPass.length < 6) {
      toast.error("Please enter a valid security password.");
      return;
    }

    toast.loading("Processing withdrawal request...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to withdraw funds.");
        return;
      }

      // Create withdrawal transaction
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amount,
          status: 'pending',
          bank_name: bankDetails.bank_name || 'User Bank Account',
          account_number: bankDetails.account_number || '****1234',
          security_password: withdrawPass // In production, this should be hashed
        })
        .select();

      if (withdrawalError) {
        console.error('Withdrawal error:', withdrawalError);
        toast.error("Withdrawal failed. Please try again.");
        return;
      }

      // Update user balance
      const newBalance = profile.balance - amount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        toast.error("Balance update failed. Contact support.");
        return;
      }

      // Update local state
      setProfile(prev => ({ ...prev, balance: newBalance }));
      setWithdrawPass('');
      setWithdrawAmount('');
      setShowWithdraw(false);
      
      toast.success("Withdrawal request submitted! Processing within 24 hours.");
      
      // Add to transaction history
      setTransactions(prev => [
        {
          id: Date.now(),
          type: 'withdrawal',
          description: 'Withdrawal request',
          amount: -amount,
          status: 'pending',
          date: new Date().toISOString()
        },
        ...prev
      ]);

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error("Withdrawal failed. Please try again.");
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      toast.error('Please select a receipt image');
      return;
    }

    setUploadingReceipt(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        toast.error('Please log in to submit receipt');
        setUploadingReceipt(false);
        return;
      }

      console.log('Submitting receipt for user:', user.id);

      // First, verify the user exists in the database
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (profileCheckError || !existingProfile) {
        console.log('Creating profile for user:', user.id);
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User',
            balance: 0,
            referral_code: 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase()
          });

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          toast.error('User profile not found. Please try logging in again.');
          setUploadingReceipt(false);
          return;
        }
        
        console.log('Profile created successfully');
      }

      // Upload receipt to Supabase Storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload receipt. Please try again.');
        return;
      }

      // Get public URL for the uploaded receipt
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Create recharge request
      const { error: rechargeError } = await supabase
        .from('recharge_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(rechargeAmount),
          receipt_url: publicUrl,
          payment_method: selectedPayment,
          status: 'pending'
        });

      if (rechargeError) {
        console.error('Recharge request error:', rechargeError);
        
        // If it's a foreign key error, provide a helpful message
        if (rechargeError.code === '23503') {
          toast.error('User profile not found. Please log out and log in again.');
        } else {
          toast.error('Failed to submit recharge request. Please try again.');
        }
        return;
      }

      if (rechargeError) {
        console.error('Recharge request error:', rechargeError);
        toast.error('Failed to submit recharge request. Please try again.');
        return;
      }

      toast.success('Receipt submitted! Waiting for admin approval.');
      setShowReceiptModal(false);
      setShowAccountDetails(false);
      setShowRecharge(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      
      // Add to transaction history
      setTransactions(prev => [
        {
          id: Date.now(),
          type: 'recharge',
          description: `Recharge request - ₦${rechargeAmount}`,
          amount: parseFloat(rechargeAmount),
          status: 'pending',
          date: new Date().toISOString()
        },
        ...prev
      ]);

    } catch (error) {
      console.error('Error submitting receipt:', error);
      toast.error('Failed to submit receipt. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankDetails.bank_name || !bankDetails.account_number || !bankDetails.account_name) {
      toast.error('Please fill all bank details');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update(bankDetails)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Bank details saved successfully!');
      setShowBankModal(false);
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error('Failed to save bank details');
    }
  };

  const handleAboutUs = () => {
    window.open('https://t.me/+bXqOsMT73P02YjI0', '_blank');
  };

  const handlePlatformRules = () => {
    setShowPlatformRulesModal(true);
  };

  const [showPlatformRulesModal, setShowPlatformRulesModal] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [dailyIncomeEnabled, setDailyIncomeEnabled] = useState(false);

  const handleCustomerService = () => {
    window.open('https://t.me/+bXqOsMT73P02YjI0', '_blank');
  };

  // Function to fix incorrect days_claimed data
  const fixDaysClaimed = async (purchase) => {
    try {
      // Count actual claims in the database
      const { data: claims, error: claimsError } = await supabase
        .from('daily_income_claims')
        .select('id')
        .eq('purchase_id', purchase.id);

      if (claimsError) {
        return; // Can't fix if we can't access the table
      }

      const actualDaysClaimed = claims?.length || 0;

      // If the count doesn't match, update it
      if (actualDaysClaimed !== purchase.days_claimed) {
        console.log(`Fixing days_claimed for purchase ${purchase.id}: ${purchase.days_claimed} -> ${actualDaysClaimed}`);
        
        const { error: updateError } = await supabase
          .from('user_purchases')
          .update({ 
            days_claimed: actualDaysClaimed,
            total_earned: actualDaysClaimed * (purchase.products?.daily_income || 0)
          })
          .eq('id', purchase.id);

        if (updateError) {
          console.error('Error fixing days_claimed:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in fixDaysClaimed:', error);
    }
  };

  // Fetch user purchases and calculate daily income
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if the tables exist and are accessible
        const { data: tableCheck, error: tableError } = await supabase
          .from('user_purchases')
          .select('id')
          .limit(1);

        // If there's an error, disable daily income feature
        if (tableError) {
          console.log('Products feature not yet configured.');
          setPurchases([]);
          setDailyIncome(0);
          setDailyIncomeEnabled(false);
          return;
        }

        // If table is accessible, enable the feature
        setDailyIncomeEnabled(true);

        if (!tableCheck || tableCheck.length === 0) {
          console.log('No purchases yet.');
          setPurchases([]);
          setDailyIncome(0);
          return;
        }

        // Fetch active purchases
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('user_purchases')
          .select('*, products(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gte('expiry_date', new Date().toISOString());

        if (purchasesError) {
          console.error('Error fetching purchases:', purchasesError);
          setPurchases([]);
          setDailyIncome(0);
          return;
        }

        // Fix incorrect days_claimed data for each purchase
        if (purchasesData && purchasesData.length > 0) {
          for (const purchase of purchasesData) {
            await fixDaysClaimed(purchase);
          }
          
          // Re-fetch after fixing
          const { data: fixedPurchases } = await supabase
            .from('user_purchases')
            .select('*, products(*)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gte('expiry_date', new Date().toISOString());
          
          const updatedPurchases = fixedPurchases || purchasesData;
          setPurchases(updatedPurchases || []);
        } else {
          setPurchases(purchasesData || []);
        }

        // Calculate total daily income
        const totalDailyIncome = purchasesData?.reduce((sum, purchase) => {
          return sum + (purchase.products?.daily_income || 0);
        }, 0) || 0;

        setDailyIncome(totalDailyIncome);

        // Auto-claim daily income for each purchase (only if feature is enabled)
        if (purchasesData && purchasesData.length > 0 && dailyIncomeEnabled) {
          for (const purchase of purchasesData) {
            await claimDailyIncome(purchase);
          }
        }
      } catch (error) {
        console.error('Error fetching purchases:', error);
        setPurchases([]);
        setDailyIncome(0);
        setDailyIncomeEnabled(false);
      }
    };

    fetchPurchases();
  }, [dailyIncomeEnabled]);

  const claimDailyIncome = async (purchase) => {
    // Only claim if daily income feature is enabled
    if (!dailyIncomeEnabled) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already claimed today
      const today = new Date().toISOString().split('T')[0];
    // In claimDailyIncome, change this:
const { data: existingClaim, error: claimCheckError } = await supabase
  .from('daily_income_claims')
  .select('id')
  .eq('user_id', user.id)
  .eq('purchase_id', parseInt(purchase.id)) // Explicitly parse as integer
  .gte('claim_date', today);
// Use the array length check instead:
if (existingClaim && existingClaim.length > 0) {
  return; // Already claimed today
}

      if (existingClaim) {
        return; // Already claimed today
      }

      // Check if purchase is still valid
      if (new Date() > new Date(purchase.expiry_date)) {
        return; // Purchase expired
      }

      // Check if all days have been claimed
      if (purchase.days_claimed >= purchase.products?.validity_days) {
        return; // All days claimed
      }

      // Create daily income claim
      const { error: claimError } = await supabase
        .from('daily_income_claims')
        .insert({
          user_id: user.id,
          purchase_id: purchase.id,
          amount: purchase.products?.daily_income || 0
        });

      if (claimError) {
        console.error('Error claiming daily income:', claimError);
        setDailyIncomeEnabled(false);
        return;
      }

      // Update purchase record
      const { error: updateError } = await supabase
        .from('user_purchases')
        .update({
          days_claimed: purchase.days_claimed + 1,
          total_earned: (purchase.total_earned || 0) + (purchase.products?.daily_income || 0)
        })
        .eq('id', purchase.id);

      if (updateError) {
        console.error('Error updating purchase:', updateError);
        return;
      }

      // Update user balance
      if (setProfile && profile) {
        setProfile({ 
          ...profile, 
          balance: (profile.balance || 0) + (purchase.products?.daily_income || 0)
        });
      }

      toast.success(`₦${purchase.products?.daily_income || 0} daily income credited!`);
    } catch (error) {
      console.error('Error claiming daily income:', error);
      setDailyIncomeEnabled(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#07080e] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'referral':
      case 'task':
      case 'social':
        return <ArrowDownRight className="h-4 w-4 text-emerald-400" />;
      case 'withdrawal':
      case 'purchase':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      default:
        return <TrendingUp className="h-4 w-4 text-indigo-400" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#07080e] text-white p-4 pb-24">
      
      {/* USER PROFILE SECTION */}
      <div className="bg-[#0d0e16] border border-slate-900 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-600/10 border-2 border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xl">
            {getInitials(profile?.full_name || profile?.username)}
          </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'User'}</h2>
              <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <p className="text-xs truncate">{profile?.email || 'user@example.com'}</p>
              </div>
            {profile?.referral_code && (
              <div className="flex items-center gap-1.5 text-indigo-400 mt-1">
                <User className="h-3.5 w-3.5 shrink-0" />
                <p className="text-xs font-mono">Code: {profile.referral_code}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Member Since */}
        {profile?.created_at && (
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-3 pt-3 border-t border-slate-900">
            <Calendar className="h-3.5 w-3.5" />
            <span>Member since {new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</span>
          </div>
        )}
      </div>

      {/* Balance Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 border border-indigo-500/30 rounded-2xl p-6 mb-4 text-center shadow-xl">
        <p className="text-indigo-100 text-sm font-medium">Total Balance</p>
        <h1 className="text-4xl font-black mt-2 text-white">₦{profile?.balance?.toLocaleString() || '0'}</h1>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1 text-indigo-100">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Total Earned: ₦{profile?.referral_earnings?.toLocaleString() || '0'}</span>
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
                {/* Progress Bar */}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={() => setShowRecharge(true)} className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20">Recharge</button>
        <button onClick={() => setShowWithdraw(true)} className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">Withdrawal</button>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="bg-[#0d0e16] border border-slate-900 rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-indigo-400" />
          Recent Transactions
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-950 bg-[#07080e]/50 hover:border-slate-800 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                    {getTransactionIcon(txn.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200">{txn.description}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(txn.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${txn.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {txn.amount >= 0 ? '+' : ''}₦{txn.amount.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-0.5 capitalize">{txn.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Menu */}
      <div className="bg-[#0d0e16] border border-slate-900 rounded-2xl mb-4">
        <div 
          onClick={() => setShowBankModal(true)}
          className="flex items-center justify-between p-4 border-b border-slate-900 last:border-0 cursor-pointer hover:bg-slate-900/50 active:bg-slate-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            <span className="text-sm font-medium">Bank Account Management</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </div>
      </div>

      {/* Info Menu */}
      <div className="bg-[#0d0e16] border border-slate-900 rounded-2xl">
        {[
          { icon: Info, label: 'About Us', action: handleAboutUs },
          { icon: ShieldCheck, label: 'Platform rules', action: handlePlatformRules },
          { icon: Headphones, label: 'Customer service', action: handleCustomerService },
          { icon: LogOut, label: 'Exit the app', action: () => supabase.auth.signOut() },
        ].map((item, i) => (
          <button key={i} onClick={item.action} className="w-full flex items-center justify-between p-4 border-b border-slate-900 last:border-0 hover:bg-slate-900/50 active:bg-slate-900/30 transition-colors">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        ))}
      </div>

      {/* Modals */}
      <Modal isOpen={showRecharge} onClose={() => {setShowRecharge(false); setShowAccountDetails(false);}} title="">
        {!showAccountDetails ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowRecharge(false)} className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-white">Recharge</h2>
              <button className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-300 transition-colors">
                Records
              </button>
            </div>

            {/* Recharge Amount Input */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4">
              <p className="text-sm text-gray-400 mb-2">Recharge Amount</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-yellow-400">₦</span>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="0.00"
                  min="5000"
                  step="100"
                  className="bg-transparent text-4xl font-black text-white w-full focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum deposit: ₦5,000</p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-300 mb-3">Select Payment Method</h3>
              <div className="space-y-2.5">
                {[
                  { id: 'PAY-1', label: 'PAY-1', recommended: true },
                  { id: 'PAY-3', label: 'PAY-3', recommended: true },
                  { id: 'PAY-2', label: 'PAY-2', recommended: false }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedPayment === method.id
                        ? 'border-yellow-500 bg-slate-800/50'
                        : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{method.label}</span>
                      {method.recommended && (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === method.id ? 'border-yellow-500' : 'border-gray-600'
                    }`}>
                      {selectedPayment === method.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Message */}
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Funds are secure · Bank-level encryption</span>
            </div>

            {/* Recharge Button */}
            <button
              onClick={() => {
                const amount = parseFloat(rechargeAmount);
                if (isNaN(amount) || amount < 5000) {
                  toast.error("Minimum recharge amount is ₦5,000");
                  return;
                }
                setShowAccountDetails(true);
              }}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 rounded-xl transition-all shadow-lg"
            >
              Recharge Now
            </button>
          </>
        ) : (
          <>
            {/* Account Details View */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Payment Account Details</h3>
              <p className="text-xs text-gray-400">Transfer the exact amount to complete your recharge</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Bank Name</p>
                <p className="text-sm font-bold text-white">First City Monument Bank (FCMB)</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Account Name</p>
                <p className="text-sm font-bold text-white">Skill Money Platform Ltd</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Account Number</p>
                <p className="text-sm font-bold text-white font-mono">1234567890</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="text-lg font-black text-yellow-400">₦{rechargeAmount}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowAccountDetails(false);
                setShowReceiptModal(true);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
            >
              I have made the transfer
            </button>
          </>
        )}
      </Modal>

      {/* Receipt Upload Modal */}
      <Modal isOpen={showReceiptModal} onClose={() => {setShowReceiptModal(false); setReceiptFile(null); setReceiptPreview(null);}} title="Submit Payment Receipt">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Please upload a screenshot of your payment receipt</p>
          
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="receipt-upload"
            />
            {receiptPreview ? (
              <div className="space-y-3">
                <img src={receiptPreview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg" />
                <button
                  onClick={() => document.getElementById('receipt-upload').click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Change image
                </button>
              </div>
            ) : (
              <label htmlFor="receipt-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6 text-indigo-400" />
                  </div>
                  <p className="text-sm text-gray-300">Click to upload receipt</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </label>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowReceiptModal(false);
                setReceiptFile(null);
                setReceiptPreview(null);
              }}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
              disabled={uploadingReceipt}
            >
              Cancel
            </button>
            <button
              onClick={handleReceiptUpload}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!receiptFile || uploadingReceipt}
            >
              {uploadingReceipt ? 'Submitting...' : 'Submit Receipt'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showWithdraw} onClose={() => {setShowWithdraw(false); setWithdrawAmount('');}} title="">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => {setShowWithdraw(false); setWithdrawAmount('');}} className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-white">Withdraw</h2>
          <div className="w-10"></div>
        </div>

        {/* Bank Account Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-sm font-bold text-gray-300">Bank Account</p>
          </div>
          {bankDetails.account_number ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {bankDetails.bank_name} ••••{bankDetails.account_number.slice(-4)}
              </p>
              <button 
                onClick={() => setShowBankModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Switch
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {setShowWithdraw(false); setShowBankModal(true);}}
              className="text-sm text-gray-500 hover:text-gray-400"
            >
              Please enter the account
            </button>
          )}
        </div>

        {/* Withdraw Amount Input */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold text-gray-300">Withdraw Amount</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-400">₦</span>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0"
              min="5000"
              step="100"
              className="bg-transparent text-2xl font-bold text-white w-full focus:outline-none"
            />
          </div>
        </div>

        {/* Withdraw PIN Input */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm font-bold text-gray-300">Withdraw PIN</p>
          </div>
          <input
            type="password"
            value={withdrawPass}
            onChange={(e) => setWithdrawPass(e.target.value)}
            placeholder="Enter your PIN"
            maxLength={6}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Withdraw Button */}
        <button 
          onClick={handleWithdraw} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
        >
          WITHDRAW
        </button>

        {/* Withdrawal Notice */}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-bold text-gray-300">Withdrawal Notice</p>
          <p className="text-xs text-gray-500">1: Minimum withdrawal amount: ₦5,000</p>
          <p className="text-xs text-gray-500">2: Withdrawal time: Monday to Sunday, 10:00 - 17:00</p>
        </div>
      </Modal>

      {/* Bank Account Management Modal */}
      <Modal isOpen={showBankModal} onClose={() => setShowBankModal(false)} title="Bank Account Management">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Enter your bank details where you want to receive your money</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Bank Name</label>
              <input
                type="text"
                value={bankDetails.bank_name}
                onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                placeholder="e.g. First Bank, GTBank, Access Bank"
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Account Number</label>
              <input
                type="text"
                value={bankDetails.account_number}
                onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
                placeholder="Enter your account number"
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Account Name</label>
              <input
                type="text"
                value={bankDetails.account_name}
                onChange={(e) => setBankDetails({...bankDetails, account_name: e.target.value})}
                placeholder="Enter your account name"
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowBankModal(false)}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBankDetails}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
            >
              Save Details
            </button>
          </div>
        </div>
      </Modal>

      {/* Platform Rules Modal */}
      <Modal isOpen={showPlatformRulesModal} onClose={() => setShowPlatformRulesModal(false)} title="Platform Rules & Terms">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="space-y-3 text-xs text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-1">1. Acceptance of terms</h3>
              <p className="leading-relaxed">By accessing or using Skill Money, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, please stop using the platform immediately.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">2. Eligibility</h3>
              <p className="leading-relaxed">You must be at least 18 years old to create an account and use our services. By registering, you confirm that the information you provide is accurate and that you are legally allowed to use this platform.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">3. Use of content</h3>
              <p className="leading-relaxed">All content available on Skill Money, including learning materials, articles, graphics, logos, and digital resources, belongs to Skill Money or its licensors and is protected by applicable intellectual property laws. You may view and use this content only for personal, non-commercial learning purposes. Redistribution, reproduction, or commercial use without prior written permission is strictly prohibited.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">4. Platform changes</h3>
              <p className="leading-relaxed">Skill Money reserves the right to modify, suspend, or remove any feature, service, or section of the platform at any time, with or without notice. We may also update these terms to reflect changes in our services, technology, or legal requirements. Continued use of the platform after changes means you accept the updated terms.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">5. User conduct</h3>
              <p className="leading-relaxed">You agree to use the platform responsibly and not participate in illegal, abusive, fraudulent, or disruptive activity. The use of bots, automated scripts, fake accounts, or any attempt to compromise platform integrity is strictly prohibited.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">6. Account security</h3>
              <p className="leading-relaxed">You are responsible for keeping your login details confidential and for all activity performed through your account. Please contact support immediately if you suspect unauthorised access or a security issue.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">7. Account suspension or closure</h3>
              <p className="leading-relaxed">We reserve the right to suspend or close, without notice or liability, any account that violates these terms or engages in behaviour considered harmful to the platform or its users.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">8. Disclaimer of warranty</h3>
              <p className="leading-relaxed">The platform and its content are provided "as is" and "as available". Skill Money makes no express or implied warranty regarding the accuracy, reliability, or availability of the services.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">9. Updates to these terms</h3>
              <p className="leading-relaxed">These terms and conditions may be updated from time to time. The latest version will always be available on this page, and continued use of the platform indicates your acceptance of any changes.</p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-1">10. Contact</h3>
              <p className="leading-relaxed">For any questions or concerns about these terms, please contact us through our official support channels.</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
