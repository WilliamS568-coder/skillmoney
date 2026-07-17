import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth'; 
import Dashboard from './components/Dashboard'; 
import AdminPanel from './components/AdminPanel';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // 1. Check current session active on app launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen to authentication state changes (Login, Logout, Sign In)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth event triggered:", _event, session);
      setSession(session);
      if (session) {
        checkAdminStatus(session.user);
      } else {
        setIsAdmin(false);
        setShowAdmin(false);
        setIsLoading(false);
      }
    });

    // 3. Listen to hash changes for admin access
    const handleHashChange = () => {
      if (window.location.hash === '#admin' && isAdmin) {
        setShowAdmin(true);
      } else if (window.location.hash !== '#admin') {
        setShowAdmin(false);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isAdmin]);

  const checkAdminStatus = async (user) => {
    try {
      // Check if user has admin role in their user_metadata or profile
      const isAdminUser = user.user_metadata?.role === 'admin' || 
                          user.email === 'towolawisolomon111@gmail.com'; // Replace with your admin email
      
      if (isAdminUser) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e15] flex items-center justify-center text-white font-sans">
        <span className="text-sm text-gray-400">Verifying secure connection...</span>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {showAdmin && isAdmin ? (
        <AdminPanel />
      ) : session ? (
        <Dashboard user={session.user} />
      ) : (
        <Auth />
      )}
    </>
  );
}
