import { supabase } from '../supabaseClient';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { toast } from 'react-hot-toast';
import { User, Mail, Lock, Eye, EyeOff, Gift, ArrowRight, X, FileText, Loader2 } from 'lucide-react';

export default function Register({ onSwitchToLogin }) {
  const [searchParams] = useSearchParams(); 
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [referrerName, setReferrerName] = useState('');
  const [verifyingReferrer, setVerifyingReferrer] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const code = searchParams.get('ref');
    if (code) {
      setReferralCode(code.toLowerCase());
      verifyReferrer(code.toLowerCase());
    }
  }, [searchParams]);

  const verifyReferrer = async (code) => {
    if (!code) return;
    setVerifyingReferrer(true);
    try {
      // Try to find by username (email prefix)
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .ilike('username', code.trim())
        .maybeSingle();

      if (!error && data) {
        setReferrerName(data.full_name || data.username);
      }
    } catch (err) {
      console.error("Referral verification error:", err);
    } finally {
      setVerifyingReferrer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error("Passwords do not match!");
    if (password.length < 6) return toast.error("Password must be at least 6 characters!");

    setIsLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (signUpError) throw signUpError;

        if (authData?.user) {
          // Create profile - use only fields that definitely exist in the table
          const profileData = {
            id: authData.user.id,
            full_name: fullName,
            email: email,
            username: email.split('@')[0],
            referred_by: referralCode || null,
            balance: 1000,
            is_new_user: true
          };

      const { error: insertError } = await supabase
  .from('profiles')
  .upsert(profileData); // Removed the array brackets [] as upsert handles the object directly

  
        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created for new user');
        }

        // If there's a referral code, update the referrer's bonus
        if (referralCode) {
          console.log('Updating referrer for code:', referralCode);
          
          // Find referrer by username
          const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id, balance')
            .ilike('username', referralCode)
            .single();

          if (!referrerError && referrer) {
            // Update referrer's balance by adding ₦500
            const newBalance = (referrer.balance || 0) + 500;
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ balance: newBalance })
              .eq('id', referrer.id);

            if (updateError) {
              console.error('Error updating referrer:', updateError);
            } else {
              console.log('Referrer credited ₦500! New balance:', newBalance);
            }
          } else {
            console.log('Referrer not found by username:', referralCode);
          }
        }

        toast.success("Account created successfully! Please Login.");
        onSwitchToLogin();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const termsList = [
    {
      title: "1. Acceptance of terms",
      content: "By accessing or using Skill Money, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, please stop using the platform immediately."
    },
    {
      title: "2. Eligibility",
      content: "You must be at least 18 years old to create an account and use our services. By registering, you confirm that the information you provide is accurate and that you are legally allowed to use this platform."
    },
    {
      title: "3. Use of content",
      content: "All content available on Skill Money, including learning materials, articles, graphics, logos, and digital resources, belongs to Skill Money or its licensors and is protected by applicable intellectual property laws."
    },
    {
      title: "4. Platform changes",
      content: "Skill Money reserves the right to modify, suspend, or remove any feature, service, or section of the platform at any time, with or without notice."
    },
    {
      title: "5. User conduct",
      content: "You agree to use the platform responsibly and not participate in illegal, abusive, fraudulent, or disruptive activity. The use of bots, automated scripts, fake accounts, or any attempt to compromise platform integrity is strictly prohibited."
    },
    {
      title: "6. Account security",
      content: "You are responsible for keeping your login details confidential and for all activity performed through your account."
    },
    {
      title: "7. Account suspension or closure",
      content: "We reserve the right to suspend or close, without notice or liability, any account that violates these terms or engages in behaviour considered harmful to the platform."
    },
    {
      title: "8. Disclaimer of warranty",
      content: "The platform and its content are provided as is and as available. Skill Money makes no express or implied warranty regarding the accuracy, reliability, or availability."
    },
    {
      title: "9. Updates to these terms",
      content: "These terms and conditions may be updated from time to time. The latest version will always be available on this page."
    },
    {
      title: "10. Contact",
      content: "For any questions or concerns about these terms, please contact us through our official support channels."
    }
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-6 font-sans relative">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Skill Money
        </span>
      </div>

      {/* Header Text */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Create an account <span className="inline-block animate-bounce">🚀</span>
        </h1>
        <p className="text-text-muted text-sm">Join us and start earning today.</p>
      </div>

      {/* Dynamic Invite Badge */}
      {referralCode && (
        <div className="w-full max-w-md mb-4 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in">
          <div className="h-9 w-9 rounded-xl bg-brand-purple/20 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-brand-purple" />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-brand-purple font-bold uppercase tracking-wider">Referral Invited</p>
            <p className="text-xs text-gray-300 font-semibold">
              {verifyingReferrer ? 'Checking system records...' : referrerName ? `Joining team of ${referrerName}` : `Invite applied (${referralCode})`}
            </p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Full name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Chinedu Okafor"
              required
              className="block w-full pl-12 pr-4 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Email address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="block w-full pl-12 pr-4 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              className="block w-full pl-12 pr-12 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Confirm password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              className="block w-full pl-12 pr-12 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Referral Code (Optional) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Referral code</label>
            <span className="text-xs text-text-muted">(optional)</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Gift className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => {
                const val = e.target.value.toLowerCase();
                setReferralCode(val);
                if (val.length >= 4) {
                  verifyReferrer(val);
                } else {
                  setReferrerName('');
                }
              }}
              placeholder="your_username"
              className="block w-full pl-12 pr-4 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200 font-mono"
            />
          </div>
        </div>

        {/* Terms of Service */}
        <p className="text-xs text-text-muted leading-relaxed text-center sm:text-left">
          By clicking "Create account", you agree to our{' '}
          <button 
            type="button"
            onClick={() => setShowTermsModal(true)} 
            className="text-brand-purple hover:underline font-semibold focus:outline-none cursor-pointer inline"
          >
            Terms
          </button> and{' '}
          <button 
            type="button"
            onClick={() => setShowTermsModal(true)} 
            className="text-brand-purple hover:underline font-semibold focus:outline-none cursor-pointer inline"
          >
            Privacy Policy
          </button>.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 bg-brand-purple hover:bg-brand-purple-hover disabled:bg-indigo-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-5 w-5 text-white" />
              Please wait...
            </span>
          ) : (
            <>
              Create account <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      {/* Toggle Link */}
      <p className="mt-6 text-text-muted text-sm">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="text-brand-purple hover:underline font-semibold ml-1 cursor-pointer">
          Log in
        </button>
      </p>

      {/* TERMS & CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10111a] border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            
            <div className="p-5 border-b border-slate-900/80 flex justify-between items-center bg-[#0d0e16]">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-purple" />
                <h3 className="font-bold text-lg text-white">Terms & Conditions</h3>
              </div>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-gray-300 text-sm leading-relaxed scrollbar-thin">
              {termsList.map((term, i) => (
                <div key={i} className="space-y-1.5 text-left">
                  <h4 className="font-bold text-white text-base">{term.title}</h4>
                  <p className="text-gray-400 text-[13px]">{term.content}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-900/80 bg-[#0d0e16] flex gap-3 justify-end">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2.5 bg-brand-purple hover:bg-brand-purple-hover text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                I Understand
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}