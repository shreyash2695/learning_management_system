import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  Trophy, 
  Users, 
  CheckCircle2, 
  ArrowUpRight,
  Flame
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Analytics() {
  const { currentUser, isStudent } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Study logger form state
  const [sessionMinutes, setSessionMinutes] = useState('30');
  const [trackerMode, setTrackerMode] = useState('Good');
  const [submittingSession, setSubmittingSession] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(null);

  const loadAnalytics = () => {
    lmsApi.getAnalytics()
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, []);

  const handleRecordSession = async (e) => {
    e.preventDefault();
    setSubmittingSession(true);
    try {
      await lmsApi.logStudySession(currentUser.id, Number(sessionMinutes), trackerMode);
      setSessionNotice(`Successfully logged ${sessionMinutes} minutes into progress_analytics!`);
      loadAnalytics();
      setTimeout(() => setSessionNotice(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-slate-400">
        Loading performance analytics...
      </div>
    );
  }

  const { leaderboard, averageCgpa, totalTimeSpent } = data;

  // Chart data
  const chartData = leaderboard.map(item => ({
    name: `${item.first_name} ${item.last_name[0]}.`,
    cgpa: Number(item.cgpa),
    timeSpent: item.time_spent,
    position: item.leaderboard_position
  }));

  const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Progress Analytics & Leaderboard</h1>
        <p className="text-sm text-slate-500">Academic performance trends, study time metrics, and semester standing</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average CGPA</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{averageCgpa}</div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">Across 5 enrolled students</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Study Time</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">
            {Math.round(totalTimeSpent / 60)} <span className="text-sm font-bold text-slate-400">hours</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{totalTimeSpent} minutes logged this semester</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Performer</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-purple-900">
            {leaderboard[0] ? `${leaderboard[0].first_name} ${leaderboard[0].last_name}` : 'N/A'}
          </div>
          <p className="text-xs text-purple-700 font-bold mt-1">CGPA: {leaderboard[0]?.cgpa} • Rank #1</p>
        </div>
      </div>

      {/* Interactive Study Logger Card */}
      {isStudent && (
        <div className="bg-gradient-to-r from-blue-50/60 to-emerald-50/60 border border-blue-200/80 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">Log Personal Study Session</h3>
                <Badge variant="green">Table: progress_analytics</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Log completed self-study or lab prep to increase your total logged study time and boost your leaderboard standing!
              </p>
              {sessionNotice && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {sessionNotice}
                </div>
              )}
            </div>

            <form onSubmit={handleRecordSession} className="flex flex-wrap items-center gap-3 shrink-0">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Study Duration</label>
                <select
                  value={sessionMinutes}
                  onChange={(e) => setSessionMinutes(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (1 Hr)</option>
                  <option value="90">90 Minutes (1.5 Hr)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Daily Status</label>
                <select
                  value={trackerMode}
                  onChange={(e) => setTrackerMode(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Good">Good Standing</option>
                  <option value="Excellent">Excellent Focus</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submittingSession ? 'Saving...' : '+ Record Study Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CGPA Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">CGPA Comparison</h3>
              <p className="text-xs text-slate-400">Relative academic standing on a 10.0 scale</p>
            </div>
            <Badge variant="blue">Cumulative</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`${val} CGPA`, 'Score']}
                />
                <Bar dataKey="cgpa" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Time Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Daily Study Activity</h3>
              <p className="text-xs text-slate-400">Total time spent on LMS modules (in minutes)</p>
            </div>
            <Badge variant="green">Time Spent</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`${val} Mins`, 'Time Spent']}
                />
                <Bar dataKey="timeSpent" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Official Department Leaderboard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Rankings based on evaluated coursework, CGPA, and module engagement</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Rank</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">CGPA</th>
                <th className="px-6 py-3.5">Daily Tracker</th>
                <th className="px-6 py-3.5">Time Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {leaderboard.map((item, idx) => {
                const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th'];
                return (
                  <tr 
                    key={item.student_id} 
                    className={`transition-colors ${
                      item.student_id === currentUser.id ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <span className={`px-2.5 py-1 rounded-lg ${idx === 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                        {medals[idx] || `#${item.leaderboard_position}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {item.first_name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{item.first_name} {item.last_name}</span>
                        {item.student_id === currentUser.id && (
                          <Badge variant="green" className="text-[10px] py-0 px-1.5">You</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.email}</td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-blue-600 text-sm">{Number(item.cgpa).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={item.daily_tracker === 'Excellent' ? 'purple' : item.daily_tracker === 'Good' ? 'green' : 'amber'}>
                        {item.daily_tracker}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.time_spent} mins</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
