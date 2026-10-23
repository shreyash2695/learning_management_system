import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  Network, 
  PlusCircle, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Terminal, 
  Clock, 
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Code,
  Download,
  History,
  Table as TableIcon,
  ChevronRight,
  Copy,
  Trash,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { crudApi } from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

// Comprehensive DBMS Concept Demonstration Presets
const PRESET_QUERIES = [
  // 1. Multi-Table JOINs
  {
    category: 'JOINs',
    title: 'Inner Join (4 Tables)',
    desc: 'Joins student, submits, course, and assignment tables to list evaluated coursework',
    sql: `SELECT s.student_id, s.first_name || ' ' || s.last_name AS student_name, 
       c.course_name, a.name AS assignment_name, sub.marks_obtained, sub.status
FROM student s 
JOIN submits sub ON s.student_id = sub.student_id 
JOIN course c ON sub.course_id = c.course_id 
JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id;`
  },
  {
    category: 'JOINs',
    title: 'Left Outer Join (Faculty & Contact)',
    desc: 'Lists all instructors with their department and phone numbers (including unassigned phones)',
    sql: `SELECT i.instructor_id, i.first_name, i.last_name, d.dept_name, i.cabin_no, ip.phone_no 
FROM instructor i 
LEFT JOIN department d ON i.dept_id = d.dept_id 
LEFT JOIN instructor_phone ip ON i.instructor_id = ip.instructor_id;`
  },
  {
    category: 'JOINs',
    title: 'Teaches M:N Relationship Join',
    desc: 'Joins course, teaches, and instructor to list all co-instructors per course',
    sql: `SELECT c.course_id, c.course_name, i.first_name || ' ' || i.last_name AS instructor_name, i.email
FROM course c
JOIN teaches t ON c.course_id = t.course_id
JOIN instructor i ON t.instructor_id = i.instructor_id
ORDER BY c.course_id;`
  },
  // 2. Aggregations & Grouping
  {
    category: 'Aggregates',
    title: 'Group By & Having Filter',
    desc: 'Finds courses with 2 or more enrolled students using GROUP BY and HAVING',
    sql: `SELECT c.course_id, c.course_name, COUNT(e.student_id) AS enrolled_count
FROM course c
JOIN enrolls e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
HAVING COUNT(e.student_id) >= 2;`
  },
  {
    category: 'Aggregates',
    title: 'Aggregate Stats (COUNT, AVG, MIN, MAX)',
    desc: 'Calculates performance summary across all evaluated submissions',
    sql: `SELECT COUNT(*) AS total_graded_submissions, 
       ROUND(AVG(marks_obtained), 2) AS average_score, 
       MIN(marks_obtained) AS lowest_score, 
       MAX(marks_obtained) AS highest_score
FROM submits 
WHERE marks_obtained IS NOT NULL;`
  },
  // 3. Subqueries
  {
    category: 'Subqueries',
    title: 'Nested Non-Correlated Subquery',
    desc: 'Selects students whose CGPA is strictly above the university-wide average',
    sql: `SELECT s.student_id, s.first_name, s.last_name, pa.cgpa 
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id
WHERE pa.cgpa > (SELECT AVG(cgpa) FROM progress_analytics);`
  },
  {
    category: 'Subqueries',
    title: 'Correlated Subquery',
    desc: 'Finds students with above-average study hours compared to overall cohort',
    sql: `SELECT s.student_id, s.first_name, s.last_name, pa.time_spent
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id
WHERE pa.time_spent >= (
  SELECT AVG(pa2.time_spent) 
  FROM progress_analytics pa2
);`
  },
  // 4. Relational Division
  {
    category: 'Relational Division',
    title: 'Relational Division Simulation',
    desc: 'Finds students enrolled in all courses offered by Computer Science (Dept 1)',
    sql: `SELECT s.student_id, s.first_name, s.last_name
FROM student s
WHERE NOT EXISTS (
  SELECT c.course_id 
  FROM course c 
  WHERE c.dept_id = 1
  AND NOT EXISTS (
    SELECT e.course_id 
    FROM enrolls e 
    WHERE e.student_id = s.student_id 
      AND e.course_id = c.course_id
  )
);`
  },
  // 5. Views
  {
    category: 'Views',
    title: 'View: student_performance_view',
    desc: 'Queries the composite student performance database view',
    sql: `SELECT * FROM student_performance_view ORDER BY cgpa DESC;`
  },
  {
    category: 'Views',
    title: 'View: course_feedback_summary',
    desc: 'Queries aggregated course feedback ratings and review counts',
    sql: `SELECT * FROM course_feedback_summary;`
  },
  {
    category: 'Views',
    title: 'View: course_enrollment_summary',
    desc: 'Queries course enrollment statistics and student totals',
    sql: `SELECT * FROM course_enrollment_summary;`
  },
  // 6. Stored Procedures & Functions
  {
    category: 'Procedures',
    title: 'Procedure: GET_STUDENT_DETAILS',
    desc: 'Executes stored procedure for Student #101',
    sql: `CALL GET_STUDENT_DETAILS(101);`
  },
  {
    category: 'Procedures',
    title: 'Procedure: GET_COURSE_STUDENTS',
    desc: 'Executes stored procedure for Course #301',
    sql: `CALL GET_COURSE_STUDENTS(301);`
  },
  {
    category: 'Functions',
    title: 'Function: GET_COURSE_STUDENT_COUNT',
    desc: 'Calls stored function to compute enrollment count for Course #301',
    sql: `SELECT GET_COURSE_STUDENT_COUNT(301) AS enrolled_students;`
  },
  {
    category: 'Functions',
    title: 'Function: GET_COURSE_AVERAGE_RATING',
    desc: 'Calls stored function to return average rating for Course #301',
    sql: `SELECT GET_COURSE_AVERAGE_RATING(301) AS average_rating;`
  },
  // 7. Triggers & Audit Log
  {
    category: 'Triggers & Audit',
    title: 'View Audit Log Table',
    desc: 'Inspects automated audit log triggers capturing student modifications',
    sql: `SELECT * FROM audit_log ORDER BY log_id DESC LIMIT 10;`
  },
  {
    category: 'Triggers & Audit',
    title: 'Trigger Test: Under-16 Check (Should Error)',
    desc: 'Attempts to insert student < 16 yrs to demonstrate BEFORE INSERT trigger constraint',
    sql: `INSERT INTO student (student_id, first_name, last_name, dob, email, proctor_id) 
VALUES (999, 'Underage', 'Test', '2020-01-01', 'underage@test.com', 1);`
  },
  // 8. Ranking & Analytics
  {
    category: 'Ranking',
    title: 'Window Function: RANK() OVER CGPA',
    desc: 'Dynamically computes academic standing and ranks across students',
    sql: `SELECT s.student_id, s.first_name || ' ' || s.last_name AS student_name, 
       pa.cgpa,
       RANK() OVER (ORDER BY pa.cgpa DESC) AS computed_rank
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id;`
  },
  // 9. Query Optimization
  {
    category: 'Optimization',
    title: 'EXPLAIN QUERY PLAN (Index Usage)',
    desc: 'Analyzes query optimizer execution plan and confirms index usage',
    sql: `EXPLAIN QUERY PLAN 
SELECT s.student_id, s.first_name, e.course_id 
FROM student s 
JOIN enrolls e ON s.student_id = e.student_id 
WHERE s.student_id = 101;`
  }
];

export default function CrudStudio() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('student');
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [search, setSearch] = useState('');
  const [dbType, setDbType] = useState('sqlite');

  // Insert Modal State
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [insertError, setInsertError] = useState(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRecordKey, setEditRecordKey] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState(null);

  // SQL Compiler State
  const [activeTab, setActiveTab] = useState('query'); // Default to enhanced query compiler!
  const [customQuery, setCustomQuery] = useState(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [resultFilter, setResultFilter] = useState('');
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('lms_query_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const textareaRef = useRef(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState(null);

  // Category filter for DBMS Presets
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('All');
  const presetCategories = ['All', ...new Set(PRESET_QUERIES.map(p => p.category))];
  const filteredPresets = selectedPresetCategory === 'All' 
    ? PRESET_QUERIES 
    : PRESET_QUERIES.filter(p => p.category === selectedPresetCategory);

  useEffect(() => {
    crudApi.getSchema()
      .then(res => {
        setTables(res.tables);
        setDbType(res.dbType || 'sqlite');
      })
      .catch(err => console.error(err));
  }, []);

  const currentSchema = tables.find(t => t.name === selectedTable);

  const loadTableData = (tableName, searchQuery = '') => {
    setLoadingRecords(true);
    crudApi.getTableRecords(tableName, searchQuery)
      .then(res => {
        setRecords(res.rows || []);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setLoadingRecords(false));
  };

  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      loadTableData(selectedTable, search);
    }
  }, [selectedTable, search, activeTab]);

  // Execute SQL Query
  const handleExecuteSql = async () => {
    if (!customQuery.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    const startTime = Date.now();
    try {
      const res = await crudApi.executeRawQuery(customQuery);
      setQueryResult(res);

      // Save to History
      const newEntry = {
        id: Date.now(),
        sql: customQuery.trim(),
        timestamp: new Date().toLocaleTimeString(),
        rows: res.rowCount,
        ms: res.executionTimeMs,
        success: true
      };
      const updatedHistory = [newEntry, ...queryHistory.slice(0, 9)];
      setQueryHistory(updatedHistory);
      localStorage.setItem('lms_query_history', JSON.stringify(updatedHistory));
    } catch (err) {
      setQueryError(err.message);
      setQueryResult(null);
      const newEntry = {
        id: Date.now(),
        sql: customQuery.trim(),
        timestamp: new Date().toLocaleTimeString(),
        error: err.message,
        success: false
      };
      const updatedHistory = [newEntry, ...queryHistory.slice(0, 9)];
      setQueryHistory(updatedHistory);
      localStorage.setItem('lms_query_history', JSON.stringify(updatedHistory));
    } finally {
      setQueryLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run query
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSql();
    }
  };

  // Format / Uppercase SQL keywords
  const handleFormatSql = () => {
    const keywords = ['select', 'from', 'where', 'join', 'left join', 'inner join', 'right join', 'on', 'group by', 'order by', 'insert into', 'values', 'update', 'set', 'delete from', 'limit', 'as', 'and', 'or', 'having', 'count', 'avg', 'sum', 'min', 'max'];
    let formatted = customQuery;
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw.toUpperCase());
    });
    setCustomQuery(formatted);
  };

  // Quick-Insert SQL Template for a selected table
  const insertTemplateForTable = (tableName, type) => {
    if (type === 'select') {
      setCustomQuery(`SELECT * FROM ${tableName} LIMIT 20;`);
    } else if (type === 'count') {
      setCustomQuery(`SELECT COUNT(*) as total_records FROM ${tableName};`);
    }
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Export Results as CSV
  const exportToCsv = () => {
    if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) return;
    const cols = queryResult.columns;
    const csvRows = [cols.join(',')];

    queryResult.rows.forEach(row => {
      const vals = cols.map(c => {
        const val = row[c] === null || row[c] === undefined ? '' : String(row[c]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Results as JSON
  const exportToJson = () => {
    if (!queryResult || !queryResult.rows) return;
    const blob = new Blob([JSON.stringify(queryResult.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Query Output Rows
  const filteredOutputRows = queryResult?.rows?.filter(row => {
    if (!resultFilter.trim()) return true;
    return Object.values(row).some(v => 
      String(v).toLowerCase().includes(resultFilter.toLowerCase())
    );
  }) || [];

  // CRUD Handlers
  const handleOpenInsert = () => {
    setFormData({});
    setInsertError(null);
    setIsInsertOpen(true);
  };

  const handleInsertSubmit = async (e) => {
    e.preventDefault();
    setInsertError(null);
    try {
      const res = await crudApi.insertRecord(selectedTable, formData);
      setStatusMessage({ type: 'success', text: res.message || `Successfully inserted record into '${selectedTable}'!` });
      setIsInsertOpen(false);
      loadTableData(selectedTable, search);
      setTimeout(() => setStatusMessage(null), 8000);
    } catch (err) {
      setInsertError(err.message);
    }
  };

  const handleOpenEdit = (row) => {
    if (!currentSchema) return;
    const key = {};
    currentSchema.primaryKey.forEach(pk => {
      key[pk] = row[pk];
    });
    setEditRecordKey(key);
    setEditFormData({ ...row });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      await crudApi.updateRecord(selectedTable, editRecordKey, editFormData);
      setStatusMessage({ type: 'success', text: `Record in '${selectedTable}' updated successfully!` });
      setIsEditOpen(false);
      loadTableData(selectedTable, search);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleDelete = async (row) => {
    if (!currentSchema) return;
    const key = {};
    currentSchema.primaryKey.forEach(pk => {
      key[pk] = row[pk];
    });

    const keyStr = Object.entries(key).map(([k, v]) => `${k}=${v}`).join(', ');
    if (!window.confirm(`Are you sure you want to DELETE record (${keyStr}) from '${selectedTable}'?\nForeign key cascades may affect dependent records.`)) {
      return;
    }

    try {
      await crudApi.deleteRecord(selectedTable, key);
      setStatusMessage({ type: 'success', text: `Record (${keyStr}) deleted from '${selectedTable}'.` });
      loadTableData(selectedTable, search);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 p-7 text-white shadow-lg shadow-purple-600/15">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
                <Database className="w-3.5 h-3.5" /> Database Administrator Control Panel
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-bold uppercase tracking-wider">
                Engine: {dbType.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Interactive SQL Compiler & CRUD Studio
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-purple-100 max-w-2xl leading-relaxed">
              Execute advanced multi-table <code>JOIN</code> queries, analyze execution times, export query data to CSV, or manipulate database tables directly with constraint enforcement.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-purple-900/40 p-1.5 rounded-2xl border border-white/20 shrink-0">
            <button
              onClick={() => { setActiveTab('query'); if (!queryResult) handleExecuteSql(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'query'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" /> SQL Compiler & Playground
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'tables'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" /> Table CRUD Manager
            </button>
            <Link
              to="/curriculum-graph"
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-300/30 shadow-xs"
            >
              <Network className="w-4 h-4 text-indigo-300" />
              <span>Neo4j Knowledge Graph &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {statusMessage.text}
        </div>
      )}

      {/* VIEW 1: Advanced SQL Compiler & Playground */}
      {activeTab === 'query' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Schema Inspector & History */}
          <div className="lg:col-span-1 space-y-5">
            {/* Quick Schema Inspector */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" /> Database Schema
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{tables.length} Tables</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Click a table to quickly insert query template:</p>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {tables.map(t => (
                  <div key={t.name} className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-100 flex items-center justify-between text-xs transition-colors">
                    <span className="font-mono text-[11px] font-bold text-slate-800 truncate">{t.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => insertTemplateForTable(t.name, 'select')}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-purple-600 hover:text-white text-[10px] font-bold border border-slate-200 text-slate-600 transition-colors"
                        title="Insert SELECT * query"
                      >
                        SELECT
                      </button>
                      <button
                        onClick={() => insertTemplateForTable(t.name, 'count')}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-purple-600 hover:text-white text-[10px] font-bold border border-slate-200 text-slate-600 transition-colors"
                        title="Insert COUNT(*) query"
                      >
                        COUNT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Query History */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" /> Query History
                </h3>
                {queryHistory.length > 0 && (
                  <button
                    onClick={() => { setQueryHistory([]); localStorage.removeItem('lms_query_history'); }}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCustomQuery(item.sql)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 cursor-pointer text-xs transition-all group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono">{item.timestamp}</span>
                      {item.success ? (
                        <span className="text-emerald-600 font-bold">{item.rows} rows ({item.ms}ms)</span>
                      ) : (
                        <span className="text-rose-600 font-bold">Failed</span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-slate-700 truncate group-hover:text-blue-700">
                      {item.sql}
                    </p>
                  </div>
                ))}

                {queryHistory.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4">No recent queries.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Code Editor & Execution Grid */}
          <div className="lg:col-span-3 space-y-5">
            {/* Preset Query Badges */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  DBMS Concept Demonstrations ({filteredPresets.length} of {PRESET_QUERIES.length}):
                </span>
                {/* Category Selector */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  {presetCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedPresetCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap ${
                        selectedPresetCategory === cat
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {filteredPresets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCustomQuery(p.sql)}
                    title={p.desc}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 font-semibold text-xs transition-colors text-left flex items-center gap-1.5 group"
                  >
                    <Code className="w-3 h-3 text-purple-600 shrink-0" />
                    <span>{p.title}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white text-purple-600 border border-purple-200 uppercase font-bold">
                      {p.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Editor Area */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-purple-600" /> SQL Editor
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Press <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[9px] border">Ctrl + Enter</kbd> to run)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFormatSql}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    title="Uppercase SQL keywords"
                  >
                    Format SQL
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomQuery('')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSql}
                    disabled={queryLoading}
                    className="inline-flex items-center gap-2 px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 transition-transform active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {queryLoading ? 'Executing...' : 'Run Query'}
                  </button>
                </div>
              </div>

              {/* Code Box with dark theme for code readability */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800">
                <textarea
                  ref={textareaRef}
                  rows="6"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none leading-relaxed tracking-wide selection:bg-purple-800"
                  placeholder="SELECT * FROM student JOIN progress_analytics USING (student_id);"
                ></textarea>
              </div>

              {queryError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">SQL Execution / Syntax Error:</div>
                    <div className="font-mono text-[11px] mt-1 text-rose-700">{queryError}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Grid with Export Toolbar */}
            {queryResult && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Result Top Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Execution Output ({queryResult.rowCount} rows in {queryResult.executionTimeMs}ms)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {queryResult.dbType.toUpperCase()}
                    </span>
                  </div>

                  {/* Search & Export Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter rows..."
                        value={resultFilter}
                        onChange={(e) => setResultFilter(e.target.value)}
                        className="pl-8 pr-3 py-1 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 w-36 sm:w-44"
                      />
                    </div>

                    <button
                      onClick={exportToCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors"
                      title="Download query result as CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV
                    </button>

                    <button
                      onClick={exportToJson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition-colors"
                      title="Download query result as JSON"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      JSON
                    </button>
                  </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} className="px-5 py-3 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800 text-[11px]">
                      {filteredOutputRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-purple-50/20">
                          {queryResult.columns.map(col => (
                            <td key={col} className="px-5 py-3 whitespace-nowrap">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {filteredOutputRows.length === 0 && (
                        <tr>
                          <td colSpan={queryResult.columns.length || 1} className="py-8 text-center text-slate-400 font-sans">
                            {resultFilter ? 'No rows match filter.' : 'Query executed successfully with 0 returned rows.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Table Data CRUD Manager */}
      {activeTab === 'tables' && (
        <div className="space-y-5">
          {/* Table Selector Tabs */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
              Select Database Table:
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {tables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setSelectedTable(t.name); setSearch(''); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedTable === t.name
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search records in '${selectedTable}'...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs font-semibold text-slate-500">
                {records.length} record(s) found
              </span>
              <button
                onClick={handleOpenInsert}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> Insert Record
              </button>
            </div>
          </div>

          {/* Table Data Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingRecords ? (
              <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading {selectedTable}...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      {currentSchema?.columns.map(col => (
                        <th key={col.name} className="px-5 py-3.5 whitespace-nowrap">
                          {col.name}
                          {currentSchema.primaryKey.includes(col.name) && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold">PK</span>
                          )}
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {records.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                        {currentSchema?.columns.map(col => (
                          <td key={col.name} className="px-5 py-3.5 max-w-xs truncate">
                            {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : (
                              <span className="text-slate-300 italic">NULL</span>
                            )}
                          </td>
                        ))}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Update Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {records.length === 0 && (
                      <tr>
                        <td colSpan={(currentSchema?.columns.length || 0) + 1} className="py-12 text-center text-slate-400">
                          No records in <code>{selectedTable}</code>. Click "+ Insert Record" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSERT MODAL */}
      <Modal
        isOpen={isInsertOpen}
        onClose={() => setIsInsertOpen(false)}
        title={`Insert New Record into '${selectedTable}'`}
      >
        {insertError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            {insertError}
          </div>
        )}

        <form onSubmit={handleInsertSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto px-1">
            {currentSchema?.columns.map(col => (
              <div key={col.name} className={col.type === 'text' && col.name.includes('name') ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {col.label} {col.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                  step={col.step || '1'}
                  value={formData[col.name] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [col.name]: e.target.value }))}
                  required={col.required}
                  placeholder={`Enter ${col.name}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInsertOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              Insert Record
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Update Record in '${selectedTable}'`}
      >
        {editError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            {editError}
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto px-1">
            {currentSchema?.columns.map(col => {
              const isPk = currentSchema.primaryKey.includes(col.name);
              return (
                <div key={col.name} className={col.type === 'text' && col.name.includes('name') ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {col.label} {isPk && <span className="text-amber-600 font-semibold">(Primary Key - Locked)</span>}
                  </label>
                  <input
                    type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                    step={col.step || '1'}
                    disabled={isPk}
                    value={editFormData[col.name] !== undefined ? editFormData[col.name] : ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, [col.name]: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${
                      isPk ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
