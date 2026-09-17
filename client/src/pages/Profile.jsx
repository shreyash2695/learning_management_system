import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Lock, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Building,
  Key,
  GraduationCap,
  Layers,
  ArrowRight,
  Database,
  Check
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

// ==========================================
// 1. INSTRUCTOR PROFILE VIEW
// ==========================================
function InstructorProfileView({ currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone Edit Form
  const [phoneNo, setPhoneNo] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Cabin Edit Form
  const [cabinNo, setCabinNo] = useState('');
  const [cabinSuccess, setCabinSuccess] = useState(false);
  const [cabinError, setCabinError] = useState(null);
  const [updatingCabin, setUpdatingCabin] = useState(false);

  // Password Edit Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [updatingPwd, setUpdatingPwd] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    lmsApi.getInstructorProfile(currentUser.id)
      .then(res => {
        if (res.profile) {
          setProfile(res.profile);
          setPhoneNo(res.profile.phone_no || '');
          setCabinNo(res.profile.cabin_no || '');
        }
      })
      .catch(err => console.error('Error loading instructor profile:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadProfile();
    }
  }, [currentUser?.id]);

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(false);

    const regex = /^[0-9]{10}$/;
    if (!regex.test(phoneNo.trim())) {
      setPhoneError('Phone number must be exactly 10 digits (0-9) according to database constraints.');
      return;
    }

    setUpdatingPhone(true);
    try {
      await lmsApi.updateInstructorPhone(currentUser.id, phoneNo.trim());
      setPhoneSuccess(true);
      loadProfile();
      setTimeout(() => setPhoneSuccess(false), 3500);
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleUpdateCabin = async (e) => {
    e.preventDefault();
    setCabinError(null);
    setCabinSuccess(false);

    if (!cabinNo.trim()) {
      setCabinError('Cabin number cannot be empty.');
      return;
    }

    setUpdatingCabin(true);
    try {
      await lmsApi.updateInstructorCabin(currentUser.id, cabinNo.trim());
      setCabinSuccess(true);
      loadProfile();
      setTimeout(() => setCabinSuccess(false), 3500);
    } catch (err) {
      setCabinError(err.message);
    } finally {
      setUpdatingCabin(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setPwdError('Password should be at least 4 characters long.');
      return;
    }

    setUpdatingPwd(true);
    try {
      await lmsApi.updateInstructorPassword(currentUser.id, oldPassword, newPassword);
      setPwdSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 3500);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setUpdatingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-slate-400">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading faculty credentials &amp; profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
        Failed to load instructor profile details. Please re-authenticate.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="purple">Faculty Academic Lead</Badge>
          <Badge variant="blue">Faculty ID #{profile.instructor_id}</Badge>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Faculty Profile &amp; Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your official university appointment, office cabin allocation, contact details, and taught courses
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-purple-600/20 shrink-0">
            {profile.first_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-extrabold text-slate-900">
                Prof. {profile.first_name} {profile.middle_name ? `${profile.middle_name} ` : ''}{profile.last_name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {profile.email}</span>
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" /> Dept: <strong>{profile.dept_name || 'Academic'}</strong></span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> Cabin: <strong>{profile.cabin_no || 'TBD'}</strong></span>
            </p>
          </div>
        </div>

        {/* Academic Role Badge */}
        <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100 min-w-[220px]">
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> Faculty Status
          </div>
          <div className="font-bold text-sm text-slate-900">
            Coursework Instructor
          </div>
          <div className="text-[11px] text-purple-700 mt-0.5 font-medium">
            Active in {profile.taughtCourses?.length || 0} University Course(s)
          </div>
        </div>
      </div>

      {/* Notice: Instructors do NOT have proctors */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
        <div>
          <strong className="text-slate-800 font-bold">Academic Structure Note:</strong> Faculty instructors lead course instruction, curriculum authoring, and student grading. Proctors are mentors assigned strictly to undergraduate student wards.
        </div>
      </div>

      {/* 2 Column Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Numbers & Cabin Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Phone Number Update */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Registered Mobile Number</h3>
                <p className="text-xs text-slate-400">Stored in database table <code>instructor_phone</code></p>
              </div>
            </div>

            {phoneSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Phone number updated successfully!
              </div>
            )}

            {phoneError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {phoneError}
              </div>
            )}

            <form onSubmit={handleUpdatePhone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                    placeholder="9000000001"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingPhone}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updatingPhone ? 'Updating Database...' : 'Save Phone Number'}
              </button>
            </form>
          </div>

          {/* Cabin Number Update */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Faculty Cabin Allocation</h3>
                <p className="text-xs text-slate-400">Updates column <code>instructor.cabin_no</code></p>
              </div>
            </div>

            {cabinSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Cabin location updated successfully!
              </div>
            )}

            {cabinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {cabinError}
              </div>
            )}

            <form onSubmit={handleUpdateCabin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Office Cabin Number
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cabinNo}
                    onChange={(e) => setCabinNo(e.target.value)}
                    placeholder="Cabin 401"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingCabin}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updatingCabin ? 'Updating...' : 'Update Cabin Location'}
              </button>
            </form>
          </div>
        </div>

        {/* Security / Password Reset Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Faculty Authentication &amp; Security</h3>
              <p className="text-xs text-slate-400">Cryptographically hashed with PBKDF2-SHA512</p>
            </div>
          </div>

          {pwdSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Password updated successfully!
            </div>
          )}

          {pwdError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {pwdError}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPwd}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {updatingPwd ? 'Verifying & Hashing...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Taught Courses Section (via teaches table) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Assigned Courses Taught</h3>
              <p className="text-xs text-slate-400">Relational mapping via database table <code>teaches</code></p>
            </div>
          </div>
          <Badge variant="purple">{profile.taughtCourses?.length || 0} Assigned Course(s)</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {profile.taughtCourses?.map((c) => (
            <div key={c.course_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="blue">Code: #{c.course_id}</Badge>
                  <span className="text-[10px] font-bold text-slate-500">{c.dept_name}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{c.course_name}</h4>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <p>• {c.module_count} Syllabus Modules</p>
                  <p>• {c.assignment_count} Coursework Tasks</p>
                  <p>• {c.enrolled_count} Enrolled Students</p>
                </div>
              </div>

              <Link
                to={`/courses/${c.course_id}`}
                className="mt-4 pt-2 border-t border-slate-200/60 text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center justify-between"
              >
                <span>View Course Syllabus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}

          {(!profile.taughtCourses || profile.taughtCourses.length === 0) && (
            <p className="col-span-3 text-xs text-slate-400 py-6 text-center">
              No courses mapped in table <code>teaches</code> for this faculty ID.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. STUDENT PROFILE VIEW
// (Preserving complete student details with explicit 1-to-1 proctor callout)
// ==========================================
function StudentProfileView({ currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone Edit Form
  const [phoneNo, setPhoneNo] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Password Edit Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [updatingPwd, setUpdatingPwd] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    lmsApi.getStudentProfile(currentUser.id)
      .then(res => {
        if (res.profile) {
          setProfile(res.profile);
          setPhoneNo(res.profile.phone_no || '');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadProfile();
    }
  }, [currentUser?.id]);

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(false);

    const regex = /^[0-9]{10}$/;
    if (!regex.test(phoneNo.trim())) {
      setPhoneError('Phone number must be exactly 10 digits (0-9) according to database constraints.');
      return;
    }

    setUpdatingPhone(true);
    try {
      await lmsApi.updateStudentPhone(currentUser.id, phoneNo.trim());
      setPhoneSuccess(true);
      loadProfile();
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setPwdError('Password should be at least 4 characters long.');
      return;
    }

    setUpdatingPwd(true);
    try {
      await lmsApi.updateStudentPassword(currentUser.id, oldPassword, newPassword);
      setPwdSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setUpdatingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-slate-400">
        Loading student profile data...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
        Failed to load student profile details.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Profile &amp; Settings</h1>
        <p className="text-sm text-slate-500">Manage your official university details, emergency contact numbers, and security</p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-blue-500/20 shrink-0">
            {profile.first_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-extrabold text-slate-900">
                {profile.first_name} {profile.middle_name ? `${profile.middle_name} ` : ''}{profile.last_name}
              </h2>
              <Badge variant="blue">Student #{profile.student_id}</Badge>
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {profile.email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> DOB: {profile.dob}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> User: <strong>{profile.username}</strong></span>
            </p>
          </div>
        </div>

        {/* Dedicated 1-to-1 Assigned Proctor Pill */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 min-w-[250px]">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Your Assigned Faculty Proctor (1-to-1)
          </div>
          <div className="font-bold text-sm text-slate-900">
            Prof. {profile.proctor_first} {profile.proctor_last}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            Cabin: {profile.proctor_cabin} • Emergency: {profile.proctor_phone || '9876543210'}
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
            <span className="text-[10px] text-emerald-700 font-bold">1 Designated Mentor</span>
            <Link to="/proctors" className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-0.5">
              Request Meet →
            </Link>
          </div>
        </div>
      </div>

      {/* 2 Column Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Numbers Section (Database student_phone table) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Registered Contact Phone</h3>
              <p className="text-xs text-slate-400">Updates database table <code>student_phone</code></p>
            </div>
          </div>

          {phoneSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Phone number updated successfully!
            </div>
          )}

          {phoneError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {phoneError}
            </div>
          )}

          <form onSubmit={handleUpdatePhone} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Mobile Number (10 Digits)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Validated by database table <code>student_phone</code>.
              </span>
            </div>

            <button
              type="submit"
              disabled={updatingPhone}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updatingPhone ? 'Updating Database...' : 'Save Phone Number'}
            </button>
          </form>
        </div>

        {/* Security / Password Reset Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Account Security &amp; Password</h3>
              <p className="text-xs text-slate-400">Cryptographically hashed with PBKDF2-SHA512</p>
            </div>
          </div>

          {pwdSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Password updated successfully!
            </div>
          )}

          {pwdError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {pwdError}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPwd}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {updatingPwd ? 'Verifying & Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. ADMIN PROFILE VIEW
// ==========================================
function AdminProfileView({ currentUser }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
      <div>
        <Badge variant="purple">System Administrator</Badge>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Administrator Profile &amp; Control
        </h1>
        <p className="text-sm text-slate-500">
          Root university operations, schema control, and database administration credentials
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-purple-600/20">
            A
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{currentUser.name || 'System Administrator'}</h2>
            <p className="text-xs text-slate-500 mt-1">Username: <strong>admin</strong> • Role: University Root Admin</p>
          </div>
        </div>

        <Link
          to="/crud"
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20"
        >
          <Database className="w-4 h-4" /> Open Database Studio
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// MAIN DYNAMIC PROFILE ROUTE COMPONENT
// ==========================================
export default function Profile() {
  const { currentUser, isInstructor, isStudent, isAdmin } = useAuth();

  if (isInstructor) {
    return <InstructorProfileView currentUser={currentUser} />;
  }
  if (isAdmin) {
    return <AdminProfileView currentUser={currentUser} />;
  }
  return <StudentProfileView currentUser={currentUser} />;
}
