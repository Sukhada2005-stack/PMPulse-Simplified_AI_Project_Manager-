import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Mic,
  MicOff,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  RotateCcw,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

export default function VoiceStandupModal({
  isOpen,
  onClose,
  tasks = [],
  onApplyToForm,
  onLogSubmitted
}) {
  const [step, setStep] = useState('record'); // 'record' | 'review'
  const [isRecording, setIsRecording] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [transcript, setTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Review & structured fields
  const [completedDeliverables, setCompletedDeliverables] = useState('');
  const [nextTasks, setNextTasks] = useState('');
  const [blockers, setBlockers] = useState('');
  const [hasWorked, setHasWorked] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('record');
      setIsRecording(false);
      setTimerSeconds(30);
      setTranscript('');
      setIsParsing(false);
      setIsSubmitting(false);
      setErrorMsg(null);
      setCompletedDeliverables('');
      setNextTasks('');
      setBlockers('');
      setHasWorked(true);
      setLogDate(new Date().toISOString().split('T')[0]);
      if (tasks.length > 0) {
        setSelectedTaskId(tasks[0].id);
      }
    } else {
      stopRecordingCleanup();
    }
  }, [isOpen, tasks]);

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Start Speech Recognition & 30s Countdown
  const startRecording = () => {
    setErrorMsg(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not natively supported in this browser. You can type or paste your spoken summary below!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let currentText = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentText += ' ' + event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript((currentText + (interim ? ' ' + interim : '')).trim());
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        if (err.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permission or type your summary below.');
        } else if (err.error !== 'no-speech') {
          setErrorMsg(`Microphone notice: ${err.error}. You can continue by typing your standup.`);
        }
      };

      recognition.onend = () => {
        // Only mark false if timer finished or explicitly stopped
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setTimerSeconds(30);

      // Start 30s timer
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            stopRecordingCleanup();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setErrorMsg('Could not initialize microphone. Please type your summary below.');
    }
  };

  // Stop recording manually
  const stopRecording = () => {
    stopRecordingCleanup();
  };

  // Call Backend AI Parser
  const handleProcessTranscript = async () => {
    const textToProcess = transcript.trim();
    if (!textToProcess) {
      setErrorMsg('Please speak or enter a standup summary before processing.');
      return;
    }

    stopRecordingCleanup();
    setIsParsing(true);
    setErrorMsg(null);

    try {
      const parsed = await api.dailyLogs.parseVoiceStandup(textToProcess, tasks);

      setCompletedDeliverables(parsed.completed_deliverables || '');
      setNextTasks(parsed.next_tasks || '');
      setBlockers(parsed.blockers || '');
      setHasWorked(typeof parsed.has_worked === 'boolean' ? parsed.has_worked : true);

      if (parsed.matched_task_id && tasks.some(t => String(t.id) === String(parsed.matched_task_id))) {
        setSelectedTaskId(parsed.matched_task_id);
      } else if (tasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(tasks[0].id);
      }

      setStep('review');
    } catch (err) {
      console.error('Voice parsing failed:', err);
      setErrorMsg('Could not parse standup. You can review and adjust the fields manually.');
      setCompletedDeliverables(textToProcess);
      setStep('review');
    } finally {
      setIsParsing(false);
    }
  };

  // Apply to form in parent component (e.g. EmployeeDailyLogs)
  const handleApplyToForm = () => {
    if (onApplyToForm) {
      // Build synthesized work_text
      let combinedWork = completedDeliverables.trim();
      if (nextTasks.trim()) {
        combinedWork += (combinedWork ? '\n\n' : '') + 'Next planned: ' + nextTasks.trim();
      }

      onApplyToForm({
        selectedTaskId: selectedTaskId || (tasks[0]?.id || ''),
        hasWorked: Boolean(hasWorked),
        workText: combinedWork,
        noWorkReason: blockers.trim(),
        logDate: logDate
      });
      onClose();
    }
  };

  // Instant Submit directly to Database
  const handleInstantSubmit = async () => {
    if (!selectedTaskId) {
      setErrorMsg('Please select a deliverable task before submitting.');
      return;
    }

    let combinedWork = completedDeliverables.trim();
    if (nextTasks.trim()) {
      combinedWork += (combinedWork ? '\n\n' : '') + 'Next: ' + nextTasks.trim();
    }

    if (hasWorked && !combinedWork) {
      setErrorMsg('Please provide completed deliverables or mark as blocker.');
      return;
    }

    if (!hasWorked && !blockers.trim()) {
      setErrorMsg('A blocker explanation is required when no productive work is recorded.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        has_worked: hasWorked,
        work_text: hasWorked ? combinedWork : null,
        no_work_reason: !hasWorked ? blockers.trim() : (blockers.trim() ? blockers.trim() : null),
        log_date: logDate
      };

      await api.dailyLogs.submit(selectedTaskId, payload);

      if (hasWorked) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.65 }
        });
      }

      if (onLogSubmitted) {
        await onLogSubmitted();
      }
      onClose();
    } catch (err) {
      console.error('Instant submit error:', err);
      setErrorMsg(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = () => {
    setTranscript("Today I fixed the payment webhook timeout and tested auth tokens. Blocked by missing staging DB credentials. Tomorrow I will write the integration tests.");
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Voice-to-Log / 30-Second Async Standup
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Structured
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Eliminate typing friction: speak your daily progress in under 30 seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── ERROR BANNER ──────────────────────────────────────────── */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── BODY: STEP 1 (RECORD) ─────────────────────────────────── */}
        {step === 'record' && (
          <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            {/* Audio Visualizer & Mic Central Trigger */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative flex items-center justify-center mb-4">
                {/* Wave Pulse Rings when recording */}
                {isRecording && (
                  <>
                    <div className="absolute w-36 h-36 rounded-full bg-yellow-500/15 animate-ping" />
                    <div className="absolute w-28 h-28 rounded-full bg-yellow-500/25 animate-pulse" />
                  </>
                )}

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                      : 'bg-gradient-to-tr from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-bold hover:scale-105'
                  }`}
                  title={isRecording ? "Click to stop recording" : "Click to speak standup"}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Speak</span>
                    </>
                  )}
                </button>
              </div>

              {/* Countdown & Waveform Simulation */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isRecording
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timerSeconds}s Remaining</span>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-1 h-5">
                    {[16, 24, 12, 28, 20, 14, 26, 18, 22].map((height, i) => (
                      <span
                        key={i}
                        className="w-1 bg-yellow-500 rounded-full animate-pulse"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 120}ms`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                {isRecording
                  ? 'Listening live... Speak deliverables, blockers, and next steps.'
                  : 'Click the microphone to start your 30-second standup summary.'}
              </p>
            </div>

            {/* Live Transcript Textarea (Editable fallback) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Live Spoken Transcript Preview
                </label>
                {!transcript && !isRecording && (
                  <button
                    type="button"
                    onClick={handleQuickDemo}
                    className="text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Use Sample Standup</span>
                  </button>
                )}
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your spoken words will appear here in real-time... (You can also type or paste directly here)"
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Say: "Today I completed..., Blocked by..., Tomorrow I will..."</span>
                <span>{transcript.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setErrorMsg(null);
                }}
                disabled={!transcript || isRecording || isParsing}
                className="btn-secondary text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Clear
              </button>

              <button
                type="button"
                onClick={handleProcessTranscript}
                disabled={!transcript.trim() || isParsing}
                className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isParsing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Structuring Standup...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process &amp; AI Structure</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── BODY: STEP 2 (REVIEW & STRUCTURED RESULTS) ────────────── */}
        {step === 'review' && (
          <div className="p-6 space-y-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-xs text-yellow-800 dark:text-yellow-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span>
                  <strong>AI Breakdown Generated:</strong> Review the isolated categories and submit to update your task heatmap.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('record')}
                className="text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 font-semibold ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                Re-record
              </button>
            </div>

            {/* Task & Date Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Deliverable Task <span className="text-yellow-500">*</span>
                </label>
                {tasks.length === 0 ? (
                  <div className="text-xs text-slate-500 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    No active tasks found.
                  </div>
                ) : (
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-yellow-500"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} {t.project_title ? `(${t.project_title})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Log Date
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* 1. Completed Deliverables */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1. Completed Deliverables &amp; Achievements</span>
              </label>
              <textarea
                value={completedDeliverables}
                onChange={(e) => {
                  setCompletedDeliverables(e.target.value);
                  if (e.target.value.trim()) setHasWorked(true);
                }}
                rows={3}
                placeholder="Bullet points of milestones, code changes, or deliverables completed..."
                className="w-full bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>

            {/* 2. Next Planned Tasks */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Next Planned Tasks</span>
              </label>
              <textarea
                value={nextTasks}
                onChange={(e) => setNextTasks(e.target.value)}
                rows={2}
                placeholder="Next planned tasks or steps for tomorrow..."
                className="w-full bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none font-mono"
              />
            </div>

            {/* 3. Identified Impediments / Blockers */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>3. Identified Impediments / Blockers</span>
              </label>
              <textarea
                value={blockers}
                onChange={(e) => {
                  setBlockers(e.target.value);
                  if (e.target.value.trim() && !completedDeliverables.trim()) {
                    setHasWorked(false);
                  }
                }}
                rows={2}
                placeholder="Missing credentials, dependencies, or blockers (Leave empty if none)..."
                className="w-full bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-none font-mono"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  Status: <strong className={hasWorked ? 'text-emerald-600' : 'text-rose-600'}>
                    {hasWorked ? 'Productive Progress' : 'Blocker Flagged'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onApplyToForm && (
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="btn-secondary text-xs px-3.5 py-2 font-medium"
                  >
                    Populate Form
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleInstantSubmit}
                  disabled={isSubmitting}
                  className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-md"
                >
                  {isSubmitting ? (
                    <span>Submitting Log...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Daily Log</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
