import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Draggable from 'react-draggable';
import {
  MessageSquare,
  Calendar,
  Clock,
  Video,
  MapPin,
  Send,
  Plus,
  Users,
  X,
  Sparkles,
  ChevronDown,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  CalendarPlus
} from 'lucide-react';

export default function ProjectChatModal({ projectId, projects = [], onClose }) {
  const { user } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState(projectId || (projects[0]?.id ?? null));
  const [projectList, setProjectList] = useState(projects);
  const [projectData, setProjectData] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  // Meeting scheduler sub-panel
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTopic, setMeetingTopic] = useState('');
  const [meetingDate, setMeetingDate] = useState('2026-09-03');
  const [meetingTime, setMeetingTime] = useState('10:00 AM IST');
  const [meetingDuration, setMeetingDuration] = useState('30 mins');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/pulse-sync');
  const [meetingLocation, setMeetingLocation] = useState('Virtual / Engineering Room 1');

  const chatScrollRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch project list if not passed
  useEffect(() => {
    async function loadProjects() {
      if (projectList.length === 0) {
        try {
          const res = await api.projects.getAll();
          const pjs = res.projects || [];
          setProjectList(pjs);
          if (!activeProjectId && pjs.length > 0) {
            setActiveProjectId(pjs[0].id);
          }
        } catch (err) {
          console.error('Failed to load projects in chat:', err);
        }
      }
    }
    loadProjects();
  }, [projectList, activeProjectId]);

  // Reset scroll state when active project changes
  useEffect(() => {
    initialLoadDoneRef.current = false;
    isAtBottomRef.current = true;
    setIsUserScrolledUp(false);
  }, [activeProjectId]);

  // Load chat messages and poll
  const loadMessages = async (showSpinner = false) => {
    if (!activeProjectId) return;
    if (showSpinner) setLoading(true);
    try {
      const res = await api.projects.getMessages(activeProjectId);
      setProjectData(res.project);
      setMembers(res.members || []);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load project messages:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(true);
    // Real-time polling every 3.5 seconds
    const interval = setInterval(() => {
      loadMessages(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeProjectId]);

  // Track scroll position: pause auto-scroll if user scrolled up >50px from bottom
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const scrolledUp = distanceFromBottom > 50;

    isAtBottomRef.current = !scrolledUp;
    setIsUserScrolledUp(scrolledUp);
  };

  // Helper to scroll strictly to the bottom
  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      isAtBottomRef.current = true;
      setIsUserScrolledUp(false);
    }
  };

  // Smart auto-scroll: ONLY trigger if user is at the very bottom or initial load
  useEffect(() => {
    if (!chatScrollRef.current) return;

    if (!initialLoadDoneRef.current || isAtBottomRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      if (messages.length > 0) {
        initialLoadDoneRef.current = true;
      }
    }
  }, [messages, showMeetingModal]);

  // Send regular text message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending || !activeProjectId) return;

    const messageContent = text.trim();
    setText('');
    setSending(true);

    try {
      const res = await api.projects.sendMessage(activeProjectId, {
        message: messageContent,
        message_type: 'text'
      });
      if (res?.message) {
        setMessages(prev => [...prev, res.message]);
      } else {
        await loadMessages(false);
      }
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Schedule meeting
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingTopic.trim() || sending || !activeProjectId) return;

    setSending(true);
    try {
      const metadata = {
        topic: meetingTopic.trim(),
        date: meetingDate,
        time: meetingTime,
        duration: meetingDuration,
        link: meetingLink.trim() || null,
        location: meetingLocation.trim() || null
      };

      const res = await api.projects.sendMessage(activeProjectId, {
        message: `Scheduled Meeting: ${meetingTopic.trim()}`,
        message_type: 'meeting',
        metadata
      });

      if (res?.message) {
        setMessages(prev => [...prev, res.message]);
      } else {
        await loadMessages(false);
      }

      setShowMeetingModal(false);
      setMeetingTopic('');
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
      alert(err.message || 'Failed to schedule meeting');
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  const formatDateLabel = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return ts;
    }
  };

  return (
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] pointer-events-none"
    >
      <Draggable handle=".chat-drag-handle">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-300 dark:border-slate-700 flex flex-col overflow-hidden relative pointer-events-auto w-[95vw] sm:w-[450px] md:w-[600px] text-gray-900 dark:text-slate-100"
          style={{ height: 'min(75vh, 600px)', minHeight: '400px' }}
        >
          {/* ── TOP HEADER (Always Sticky & High Visibility) ────────── */}
          <div className="chat-drag-handle cursor-move p-3.5 sm:p-4 border-b border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Project Discussions &amp; Sync
                  </span>
                  <span className="lozenge lozenge-success text-[10px]">Live Team Channel</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  {projectData?.title || 'Project Team Workspace'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Project Switcher */}
              {projectList.length > 0 && (
                <div className="relative">
                  <select
                    value={activeProjectId || ''}
                    onChange={(e) => setActiveProjectId(parseInt(e.target.value, 10))}
                    className="jira-select text-xs font-semibold py-1.5 pl-2.5 pr-7 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                    style={{ minWidth: '160px' }}
                  >
                    {projectList.map(p => (
                      <option key={p.id} value={p.id}>
                        📁 {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Schedule Meeting Shortcut */}
              <button
                onClick={() => setShowMeetingModal(true)}
                className="btn-secondary text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-1.5 px-2.5"
                title="Schedule a team sync or milestone meeting"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Schedule Meeting</span>
              </button>

              {/* Prominent Red/Gray Close Button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-400 text-gray-700 dark:text-slate-300 font-bold text-xs transition-colors border border-gray-200 dark:border-slate-700"
                title="Close Chat (Esc or click outside)"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* ── SUB-HEADER: Team Members Bar ──────────────────────── */}
          <div className="px-5 py-2.5 bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <span className="font-bold text-gray-700 dark:text-slate-200 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Team Members ({members.length}):
              </span>
              <div className="flex items-center -space-x-1.5 overflow-hidden">
                {members.map(m => (
                  <img
                    key={m.id}
                    src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.full_name}`}
                    alt={m.full_name}
                    title={`${m.full_name} (${m.role_title})`}
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap ml-1">
                {members.map(m => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                  >
                    {m.full_name}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
              Signed in as: <b className="text-gray-800 dark:text-slate-200">{user?.full_name}</b> ({user?.role_title})
            </div>
          </div>

          {/* ── MAIN CHAT STREAM ──────────────────────────────────── */}
          <div
            ref={chatScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/50 relative"
          >
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <Sparkles className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Loading project discussions &amp; meetings...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-slate-200">Start the Project Conversation</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                  Discuss task dependencies, triage blockers, or schedule sync meetings with your team members and Project Manager.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const isMe = msg.user_id === user?.id;
                  const isPM = msg.sender_type === 'pm';
                  const isMeeting = msg.message_type === 'meeting';
                  const meta = msg.metadata;

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex gap-3 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <img
                        src={msg.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_name}`}
                        alt={msg.sender_name}
                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 object-cover shadow-sm flex-shrink-0 mt-0.5"
                      />

                      {/* Content Box */}
                      <div className={`max-w-lg space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Name & Role Header */}
                        <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-bold text-gray-900 dark:text-slate-200">{msg.sender_name}</span>
                          {isPM ? (
                            <span className="lozenge lozenge-blue text-[9px] font-bold">PM</span>
                          ) : (
                            <span className="text-[10px] text-gray-500 dark:text-slate-400">({msg.sender_role})</span>
                          )}
                          <span className="text-[10px] text-gray-400 font-mono ml-1">{formatTime(msg.created_at)}</span>
                        </div>

                        {/* Message Bubble or Meeting Card */}
                        {isMeeting ? (
                          <div
                            className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm space-y-3 bg-[#F0F7FF] dark:bg-blue-950/30"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/50 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-600 dark:bg-blue-500 text-white">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                                    Scheduled Project Sync
                                  </span>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                    {meta?.topic || msg.message}
                                  </h4>
                                </div>
                              </div>
                              <span className="lozenge lozenge-blue font-bold text-[10px]">
                                {meta?.duration || '30 mins'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span><b>Date:</b> {meta?.date || 'Upcoming'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span><b>Time:</b> {meta?.time || '10:00 AM'}</span>
                              </div>
                              {meta?.location && (
                                <div className="flex items-center gap-1.5 sm:col-span-2">
                                  <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                  <span><b>Location:</b> {meta.location}</span>
                                </div>
                              )}
                            </div>

                            {meta?.link && (
                              <div className="pt-2 border-t border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                                <a
                                  href={meta.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors shadow-sm"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Join Virtual Meeting</span>
                                  <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 italic">Scheduled via PulsePM</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SCHEDULE MEETING MODAL DRAWER ─────────────────────── */}
          {showMeetingModal && (
            <div className="p-4 bg-blue-50 dark:bg-slate-800/90 border-t border-blue-200 dark:border-slate-700 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold text-blue-950 dark:text-blue-300 uppercase tracking-wide">
                    Schedule Team Meeting for {projectData?.title}
                  </h4>
                </div>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleScheduleMeeting} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Meeting Topic / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sprint Blocker Triage & Gateway Sandbox Sync"
                    value={meetingTopic}
                    onChange={e => setMeetingTopic(e.target.value)}
                    className="jira-input text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="jira-input text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM IST"
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="jira-input text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Duration</label>
                  <select
                    value={meetingDuration}
                    onChange={e => setMeetingDuration(e.target.value)}
                    className="jira-select text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  >
                    <option value="15 mins">15 mins (Quick Sync)</option>
                    <option value="30 mins">30 mins (Standard Sync)</option>
                    <option value="45 mins">45 mins (Technical Review)</option>
                    <option value="1 Hour">1 Hour (Sprint Planning)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Video Meeting Link (Google Meet / Zoom)</label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    className="jira-input text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Location / Room</label>
                  <input
                    type="text"
                    placeholder="Virtual / Conf Room B"
                    value={meetingLocation}
                    onChange={e => setMeetingLocation(e.target.value)}
                    className="jira-input text-xs w-full dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary text-xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>{sending ? 'Scheduling...' : 'Post Meeting to Project Chat'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Floating Scroll to Latest Button */}
          {isUserScrolledUp && (
            <div className="absolute bottom-20 right-6 z-20">
              <button
                onClick={() => scrollToBottom(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-bold shadow-lg transition-all transform hover:scale-105 border border-white/20"
                title="Jump to latest messages"
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>Scroll to latest</span>
              </button>
            </div>
          )}

          {/* ── MESSAGE COMPOSER / INPUT BAR ───────────────────────── */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => setShowMeetingModal(prev => !prev)}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
              title="Schedule Meeting"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Message #${projectData?.title || 'project'} (Press Enter to send)...`}
              className="jira-input text-xs flex-1 py-2.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              disabled={sending}
            />

            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-3 py-2.5 text-xs text-gray-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
              title="Close Chat (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Close</span>
            </button>
          </form>
        </div>
      </Draggable>
    </div>
  );
}
