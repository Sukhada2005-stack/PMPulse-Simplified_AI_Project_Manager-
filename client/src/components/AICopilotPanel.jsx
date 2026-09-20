import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  Trash2,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  ShieldCheck,
  CornerDownLeft
} from 'lucide-react';

/**
 * Lightweight helper to format basic Markdown in Copilot responses:
 * Handles **bold**, `code`, bullet points, and paragraphs cleanly.
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-500 font-bold mt-1 text-xs">•</span>
              <span className="flex-1">{renderFormattedInline(content)}</span>
            </div>
          );
        }

        // Numbered list (e.g. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-500 font-semibold text-xs mt-0.5 min-w-[16px]">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderFormattedInline(numMatch[2])}</span>
            </div>
          );
        }

        // Header (### or ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-sm text-slate-900 dark:text-amber-400 mt-2">
              {renderFormattedInline(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-base text-slate-900 dark:text-amber-300 mt-3 border-b border-slate-200 dark:border-slate-800 pb-1">
              {renderFormattedInline(trimmed.substring(3))}
            </h3>
          );
        }

        // Standard paragraph
        return <p key={idx}>{renderFormattedInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(str) {
  // Simple regex parser for **bold** and `code`
  const parts = [];
  let remaining = str;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // Code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);

    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : -1;

    let firstMatch = null;
    let type = null;

    if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
      firstMatch = boldMatch;
      type = 'bold';
    } else if (codeIdx !== -1) {
      firstMatch = codeMatch;
      type = 'code';
    }

    if (!firstMatch) {
      parts.push(<React.Fragment key={key++}>{remaining}</React.Fragment>);
      break;
    }

    const startIdx = remaining.indexOf(firstMatch[0]);
    if (startIdx > 0) {
      parts.push(<React.Fragment key={key++}>{remaining.slice(0, startIdx)}</React.Fragment>);
    }

    if (type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900 dark:text-white">
          {firstMatch[1]}
        </strong>
      );
    } else if (type === 'code') {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-mono text-xs"
        >
          {firstMatch[1]}
        </code>
      );
    }

    remaining = remaining.slice(startIdx + firstMatch[0].length);
  }

  return parts;
}

export default function AICopilotPanel({
  role = 'employee',
  title = 'AI Copilot',
  subtitle = 'Verified Telemetry Assistant',
  endpoint = '/copilot/employee',
  suggestedInquiries = [],
  userName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Send message to role-scoped endpoint
  const handleSendMessage = async (textToSend) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    // Create user message
    const userMsg = {
      role: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Build sanitized history (last 6 turns)
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await api.copilot.ask(endpoint, messageText, historyPayload);

      const aiMsg = {
        role: 'model',
        text: res.reply || 'No response produced.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([...newHistory, aiMsg]);
    } catch (err) {
      console.error('[AICopilotPanel] Error:', err);
      const errorMsg = {
        role: 'model',
        text: '⚠️ Failed to contact AI Copilot. Please check your network connection or try again shortly.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...newHistory, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear conversation history for this session?')) {
      setMessages([]);
    }
  };

  const panelMarkup = (
    <>
      {/* ── FLOATING TRIGGER BUTTON (Bottom-Right) ───────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9990 }}
        className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold text-sm select-none cursor-pointer group bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-300/40 hover:scale-105 active:scale-95 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        title="Open PulsePM AI Copilot"
      >
        <div className="p-1 rounded-full bg-slate-950/15 group-hover:rotate-12 transition-transform duration-300">
          <Sparkles className="w-4 h-4 text-slate-950" />
        </div>
        <span className="tracking-tight font-bold">Ask AI Copilot</span>
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-slate-950 text-amber-400 tracking-wider">
          {role}
        </span>
      </button>

      {/* ── BACKDROP OVERLAY ───────────────────────────────────────── */}
      {isOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* ── SLIDE-OUT PANEL DRAWER ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          zIndex: 99999
        }}
        className={`fixed top-0 right-0 h-screen w-full sm:w-[450px] md:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between gap-3 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  {title}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {role} Scope
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Clear Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close panel (Esc)"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BODY (Scrollable Messages Stream) ────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800 dark:text-slate-200">
          {/* Welcome / Identity Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-slate-700 dark:text-slate-300 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict Role-Scoped Data Isolation</span>
            </div>
            <p className="leading-relaxed">
              {role === 'employee' && (
                <>
                  Hello <strong>{userName || 'Contributor'}</strong>! I can answer questions regarding your assigned deliverables, sprint due dates, logged blockers, and submitted daily logs. I cannot access other contributors' private metrics.
                </>
              )}
              {role === 'pm' && (
                <>
                  Welcome <strong>{userName || 'Project Manager'}</strong>! I have visibility into all projects, sprint tasks, team workloads, blockers, and daily logs under your management. Other PMs' data is strictly out of scope.
                </>
              )}
              {role === 'superuser' && (
                <>
                  Welcome Administrator! I provide executive fleet-level oversight across all Project Managers, active project allocations, and organization-wide health metrics.
                </>
              )}
            </p>
          </div>

          {/* Suggested Inquiries (Show when no messages yet or always on top as quick pills) */}
          {messages.length === 0 && suggestedInquiries.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">
                Suggested Inquiries
              </p>
              <div className="space-y-2">
                {suggestedInquiries.map((inquiry, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(inquiry)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700/60 hover:border-amber-500/40 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                  >
                    <span className="pr-2">{inquiry}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm relative group ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-bl-none'
                    : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-slate-900 dark:text-slate-100 rounded-bl-none'
                }`}
              >
                {msg.role === 'model' ? (
                  <FormattedMessage text={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}

                <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'model' && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-3 animate-fade-in pl-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl rounded-bl-none p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Analyzing role telemetry & generating response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── FOOTER INPUT ─────────────────────────────────────────── */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                role === 'employee'
                  ? 'Ask about your tasks, deadlines, or logs...'
                  : role === 'pm'
                  ? 'Ask about projects, blockers, or team workload...'
                  : 'Ask about fleet health, PMs, or workspaces...'
              }
              disabled={loading}
              className="flex-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer"
              title="Send message"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1 select-none">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Server-side isolated telemetry
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(panelMarkup, document.body);
  }

  return panelMarkup;
}
