import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  Clock, 
  BookOpen, 
  Search, 
  Filter,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { lmsApi } from '../services/api';
import Badge from '../components/common/Badge';

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  useEffect(() => {
    lmsApi.getModules()
      .then(res => setModules(res.modules))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const courses = ['ALL', ...new Set(modules.map(m => m.course_name))];

  const filtered = modules.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          m.course_name.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = selectedCourse === 'ALL' || m.course_name === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Curriculum Modules</h1>
        <p className="text-sm text-slate-500">Unit-wise topic breakdown and allocated classroom lecture hours</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search module topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {courses.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCourse(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCourse === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Modules List */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading curriculum modules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div
              key={`${m.course_id}-${m.module_no}`}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-200 hover:shadow-md transition-all flex items-start justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold text-base shrink-0">
                  M{m.module_no}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="blue">{m.course_name}</Badge>
                    <span className="text-xs font-semibold text-slate-400">Code: {m.course_id}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                    {m.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{m.lecture_hours} Lecture Hours</strong> scheduled
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Approved
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No modules match criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
