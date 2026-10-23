import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Building, 
  Phone, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Mail, 
  Search,
  Info,
  Calendar,
  MessageSquare,
  Clock
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Proctors() {
  const { currentUser, isStudent, isInstructor, isAdmin } = useAuth();
  const [proctors, setProctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [consultNotice, setConsultNotice] = useState(null);
  
  // Meeting request dialog state
  const [requestingMeeting, setRequestingMeeting] = useState(false);
  const [meetingTopic, setMeetingTopic] = useState('Academic Progress & Advisory');
  const [meetingNotes, setMeetingNotes] = useState('');

  useEffect(() => {
    lmsApi.getProctors()
      .then(res => setProctors(res.proctors || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Find student's single assigned proctor
  const myProctor = proctors.find(p => p.students && p.students.some(s => s.student_id === currentUser?.id));

  const handleSendMeetingRequest = (e) => {
    e.preventDefault();
    if (!myProctor) return;
    const proctorName = `${myProctor.first_name} ${myProctor.last_name}`;
    setConsultNotice({
      title: `Meeting Requested with Prof. ${proctorName}`,
      detail: `Topic: "${meetingTopic}" • Cabin ${myProctor.cabin_no}. Your proctor will review this request.`
    });
    setRequestingMeeting(false);
    setMeetingNotes('');
    setTimeout(() => setConsultNotice(null), 6000);
  };

  const filtered = proctors.filter(p => {
    const fullName = `${p.first_name} ${p.middle_name || ''} ${p.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           (p.cabin_no && p.cabin_no.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {isStudent ? 'My Assigned Proctor & Mentorship' : 'Proctoring & Student Mentorship Directorate'}
        </h1>
        <p className="text-sm text-slate-500">
          {isStudent 
            ? 'Dedicated 1-to-1 faculty advisory allocation and university proctor directory' 
            : 'University faculty advisors and 1-to-1 student ward allocation registry'}
        </p>
      </div>

      {/* Instructor Notice: Faculty do not have proctors */}
      {isInstructor && (
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl text-blue-900 flex items-start gap-4 shadow-xs">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-blue-950">Faculty Advisory Notice: Instructors Do Not Have Proctors</h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              Under university academic regulations, the <strong>Proctoring &amp; Mentorship System</strong> is established strictly for undergraduate student wards (1 dedicated faculty mentor per student). As a faculty member/instructor, you do not have an assigned proctor. You can manage your taught courses, create quizzes, and grade assignment submissions directly from the instructor navigation. The directory below displays the university-wide proctor ward distribution for academic coordination.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation notification */}
      {consultNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-950">{consultNotice.title}:</span> {consultNotice.detail}
            </div>
          </div>
          <button 
            onClick={() => setConsultNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Student's Assigned Proctor Spotlight Hero (Single Proctor Enforced) */}
      {isStudent && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-700/15">
          {myProctor ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-extrabold text-2xl shadow-inner shrink-0 border border-white/20">
                    <ShieldCheck className="w-9 h-9 text-emerald-200" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-300/30 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider mb-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Dedicated 1-to-1 Faculty Proctor
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                      Prof. {myProctor.first_name} {myProctor.middle_name ? `${myProctor.middle_name} ` : ''}{myProctor.last_name}
                    </h2>
                    <p className="text-xs text-emerald-100/90 mt-1.5 flex flex-wrap items-center gap-4 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-emerald-300" /> Cabin: <strong className="text-white font-bold">{myProctor.cabin_no}</strong> (Proctor Wing)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-emerald-300" /> Emergency Hotline: <strong className="font-mono text-white font-bold">{myProctor.phone_numbers || '9876543210'}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-300" /> Ward Unit #{myProctor.proctor_id}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setRequestingMeeting(true)}
                    className="px-5 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    Request Proctor Meeting
                  </button>
                </div>
              </div>

              {/* University Policy Notice */}
              <div className="p-3.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-xs text-emerald-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>
                  <strong>University Academic Regulation:</strong> Every enrolled student has exactly one assigned faculty mentor (governed by foreign key <code>student.proctor_id</code>). All academic counseling, course registrations, semester clearance, and leave approvals must be scheduled exclusively through your assigned proctor above.
                </span>
              </div>

              {/* Inline Meeting Request Form */}
              {requestingMeeting && (
                <form onSubmit={handleSendMeetingRequest} className="p-5 bg-white text-slate-900 rounded-2xl shadow-xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Schedule Meeting with Prof. {myProctor.first_name} {myProctor.last_name}
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setRequestingMeeting(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Agenda / Topic</label>
                      <select 
                        value={meetingTopic}
                        onChange={(e) => setMeetingTopic(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="Academic Progress & Advisory">Academic Progress &amp; Advisory</option>
                        <option value="Course Registration Approval">Course Registration Approval</option>
                        <option value="Attendance / Leave Clarification">Attendance / Leave Clarification</option>
                        <option value="Career Mentorship & Counseling">Career Mentorship &amp; Counseling</option>
                        <option value="General Grievance">General Grievance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time Window</label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="e.g. Tomorrow 3:00 PM during cabin hours"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          defaultValue="During Cabin Office Hours (Mon-Fri 3:00 - 5:00 PM)"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Additional Notes for Proctor (Optional)</label>
                    <textarea 
                      rows={2}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Briefly describe what you would like to discuss with your mentor..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRequestingMeeting(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      Confirm Meeting Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-900/40 rounded-2xl border border-emerald-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <strong className="text-sm font-bold">No Faculty Proctor Assigned Yet</strong>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Please consult the university registrar to assign your primary faculty proctor.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Directory Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isStudent ? 'University Mentorship Directorate (Directory Reference)' : 'Faculty Proctor & Ward Directory'}
          </h2>
          <p className="text-xs text-slate-500">
            {isStudent 
              ? 'Complete university listing of mentorship wards. (Non-assigned proctors are view-only)'
              : 'Institutional record of faculty proctor units, cabins, hotlines, and student ward rosters'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search proctors or cabin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading proctor records...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const isMyAssignedProctor = isStudent && myProctor && p.proctor_id === myProctor.proctor_id;

            return (
              <div
                key={p.proctor_id}
                className={`bg-white rounded-3xl border p-6 shadow-xs transition-all flex flex-col justify-between ${
                  isMyAssignedProctor 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                    : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-sm ${
                      isMyAssignedProctor 
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20' 
                        : 'bg-gradient-to-tr from-slate-700 to-slate-800 text-white shadow-slate-700/20'
                    }`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    {isMyAssignedProctor ? (
                      <Badge variant="green">Your Assigned Proctor</Badge>
                    ) : (
                      <Badge variant="gray">Ward Unit #{p.proctor_id}</Badge>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900">
                    Prof. {p.first_name} {p.middle_name ? `${p.middle_name} ` : ''}{p.last_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Faculty Mentor ID: #{p.proctor_id}</p>

                  <div className="mt-5 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Cabin: <strong className="text-slate-800">{p.cabin_no}</strong> (Proctor Wing)</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Emergency Hotline: <strong className="font-mono">{p.phone_numbers || '9876543210'}</strong></span>
                    </div>
                  </div>

                  {/* Assigned Student Wards */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Assigned Wards</span>
                      <span className="text-emerald-700 font-bold">{p.students?.length || 0} Student(s)</span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {p.students && p.students.map((st) => (
                        <div 
                          key={st.student_id} 
                          className={`p-2 rounded-xl flex items-center justify-between text-xs ${
                            isStudent && st.student_id === currentUser?.id 
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold' 
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">
                            {st.first_name} {st.last_name}
                            {isStudent && st.student_id === currentUser?.id && ' (You)'}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">#{st.student_id}</span>
                        </div>
                      ))}
                      {(!p.students || p.students.length === 0) && (
                        <p className="text-[11px] text-slate-400 italic">No assigned students currently.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {isMyAssignedProctor ? (
                    <>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 1-to-1 Mentor Active
                      </span>
                      <button
                        onClick={() => {
                          setRequestingMeeting(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
                      >
                        Request Consultation
                      </button>
                    </>
                  ) : isStudent ? (
                    <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
                      <span>Assigned to other student wards</span>
                      <span className="italic font-medium">Reference Only</span>
                    </div>
                  ) : isInstructor ? (
                    <div className="w-full flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Faculty Mentorship Unit</span>
                      <Badge variant="blue">{p.students?.length || 0} Wards</Badge>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">{p.students?.length || 0} Active Wards</span>
                      <Badge variant="purple">Unit #{p.proctor_id}</Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
