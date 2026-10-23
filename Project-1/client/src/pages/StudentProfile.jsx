import React, { useEffect, useState } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function StudentProfile() {
  const { currentUser } = useAuth();
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
        setProfile(res.profile);
        setPhoneNo(res.profile.phone_no || '');
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [currentUser.id]);

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
        Failed to load profile details.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Profile & Settings</h1>
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

        {/* Assigned Proctor Pill */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 min-w-[240px]">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Assigned Faculty Proctor
          </div>
          <div className="font-bold text-sm text-slate-900">
            Prof. {profile.proctor_first} {profile.proctor_last}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            Cabin: {profile.proctor_cabin} • Phone: {profile.proctor_phone || '9876543210'}
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                <input
                  type="text"
                  maxLength="10"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="9123456780"
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Must match regex <code>^[0-9]&#123;10&#125;$</code> enforced by MySQL constraint.
              </p>
            </div>

            <button
              type="submit"
              disabled={updatingPhone}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {updatingPhone ? 'Saving...' : 'Update Phone Number'}
            </button>
          </form>
        </div>

        {/* Security & Password Manager (Database account table) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Change Account Password</h3>
              <p className="text-xs text-slate-400">Updates database table <code>account</code></p>
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

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current password (e.g. pass1)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={updatingPwd}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              {updatingPwd ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
