import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  Network, 
  GitFork, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Compass, 
  ArrowRight, 
  Database, 
  BookOpen, 
  GraduationCap, 
  RefreshCw, 
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Info,
  Maximize2,
  Play,
  Sun,
  Moon,
  Table as TableIcon,
  Code2,
  Download,
  Terminal,
  UserCheck,
  Briefcase,
  Building,
  Check,
  Copy
} from 'lucide-react';
import { graphApi, lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { forceCollide, forceCenter, forceManyBody, forceRadial } from 'd3-force-3d';

// Color palette mapping for Node Types across Dark and Light modes
const NODE_THEMES = {
  dark: {
    Course: { border: '#38bdf8', dot: '#60a5fa', bg: '#0f172a', text: '#ffffff', sub: '#93c5fd' },
    Student: { border: '#f472b6', dot: '#ec4899', bg: '#1c1917', text: '#fdf2f8', sub: '#fbcfe8' },
    Topic: { border: '#34d399', dot: '#10b981', bg: '#022c22', text: '#ecfdf5', sub: '#a7f3d0' },
    Instructor: { border: '#fbbf24', dot: '#f59e0b', bg: '#1c1917', text: '#fffbeb', sub: '#fde68a' },
    Department: { border: '#22d3ee', dot: '#06b6d4', bg: '#083344', text: '#ecfeff', sub: '#a5f3fc' },
    Skill: { border: '#c084fc', dot: '#a855f7', bg: '#1e1b4b', text: '#faf5ff', sub: '#e9d5ff' },
    Default: { border: '#94a3b8', dot: '#64748b', bg: '#0f172a', text: '#ffffff', sub: '#cbd5e1' }
  },
  light: {
    Course: { border: '#2563eb', dot: '#3b82f6', bg: '#ffffff', text: '#0f172a', sub: '#1d4ed8' },
    Student: { border: '#db2777', dot: '#ec4899', bg: '#ffffff', text: '#0f172a', sub: '#be185d' },
    Topic: { border: '#059669', dot: '#10b981', bg: '#ffffff', text: '#0f172a', sub: '#047857' },
    Instructor: { border: '#d97706', dot: '#f59e0b', bg: '#ffffff', text: '#0f172a', sub: '#b45309' },
    Department: { border: '#0891b2', dot: '#06b6d4', bg: '#ffffff', text: '#0f172a', sub: '#0e7490' },
    Skill: { border: '#7c3aed', dot: '#9333ea', bg: '#ffffff', text: '#0f172a', sub: '#6d28d9' },
    Default: { border: '#64748b', dot: '#94a3b8', bg: '#ffffff', text: '#0f172a', sub: '#475569' }
  }
};

const PRESET_QUERIES = [
  { label: 'All Entities: MATCH (n) RETURN n', query: 'MATCH (n) RETURN n' },
  { label: 'Student 101 All Involvements', query: 'MATCH (s:Student {student_id: 101})-[r]-(n) RETURN s, r, n' },
  { label: 'Student 101 Summary Table', query: 'MATCH (s:Student {student_id: 101}) OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course) OPTIONAL MATCH (s)-[:COMPLETED]->(comp:Course) RETURN s.student_id AS ID, s.name AS Name, collect(DISTINCT c.name) AS Enrolled, collect(DISTINCT comp.name) AS Completed' },
  { label: 'Prerequisites DAG (Course -> Course)', query: 'MATCH (c1:Course)-[r:REQUIRES]->(c2:Course) RETURN c1, r, c2' },
  { label: 'Faculty Teaching Matrix', query: 'MATCH (i:Instructor)-[r:TEACHES]->(c:Course) RETURN i, r, c' },
  { label: 'Student Enrollments & Completions', query: 'MATCH (s:Student)-[r:ENROLLED_IN|COMPLETED]->(c:Course) RETURN s, r, c' },
  { label: 'Course Industry Skills', query: 'MATCH (c:Course)-[r:DEVELOPS_SKILL]->(sk:Skill) RETURN c, r, sk' },
  { label: 'Department Academic Offerings', query: 'MATCH (d:Department)-[r:OFFERS]->(c:Course) RETURN d, r, c' },
  { label: 'Cycle Deadlock Audit', query: 'MATCH path = (c:Course)-[:REQUIRES*1..10]->(c) RETURN c.name AS cycle' }
];

export default function CurriculumGraph() {
  const { currentUser } = useAuth();
  const graphRef = useRef();
  const containerRef = useRef();

  // Theme Toggle: Dark mode vs Light mode
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Tab View: 'graph' | 'table' | 'raw'
  const [activeTab, setActiveTab] = useState('graph');

  // Cypher Console State
  const [cypherQuery, setCypherQuery] = useState('MATCH (n) RETURN n');
  const [isExecutingCypher, setIsExecutingCypher] = useState(false);
  const [cypherTicker, setCypherTicker] = useState('Started streaming 71 records after 14 ms and completed after 16 ms.');
  const [rawQueryResult, setRawQueryResult] = useState(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Graph Data & Filtering
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0, labelCounts: {} });
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('ALL'); // 'ALL' or specific label (Course, Student, etc.)
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('organic'); // 'organic' (Balanced Neo4j Default), 'columns' (Structured Lanes), 'radial' (Concentric Orbits), 'dag' (Prerequisites Flow)

  // Student Progress Overlay
  const [enableProgressOverlay, setEnableProgressOverlay] = useState(true);
  const [studentProgressMap, setStudentProgressMap] = useState({});

  // Inspector & Tools
  const [courses, setCourses] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodePrereqs, setNodePrereqs] = useState(null);
  const [loadingPrereqs, setLoadingPrereqs] = useState(false);

  // Learning Path Finder State
  const [pathStart, setPathStart] = useState('301');
  const [pathTarget, setPathTarget] = useState('308');
  const [learningPath, setLearningPath] = useState(null);
  const [calculatingPath, setCalculatingPath] = useState(false);

  // Student Eligibility State
  const [eligibilityCourseId, setEligibilityCourseId] = useState('308');
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Cycle Audit State
  const [cycleAudit, setCycleAudit] = useState(null);

  // Canvas Dimensions
  const [dimensions, setDimensions] = useState({ width: 900, height: 620 });

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(540, window.innerHeight - 360)
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchGraph();
    fetchCourses();
    fetchCycleAudit();
    fetchStudentProgress();
  }, []);

  async function fetchGraph() {
    try {
      setLoading(true);
      const res = await graphApi.getCurriculum();
      if (res.success) {
        setGraphData(res.graph);
        setStats(res.stats);
        setCypherTicker(`Retrieved ${res.stats.totalNodes} nodes and ${res.stats.totalLinks} relationships from Neo4j AuraDB.`);
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const res = await lmsApi.getCourses();
      if (res.success) setCourses(res.courses || []);
    } catch (err) {
      console.error('Failed to load courses list:', err);
    }
  }

  async function fetchCycleAudit() {
    try {
      const res = await graphApi.getCycles();
      if (res.success) setCycleAudit(res);
    } catch (err) {
      console.error('Failed cycle audit:', err);
    }
  }

  async function fetchStudentProgress() {
    try {
      const studentId = currentUser?.id || 101;
      const res = await graphApi.getStudentProgress(studentId);
      if (res.success) {
        setStudentProgressMap(res.statusMap || {});
      }
    } catch (err) {
      console.error('Failed to fetch student progress map:', err);
    }
  }

  // Execute Cypher Query
  async function handleRunCypher(queryToRun = cypherQuery) {
    if (!queryToRun.trim()) return;
    try {
      setIsExecutingCypher(true);
      const res = await graphApi.runCypher(queryToRun);
      if (res.success) {
        setRawQueryResult(res);
        setCypherTicker(
          `Started streaming ${res.recordCount} records after ${Math.max(5, Math.round(res.executionTimeMs * 0.4))} ms and completed after ${res.executionTimeMs} ms.`
        );

        const hasGraphNodes = res.extractedGraph?.nodes?.length > 0;
        if (hasGraphNodes) {
          // Query returned graph nodes & edges! Render in Graph view
          setGraphData(res.extractedGraph);
          setStats({
            totalNodes: res.extractedGraph.nodes.length,
            totalLinks: res.extractedGraph.links?.length || 0,
            labelCounts: res.extractedGraph.labelCounts || {}
          });
          setSelectedLabelFilter('ALL');
          setActiveTab('graph');
          if (graphRef.current) {
            graphRef.current.d3ReheatSimulation();
            setTimeout(() => graphRef.current?.zoomToFit(500, 60), 400);
          }
        } else if (res.records?.length > 0) {
          // Query returned tabular scalar records! Switch to Table view
          setActiveTab('table');
        }
      }
    } catch (err) {
      setCypherTicker(`Error executing Cypher: ${err.message}`);
    } finally {
      setIsExecutingCypher(false);
    }
  }

  // 1-Click: Focus & Show all connections of any node
  function handleFocusNodeConnections(node) {
    if (!node) return;
    let query = '';
    if (node.type === 'Student' && node.student_id) {
      query = `MATCH (s:Student {student_id: ${node.student_id}})-[r]-(neighbor) RETURN s, r, neighbor`;
    } else if (node.type === 'Instructor' && node.instructor_id) {
      query = `MATCH (i:Instructor {instructor_id: ${node.instructor_id}})-[r]-(neighbor) RETURN i, r, neighbor`;
    } else if (node.type === 'Course' && node.course_id) {
      query = `MATCH (c:Course {course_id: ${node.course_id}})-[r]-(neighbor) RETURN c, r, neighbor`;
    } else if (node.type === 'Department' && node.dept_id) {
      query = `MATCH (d:Department {dept_id: ${node.dept_id}})-[r]-(neighbor) RETURN d, r, neighbor`;
    } else if (node.label) {
      query = `MATCH (n {name: '${node.label}'})-[r]-(neighbor) RETURN n, r, neighbor`;
    }
    if (query) {
      setCypherQuery(query);
      handleRunCypher(query);
    }
  }

  // Handle Node Click
  async function handleNodeClick(node) {
    setSelectedNode(node);
    if (node.type === 'Course' && node.course_id) {
      try {
        setLoadingPrereqs(true);
        const res = await graphApi.getPrerequisites(node.course_id);
        if (res.success) setNodePrereqs(res);
      } catch (err) {
        console.error('Failed to load node prereqs:', err);
      } finally {
        setLoadingPrereqs(false);
      }
    } else {
      setNodePrereqs(null);
    }

    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 600);
      graphRef.current.zoom(2.2, 600);
    }
  }

  // Shortest Learning Pathway
  async function handleCalculatePath() {
    if (!pathStart || !pathTarget) return;
    try {
      setCalculatingPath(true);
      const res = await graphApi.getLearningPath(pathStart, pathTarget);
      if (res.success) setLearningPath(res);
    } catch (err) {
      console.error('Failed to calculate learning path:', err);
    } finally {
      setCalculatingPath(false);
    }
  }

  // Check Eligibility
  async function handleCheckEligibility() {
    const studentId = currentUser?.id || 101;
    try {
      setCheckingEligibility(true);
      const res = await graphApi.checkEligibility(studentId, eligibilityCourseId);
      if (res.success) setEligibilityResult(res);
    } catch (err) {
      console.error('Failed to check eligibility:', err);
    } finally {
      setCheckingEligibility(false);
    }
  }

  // Fit view
  const handleResetView = () => {
    if (graphRef.current) graphRef.current.zoomToFit(500, 50);
  };

  // Filtered dataset for graph
  const filteredData = useMemo(() => {
    let nodes = graphData.nodes || [];
    let links = graphData.links || [];

    // Filter by node label pill
    if (selectedLabelFilter !== 'ALL') {
      nodes = nodes.filter(n => n.type === selectedLabelFilter);
      const allowedNodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => 
        allowedNodeIds.has(l.source?.id || l.source) && 
        allowedNodeIds.has(l.target?.id || l.target)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n => 
        (n.label && n.label.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q)) ||
        (n.dept && n.dept.toLowerCase().includes(q))
      );
      const searchNodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => 
        searchNodeIds.has(l.source?.id || l.source) && 
        searchNodeIds.has(l.target?.id || l.target)
      );
    }

    return { nodes, links };
  }, [graphData, selectedLabelFilter, searchQuery]);

  // Dynamically configure D3 forces based on selected layoutMode
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    const nodes = filteredData.nodes || [];

    if (layoutMode === 'columns') {
      // 1. Structured Academic Columns (Equally Spaced Vertical Lanes)
      fg.d3Force('charge', null);
      fg.d3Force('collide', null);
      fg.d3Force('radial', null);
      fg.d3Force('center', null);

      const colX = {
        Department: -460,
        Instructor: -280,
        Course: -100,
        Topic: 90,
        Skill: 280,
        Student: 470
      };

      const order = ['Department', 'Instructor', 'Course', 'Topic', 'Skill', 'Student'];
      const byType = {};
      order.forEach(t => { byType[t] = []; });
      nodes.forEach(n => {
        const t = n.type || 'Course';
        if (!byType[t]) byType[t] = [];
        byType[t].push(n);
      });

      order.forEach(t => {
        const list = byType[t] || [];
        const count = list.length;
        if (count === 0) return;

        // If list is large (like Skills with 24 or Students with 16), split into 2 sub-columns
        if (count > 12) {
          const half = Math.ceil(count / 2);
          list.forEach((n, idx) => {
            const isSecondCol = idx >= half;
            const subIdx = isSecondCol ? idx - half : idx;
            const subTotal = isSecondCol ? count - half : half;
            const xOffset = isSecondCol ? +45 : -45;
            const vGap = Math.min(38, 480 / Math.max(subTotal, 1));
            n.fx = colX[t] + xOffset;
            n.fy = (subIdx - (subTotal - 1) / 2) * vGap;
          });
        } else {
          const vGap = Math.min(48, 480 / Math.max(count, 1));
          list.forEach((n, idx) => {
            n.fx = colX[t];
            n.fy = (idx - (count - 1) / 2) * vGap;
          });
        }
      });

      fg.d3ReheatSimulation();
    } else if (layoutMode === 'radial') {
      // 2. Concentric Orbits (Radial Rings)
      fg.d3Force('charge', null);
      fg.d3Force('collide', null);
      fg.d3Force('radial', null);
      fg.d3Force('center', null);

      const radiusMap = {
        Course: 85,
        Topic: 175,
        Skill: 265,
        Instructor: 355,
        Department: 425,
        Student: 495
      };

      const byType = {};
      nodes.forEach(n => {
        const t = n.type || 'Course';
        if (!byType[t]) byType[t] = [];
        byType[t].push(n);
      });

      Object.entries(byType).forEach(([t, list]) => {
        const r = radiusMap[t] || 250;
        const count = list.length;
        list.forEach((n, idx) => {
          const angle = (2 * Math.PI * idx) / count;
          n.fx = r * Math.cos(angle);
          n.fy = r * Math.sin(angle);
        });
      });

      fg.d3ReheatSimulation();
    } else if (layoutMode === 'dag') {
      // 3. Prerequisite Hierarchy DAG (Courses only)
      nodes.forEach(n => {
        delete n.fx;
        delete n.fy;
      });
      fg.d3Force('charge', forceManyBody().strength(-350).distanceMax(600));
      fg.d3Force('collide', forceCollide().radius(42).iterations(3));
      fg.d3Force('center', forceCenter(0, 0));
      fg.d3Force('radial', null);
      fg.d3ReheatSimulation();
    } else {
      // 4. 'organic' - Balanced Equal-Spacing Force Layout (Default - Neo4j Style)
      nodes.forEach(n => {
        delete n.fx;
        delete n.fy;
      });

      // Collision force guarantees nodes NEVER overlap and maintain equal separation
      fg.d3Force('collide', forceCollide().radius(n => {
        if (n.type === 'Course') return 46;
        if (n.type === 'Skill' || n.type === 'Topic') return 34;
        return 38;
      }).iterations(3));

      // Many-body repulsion
      fg.d3Force('charge', forceManyBody().strength(-340).distanceMax(600));

      // Center force
      fg.d3Force('center', forceCenter(0, 0));

      // Gentle radial grouping to shape a clean, balanced constellation
      fg.d3Force('radial', forceRadial(n => {
        if (n.type === 'Course') return 70;
        if (n.type === 'Topic') return 150;
        if (n.type === 'Skill') return 230;
        if (n.type === 'Instructor') return 300;
        if (n.type === 'Department') return 360;
        return 420;
      }, 0, 0).strength(0.12));

      fg.d3ReheatSimulation();
    }

    const timer = setTimeout(() => {
      fg.zoomToFit(500, 60);
    }, 600);
    return () => clearTimeout(timer);
  }, [filteredData, layoutMode]);

  // Custom Canvas Rendering adapted for Dark / Light mode
  const paintNode = (node, ctx, globalScale) => {
    const theme = isDarkMode ? NODE_THEMES.dark : NODE_THEMES.light;
    const typeTheme = theme[node.type] || theme.Default;
    const isSelected = selectedNode?.id === node.id;
    const isCourse = node.type === 'Course';

    // Academic progress status for courses
    const studentStatus = enableProgressOverlay && isCourse ? studentProgressMap[node.course_id] : null;

    let borderCol = typeTheme.border;
    let dotCol = typeTheme.dot;
    let badgeText = node.type.toUpperCase();

    if (studentStatus) {
      if (studentStatus === 'COMPLETED') {
        borderCol = '#10b981'; // Green
        dotCol = '#10b981';
        badgeText = '✓ PASSED';
      } else if (studentStatus === 'ENROLLED') {
        borderCol = '#f59e0b'; // Amber
        dotCol = '#f59e0b';
        badgeText = '⚡ ENROLLED';
      } else if (studentStatus === 'ELIGIBLE') {
        borderCol = '#3b82f6'; // Blue
        dotCol = '#3b82f6';
        badgeText = '★ ELIGIBLE';
      } else if (studentStatus === 'LOCKED') {
        borderCol = '#ef4444'; // Red
        dotCol = '#ef4444';
        badgeText = '🔒 LOCKED';
      }
    }

    const label = node.label || '';
    const subLabel = isCourse 
      ? `CS-${node.course_id} • ${badgeText}` 
      : `${badgeText} ${node.dept ? `• ${node.dept}` : ''}`;

    // Measure text to compute box width
    ctx.font = isCourse ? 'bold 9px Inter, system-ui, sans-serif' : 'bold 7.5px Inter, system-ui, sans-serif';
    const mainWidth = ctx.measureText(label).width;
    ctx.font = 'bold 6.5px Inter, system-ui, sans-serif';
    const subWidth = ctx.measureText(subLabel).width;

    const textWidth = Math.max(mainWidth, subWidth);
    const boxWidth = Math.max(isCourse ? 104 : 82, textWidth + 22);
    const boxHeight = isCourse ? 28 : 22;
    const radius = isCourse ? 6 : 5;

    const x = node.x - boxWidth / 2;
    const y = node.y - boxHeight / 2;

    // Background Card
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, boxWidth, boxHeight, radius);
    } else {
      ctx.rect(x, y, boxWidth, boxHeight);
    }

    ctx.fillStyle = isSelected 
      ? (isDarkMode ? '#1e3a8a' : '#dbeafe') 
      : typeTheme.bg;
    ctx.fill();

    // Border
    ctx.lineWidth = isSelected ? 2.2 : 1.2;
    ctx.strokeStyle = isSelected ? (isDarkMode ? '#60a5fa' : '#2563eb') : borderCol;
    ctx.stroke();

    // Type Indicator Dot
    ctx.beginPath();
    ctx.arc(x + 8, y + boxHeight / 2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = dotCol;
    ctx.fill();

    // Text labels
    const textLeft = x + 16;
    // Subheader
    ctx.font = 'bold 6.5px Inter, system-ui, sans-serif';
    ctx.fillStyle = typeTheme.sub;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(subLabel, textLeft, y + (isCourse ? 8 : 6));

    // Main Title
    ctx.font = isCourse ? 'bold 8.5px Inter, system-ui, sans-serif' : 'bold 7.5px Inter, system-ui, sans-serif';
    ctx.fillStyle = typeTheme.text;
    ctx.fillText(label, textLeft, y + (isCourse ? 19 : 15));
  };

  const paintPointerArea = (node, color, ctx) => {
    const isCourse = node.type === 'Course';
    const boxWidth = isCourse ? 108 : 86;
    const boxHeight = isCourse ? 32 : 26;
    ctx.fillStyle = color;
    ctx.fillRect(node.x - boxWidth / 2, node.y - boxHeight / 2, boxWidth, boxHeight);
  };

  const paintLink = (link, ctx, globalScale) => {
    if (!link.source || !link.target || typeof link.source !== 'object') return;
    const isPrereq = link.type === 'REQUIRES';
    const isTeaches = link.type === 'TEACHES';

    // Only draw edge badge if zoomed in (scale >= 0.85) to avoid clutter
    if (globalScale < 0.85 || (!isPrereq && !isTeaches)) return;

    const start = link.source;
    const end = link.target;
    const textPos = {
      x: start.x + (end.x - start.x) * 0.5,
      y: start.y + (end.y - start.y) * 0.5
    };

    const label = isPrereq ? '⚡ REQUIRES' : '👨‍🏫 TEACHES';
    ctx.font = 'bold 6.5px Inter, sans-serif';
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = isPrereq ? '#f59e0b' : '#3b82f6';
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(textPos.x - textWidth / 2 - 3, textPos.y - 5, textWidth + 6, 10, 2.5);
    } else {
      ctx.rect(textPos.x - textWidth / 2 - 3, textPos.y - 5, textWidth + 6, 10);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDarkMode 
      ? (isPrereq ? '#fde68a' : '#93c5fd') 
      : (isPrereq ? '#b45309' : '#1d4ed8');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, textPos.x, textPos.y);
  };

  const handleCopyRaw = () => {
    if (!rawQueryResult) return;
    navigator.clipboard.writeText(JSON.stringify(rawQueryResult, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className={`rounded-3xl p-6 transition-colors shadow-lg border relative overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-950 text-white border-slate-800' 
          : 'bg-white text-slate-900 border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  Curriculum & Knowledge Graph Studio
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Neo4j AuraDB Live
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Graph database visualizer for courses, students, faculty, competencies, and prerequisite pathways.
              </p>
            </div>
          </div>

          {/* Quick Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Student Progress Overlay Toggle */}
            <button
              onClick={() => setEnableProgressOverlay(!enableProgressOverlay)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                enableProgressOverlay
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Progress Map: {enableProgressOverlay ? 'ON' : 'OFF'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                isDarkMode 
                  ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800' 
                  : 'bg-slate-100 text-indigo-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Dark and Light Studio Mode"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? 'Light Studio' : 'Dark Studio'}</span>
            </button>

            {/* Switch to SQL CRUD Studio */}
            <Link
              to="/crud"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                isDarkMode
                  ? 'bg-purple-950/70 hover:bg-purple-900 text-purple-300 border-purple-800/80'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
              }`}
              title="Switch to SQL Compiler & Table CRUD Studio"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>SQL CRUD Studio</span>
            </Link>

            {/* Sync Cloud Button */}
            <button
              onClick={() => { fetchGraph(); fetchCycleAudit(); }}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Cloud</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Interactive Cypher Query CLI Bar (Matches Screenshot) */}
      <div className={`rounded-2xl border p-4 transition-colors shadow-sm ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Terminal Prompt Prefix */}
          <div className="flex items-center gap-2 shrink-0 font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>8bf3a89d$</span>
          </div>

          {/* Query Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={cypherQuery}
              onChange={e => setCypherQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRunCypher(); }}
              placeholder="Enter Cypher statement (e.g. MATCH (n) RETURN n)"
              className={`w-full px-3.5 py-2 rounded-xl font-mono text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                isDarkMode 
                  ? 'bg-slate-950 text-emerald-300 border-slate-800 placeholder-slate-600' 
                  : 'bg-slate-50 text-slate-800 border-slate-200 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Run Button */}
          <button
            onClick={() => handleRunCypher()}
            disabled={isExecutingCypher}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            {isExecutingCypher ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run</span>
          </button>
        </div>

        {/* Preset Queries Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/40 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>Presets:</span>
          {PRESET_QUERIES.map((p, idx) => (
            <button
              key={idx}
              onClick={() => { setCypherQuery(p.query); handleRunCypher(p.query); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                isDarkMode 
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Streaming/Execution Status Ticker (Matches Screenshot) */}
        <div className={`mt-2.5 text-[11px] font-mono flex items-center justify-between ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>{cypherTicker}</span>
          <span className="hidden sm:inline opacity-75">Protocol: Bolt over TLS (neo4j+s)</span>
        </div>
      </div>

      {/* 3. Main Workspace: Canvas & Results Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Left 3 Cols: Studio View (Graph | Table | Raw) */}
        <div className={`lg:col-span-3 rounded-3xl border flex flex-col p-4 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          {/* Studio Top Control Strip (Tabs & Search) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200/20">
            {/* View Switcher Tabs */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'graph' 
                    ? (isDarkMode ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-indigo-600 shadow-xs') 
                    : 'hover:text-slate-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Graph</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'table' 
                    ? (isDarkMode ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-indigo-600 shadow-xs') 
                    : 'hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'raw' 
                    ? (isDarkMode ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-indigo-600 shadow-xs') 
                    : 'hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Raw</span>
              </button>
            </div>

            {/* Search Input & Reset View */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search graph..."
                  className={`pl-8 pr-3 py-1 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDarkMode 
                      ? 'bg-slate-950 text-white border-slate-800 placeholder-slate-600' 
                      : 'bg-slate-50 text-slate-800 border-slate-200 placeholder-slate-400'
                  }`}
                />
              </div>

              {activeTab === 'graph' && (
                <>
                  <select
                    value={layoutMode}
                    onChange={e => setLayoutMode(e.target.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-950 text-slate-200 border-slate-800' 
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <option value="organic">✨ Balanced Organic (Equal Spacing)</option>
                    <option value="columns">🏛️ Academic Columns (Structured Grid)</option>
                    <option value="radial">🪐 Concentric Orbits (Radial Rings)</option>
                    <option value="dag">⚡ Prerequisite Flow (Courses DAG)</option>
                  </select>

                  <button
                    onClick={handleResetView}
                    title="Fit view to canvas"
                    className={`p-1.5 rounded-xl border transition-all ${
                      isDarkMode 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Viewport Content */}
          <div ref={containerRef} className={`flex-1 rounded-2xl overflow-hidden relative border min-h-[520px] ${
            isDarkMode ? 'bg-[#111827] border-slate-800' : 'bg-[#f8fafc] border-slate-200'
          }`}>
            {/* TAB 1: GRAPH VIEW */}
            {activeTab === 'graph' && (
              <>
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                    <span className="text-sm font-medium">Rendering Neo4j graph topology...</span>
                  </div>
                ) : (
                  <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.width - 32}
                    height={dimensions.height}
                    graphData={filteredData}
                    dagMode={layoutMode === 'dag' ? 'lr' : null}
                    dagLevelDistance={160}
                    nodeCanvasObject={paintNode}
                    nodePointerAreaPaint={paintPointerArea}
                    linkCanvasObjectMode={() => 'after'}
                    linkCanvasObject={paintLink}
                    linkColor={link => (link.type === 'REQUIRES' ? '#f59e0b' : link.type === 'TEACHES' ? '#38bdf8' : isDarkMode ? '#334155' : '#cbd5e1')}
                    linkWidth={link => (link.type === 'REQUIRES' ? 1.8 : 0.8)}
                    linkDirectionalArrowLength={link => (link.type === 'REQUIRES' ? 7 : 4)}
                    linkDirectionalArrowRelPos={0.88}
                    linkDirectionalParticles={link => (link.type === 'REQUIRES' ? 3 : 0)}
                    linkDirectionalParticleSpeed={0.007}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={160}
                    d3VelocityDecay={0.3}
                  />
                )}

                {/* Legend Watermark */}
                <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-xl text-[11px] backdrop-blur-md border flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-slate-950/80 text-slate-300 border-slate-800' 
                    : 'bg-white/80 text-slate-600 border-slate-200'
                }`}>
                  <span className="font-semibold">Showing:</span>
                  <span>{filteredData.nodes.length} Nodes</span>
                  <span>•</span>
                  <span>{filteredData.links.length} Edges</span>
                </div>
              </>
            )}

            {/* TAB 2: TABLE VIEW */}
            {activeTab === 'table' && (
              <div className="p-4 h-full overflow-auto text-xs font-mono">
                {rawQueryResult?.records?.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                        <th className="p-2 font-bold">#</th>
                        {Object.keys(rawQueryResult.records[0] || {}).map(key => (
                          <th key={key} className="p-2 font-bold uppercase">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawQueryResult.records.map((row, idx) => (
                        <tr key={idx} className={`border-b ${
                          isDarkMode ? 'border-slate-800/60 hover:bg-slate-800/40 text-slate-300' : 'border-slate-100 hover:bg-slate-100 text-slate-800'
                        }`}>
                          <td className="p-2 text-slate-500">{idx + 1}</td>
                          {Object.values(row).map((val, colIdx) => (
                            <td key={colIdx} className="p-2 max-w-xs truncate">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <TableIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span>Run a Cypher query above to view table records</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RAW JSON VIEW */}
            {activeTab === 'raw' && (
              <div className="p-4 h-full overflow-auto relative">
                <button
                  onClick={handleCopyRaw}
                  className={`absolute top-4 right-4 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <pre className={`text-xs font-mono p-4 rounded-xl ${
                  isDarkMode ? 'bg-slate-950 text-emerald-300' : 'bg-slate-50 text-slate-800'
                }`}>
                  {rawQueryResult ? JSON.stringify(rawQueryResult, null, 2) : '// Run a query above to inspect raw JSON output'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Results Overview & Node Badges (Matches Screenshot!) */}
        <div className="space-y-5 flex flex-col">
          
          {/* Results Overview Box */}
          <div className={`rounded-3xl border p-5 transition-colors shadow-sm ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold flex items-center justify-between mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <span>Results overview</span>
              <span className="text-[11px] font-mono text-slate-400">Nodes ({stats.totalNodes || 0})</span>
            </h3>

            {/* Filter Pills matching Screenshot */}
            <div className="flex flex-wrap gap-2">
              {/* All Nodes Pill */}
              <button
                onClick={() => setSelectedLabelFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedLabelFilter === 'ALL'
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                    : isDarkMode ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                * ({stats.totalNodes || 0})
              </button>

              {/* Individual Node Type Pills with Live Counts */}
              {Object.entries(stats.labelCounts || {}).map(([label, count]) => {
                const isSelected = selectedLabelFilter === label;
                let pillStyle = '';
                if (label === 'Course') {
                  pillStyle = isSelected 
                    ? 'bg-sky-500 text-white ring-2 ring-sky-300' 
                    : isDarkMode ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-50 text-sky-700 border border-sky-200';
                } else if (label === 'Student') {
                  pillStyle = isSelected 
                    ? 'bg-pink-500 text-white ring-2 ring-pink-300' 
                    : isDarkMode ? 'bg-pink-950 text-pink-300 border border-pink-800' : 'bg-pink-50 text-pink-700 border border-pink-200';
                } else if (label === 'Topic') {
                  pillStyle = isSelected 
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' 
                    : isDarkMode ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (label === 'Instructor') {
                  pillStyle = isSelected 
                    ? 'bg-amber-500 text-white ring-2 ring-amber-300' 
                    : isDarkMode ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-amber-50 text-amber-700 border border-amber-200';
                } else if (label === 'Department') {
                  pillStyle = isSelected 
                    ? 'bg-cyan-500 text-white ring-2 ring-cyan-300' 
                    : isDarkMode ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-cyan-50 text-cyan-700 border border-cyan-200';
                } else if (label === 'Skill') {
                  pillStyle = isSelected 
                    ? 'bg-purple-500 text-white ring-2 ring-purple-300' 
                    : isDarkMode ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-purple-50 text-purple-700 border border-purple-200';
                } else {
                  pillStyle = isSelected ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-300';
                }

                return (
                  <button
                    key={label}
                    onClick={() => setSelectedLabelFilter(isSelected ? 'ALL' : label)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${pillStyle}`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node Inspector Drawer */}
          <div className={`rounded-3xl border p-5 transition-colors shadow-sm flex-1 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-3 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Property Inspector</span>
            </h3>

            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                      {selectedNode.type}
                    </span>
                    {selectedNode.dept && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        {selectedNode.dept}
                      </span>
                    )}
                  </div>
                  <h4 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {selectedNode.label}
                  </h4>
                  {selectedNode.course_id && (
                    <p className="text-slate-400 text-[11px] mt-0.5">Code: CS-{selectedNode.course_id} • 4 Credits</p>
                  )}
                  {selectedNode.email && (
                    <p className="text-slate-400 text-[11px] mt-0.5">{selectedNode.email}</p>
                  )}

                  {/* 1-Click Action to inspect all involvements */}
                  <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center gap-2">
                    <button
                      onClick={() => handleFocusNodeConnections(selectedNode)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Focus & Show Involvements</span>
                    </button>
                    {graphData.nodes.length < 71 && (
                      <button
                        onClick={fetchGraph}
                        title="Reset to Full Graph"
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-all border border-slate-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Prerequisite Hierarchy for Courses */}
                {selectedNode.type === 'Course' && (
                  <div>
                    <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <GitFork className="w-3.5 h-3.5 text-amber-500" />
                      <span>Prerequisites DAG</span>
                    </h5>

                    {loadingPrereqs ? (
                      <div className="p-3 text-center text-slate-500">Traversing graph...</div>
                    ) : nodePrereqs?.allPrerequisites?.length > 0 ? (
                      <div className="space-y-1.5">
                        {nodePrereqs.allPrerequisites.map(p => (
                          <div 
                            key={p.course_id}
                            className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                              isDarkMode ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}
                          >
                            <span className="font-semibold">{p.name} (CS-{p.course_id})</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 font-bold">
                              {p.depth} hop{p.depth > 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Foundational course. No prior prerequisites needed!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={`p-6 text-center text-xs border-2 border-dashed rounded-2xl ${
                isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>Click any node in the graph canvas to inspect its full Neo4j properties and relationships.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Bottom Academic Tools: Shortest Learning Pathway & Eligibility Evaluator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Shortest Learning Pathway */}
        <div className={`rounded-3xl border p-5 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Shortest Learning Pathway Discovery</span>
          </h3>
          <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Uses Neo4j <code className="text-indigo-400 font-mono">shortestPath()</code> to calculate the fastest prerequisite progression.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Starting Course</label>
              <select
                value={pathStart}
                onChange={e => setPathStart(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                  isDarkMode ? 'bg-slate-950 text-white border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                {courses.map(c => (
                  <option key={c.course_id} value={c.course_id}>{c.course_id} - {c.course_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Target Course</label>
              <select
                value={pathTarget}
                onChange={e => setPathTarget(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                  isDarkMode ? 'bg-slate-950 text-white border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                {courses.map(c => (
                  <option key={c.course_id} value={c.course_id}>{c.course_id} - {c.course_name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculatePath}
            disabled={calculatingPath}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {calculatingPath ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Calculate Learning Pathway</span>
          </button>

          {learningPath && (
            <div className={`mt-3 p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-slate-800'
            }`}>
              {learningPath.pathFound ? (
                <div>
                  <span className="font-bold text-indigo-400 block mb-1.5">
                    Optimal Prerequisite Sequence ({learningPath.totalSteps} Courses):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {learningPath.path.map((step, idx) => (
                      <React.Fragment key={step.course_id}>
                        <span className="font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                          {step.name} (CS-{step.course_id})
                        </span>
                        {idx < learningPath.path.length - 1 && <span className="text-slate-500">&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <span>{learningPath.message}</span>
              )}
            </div>
          )}
        </div>

        {/* Enrollment Prerequisite Evaluator */}
        <div className={`rounded-3xl border p-5 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Enrollment Prerequisite Evaluator</span>
          </h3>
          <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Verifies student completed history against prerequisite graph before allowing enrollment.
          </p>

          <div className="text-xs mb-3">
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Target Course to Evaluate</label>
            <select
              value={eligibilityCourseId}
              onChange={e => setEligibilityCourseId(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                isDarkMode ? 'bg-slate-950 text-white border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              {courses.map(c => (
                <option key={c.course_id} value={c.course_id}>{c.course_id} - {c.course_name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCheckEligibility}
            disabled={checkingEligibility}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {checkingEligibility ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
            <span>Evaluate Eligibility for Student #{currentUser?.id || 101}</span>
          </button>

          {eligibilityResult && (
            <div className={`mt-3 p-3 rounded-2xl border text-xs ${
              eligibilityResult.eligible 
                ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900') 
                : (isDarkMode ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900')
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {eligibilityResult.eligible ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{eligibilityResult.eligible ? 'Eligible to Enroll' : 'Registration Blocked'}</span>
              </div>
              <p className="text-[11px] opacity-90">{eligibilityResult.message}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
