import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Assignments from './pages/Assignments';
import Quizzes from './pages/Quizzes';
import Modules from './pages/Modules';
import Instructors from './pages/Instructors';
import Proctors from './pages/Proctors';
import Analytics from './pages/Analytics';
import Enrollments from './pages/Enrollments';
import Submissions from './pages/Submissions';
import CrudStudio from './pages/CrudStudio';
import Profile from './pages/Profile';
import { useAuth } from './context/AuthContext';

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Bright Top Navigation */}
      <Navbar />

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/enrollments" element={<Enrollments />} />
            <Route path="/instructors" element={<Instructors />} />
            <Route path="/proctors" element={<Proctors />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Admin-Only Route for Database CRUD Studio */}
            <Route path="/crud" element={<AdminRoute><CrudStudio /></AdminRoute>} />

            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Academic Portal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Learning Management System (LMS). Built for academic and database instruction.</p>
          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Database: MySQL / SQLite Dual Engine</span>
            <span>•</span>
            <span>Security: Admin-Gated CRUD Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
