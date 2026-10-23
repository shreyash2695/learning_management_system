import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Database, 
  Bell, 
  User, 
  ChevronDown, 
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  LogOut,
  Lock,
  Award,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isCrudPage = location.pathname.startsWith('/crud');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Portal Name */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span className="text-blue-600">LMS</span>
                  <span>Portal</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">Academic</span>
                </span>

                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Official University Academic & Learning Management System</p>
              </div>
            </Link>

            {/* Semester Badge */}
            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-200">
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Fall Semester 2026-27
              </span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* The Dedicated CRUD Studio Button (Locked for Non-Admins as per prompt) */}
            <Link
              to="/crud"
              className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 ${
                isAdmin 
                  ? isCrudPage 
                    ? 'bg-purple-600 text-white shadow-purple-500/30 shadow-md ring-2 ring-purple-400/40' 
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:shadow-md hover:scale-102'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
            >
              {isAdmin ? (
                <>
                  <Database className="w-4 h-4 text-purple-600 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">Database</span> CRUD Studio
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">CRUD Studio</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Admin</span>
                </>
              )}
            </Link>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-88 rounded-2xl bg-white shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 pb-2.5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Live Academic Alerts</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-1">
                        <Bell className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                        <p className="text-xs font-bold text-slate-600">No Notifications</p>
                        <p className="text-[10px]">You are all caught up with your courses &amp; submissions.</p>
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => {
                        const getNotifIcon = () => {
                          switch (n.type) {
                            case 'GRADE':
                              return <Award className="w-4 h-4 text-emerald-600" />;
                            case 'ENROLLMENT':
                              return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
                            case 'ASSIGNMENT':
                            case 'SUBMISSION':
                              return <FileText className="w-4 h-4 text-purple-600" />;
                            default:
                              return <Sparkles className="w-4 h-4 text-amber-500" />;
                          }
                        };

                        return (
                          <div
                            key={n.notification_id}
                            onClick={() => {
                              if (n.is_read === 0) markAsRead(n.notification_id);
                              if (n.link) {
                                setShowNotifications(false);
                                navigate(n.link);
                              }
                            }}
                            className={`p-3.5 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer ${
                              n.is_read === 0 ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-3xs shrink-0 self-start mt-0.5">
                              {getNotifIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className={`text-xs truncate ${n.is_read === 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                  {n.title}
                                </p>
                                {n.is_read === 0 && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Sign Out Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {currentUser.name ? currentUser.name[0] : 'U'}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        currentUser.role === 'admin' ? 'bg-purple-500' : currentUser.role === 'instructor' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}></span>
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1 capitalize">
                        Role: {currentUser.role}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2 transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        My Profile &amp; Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>


                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
