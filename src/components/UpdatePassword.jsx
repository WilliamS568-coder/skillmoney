import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

export default function UpdatePassword({ onFinish }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }

    setIsLoading(true);

    try {
      // Extract the access token from the URL hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken) {
        toast.error("Invalid or expired password reset link. Please request a new one.");
        setIsLoading(false);
        return;
      }

      // Set the session with the recovery tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error("Failed to verify recovery link. Please try again.");
        setIsLoading(false);
        return;
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      setIsLoading(false);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully! Redirecting to login...");
        // Clear the URL hash
        window.location.hash = '';
        setTimeout(() => {
          if (onFinish) onFinish(); // Switch them back to login screen
        }, 2000);
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Set New Password 🔒
        </h1>
        <p className="text-text-muted text-sm">Please choose a strong password for security.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        {/* New Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">New Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              className="block w-full pl-12 pr-12 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="block w-full pl-12 pr-4 py-3.5 bg-card-bg border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 bg-brand-purple hover:bg-brand-purple-hover disabled:bg-indigo-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md cursor-pointer"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}