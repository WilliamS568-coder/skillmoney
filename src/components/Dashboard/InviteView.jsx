import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { Users, Copy, Check, Gift, Wallet, ShieldCheck, Loader2 } from 'lucide-react';

export default function MyTeam() {
  const [profile, setProfile] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralBonusAmount = 500; 

  useEffect(() => {
    // Define the function clearly inside useEffect
    const fetchTeamAndEnsureCode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        let { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        // Use the referral code from the database, or generate one if it doesn't exist
        let finalReferralCode = userProfile?.referral_code;

        if (!finalReferralCode) {
          // Database didn't generate a code, so we'll generate one on the frontend
          finalReferralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
          console.log('Database has no referral code. Generated new code:', finalReferralCode);

          // Save the generated code to the database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referral_code: finalReferralCode })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to save referral code to database:', updateError);
            toast.error('Failed to generate referral code. Please try again.');
            return;
          } else {
            console.log('Successfully saved referral code to database:', finalReferralCode);
          }
        } else {
          console.log('Using referral code from database:', finalReferralCode);
        }

        setProfile({
          ...userProfile,
          referral_code: finalReferralCode
        });

        // Fetch referred members using the user's username as referral code
        const { data: members, error: teamError } = await supabase
          .from('profiles')
          .select('*')
          .eq('referred_by', userProfile?.username);

        if (!teamError && members) {
          setTeamMembers(members);
        }
      } catch (err) {
        console.error("Setup error:", err);
        toast.error("Connecting to network squad...");
      } finally {
        setLoading(false);
      }
    };

    // Call the function we just defined
    fetchTeamAndEnsureCode();
  }, []); // The empty array ensures this runs once when the component mounts

  // Your real system deployment link
  // Automatically uses the exact domain name you used to visit the website!
// Change to this so it uses the referral_code you generated:
const referralLink = profile?.referral_code 
  ? `${window.location.origin}/register?ref=${profile.referral_code}` 
  : '';
  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied! 📋");
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080e] flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080e] text-white p-4 sm:p-6 font-sans flex flex-col items-center">
      
      {/* Header Info */}
      <div className="w-full max-w-2xl text-center mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2">My Network Team 👥</h1>
        <p className="text-gray-400 text-xs sm:text-sm px-2">Invite your friends and earn rewards when they join your earning squad.</p>
      </div>

      {/* STATS CARDS GRID */}
      <div className="w-full max-w-2xl grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="bg-[#0d0e16] border border-slate-900 rounded-xl sm:rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Members</span>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white">{teamMembers.length}</h2>
            <p className="text-[10px] sm:text-xs text-indigo-400 mt-1">Direct Referrals</p>
          </div>
        </div>

        <div className="bg-[#0d0e16] border border-slate-900 rounded-xl sm:rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Commission</span>
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white">₦{profile?.referral_earnings || 0}</h2>
            <p className="text-[10px] sm:text-xs text-emerald-400 mt-1">Earned via network</p>
          </div>
        </div>
      </div>

      {/* REFERRAL LINK BOX */}
      <div className="w-full max-w-2xl bg-[#0d0e16] border border-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs sm:text-sm font-bold text-gray-300">Your Shareable Invite Link</h3>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 mb-4 leading-relaxed">
          Get <strong>₦{referralBonusAmount}</strong> immediately when a user signs up with your code and starts completing tasks.
        </p>

        {/* COPY LINK BAR */}
        <div className="flex items-center gap-2 bg-[#07080e] border border-slate-900 rounded-xl p-2.5 pl-4">
          <input 
            type="text" 
            readOnly 
            value={referralLink} 
            className="bg-transparent text-gray-300 text-[11px] sm:text-xs focus:outline-none w-full truncate select-all font-mono"
          />
          <button 
            onClick={copyToClipboard}
            className="shrink-0 p-2 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs font-bold"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* TEAM MEMBERS LIST */}
      <div className="w-full max-w-2xl bg-[#0d0e16] border border-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm sm:text-base font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span>Active Team Members</span>
          <span className="bg-indigo-600/20 text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            {teamMembers.length} Joined
          </span>
        </h3>

        {teamMembers.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center">
            <Users className="h-10 w-10 text-slate-800 mb-2" />
            <p className="text-xs text-gray-500">No active team members yet. Share your invite link to start building your crew!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {teamMembers.map((member, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-950 bg-[#07080e]/50 hover:border-slate-800 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-xs sm:text-sm">
                    {(member.full_name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-200">{member.full_name || 'Registered User'}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Joined: {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 shrink-0" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
