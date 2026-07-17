import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  Users, Wallet, FileText, Settings, 
  Search, Check, X, Eye, LogOut, 
  TrendingUp, Shield, Bell
} from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [rechargeRequests, setRechargeRequests] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch profiles directly (RLS will filter based on policies)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (!profilesError && profilesData) {
        setUsers(profilesData);
      } else {
        console.error('Error fetching profiles:', profilesError);
        toast.error('⚠️ RLS Policy Missing: Run SQL from SETUP_GUIDE.md to view all users');
        // If RLS blocks, try to get current user at least
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUsers([{
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Admin',
            balance: 0,
            referral_code: 'N/A'
          }]);
        } else {
          setUsers([]);
        }
      }

      // Fetch all transactions from withdrawals table (recharge/withdrawal history)
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*');

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      }

      // Also fetch from profiles to get referral bonuses and other transactions
      const { data: profiles, error: profilesFetchError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesFetchError) {
        console.error('Error fetching profiles:', profilesFetchError);
      }

      // Combine withdrawal data as transactions
      const withdrawalTransactions = withdrawals?.map(w => ({
        id: w.id,
        user_id: w.user_id,
        user_name: 'User',
        type: 'withdrawal',
        amount: w.amount,
        status: w.status,
        reference: `WD-${w.id.slice(0, 8)}`,
        receipt_url: null,
        created_at: w.created_at
      })) || [];

      // Add referral bonus transactions from profiles
      const referralTransactions = profiles?.filter(p => p.referral_earnings > 0).map((p, index) => ({
        id: `referral-${p.id}`,
        user_id: p.id,
        user_name: p.full_name || 'User',
        type: 'referral_bonus',
        amount: p.referral_earnings,
        status: 'completed',
        reference: `REF-${index + 1000}`,
        receipt_url: null,
        created_at: p.created_at
      })) || [];

      const allTransactions = [...withdrawalTransactions, ...referralTransactions];
      setTransactions(allTransactions);

      // Fetch withdrawal requests with user details
      const { data: withdrawalsData, error: withdrawalsError2 } = await supabase
        .from('withdrawals')
        .select('*, profiles!inner(full_name)');

      if (!withdrawalsError2 && withdrawalsData) {
        setWithdrawals(withdrawalsData);
      } else if (withdrawalsError2) {
        console.error('Error fetching withdrawals:', withdrawalsError2);
        // Don't show toast if table doesn't exist
        if (!withdrawalsError2.message.includes('does not exist')) {
          toast.error('Failed to load withdrawals');
        }
      }

      // Fetch recharge requests (table might not exist yet)
      const { data: rechargeData, error: rechargeError } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });
 
      if (!rechargeError && rechargeData) {
        // Fetch user details separately to avoid join errors
        const rechargesWithUsers = await Promise.all(
          rechargeData.map(async (recharge) => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', recharge.user_id)
                .single();
              
              return {
                ...recharge,
                profiles: profile || { full_name: 'User' }
              };
            } catch (err) {
              return {
                ...recharge,
                profiles: { full_name: 'User' }
              };
            }
          })
        );
        setRechargeRequests(rechargesWithUsers);
      } else if (rechargeError) {
        console.error('Error fetching recharge requests:', rechargeError);
        // Don't show toast if table doesn't exist yet
        if (!rechargeError.message.includes('does not exist')) {
          toast.error('Failed to load recharge requests');
        }
        setRechargeRequests([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !newBalance) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: parseFloat(newBalance) })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Balance updated successfully!');
      setShowBalanceModal(false);
      setNewBalance('');
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    }
  };

  const handleApproveWithdrawal = async (withdrawalId) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast.success('Withdrawal approved!');
      fetchData();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleRejectWithdrawal = async (withdrawalId) => {
    try {
      // Get withdrawal details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (fetchError) throw fetchError;

      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Refund the balance
      const { error: refundError } = await supabase
        .from('profiles')
        .update({ balance: supabase.raw(`balance + ${withdrawal.amount}`) })
        .eq('id', withdrawal.user_id);

      if (refundError) throw refundError;

      toast.success('Withdrawal rejected and balance refunded!');
      fetchData();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    }
  };

  const handleApproveRecharge = async (rechargeId) => {
    try {
      // Get recharge request details
      const { data: recharge, error: fetchError } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('id', rechargeId)
        .single();

      if (fetchError) throw fetchError;

      // Get current user balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', recharge.user_id)
        .single();

      if (profileError) throw profileError;

      // Calculate new balance
      const currentBalance = profile?.balance || 0;
      const newBalance = currentBalance + recharge.amount;

      // Update recharge status
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({ status: 'approved' })
        .eq('id', rechargeId);

      if (updateError) throw updateError;

      // Update user balance with new total
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', recharge.user_id);

      if (balanceError) throw balanceError;

      toast.success('Recharge approved! Balance updated.');
      fetchData();
    } catch (error) {
      console.error('Error approving recharge:', error);
      toast.error('Failed to approve recharge');
    }
  };

  const handleRejectRecharge = async (rechargeId) => {
    try {
      // Update recharge status
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({ status: 'rejected' })
        .eq('id', rechargeId);

      if (updateError) throw updateError;

      toast.success('Recharge rejected!');
      fetchData();
    } catch (error) {
      console.error('Error rejecting recharge:', error);
      toast.error('Failed to reject recharge');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080e] text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black mb-2">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage users, transactions, and withdrawals</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-black">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
          </div>
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending Withdrawals</p>
                <p className="text-2xl font-black">{withdrawals.filter(w => w.status === 'pending').length}</p>
              </div>
              <Wallet className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Transactions</p>
                <p className="text-2xl font-black">{transactions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Volume</p>
                <p className="text-2xl font-black">₦{transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-1.5 flex gap-2 mb-6">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: FileText },
            { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
            { id: 'recharges', label: 'Recharges', icon: Wallet },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:bg-slate-900/50 hover:text-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-slate-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Referral Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Referrals</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                            {(user.full_name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{user.full_name || 'User'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-indigo-600/10 text-indigo-400 px-2 py-1 rounded">
                          {user.referral_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-400">₦{user.balance?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.referral_count || 0}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewBalance(user.balance?.toString() || '0');
                            setShowBalanceModal(true);
                          }}
                          className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors"
                          title="Update Balance"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{txn.reference}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{txn.user_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          txn.type === 'recharge' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">₦{txn.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          txn.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {txn.receipt_url && (
                          <button
                            onClick={() => window.open(txn.receipt_url, '_blank')}
                            className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {withdrawals.map(withdrawal => (
                    <tr key={withdrawal.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{withdrawal.profiles?.full_name || 'User'}</p>
                          <p className="text-xs text-gray-400">{withdrawal.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400">₦{withdrawal.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{withdrawal.bank_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{withdrawal.account_number}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          withdrawal.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          withdrawal.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {withdrawal.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                              className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(withdrawal.id)}
                              className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recharges Tab */}
        {activeTab === 'recharges' && (
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Payment Method</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Receipt</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {rechargeRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No recharge requests yet
                      </td>
                    </tr>
                  ) : (
                    rechargeRequests.map(recharge => (
                      <tr key={recharge.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{recharge.profiles?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-400">{recharge.profiles?.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-400">₦{recharge.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{recharge.payment_method}</td>
                        <td className="px-4 py-3">
                          {recharge.receipt_url && (
                            <button
                              onClick={() => window.open(recharge.receipt_url, '_blank')}
                              className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors"
                              title="View Receipt"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            recharge.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            recharge.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {recharge.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(recharge.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {recharge.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveRecharge(recharge.id)}
                                className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectRecharge(recharge.id)}
                                className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-[#0d0e16] border border-slate-900 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Platform Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg">
                <div>
                  <p className="font-medium">Platform Name</p>
                  <p className="text-xs text-gray-400">Skill Money</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-colors">
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg">
                <div>
                  <p className="font-medium">Referral Bonus</p>
                  <p className="text-xs text-gray-400">₦500 per referral</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-colors">
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg">
                <div>
                  <p className="font-medium">Minimum Withdrawal</p>
                  <p className="text-xs text-gray-400">₦1,000</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-colors">
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg">
                <div>
                  <p className="font-medium">Minimum Recharge</p>
                  <p className="text-xs text-gray-400">₦5,000</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Balance Update Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0e16] border border-slate-800 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Update User Balance</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">User: {selectedUser?.full_name || selectedUser?.email}</p>
              <p className="text-sm text-gray-400 mb-4">Current Balance: ₦{selectedUser?.balance?.toLocaleString() || '0'}</p>
              <label className="block text-sm font-medium mb-2">New Balance</label>
              <input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter new balance"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBalance}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}