import React, { useState, useRef, useEffect } from 'react';
import { Home, ShoppingCart, CheckSquare, Users, User, LogOut, MoreVertical, FileText, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import HomeView from './Dashboard/HomeView';
import EarnView from './Dashboard/EarnView';
import TaskView from './Dashboard/TaskView';
import InviteView from './Dashboard/InviteView';
import WithdrawView from './Dashboard/WithdrawView';
import WelcomeModal from './WelcomeModal';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState({ balance: 0, email: user?.email });
  
  // Header dropdown and modal states
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const dropdownRef = useRef(null);
  
  // Check if user is new and show welcome modal
  useEffect(() => {
    if (profile?.is_new_user) {
      setShowWelcomeModal(true);
    }
  }, [profile?.is_new_user]);
  
  const handleWelcomeClose = async () => {
    setShowWelcomeModal(false);
    // Update user profile to mark as not new
    if (profile?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_new_user: false })
        .eq('id', profile.id);
      
      if (!error) {
        setProfile({ ...profile, is_new_user: false });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileData) {
          setProfile({
            ...profileData,
            email: authUser.email
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();

    // Set up real-time listener for profile changes
    const setupRealtimeListener = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const channel = supabase.channel('profile-changes');
        
        channel.on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${authUser.id}`
        }, (payload) => {
          console.log('Profile updated:', payload.new);
          setProfile({
            ...payload.new,
            email: authUser.email
          });
        });

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime connected');
          }
        });
      } catch (error) {
        // Silently handle realtime errors (table might not exist)
        console.debug('Realtime not available');
      }
    };

    setupRealtimeListener();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'earn', label: 'Product', icon: ShoppingCart },
    { id: 'top', label: 'Task', icon: CheckSquare },
    { id: 'invite', label: 'My team', icon: Users },
    { id: 'withdraw', label: 'Mine', icon: User },
  ];

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
      content: "All content available on Skill Money, including learning materials, articles, graphics, logos, and digital resources, belongs to Skill Money or its licensors and is protected by applicable intellectual property laws. You may view and use this content only for personal, non-commercial learning purposes. Redistribution, reproduction, or commercial use without prior written permission is strictly prohibited."
    },
    {
      title: "4. Platform changes",
      content: "Skill Money reserves the right to modify, suspend, or remove any feature, service, or section of the platform at any time, with or without notice. We may also update these terms to reflect changes in our services, technology, or legal requirements. Continued use of the platform after changes means you accept the updated terms."
    },
    {
      title: "5. User conduct",
      content: "You agree to use the platform responsibly and not participate in illegal, abusive, fraudulent, or disruptive activity. The use of bots, automated scripts, fake accounts, or any attempt to compromise platform integrity is strictly prohibited."
    },
    {
      title: "6. Account security",
      content: "You are responsible for keeping your login details confidential and for all activity performed through your account. Please contact support immediately if you suspect unauthorised access or a security issue."
    },
    {
      title: "7. Account suspension or closure",
      content: "We reserve the right to suspend or close, without notice or liability, any account that violates these terms or engages in behaviour considered harmful to the platform or its users."
    },
    {
      title: "8. Disclaimer of warranty",
      content: "The platform and its content are provided \"as is\" and \"as available\". Skill Money makes no express or implied warranty regarding the accuracy, reliability, or availability of the services."
    },
    {
      title: "9. Updates to these terms",
      content: "These terms and conditions may be updated from time to time. The latest version will always be available on this page, and continued use of the platform indicates your acceptance of any changes."
    },
    {
      title: "10. Contact",
      content: "For any questions or concerns about these terms, please contact us through our official support channels."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07080e] text-white font-sans flex">
      
      {/* SIDEBAR NAVIGATION - Hidden on Mobile screens, visible on Medium screens up */}
      <aside className="hidden md:flex flex-col w-64 bg-[#10111a] border-r border-slate-900 p-6 shrink-0 justify-between">
        <div className="space-y-8">
          <div className="px-2">
            <h2 className="text-xl font-black text-indigo-500 tracking-wide">Skill Money</h2>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'text-gray-400 hover:bg-slate-900/50 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-950/20 hover:text-red-400 rounded-xl transition-colors">
          <LogOut className="h-5 w-5" /> Log out
        </button>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        
      {/* RESPONSIVE TOP NAV BAR - Containing the exact three-dot dropdown action */}
        <header className="w-full max-w-4xl mx-auto px-4 pt-4 flex justify-end items-center relative z-40">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-[#10111a] active:bg-[#1a1b26] rounded-xl border border-slate-900 transition-colors cursor-pointer"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>

            {/* Hidden Admin Button - Only visible to admin users */}
            {user?.email === 'admin@skillmoney.com' && (
              <button
                onClick={() => window.location.hash = '#admin'}
                className="ml-2 p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20 transition-colors text-xs font-bold"
                title="Admin Panel"
              >
                Admin
              </button>
            )}

            {/* Float Dropdown Menu Panel matching your screenshot style exactly */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-[#10111a] border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-fadeIn">
                <button
                  onClick={() => {
                    setShowTermsModal(true);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:bg-slate-900/50 hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4 text-gray-400" />
                  Terms & Conditions
                </button>
                <div className="border-t border-slate-900/60 my-1"></div>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* MAIN VIEW CONTAINER */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {activeTab === 'home' && <HomeView profile={profile} setProfile={setProfile} />}
          {activeTab === 'earn' && <EarnView profile={profile} setProfile={setProfile} />}
          {activeTab === 'top' && <TaskView />}
          {activeTab === 'invite' && <InviteView />}
          {activeTab === 'withdraw' && <WithdrawView profile={profile} setProfile={setProfile} />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#10111a]/95 backdrop-blur-md border-t border-slate-900 px-2 py-2 flex justify-around items-center z-50 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive ? 'text-white bg-indigo-600 min-w-[64px]' : 'text-gray-400 text-opacity-80'
              }`}
            >
              <Icon className={`${isActive ? 'h-5 w-5' : 'h-5 w-5 stroke-[1.8]'}`} />
              <span className="text-[10px] font-bold mt-1 tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TERMS & CONDITIONS MODAL POPUP */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10111a] border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-900/80 flex justify-between items-center bg-[#0d0e16]">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-lg text-white">Terms & Conditions</h3>
              </div>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-gray-300 text-sm leading-relaxed scrollbar-thin">
              {termsList.map((term, i) => (
                <div key={i} className="space-y-1.5">
                  <h4 className="font-bold text-white text-base">{term.title}</h4>
                  <p className="text-gray-400 text-[13px]">{term.content}</p>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-900/80 bg-[#0d0e16] flex justify-end">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                I Understand
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WELCOME MODAL FOR NEW USERS */}
      {showWelcomeModal && <WelcomeModal onClose={handleWelcomeClose} />}

    </div>
  );
}