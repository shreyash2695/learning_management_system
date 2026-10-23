import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {

  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem('lms_token');
    const saved = localStorage.getItem('lms_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lms_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('lms_user');
      localStorage.removeItem('lms_token');
    }
  }, [currentUser]);

  const login = async (role, username, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(role, username, password);
      setCurrentUser(res.user);
      localStorage.setItem('lms_user', JSON.stringify(res.user));
      localStorage.setItem('lms_token', res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (registrationData) => {
    setLoading(true);
    try {
      const res = await authApi.register(registrationData);
      if (res.user && res.token) {
        setCurrentUser(res.user);
        localStorage.setItem('lms_user', JSON.stringify(res.user));
        localStorage.setItem('lms_token', res.token);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('lms_user');
    localStorage.removeItem('lms_token');
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isStudent: currentUser?.role === 'student',
    isInstructor: currentUser?.role === 'instructor',
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
