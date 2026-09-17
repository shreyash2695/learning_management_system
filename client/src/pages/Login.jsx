import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap, 
  User, 
  Lock, 
  ShieldCheck, 
  BookOpen, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  UserPlus,
  Phone,
  Calendar,
  Building,
  KeyRound,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'signin' or 'register'
  const [mode, setMode] = useState('signin');

  // Sign In State
  const [activeRole, setActiveRole] = useState('student'); // 'student', 'instructor', 'admin'
  const [username, setUsername] = useState('akhil_user');
  const [password, setPassword] = useState('pass1');

  // Registration State
  const [regRole, setRegRole] = useState('student'); // 'student' or 'instructor'
  const [meta, setMeta] = useState({
    departments: [
      { dept_id: 1, dept_name: 'CSE' },
      { dept_id: 2, dept_name: 'ECE' },
      { dept_id: 3, dept_name: 'MECH' },
      { dept_id: 4, dept_name: 'CIVIL' },
      { dept_id: 5, dept_name: 'IT' }
    ],
    proctors: [
      { proctor_id: 1, first_name: 'Anu', last_name: 'Nair', cabin_no: 'C101' },
      { proctor_id: 2, first_name: 'Ravi', last_name: 'Menon', cabin_no: 'C102' },
      { proctor_id: 3, first_name: 'Sara', last_name: 'Jose', cabin_no: 'C103' },
      { proctor_id: 4, first_name: 'John', last_name: 'Varghese', cabin_no: 'C104' },
      { proctor_id: 5, first_name: 'Meera', last_name: 'Das', cabin_no: 'C105' }
    ]
  });
  const [regForm, setRegForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    dob: '2004-01-01',
    phone_no: '',
    username: '',
    password: '',
    confirm_password: '',
    proctor_id: '1',
    dept_id: '1',
    cabin_no: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load registration metadata (departments & proctors)
  useEffect(() => {
    let isMounted = true;
    authApi.getRegisterMeta()
      .then((res) => {
        if (isMounted && res.success) {
          setMeta({
            departments: res.departments?.length ? res.departments : meta.departments,
            proctors: res.proctors?.length ? res.proctors : meta.proctors
          });
          if (res.proctors?.length > 0) {
            setRegForm(prev => ({ ...prev, proctor_id: prev.proctor_id || String(res.proctors[0].proctor_id) }));
          }
          if (res.departments?.length > 0) {
            setRegForm(prev => ({ ...prev, dept_id: prev.dept_id || String(res.departments[0].dept_id) }));
          }
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setError(null);
    setSuccessMsg(null);
    if (role === 'student') {
      setUsername('akhil_user');
      setPassword('pass1');
    } else if (role === 'instructor') {
      setUsername('raj@gmail.com');
      setPassword('prof123');
    } else if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(activeRole, username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Demo Login Handler
  const handleQuickDemo = async (role, u, p) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(role, u, p);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registration Submit Handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (loading || successMsg) return;
    setError(null);
    setSuccessMsg(null);

    // Client-side validation
    if (!regForm.first_name.trim() || !regForm.last_name.trim()) {
      setError('First name and last name are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regForm.email.trim())) {
      setError('Please enter a valid email address with a domain (e.g. name@university.edu).');
      return;
    }

    let digits = (regForm.phone_no || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length !== 10) {
      setError('Phone number must be exactly 10 digits (e.g. 9876543210).');
      return;
    }

    if (regRole === 'student') {
      if (!regForm.dob) {
        setError('Date of birth is required.');
        return;
      }
      const birthDate = new Date(regForm.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        setError('Student must be at least 16 years old to register.');
        return;
      }

      if (!regForm.username.trim()) {
        setError('Student portal username is required.');
        return;
      }
      if (/\s/.test(regForm.username.trim())) {
        setError('Username cannot contain spaces. Use letters, numbers, or underscores (e.g. rahul_user).');
        return;
      }
    }

    if (regRole === 'instructor') {
      if (!regForm.cabin_no.trim()) {
        setError('Faculty cabin number is required (e.g. Cabin 501).');
        return;
      }
    }

    if (regForm.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (regForm.password !== regForm.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: regRole,
        first_name: regForm.first_name.trim(),
        middle_name: regForm.middle_name?.trim() || null,
        last_name: regForm.last_name.trim(),
        email: regForm.email.trim().toLowerCase(),
        phone_no: digits,
        password: regForm.password,
        ...(regRole === 'student' ? {
          dob: regForm.dob,
          username: regForm.username.trim().toLowerCase(),
          proctor_id: regForm.proctor_id ? parseInt(regForm.proctor_id, 10) : (meta.proctors[0]?.proctor_id || 1)
        } : {
          dept_id: regForm.dept_id ? parseInt(regForm.dept_id, 10) : (meta.departments[0]?.dept_id || 1),
          cabin_no: regForm.cabin_no.trim()
        })
      };

      const res = await register(payload);
      setSuccessMsg(res.message || 'Account created successfully! Logging you in...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          <span className="text-blue-600">LMS</span> Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          Official University Academic & Learning Management System
        </p>
      </div>

      {/* Main Card */}
      <div className={`mt-8 sm:mx-auto sm:w-full ${mode === 'register' ? 'sm:max-w-lg' : 'sm:max-w-md'}`}>
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          
          {/* Main Mode Switcher: Sign In vs Create Account */}
          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================================================================ */}
          {/* MODE 1: SIGN IN                                                  */}
          {/* ================================================================ */}
          {mode === 'signin' && (
            <>
              {/* Role Tabs */}
              <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeRole === 'student'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('instructor')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeRole === 'instructor'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👨‍🏫 Faculty
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeRole === 'admin'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🛡️ Admin
                </button>
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {activeRole === 'instructor' ? 'Registered Faculty Email' : activeRole === 'admin' ? 'Administrator ID' : 'Student Username'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={activeRole === 'instructor' ? 'email' : 'text'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={activeRole === 'instructor' ? 'raj@gmail.com' : activeRole === 'admin' ? 'admin' : 'akhil_user'}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                      activeRole === 'admin'
                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                    }`}
                  >
                    {loading ? 'Authenticating...' : `Sign In as ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </form>

              {/* Bottom switch to Register */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Don't have an account? <span className="underline">Register as Student or Faculty</span>
                </button>
              </div>

              {/* 1-Click Quick Demo Sign-In */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  1-Click Demo Logins (Instant Testing)
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('student', 'akhil_user', 'pass1')}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 text-left transition-colors"
                  >
                    🎓 Akhil (Student)
                    <span className="block text-[10px] font-normal text-blue-600">akhil_user / pass1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('student', 'neha_user', 'pass2')}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 text-left transition-colors"
                  >
                    🎓 Neha (Student)
                    <span className="block text-[10px] font-normal text-emerald-600">neha_user / pass2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('instructor', 'raj@gmail.com', 'prof123')}
                    className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-left transition-colors"
                  >
                    👨‍🏫 Prof. Raj (Faculty)
                    <span className="block text-[10px] font-normal text-amber-700">raj@gmail.com / prof123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin', 'admin', 'admin123')}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 text-left transition-colors"
                  >
                    🛡️ Admin (CRUD Access)
                    <span className="block text-[10px] font-normal text-purple-700">admin / admin123</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* MODE 2: CREATE ACCOUNT (STUDENT & FACULTY)                       */}
          {/* ================================================================ */}
          {mode === 'register' && (
            <div>
              {/* Registration Role Switcher */}
              <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => { setRegRole('student'); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    regRole === 'student'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🎓 Student Registration
                </button>
                <button
                  type="button"
                  onClick={() => { setRegRole('instructor'); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    regRole === 'instructor'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👨‍🏫 Faculty Registration
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={regForm.first_name}
                      onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                      placeholder="e.g. Rahul"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={regForm.middle_name}
                      onChange={(e) => setRegForm({ ...regForm, middle_name: e.target.value })}
                      placeholder="(Optional)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={regForm.last_name}
                      onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                      placeholder="e.g. Verma"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">University Email *</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder={regRole === 'student' ? 'rahul@lms.ac.in' : 'rahul.prof@lms.ac.in'}
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regForm.phone_no}
                        onChange={(e) => setRegForm({ ...regForm, phone_no: e.target.value })}
                        placeholder="9876543210"
                        required
                        maxLength={10}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Specific Fields: Student */}
                {regRole === 'student' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Date of Birth (Age ≥ 16) *
                        </label>
                        <div className="relative">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="date"
                            value={regForm.dob}
                            onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                            required
                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Proctor *</label>
                        <select
                          value={regForm.proctor_id}
                          onChange={(e) => setRegForm({ ...regForm, proctor_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {meta.proctors.map((p) => (
                            <option key={p.proctor_id} value={p.proctor_id}>
                              {p.first_name} {p.last_name} ({p.cabin_no})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Student Portal Username *</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regForm.username}
                          onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                          placeholder="e.g. rahul_user"
                          required
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Role Specific Fields: Faculty */}
                {regRole === 'instructor' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Academic Department *</label>
                      <div className="relative">
                        <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={regForm.dept_id}
                          onChange={(e) => setRegForm({ ...regForm, dept_id: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {meta.departments.map((d) => (
                            <option key={d.dept_id} value={d.dept_id}>
                              {d.dept_name} (Dept #{d.dept_id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Faculty Cabin No. *</label>
                        <button
                          type="button"
                          onClick={() => setRegForm({ ...regForm, cabin_no: `Cabin ${Math.floor(500 + Math.random() * 400)}` })}
                          className="text-[10px] font-semibold text-amber-600 hover:text-amber-800 underline"
                        >
                          Auto-suggest
                        </button>
                      </div>
                      <input
                        type="text"
                        value={regForm.cabin_no}
                        onChange={(e) => setRegForm({ ...regForm, cabin_no: e.target.value })}
                        placeholder="e.g. Cabin 501"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength={4}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={regForm.confirm_password}
                        onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength={4}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading || !!successMsg}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                      regRole === 'instructor'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                    }`}
                  >
                    {loading ? 'Creating Account...' : successMsg ? 'Account Created! Redirecting...' : `Register New ${regRole === 'instructor' ? 'Faculty' : 'Student'} Account`}
                    {!loading && !successMsg && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </form>

              {/* Bottom switch to Sign In */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Already registered? <span className="underline">Sign in to your account</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
