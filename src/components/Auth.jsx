import React, { useState, useEffect } from 'react';
import Login from './login';
import Register from './register';
import UpdatePassword from './UpdatePassword';

export default function Auth() {
  const [view, setView] = useState('login'); // 'login', 'register', or 'update-password'

  useEffect(() => {
    // Detect if user is landing from a password recovery email link
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || window.location.pathname.includes('update-password')) {
        setView('update-password');
      }
    };

    // Check on component load
    handleHashChange();

    // Listen to route changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'update-password') {
    return <UpdatePassword onFinish={() => setView('login')} />;
  }

  return (
    <div className="transition-all duration-300 ease-in-out">
      {view === 'login' ? (
        <Login onSwitchToRegister={() => setView('register')} />
      ) : (
        <Register onSwitchToLogin={() => setView('login')} />
      )}
    </div>
  );
}