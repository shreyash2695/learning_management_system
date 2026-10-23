import React, { useEffect, useState } from 'react';
import { 
  UserCheck, 
  Building, 
  Mail, 
  Phone, 
  BookOpen, 
  Search,
  ExternalLink
} from 'lucide-react';
import { lmsApi } from '../services/api';
import Badge from '../components/common/Badge';

export default function Instructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    lmsApi.getInstructors()
      .then(res => setInstructors(res.instructors))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = instructors.filter(i => {
    const fullName = `${i.first_name} ${i.middle_name || ''} ${i.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           i.email.toLowerCase().includes(search.toLowerCase()) ||
           (i.dept_name && i.dept_name.toLowerCase().includes(search.toLowerCase())) ||
           (i.cabin_no && i.cabin_no.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Faculty & Instructors Directory</h1>
        <p className="text-sm text-slate-500">Contact professors, find departmental cabin locations, and view assigned courses</p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, department, or cabin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:block">
          Total {instructors.length} Faculty Members
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading faculty profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((i) => (
            <div
              key={i.instructor_id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shadow-blue-500/20">
                    {i.first_name[0]}
                  </div>
                  <Badge variant="purple">{i.dept_name || 'General'}</Badge>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                  Prof. {i.first_name} {i.middle_name ? `${i.middle_name} ` : ''}{i.last_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Faculty ID: #{i.instructor_id}</p>

                <div className="mt-5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cabin: <strong className="text-slate-800">{i.cabin_no || 'TBA'}</strong> (Faculty Wing)</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <a href={`mailto:${i.email}`} className="text-blue-600 hover:underline truncate">
                      {i.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Phone: <strong>{i.phone_numbers || 'Not available'}</strong></span>
                  </div>
                </div>

                {i.assigned_course && (
                  <div className="mt-4 p-3 bg-blue-50/60 rounded-xl text-xs space-y-1.5 text-blue-900 font-semibold">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                      <BookOpen className="w-3.5 h-3.5" /> Teaches Courses:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {i.assigned_course.split(',').map((cName, cIdx) => (
                        <span key={cIdx} className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 text-[10px] font-bold">
                          {cName.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Office Hours: 2 - 4 PM</span>
                <a
                  href={`mailto:${i.email}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Send Email
                </a>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No faculty members found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
