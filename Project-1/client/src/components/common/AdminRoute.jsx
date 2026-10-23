import React from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft, ArrowRight, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';


export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="py-12 flex flex-col items-center justify-center animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Administrative Area
          </span>

          <h2 className="text-xl font-extrabold text-slate-900 mt-3 tracking-tight">
            Access Restricted
          </h2>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You are currently signed in as <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role}). 
            Direct database table modifications and the SQL Query Compiler are strictly restricted to <strong>System Administrators</strong>.
          </p>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out to Log In as Admin
            </button>


            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to LMS Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
