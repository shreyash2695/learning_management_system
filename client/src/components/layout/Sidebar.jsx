import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Layers, 
  UserCheck, 
  ShieldCheck, 
  TrendingUp, 
  FolderCheck,
  Send,
  Database,
  Lock,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/courses', label: 'My Courses', icon: BookOpen },
  { path: '/modules', label: 'Course Modules', icon: Layers },
  { path: '/assignments', label: 'Assignments', icon: FileText },
  { path: '/submissions', label: 'Submissions', icon: Send },
  { path: '/quizzes', label: 'Quizzes & Tests', icon: HelpCircle },
  { path: '/enrollments', label: 'Course Registration', icon: FolderCheck },
  { path: '/instructors', label: 'Instructors', icon: UserCheck },
  { path: '/proctors', label: 'Proctors', icon: ShieldCheck },
  { path: '/analytics', label: 'Progress Analytics', icon: TrendingUp },
  { path: '/profile', label: 'My Profile & Security', icon: User },
];

export default function Sidebar() {
  const { isAdmin, isInstructor, isStudent, currentUser } = useAuth();

  const navItems = NAV_ITEMS
    .filter(item => {
      // Instructors do not have proctors
      if (isInstructor && item.path === '/proctors') return false;
      // System Administrator does not take or teach courses, submit assignments, take quizzes, or grade submissions
      if (isAdmin && ['/courses', '/modules', '/assignments', '/quizzes', '/submissions'].includes(item.path)) return false;
      return true;
    })
    .map(item => {
      if (item.path === '/courses') {
        return {
          ...item,
          label: isInstructor ? 'My Taught Courses' : 'My Enrolled Courses'
        };
      }
      if (item.path === '/enrollments') {
        return {
          ...item,
          label: isAdmin ? 'Student Enrollments & Rosters' : 'Course Registration'
        };
      }
      if (item.path === '/submissions') {
        return {
          ...item,
          label: isAdmin ? 'Coursework Submissions Feed' : isInstructor ? 'Submissions & Grading' : 'My Submissions'
        };
      }
      if (item.path === '/instructors') {
        return {
          ...item,
          label: isAdmin ? 'Faculty Directory' : 'Instructors'
        };
      }
      if (item.path === '/proctors') {
        return {
          ...item,
          label: isStudent ? 'My Assigned Proctor' : 'Proctors & Ward Allocations'
        };
      }
      if (item.path === '/analytics') {
        return {
          ...item,
          label: isAdmin ? 'University Analytics' : isInstructor ? 'Course Analytics' : 'Progress Analytics'
        };
      }
      if (item.path === '/profile') {
        return {
          ...item,
          label: isInstructor ? 'Faculty Profile & Settings' : isAdmin ? 'Admin Profile & Settings' : 'My Profile & Security'
        };
      }
      return item;
    });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Academic LMS Portal
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Dedicated Database Management Section */}
        <div className="pt-2 border-t border-slate-100">
          <p className="px-3 text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Database Studio</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'
            }`}>
              {isAdmin ? 'ADMIN ACCESS' : 'ADMIN ONLY'}
            </span>
          </p>
          <NavLink
            to="/crud"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                  : 'bg-purple-50/70 hover:bg-purple-100/80 text-purple-800 border-purple-200/80 hover:border-purple-300'
              }`
            }
          >
            {isAdmin ? (
              <Database className="w-4 h-4 shrink-0 text-purple-600" />
            ) : (
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            )}
            <div>
              <div className="leading-tight flex items-center gap-1.5">
                <span>CRUD Studio</span>
                {!isAdmin && <span className="text-[10px] text-amber-700 font-semibold">(Restricted)</span>}
              </div>
              <div className="text-[10px] font-normal opacity-80">
                {isAdmin ? 'Full SQL Console & Tables' : 'Administrator Privileges Required'}
              </div>
            </div>
          </NavLink>
        </div>
      </div>

      {/* Active User Card & Quick Profile */}
      <NavLink
        to="/profile"
        className="mt-6 p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 transition-colors block group"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-slate-800 capitalize">
              {currentUser?.role || 'Guest'} Active
            </span>
          </div>
          <span className="text-[10px] text-blue-600 font-bold group-hover:underline">Settings &rarr;</span>
        </div>
        <p className="text-[11px] text-slate-500 truncate">
          Logged in: <strong>{currentUser?.name}</strong>
        </p>
      </NavLink>
    </aside>
  );
}
