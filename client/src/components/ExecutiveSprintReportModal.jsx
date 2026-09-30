import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { downloadExecutiveDeckPDF } from '../utils/executiveReportPdf';
import {
  FileText,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Layers,
  Users,
  ShieldCheck,
  Calendar,
  FolderGit2,
  Flame,
  Award,
  Edit3,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Info
} from 'lucide-react';

export default function ExecutiveSprintReportModal({
  projectId,
  dateFrom,
  dateTo,
  activeSprintTasks,
  sprintConfig,
  sprintLabel,
  onClose
}) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Editable report fields state
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [accomplishments, setAccomplishments] = useState([]);
  const [retrospective, setRetrospective] = useState({
    what_went_well: [],
    where_bottlenecks_emerged: [],
    action_items: []
  });
  const [triageSummary, setTriageSummary] = useState('');
  const [riskMitigation, setRiskMitigation] = useState('');

  const modalContainerRef = useRef(null);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.getExecutiveReport(projectId || 'fleet', {
        date_from: dateFrom,
        date_to: dateTo,
        active_tasks: Array.isArray(activeSprintTasks) && activeSprintTasks.length > 0 ? activeSprintTasks : undefined,
        sprint_label: sprintLabel || (sprintConfig?.start && sprintConfig?.end ? `${sprintConfig.start} — ${sprintConfig.end}` : undefined)
      });
      if (res.success && res.report) {
        setReportData(res.report);
        setExecutiveSummary(res.report.executive_summary || '');
        setAccomplishments(res.report.accomplishments || []);
        setRetrospective(res.report.retrospective || {
          what_went_well: [],
          where_bottlenecks_emerged: [],
          action_items: []
        });
        setTriageSummary(res.report.blocker_analysis?.summary || '');
        setRiskMitigation(res.report.blocker_analysis?.risk_mitigation || '');
      } else {
        setError('Failed to generate executive report. Please try again.');
      }
    } catch (err) {
      console.error('Executive Report Fetch Error:', err);
      setError(err.message || 'Unable to connect to report generation engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [projectId, dateFrom, dateTo, activeSprintTasks]);

  // Handle keyboard navigation (Arrow keys + Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (!isEditing) setCurrentSlide(prev => Math.min(prev + 1, 4));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (!isEditing) setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose, isEditing]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (modalContainerRef.current?.requestFullscreen) {
        modalContainerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Direct PDF download via jsPDF
  const handleDirectPDFDownload = () => {
    if (!reportData) return;
    try {
      setIsDownloadingPdf(true);
      downloadExecutiveDeckPDF(reportData, {
        executiveSummary,
        accomplishments,
        retrospective,
        triageSummary,
        riskMitigation
      });
    } catch (err) {
      console.error('Failed to generate direct PDF:', err);
      // Fallback to print dialog if needed
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Browser print dialog (kept for users wanting paper printing)
  const handlePrintPDF = () => {
    window.print();
  };

  // Copy Executive Brief as Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!reportData) return;
    const md = `
# Executive Sprint Report: ${reportData.metadata?.project?.title}
**Sprint Window:** ${reportData.metadata?.sprint_window?.date_from} to ${reportData.metadata?.sprint_window?.date_to} (${reportData.metadata?.sprint_window?.total_days} Days)
**Health Index:** ${reportData.metadata?.health_index?.score}% (${reportData.metadata?.health_index?.label})

## 1. Key Performance Indicators
- **Planned Deliverables:** ${reportData.kpis?.total_planned_tasks} tasks
- **Shipped Velocity:** ${reportData.kpis?.completed_tasks} tasks (${reportData.kpis?.completion_velocity_pct}%)
- **Active / In Progress:** ${reportData.kpis?.in_progress_tasks} tasks
- **Daily Log Compliance:** ${reportData.kpis?.log_compliance_pct}% (${reportData.kpis?.productive_logs} productive / ${reportData.kpis?.total_daily_logs} total)
- **Blocker MTTR:** ${reportData.kpis?.avg_mttr_hours} (Mean Time to Resolution)

## 2. Executive Synthesis
${executiveSummary}

## 3. Key Accomplishments
${accomplishments.map(a => `### ${a.theme} (${a.impact})\n${a.description}\n*Contributors: ${(a.contributors || []).join(', ')}*`).join('\n\n')}

## 4. Impediments & MTTR Analysis
${reportData.blocker_analysis?.summary}
- **Average MTTR:** ${reportData.blocker_analysis?.avg_mttr_hours}
- **Active Blockers:** ${reportData.blocker_analysis?.active_count} | **Resolved:** ${reportData.blocker_analysis?.resolved_count}

## 5. Sprint Retrospective
### What Went Well
${retrospective.what_went_well?.map(w => `- ${w}`).join('\n')}

### Where Bottlenecks Emerged
${retrospective.where_bottlenecks_emerged?.map(b => `- ${b}`).join('\n')}

### AI Action Items for Next Sprint
${retrospective.action_items?.map(i => `- ${i}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const slideTitles = [
    { idx: 0, title: 'Macro Overview', short: 'Overview' },
    { idx: 1, title: 'Velocity & Matrix', short: 'Velocity' },
    { idx: 2, title: 'Accomplishments', short: 'Accomplishments' },
    { idx: 3, title: 'Blockers & MTTR', short: 'Blockers' },
    { idx: 4, title: 'Retrospective', short: 'Retrospective' }
  ];

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center relative">
            <Sparkles className="w-7 h-7 animate-pulse text-yellow-500" />
            <Loader2 className="w-10 h-10 animate-spin absolute text-yellow-500/30" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Generating Executive Sprint Report</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Querying grounded sprint metrics, task velocity, daily logs, and synthesizing executive narrative via Gemini AI...
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (error || !reportData) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Report Generation Encountered an Error</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Unable to assemble report data.'}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Generation</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const { metadata, kpis, discipline_allocation = [], calendar_matrix_snapshot, blocker_analysis } = reportData;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print-backdrop">
      {/* ── PRINT-SPECIFIC CSS RULES FOR 16:9 EXECUTIVE PDF EXPORT ────────── */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .executive-modal-container {
            position: static !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .print-slide {
            page-break-after: always !important;
            break-after: page !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            box-sizing: border-box !important;
            padding: 24px !important;
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-slide:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Main Deck Container */}
      <div
        ref={modalContainerRef}
        className={`executive-modal-container bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : 'max-w-7xl w-full h-[92vh] max-h-[860px]'
        }`}
      >
        {/* ── TOP ACTION BAR & SLIDE DECK NAVIGATION ─────────────────────── */}
        <header className="no-print border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex flex-col flex-shrink-0">
          
          {/* Row 1: Brand, Health KPI, Project Title & Deck Action Controls */}
          <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60">
            {/* Left: Brand, Health Badge, Project Title */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 flex-shrink-0 shadow-sm">
                <FileText className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                  PulsePM Executive Deck
                </span>
                
                {/* Health Status KPI Badge - clearly isolated, elevated, and un-overlapped */}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{metadata?.health_index?.score}% Health</span>
                </span>
                
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700 font-bold">•</span>
                
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] md:max-w-[320px] lg:max-w-[420px]" title={metadata?.project?.title}>
                  {metadata?.project?.title}
                </h2>
              </div>
            </div>

            {/* Right: All Deck Action Buttons (Customize, Copy Brief, Download PDF, Print, Fullscreen, Close) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Inline Editing Toggle */}
              <button
                onClick={() => setIsEditing(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 shadow-sm ${
                  isEditing
                    ? 'bg-yellow-500 text-slate-950 font-bold border-yellow-500'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={isEditing ? 'Finish Customizing Notes' : 'Edit Slide Content'}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Done Editing' : 'Customize'}</span>
              </button>

              {/* Copy Markdown */}
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Copy Executive Brief (Markdown)"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Brief'}</span>
              </button>

              {/* Direct PDF Download */}
              <button
                onClick={handleDirectPDFDownload}
                disabled={isDownloadingPdf}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-950 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
                title="Download Boardroom PDF File Directly to Your Computer"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              {/* Print Modal Option */}
              <button
                onClick={handlePrintPDF}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
                title="Print via Browser Print Dialog"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={isFullscreen ? 'Exit Fullscreen' : 'Present Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Modal */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1 border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                title="Close Report (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Slide Navigation Deck Strip ("Overview", "Velocity", "Accomplishments", "Blockers", "Retrospective") */}
          <div className="px-5 py-2 bg-slate-100/70 dark:bg-slate-950/40 flex items-center justify-between gap-3 overflow-x-auto">
            {/* Options div containing slide options */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-300/50 dark:border-slate-700/50 flex-shrink-0 shadow-inner">
              {slideTitles.map((s) => (
                <button
                  key={s.idx}
                  onClick={() => setCurrentSlide(s.idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    currentSlide === s.idx
                      ? 'bg-white dark:bg-slate-700 text-yellow-600 dark:text-yellow-400 shadow-sm font-bold border border-slate-200/80 dark:border-slate-600/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentSlide === s.idx
                      ? 'bg-yellow-500 text-slate-950'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {s.idx + 1}
                  </span>
                  <span>{s.short}</span>
                </button>
              ))}
            </div>

            {/* Slide Context & Guide Indicator on the Right */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Slide {currentSlide + 1} of 5:
              </span>
              <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                {slideTitles[currentSlide].title}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Use</span>
                <kbd className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">←</kbd>
                <kbd className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">→</kbd>
                <span>keys</span>
              </span>
            </div>
          </div>
        </header>

        {/* ── SLIDE DISPLAY VIEWPORT (INTERACTIVE CAROUSEL) ──────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-100/50 dark:bg-slate-950/40 relative">

          {/* Customization Mode Active Banner */}
          {isEditing && (
            <div className="no-print mb-4 py-2.5 px-4 bg-yellow-500/10 dark:bg-yellow-500/15 border border-yellow-500/40 rounded-xl flex items-center justify-between text-xs text-yellow-900 dark:text-yellow-300 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span>
                  <strong>Customization Mode Active:</strong> You can edit any narrative, accomplishment, blocker note, or retrospective bullet point. Click <strong>Done Editing</strong> when finished.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-sm flex-shrink-0 ml-3"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done Editing</span>
              </button>
            </div>
          )}
          
          {/* SLIDE 1: MACRO EXECUTIVE OVERVIEW & HEALTH INDEX */}
          {currentSlide === 0 && (
            <div className="h-full flex flex-col justify-between space-y-6 animate-fade-in">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                      SLIDE 1 • MACRO EXECUTIVE OVERVIEW
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {metadata?.project?.category}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                    {metadata?.project?.title}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Sprint Window: {metadata?.sprint_window?.display_label || `${metadata?.sprint_window?.date_from} — ${metadata?.sprint_window?.date_to}`} ({metadata?.sprint_window?.total_days} Active Days)</span>
                    <span>•</span>
                    <span>Delivery Lead: {metadata?.project?.manager_name}</span>
                  </p>
                </div>

                {/* Health Index Card */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Sprint Health
                    </span>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {metadata?.health_index?.score}%
                    </div>
                  </div>
                  <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {metadata?.health_index?.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Grounded Multi-Factor Score
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Key Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Planned Tasks
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {kpis?.total_planned_tasks}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">In Scope Deliverables</span>
                </div>

                <div className="bg-white dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                    Shipped Tasks
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {kpis?.completed_tasks} <span className="text-xs font-semibold text-slate-500">({kpis?.completion_velocity_pct}%)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Completed Velocity</span>
                </div>

                <div className="bg-white dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">
                    Active / In Progress
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {kpis?.in_progress_tasks}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Under Active Build</span>
                </div>

                <div className="bg-white dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block mb-1">
                    Blocker MTTR
                  </span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {kpis?.avg_mttr_hours}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{kpis?.mttr_subtitle || 'Resolution Speed'}</span>
                </div>

                <div className="bg-white dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-400 block mb-1">
                    Log Compliance
                  </span>
                  <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                    {kpis?.log_compliance_pct}%
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{kpis?.productive_logs} of {kpis?.total_daily_logs} Days Logged</span>
                </div>
              </div>

              {/* Elaborative Executive Narrative Box */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Executive Synthesis Narrative</span>
                  </span>
                  {isEditing && (
                    <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                      Editable Mode Active
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={executiveSummary}
                    onChange={e => setExecutiveSummary(e.target.value)}
                    rows={4}
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {executiveSummary}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Audience: C-Suite, Engineering VPs &amp; External Stakeholders</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Platform: PMPulse Zero-Agile Overhead Suite
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: VELOCITY BREAKDOWN & CALENDAR MATRIX HEATMAP */}
          {currentSlide === 1 && (
            <div className="h-full flex flex-col space-y-5 animate-fade-in">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                    SLIDE 2 • VELOCITY &amp; CALENDAR MATRIX HEATMAP
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Delivery Cadence &amp; Attendance Audit
                  </h2>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {calendar_matrix_snapshot?.dates?.length || 0} Scheduled Sprint Days
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
                {/* Left Column: Velocity & Discipline Distribution (5 cols) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  {/* Visual Completion Progress Bar */}
                  <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Milestone Velocity</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{kpis?.completion_velocity_pct}% Shipped</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.max(kpis?.completion_velocity_pct, 4)}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Completed: ${kpis?.completed_tasks}`}
                      />
                      <div
                        style={{ width: `${Math.round(((kpis?.in_progress_tasks || 0) / Math.max(kpis?.total_planned_tasks, 1)) * 100)}%` }}
                        className="bg-blue-500 h-full transition-all duration-500"
                        title={`In Progress: ${kpis?.in_progress_tasks}`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Completed: {kpis?.completed_tasks}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>In Progress: {kpis?.in_progress_tasks}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>Backlog: {kpis?.backlog_tasks}</span>
                      </span>
                    </div>
                  </div>

                  {/* Discipline Allocation Chart */}
                  <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-3">
                      Engineering Discipline Allocation
                    </span>
                    <div className="space-y-2.5">
                      {discipline_allocation.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{item.discipline}</span>
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">{item.percentage}% ({item.task_count} tasks)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-yellow-500 h-full rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Calendar Matrix Heatmap Snapshot (7 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between overflow-x-auto">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Calendar Matrix Tracker Snapshot
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {calendar_matrix_snapshot?.contributors?.length || 0} Team Contributors
                      </span>
                    </div>

                    {/* Matrix Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="py-1 px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Contributor
                            </th>
                            {calendar_matrix_snapshot?.dates?.slice(-10).map((d) => (
                              <th key={d} className="py-1 px-1 text-[9px] font-mono text-center text-slate-400">
                                {d.slice(5)}
                              </th>
                            ))}
                            <th className="py-1 px-2 text-[10px] font-bold text-right text-slate-500 dark:text-slate-400 uppercase">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {calendar_matrix_snapshot?.contributors?.map((c) => (
                            <tr key={c.user_id}>
                              <td className="py-2 px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {c.full_name}
                                <span className="block text-[9px] font-normal text-slate-400">{c.role_title}</span>
                              </td>
                              {calendar_matrix_snapshot?.dates?.slice(-10).map((d) => {
                                const status = c.days?.[d] || 'neutral';
                                return (
                                  <td key={d} className="py-2 px-1 text-center">
                                    <span
                                      className={`inline-block w-3.5 h-3.5 rounded-full ${
                                        status === 'productive'
                                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                                          : status === 'blocker'
                                          ? 'bg-red-500 shadow-sm shadow-red-500/30'
                                          : 'bg-slate-200 dark:bg-slate-700'
                                      }`}
                                      title={`${c.full_name} on ${d}: ${status}`}
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-2 px-2 text-xs font-bold text-right text-emerald-600 dark:text-emerald-400">
                                {c.compliance_score}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Productive Logged Work</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>Blocker Impediment</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <span>Neutral / No Log</span>
                      </span>
                    </div>
                    <span>Zero Data Fabrication</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: KEY ACCOMPLISHMENTS & DELIVERABLES */}
          {currentSlide === 2 && (
            <div className="h-full flex flex-col space-y-4 animate-fade-in">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                    SLIDE 3 • KEY ACCOMPLISHMENTS &amp; DELIVERABLES
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Shipped Business Capabilities (AI Clustered)
                  </h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  {accomplishments.length} Strategic Themes
                </span>
              </div>

              {/* Accomplishment Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {accomplishments.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.theme}
                            onChange={e => {
                              const updated = [...accomplishments];
                              updated[idx] = { ...updated[idx], theme: e.target.value };
                              setAccomplishments(updated);
                            }}
                            className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-yellow-500/5 border border-yellow-500/30 rounded px-2 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            placeholder="Deliverable theme..."
                          />
                        ) : (
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {item.theme}
                          </h3>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {item.impact || 'Core Delivery'}
                      </span>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={item.description}
                        onChange={e => {
                          const updated = [...accomplishments];
                          updated[idx].description = e.target.value;
                          setAccomplishments(updated);
                        }}
                        rows={2}
                        className="w-full text-xs p-2 rounded border border-yellow-500/40 bg-yellow-500/5 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {Array.isArray(item.contributors) && item.contributors.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Users className="w-3 h-3 text-yellow-500" />
                        <span>Key Contributors: {item.contributors.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 4: BLOCKERS, FRICTION POINTS & MTTR */}
          {currentSlide === 3 && (
            <div className="h-full flex flex-col space-y-4 animate-fade-in">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                    SLIDE 4 • BLOCKERS, FRICTION POINTS &amp; MTTR
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Impediments, Root Cause Analysis &amp; Triage Speed
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    MTTR: {blocker_analysis?.avg_mttr_hours}
                  </span>
                </div>
              </div>

              {/* Top Row: Friction Summary & Root Causes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Total Impediments Logged
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {blocker_analysis?.total_blockers}
                  </div>
                  <span className="text-[10px] text-slate-500">During Sprint Duration</span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                    Resolved Impediments
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {blocker_analysis?.resolved_count}
                  </div>
                  <span className="text-[10px] text-slate-500">Unblocked with Subsequent Logs</span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-1">
                    Active Bottlenecks
                  </span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {blocker_analysis?.active_count}
                  </div>
                  <span className="text-[10px] text-slate-500">Requiring PM Action</span>
                </div>
              </div>

              {/* Middle: Blocker Analysis Commentary */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Executive Triage Synthesis
                  </span>
                  {isEditing && (
                    <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                      Editable Mode Active
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Triage Summary Note:</label>
                      <textarea
                        value={triageSummary}
                        onChange={e => setTriageSummary(e.target.value)}
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg border border-yellow-500/40 bg-yellow-500/5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="Enter blocker triage commentary..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 block mb-1">Risk Mitigation Guidance:</label>
                      <textarea
                        value={riskMitigation}
                        onChange={e => setRiskMitigation(e.target.value)}
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg border border-yellow-500/40 bg-yellow-500/5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="Enter strategic mitigation advice..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {triageSummary || blocker_analysis?.summary}
                    </p>
                    {(riskMitigation || blocker_analysis?.risk_mitigation) && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium pt-1">
                        💡 {riskMitigation || blocker_analysis?.risk_mitigation}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Bottom: Specific Incident Log Table */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-y-auto">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Verified Blocker Incident Log
                </span>
                {Array.isArray(blocker_analysis?.incidents) && blocker_analysis.incidents.length > 0 ? (
                  <div className="space-y-2">
                    {blocker_analysis.incidents.map((inc) => (
                      <div key={inc.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{inc.employee_name}</span>
                            <span className="text-[10px] font-mono text-slate-400">[{inc.log_date}]</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                              {inc.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                            "{inc.reason}"
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                          inc.is_resolved
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {inc.resolution_label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    🎉 Zero blockers recorded during this sprint. Delivery trajectory is unimpeded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 5: AI SPRINT RETROSPECTIVE & NEXT SPRINT FORECAST */}
          {currentSlide === 4 && (
            <div className="h-full flex flex-col space-y-4 animate-fade-in">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                    SLIDE 5 • AI SPRINT RETROSPECTIVE &amp; FORECAST
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Continuous Improvement &amp; Next Sprint Target
                  </h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Ready for Boardroom Sign-off
                </span>
              </div>

              {/* Triptych Boardroom Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                {/* Column 1: What Went Well (Emerald) */}
                <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        What Went Well
                      </h3>
                    </div>
                    {isEditing && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Editing
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {retrospective.what_went_well?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 group">
                          <span className="text-emerald-500 font-bold mt-1 text-xs">•</span>
                          <textarea
                            rows={2}
                            value={item}
                            onChange={(e) => {
                              const updated = [...(retrospective.what_went_well || [])];
                              updated[idx] = e.target.value;
                              setRetrospective({ ...retrospective, what_went_well: updated });
                            }}
                            className="flex-1 text-xs p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                            placeholder="Enter what went well..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = retrospective.what_went_well.filter((_, i) => i !== idx);
                              setRetrospective({ ...retrospective, what_went_well: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Remove bullet point"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setRetrospective({
                            ...retrospective,
                            what_went_well: [...(retrospective.what_went_well || []), '']
                          });
                        }}
                        className="mt-2 w-full py-1.5 px-2 border border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 flex-1 overflow-y-auto pr-1">
                      {retrospective.what_went_well?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Column 2: Bottlenecks & Friction (Amber) */}
                <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-amber-500/30 dark:border-amber-500/20 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Where Friction Emerged
                      </h3>
                    </div>
                    {isEditing && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Editing
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {retrospective.where_bottlenecks_emerged?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 group">
                          <span className="text-amber-500 font-bold mt-1 text-xs">•</span>
                          <textarea
                            rows={2}
                            value={item}
                            onChange={(e) => {
                              const updated = [...(retrospective.where_bottlenecks_emerged || [])];
                              updated[idx] = e.target.value;
                              setRetrospective({ ...retrospective, where_bottlenecks_emerged: updated });
                            }}
                            className="flex-1 text-xs p-1.5 rounded-lg border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                            placeholder="Enter friction or bottleneck..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = retrospective.where_bottlenecks_emerged.filter((_, i) => i !== idx);
                              setRetrospective({ ...retrospective, where_bottlenecks_emerged: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Remove bullet point"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setRetrospective({
                            ...retrospective,
                            where_bottlenecks_emerged: [...(retrospective.where_bottlenecks_emerged || []), '']
                          });
                        }}
                        className="mt-2 w-full py-1.5 px-2 border border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Friction Point</span>
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 flex-1 overflow-y-auto pr-1">
                      {retrospective.where_bottlenecks_emerged?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-amber-500 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Column 3: AI Action Items (Gold/Indigo) */}
                <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-yellow-500/40 dark:border-yellow-500/30 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                        AI Action Items (Next Sprint)
                      </h3>
                    </div>
                    {isEditing && (
                      <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                        Editing
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {retrospective.action_items?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 group">
                          <span className="text-yellow-500 font-bold mt-1 text-xs">➔</span>
                          <textarea
                            rows={2}
                            value={item}
                            onChange={(e) => {
                              const updated = [...(retrospective.action_items || [])];
                              updated[idx] = e.target.value;
                              setRetrospective({ ...retrospective, action_items: updated });
                            }}
                            className="flex-1 text-xs p-1.5 rounded-lg border border-yellow-500/40 bg-yellow-50/50 dark:bg-yellow-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-y"
                            placeholder="Enter AI action item..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = retrospective.action_items.filter((_, i) => i !== idx);
                              setRetrospective({ ...retrospective, action_items: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Remove bullet point"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setRetrospective({
                            ...retrospective,
                            action_items: [...(retrospective.action_items || []), '']
                          });
                        }}
                        className="mt-2 w-full py-1.5 px-2 border border-dashed border-yellow-500/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Action Item</span>
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 flex-1 overflow-y-auto pr-1">
                      {retrospective.action_items?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-yellow-500 font-bold mt-0.5">➔</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Bottom Sign-off Strip */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">Executive Delivery Verification:</span>
                  <span className="text-slate-500">Report synthesized from live database logs, zero artificial padding.</span>
                </div>
                <button
                  onClick={handleDirectPDFDownload}
                  disabled={isDownloadingPdf}
                  className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloadingPdf ? 'Generating PDF...' : 'Export Full 5-Slide PDF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER NAVIGATION CONTROLS ─────────────────────────────────── */}
        <footer className="no-print px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
              disabled={currentSlide === 0}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Slide (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Slide {currentSlide + 1} of 5
            </span>
            <button
              onClick={() => setCurrentSlide(prev => Math.min(prev + 1, 4))}
              disabled={currentSlide === 4}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Slide (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Use</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
              →
            </kbd>
            <span>keys to navigate presentation slides</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden md:inline">
              Generated: {new Date(metadata?.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </footer>

        {/* ── HIDDEN CONTAINER FOR PRINTING ALL 5 SLIDES SEQUENTIALLY ─────── */}
        <div className="hidden print:block text-slate-900 bg-white">
          {/* Print Slide 1 */}
          <div className="print-slide">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-300">
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                    PMPULSE EXECUTIVE SPRINT REPORT • SLIDE 1 OF 5
                  </span>
                  <h1 className="text-3xl font-black text-slate-900 mt-1">{metadata?.project?.title}</h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Sprint Window: {metadata?.sprint_window?.display_label || `${metadata?.sprint_window?.date_from} — ${metadata?.sprint_window?.date_to}`} ({metadata?.sprint_window?.total_days} Days) • Delivery Lead: {metadata?.project?.manager_name}
                  </p>
                </div>
                <div className="text-right border-l-2 border-slate-300 pl-4">
                  <div className="text-3xl font-black text-emerald-700">{metadata?.health_index?.score}%</div>
                  <div className="text-xs font-bold text-slate-800">{metadata?.health_index?.label}</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3 my-6">
                <div className="p-3 border border-slate-300 rounded">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Planned Tasks</div>
                  <div className="text-2xl font-black text-slate-900">{kpis?.total_planned_tasks}</div>
                </div>
                <div className="p-3 border border-slate-300 rounded">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Shipped Tasks</div>
                  <div className="text-2xl font-black text-emerald-700">{kpis?.completed_tasks} ({kpis?.completion_velocity_pct}%)</div>
                </div>
                <div className="p-3 border border-slate-300 rounded">
                  <div className="text-[10px] uppercase font-bold text-blue-700">In Progress</div>
                  <div className="text-2xl font-black text-blue-700">{kpis?.in_progress_tasks}</div>
                </div>
                <div className="p-3 border border-slate-300 rounded">
                  <div className="text-[10px] uppercase font-bold text-purple-700">Blocker MTTR</div>
                  <div className="text-2xl font-black text-purple-700">{kpis?.avg_mttr_hours}</div>
                </div>
                <div className="p-3 border border-slate-300 rounded">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Log Compliance</div>
                  <div className="text-2xl font-black text-amber-700">{kpis?.log_compliance_pct}%</div>
                </div>
              </div>

              <div className="p-4 border border-slate-300 rounded-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Executive Synthesis Narrative</h3>
                <p className="text-sm text-slate-800 leading-relaxed">{executiveSummary}</p>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
              <span>PulsePM Zero-Agile Overhead Presentation Deck</span>
              <span>100% Mathematically Grounded Metrics</span>
            </div>
          </div>

          {/* Print Slide 2 */}
          <div className="print-slide">
            <div>
              <div className="pb-3 border-b border-slate-300">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  SLIDE 2 OF 5 • VELOCITY &amp; CALENDAR MATRIX HEATMAP
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Delivery Cadence &amp; Attendance Audit</h2>
              </div>
              <div className="my-4">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Engineering Discipline Breakdown</h4>
                <div className="space-y-2">
                  {discipline_allocation.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs border-b border-slate-100 py-1">
                      <span className="font-semibold">{item.discipline}</span>
                      <span>{item.percentage}% ({item.task_count} tasks)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
              <span>{metadata?.project?.title}</span>
              <span>Slide 2 of 5</span>
            </div>
          </div>

          {/* Print Slide 3 */}
          <div className="print-slide">
            <div>
              <div className="pb-3 border-b border-slate-300">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  SLIDE 3 OF 5 • KEY ACCOMPLISHMENTS &amp; DELIVERABLES
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Shipped Business Capabilities (AI Clustered)</h2>
              </div>
              <div className="space-y-4 my-4">
                {accomplishments.map((item, idx) => (
                  <div key={idx} className="p-3 border border-slate-300 rounded">
                    <div className="flex justify-between font-bold text-sm text-slate-900 mb-1">
                      <span>{idx + 1}. {item.theme}</span>
                      <span className="text-xs font-semibold text-emerald-700">{item.impact}</span>
                    </div>
                    <p className="text-xs text-slate-700">{item.description}</p>
                    {Array.isArray(item.contributors) && item.contributors.length > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1">Contributors: {item.contributors.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
              <span>{metadata?.project?.title}</span>
              <span>Slide 3 of 5</span>
            </div>
          </div>

          {/* Print Slide 4 */}
          <div className="print-slide">
            <div>
              <div className="pb-3 border-b border-slate-300">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  SLIDE 4 OF 5 • BLOCKERS, FRICTION POINTS &amp; MTTR
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Impediments &amp; Triage Speed (MTTR: {blocker_analysis?.avg_mttr_hours})</h2>
              </div>
              <div className="my-4 p-3 border border-slate-300 rounded">
                <h4 className="text-xs font-bold text-slate-800 mb-1">Triage Summary</h4>
                <p className="text-xs text-slate-700">{blocker_analysis?.summary}</p>
                {blocker_analysis?.risk_mitigation && (
                  <p className="text-xs text-amber-800 font-semibold mt-2">Guidance: {blocker_analysis.risk_mitigation}</p>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
              <span>{metadata?.project?.title}</span>
              <span>Slide 4 of 5</span>
            </div>
          </div>

          {/* Print Slide 5 */}
          <div className="print-slide">
            <div>
              <div className="pb-3 border-b border-slate-300">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  SLIDE 5 OF 5 • AI SPRINT RETROSPECTIVE &amp; FORECAST
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Continuous Improvement &amp; Next Sprint Target</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 my-4">
                <div className="p-3 border border-emerald-300 rounded">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">What Went Well</h4>
                  <ul className="text-xs space-y-1 text-slate-800">
                    {retrospective.what_went_well?.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
                <div className="p-3 border border-amber-300 rounded">
                  <h4 className="text-xs font-bold text-amber-800 uppercase mb-2">Friction Points</h4>
                  <ul className="text-xs space-y-1 text-slate-800">
                    {retrospective.where_bottlenecks_emerged?.map((b, i) => <li key={i}>• {b}</li>)}
                  </ul>
                </div>
                <div className="p-3 border border-yellow-300 rounded">
                  <h4 className="text-xs font-bold text-yellow-800 uppercase mb-2">AI Action Items</h4>
                  <ul className="text-xs space-y-1 text-slate-800">
                    {retrospective.action_items?.map((a, i) => <li key={i}>➔ {a}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
              <span>{metadata?.project?.title}</span>
              <span>Slide 5 of 5 • Final Sign-off</span>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
