import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ArrowLeft,
  Pencil,
  FileText,
  Download,
  Upload,
  Check,
  X,
  Plus,
  Loader2,
  User,
  Briefcase,
  Clock,
  Sparkles,
  ShieldCheck,
  Camera,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Trash2,
  MoreVertical
} from 'lucide-react';

function getInitials(name) {
  if (!name) return 'PM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getResumeFileMeta(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return {
      typeLabel: 'PDF Document',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconColor: 'text-rose-500'
    };
  }
  if (ext === 'docx' || ext === 'doc') {
    return {
      typeLabel: 'Word Document',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconColor: 'text-blue-500'
    };
  }
  return {
    typeLabel: 'Career Document',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-500'
  };
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function PersonalProfile({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isPM = user?.user_type === 'pm';

  // Profile data state
  const [profileData, setProfileData] = useState({
    name: user?.full_name || '',
    role: isPM ? '' : (user?.role_title || ''),
    experience: '',
    about: '',
    resumeName: null,
    resumeData: null,
    resumeType: null,
    resumeSize: null,
    skills: [],
    avatarUrl: user?.avatar_url || null
  });

  // Individual edit mode states for left section fields
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingExp, setIsEditingExp] = useState(false);

  // Individual edit mode states for right section fields
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);

  // Resume upload staging state
  const [stagedResumeFile, setStagedResumeFile] = useState(null);
  const [stagedResumeName, setStagedResumeName] = useState('');
  const [resumeUploadError, setResumeUploadError] = useState(null);
  const [isDraggingResume, setIsDraggingResume] = useState(false);

  // Resume kebab menu and action modal states
  const [showResumeMenu, setShowResumeMenu] = useState(false);
  const [noDocAlert, setNoDocAlert] = useState(false);
  const resumeMenuRef = useRef(null);
  const directResumeInputRef = useRef(null);

  // Input refs for automatic focus when edit pen is clicked
  const nameInputRef = useRef(null);
  const roleInputRef = useRef(null);
  const expInputRef = useRef(null);
  const aboutTextareaRef = useRef(null);
  const resumeFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);

  // Avatar change/remove modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Read more / Read less toggle
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Close resume kebab dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (resumeMenuRef.current && !resumeMenuRef.current.contains(e.target)) {
        setShowResumeMenu(false);
      }
    };
    if (showResumeMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showResumeMenu]);

  // 1. Fetch user profile from database on mount (isolated per authenticated user)
  useEffect(() => {
    let isMounted = true;
    async function loadUserProfile() {
      try {
        setLoading(true);
        const res = await api.profile.getMe();
        if (res?.profile && isMounted) {
          const p = res.profile;
          const isPmUser = (user?.user_type === 'pm');
          setProfileData({
            name: p.full_name || user?.full_name || '',
            role: isPmUser ? (p.role_title || '') : (p.role_title || user?.role_title || ''),
            experience: p.experience || '',
            about: p.about || '',
            resumeName: p.resume_data ? (p.resume_name || null) : null,
            resumeData: p.resume_data || null,
            resumeType: p.resume_type || null,
            resumeSize: p.resume_size || null,
            skills: Array.isArray(p.skills) ? p.skills : [],
            avatarUrl: p.avatar_url || user?.avatar_url || null
          });
        }
      } catch (err) {
        console.error('Failed to load profile from database:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserProfile();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Save changes to database helper
  const saveToDatabase = async (updatedFields) => {
    try {
      setSaving(true);
      const merged = { ...profileData, ...updatedFields };
      setProfileData(merged);

      const payload = {
        full_name: merged.name,
        role_title: merged.role,
        experience: merged.experience,
        about: merged.about,
        resume_name: merged.resumeName,
        resume_data: merged.resumeData,
        resume_type: merged.resumeType,
        resume_size: merged.resumeSize,
        skills: merged.skills,
        avatar_url: merged.avatarUrl
      };

      await api.profile.updateMe(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to persist profile updates to database:', err);
    } finally {
      setSaving(false);
    }
  };

  // Focus effect when any edit pen is clicked
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingRole && roleInputRef.current) {
      roleInputRef.current.focus();
      roleInputRef.current.select();
    }
  }, [isEditingRole]);

  useEffect(() => {
    if (isEditingExp && expInputRef.current) {
      expInputRef.current.focus();
      expInputRef.current.select();
    }
  }, [isEditingExp]);

  useEffect(() => {
    if (isEditingAbout && aboutTextareaRef.current) {
      aboutTextareaRef.current.focus();
    }
  }, [isEditingAbout]);

  // Handle resume file selection (.pdf, .docx, .doc)
  const handleResumeFileSelect = (file) => {
    if (!file) return;
    setResumeUploadError(null);

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setResumeUploadError('Please select a valid document in .pdf, .docx, or .doc format.');
      return;
    }

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setResumeUploadError('File size exceeds 15MB limit. Please upload a smaller file.');
      return;
    }

    setStagedResumeFile(file);
    setStagedResumeName(file.name);
  };

  // Upload staged resume file and save to database
  const handleUploadResume = async () => {
    if (!stagedResumeFile) {
      // If user only modified name without picking new file
      if (stagedResumeName && stagedResumeName !== profileData.resumeName) {
        await saveToDatabase({ resumeName: stagedResumeName });
      }
      setIsEditingResume(false);
      return;
    }

    try {
      setSaving(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const formattedSize = formatFileSize(stagedResumeFile.size);
        const fileExt = stagedResumeFile.name.split('.').pop().toLowerCase();
        const mimeType = stagedResumeFile.type || (
          fileExt === 'pdf' ? 'application/pdf' :
          fileExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
          'application/msword'
        );

        await saveToDatabase({
          resumeName: stagedResumeName || stagedResumeFile.name,
          resumeData: base64Data,
          resumeType: mimeType,
          resumeSize: formattedSize
        });

        setStagedResumeFile(null);
        setIsEditingResume(false);
        setResumeUploadError(null);
      };
      reader.readAsDataURL(stagedResumeFile);
    } catch (err) {
      console.error('Failed to read and upload resume:', err);
      setResumeUploadError('Failed to process file. Please try again.');
    }
  };

  // Download resume file
  const handleDownloadResume = async () => {
    try {
      if (profileData.resumeData) {
        const link = document.createElement('a');
        link.href = profileData.resumeData;
        link.download = profileData.resumeName || 'Resume.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fallback: Fetch directly from server endpoint
      const blob = await api.profile.downloadResume();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = profileData.resumeName || 'Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('No resume file has been uploaded yet. Click the edit/upload button to upload your resume.');
    }
  };

  // Skill management
  const handleAddSkill = async (e) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !profileData.skills.includes(trimmed)) {
      const updatedSkills = [...profileData.skills, trimmed];
      setNewSkillInput('');
      await saveToDatabase({ skills: updatedSkills });
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    const updatedSkills = profileData.skills.filter(s => s !== skillToRemove);
    await saveToDatabase({ skills: updatedSkills });
  };

  // Avatar upload and remove handlers
  const handleTriggerUploadImage = () => {
    setShowAvatarModal(false);
    setTimeout(() => {
      avatarFileInputRef.current?.click();
    }, 100);
  };

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (e.g. JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size exceeds 10MB limit. Please select a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        await saveToDatabase({ avatarUrl: base64Data });
        // Synchronize with cached user in localStorage so navigation bar updates instantly
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.avatar_url = base64Data;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        } catch {}
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarModal(false);
    await saveToDatabase({ avatarUrl: null });
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.avatar_url = null;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch {}
  };

  return (
    <div className="w-full font-sans antialiased animate-fade-up pb-16 space-y-6" style={{ color: 'var(--color-text-1)' }}>
      
      {/* ── TOP ACTION BAR ────────────────────────────────────────── */}
      <div 
        className="jira-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 rounded-xl shadow-md transition-colors"
        style={{ background: 'var(--color-surface-solid)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700/70 shadow-xs"
            title="Return to prior workspace"
          >
            <ArrowLeft size={14} />
            <span>Back to Workspace</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Personal Profile
            </span>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-slate-950 font-mono shadow-xs"
              style={{ background: 'var(--acube-gold)' }}
            >
              {profileData.role || 'Member'}
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--acube-gold)] font-medium animate-pulse">
              <Loader2 size={13} className="animate-spin" /> Saving to database...
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-up">
              <Check size={14} /> Saved
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-800">
            ID: {user?.id ? `USR-${String(user.id).padStart(4, '0')}` : 'AUTH'}
          </span>
        </div>
      </div>

      {/* ── MAIN PROFILE CONTENT GRID ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN: IDENTITY & CORE CREDENTIALS ─────────────── */}
        <div 
          className="lg:col-span-5 jira-card p-6 sm:p-8 rounded-xl shadow-lg border-l-4 space-y-7 transition-colors"
          style={{ 
            background: 'var(--color-surface-solid)', 
            border: '1px solid var(--color-border)', 
            borderLeftColor: 'var(--acube-gold)',
            borderLeftWidth: '4px'
          }}
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-200 dark:border-slate-800/80">
            <div className="relative group">
              {/* Avatar Click & Camera Button trigger modal */}
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center cursor-pointer border-2 border-slate-300 dark:border-slate-700/80 group-hover:border-[var(--acube-gold)] transition-all"
                onClick={() => setShowAvatarModal(true)}
                title="Click to update or remove profile photo"
              >
                {profileData.avatarUrl ? (
                  <img 
                    src={profileData.avatarUrl} 
                    alt={profileData.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  /* Sleek executive monogram avatar matching PulsePM */
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-100/80 via-slate-100 to-slate-200 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#334155]">
                    <span 
                      className="text-2xl sm:text-3xl font-black tracking-wider text-[var(--acube-gold)] select-none drop-shadow-xs"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {getInitials(profileData.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden file input for uploading new image */}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 p-2 rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title="Update or remove profile photo"
              >
                <Camera size={13} strokeWidth={2.5} />
              </button>
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {profileData.name || 'Member'}
              </h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Briefcase size={12} className="text-[var(--acube-gold)]" />
                <span className="truncate">{profileData.role || 'Contributor'}</span>
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                  {user?.employment_type || 'Full Time Contributor'}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Core Fields (Independent active inputs with individual edit pens) */}
          <div className="space-y-6">
            
            {/* 1. Name Field */}
            <div className="space-y-1.5 pb-5 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <User size={12} className="text-[var(--acube-gold)]" />
                  Full Name
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingName) {
                      saveToDatabase({ name: profileData.name });
                      setIsEditingName(false);
                    } else {
                      setIsEditingName(true);
                    }
                  }}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                  title={isEditingName ? "Save Name" : "Edit Name"}
                >
                  {isEditingName ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
                </button>
              </div>

              <input
                ref={nameInputRef}
                type="text"
                value={profileData.name}
                readOnly={!isEditingName}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveToDatabase({ name: profileData.name });
                    setIsEditingName(false);
                  }
                }}
                onBlur={() => {
                  if (isEditingName) {
                    saveToDatabase({ name: profileData.name });
                    setIsEditingName(false);
                  }
                }}
                className={`w-full text-base sm:text-lg font-semibold transition-all rounded px-2.5 py-1 ${
                  isEditingName
                    ? 'bg-white dark:bg-slate-900 border border-[var(--acube-gold)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--acube-gold)]/40 shadow-xs'
                    : 'bg-transparent text-slate-900 dark:text-slate-100 border-transparent outline-none cursor-default'
                }`}
                placeholder="Enter full name"
              />
            </div>

            {/* 2. Role Field */}
            <div className="space-y-1.5 pb-5 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Briefcase size={12} className="text-[var(--acube-gold)]" />
                  Role / Title
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingRole) {
                      saveToDatabase({ role: profileData.role });
                      setIsEditingRole(false);
                    } else {
                      setIsEditingRole(true);
                    }
                  }}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                  title={isEditingRole ? "Save Role" : "Edit Role"}
                >
                  {isEditingRole ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
                </button>
              </div>

              <input
                ref={roleInputRef}
                type="text"
                value={profileData.role}
                readOnly={!isEditingRole}
                onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveToDatabase({ role: profileData.role });
                    setIsEditingRole(false);
                  }
                }}
                onBlur={() => {
                  if (isEditingRole) {
                    saveToDatabase({ role: profileData.role });
                    setIsEditingRole(false);
                  }
                }}
                className={`w-full text-base sm:text-lg font-semibold transition-all rounded px-2.5 py-1 ${
                  isEditingRole
                    ? 'bg-white dark:bg-slate-900 border border-[var(--acube-gold)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--acube-gold)]/40 shadow-xs'
                    : 'bg-transparent text-slate-900 dark:text-slate-100 border-transparent outline-none cursor-default'
                }`}
                placeholder="Enter role title"
              />
            </div>

            {/* 3. Years of Experience Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} className="text-[var(--acube-gold)]" />
                  Years of Experience
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingExp) {
                      saveToDatabase({ experience: profileData.experience });
                      setIsEditingExp(false);
                    } else {
                      setIsEditingExp(true);
                    }
                  }}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                  title={isEditingExp ? "Save Experience" : "Edit Experience"}
                >
                  {isEditingExp ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
                </button>
              </div>

              <input
                ref={expInputRef}
                type="text"
                value={profileData.experience}
                readOnly={!isEditingExp}
                onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveToDatabase({ experience: profileData.experience });
                    setIsEditingExp(false);
                  }
                }}
                onBlur={() => {
                  if (isEditingExp) {
                    saveToDatabase({ experience: profileData.experience });
                    setIsEditingExp(false);
                  }
                }}
                className={`w-full text-base sm:text-lg font-semibold transition-all rounded px-2.5 py-1 ${
                  isEditingExp
                    ? 'bg-white dark:bg-slate-900 border border-[var(--acube-gold)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--acube-gold)]/40 shadow-xs'
                    : 'bg-transparent text-slate-900 dark:text-slate-100 border-transparent outline-none cursor-default'
                }`}
                placeholder="e.g. 10+ years"
              />
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN: ABOUT, RESUME, SKILLS (PULSEPM THEME) ─── */}
        <div 
          className="lg:col-span-7 jira-card p-6 sm:p-8 rounded-xl shadow-lg space-y-7 transition-colors"
          style={{ background: 'var(--color-surface-solid)', border: '1px solid var(--color-border)' }}
        >
          
          {/* 1. About Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FileText size={14} className="text-[var(--acube-gold)]" />
                Professional Summary & Bio
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isEditingAbout) {
                    saveToDatabase({ about: profileData.about });
                    setIsEditingAbout(false);
                  } else {
                    setIsEditingAbout(true);
                  }
                }}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                title={isEditingAbout ? "Save Biography" : "Edit Biography"}
              >
                {isEditingAbout ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
              </button>
            </div>

            {isEditingAbout ? (
              <div className="space-y-2.5">
                <textarea
                  ref={aboutTextareaRef}
                  rows={5}
                  value={profileData.about}
                  onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                  className="w-full text-sm text-slate-900 dark:text-slate-100 p-3 bg-white dark:bg-slate-900 border border-[var(--acube-gold)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--acube-gold)]/40 leading-relaxed font-sans shadow-inner"
                  placeholder="Enter executive biography..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAbout(false)}
                    className="text-xs px-3 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveToDatabase({ about: profileData.about });
                      setIsEditingAbout(false);
                    }}
                    className="text-xs px-3.5 py-1 bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 font-bold rounded shadow-xs"
                  >
                    Save Summary
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {profileData.about ? (
                    isAboutExpanded ? (
                      profileData.about
                    ) : (
                      profileData.about.length > 210 ? (
                        `${profileData.about.slice(0, 210)}...`
                      ) : (
                        profileData.about
                      )
                    )
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                      No summary provided yet. Click the pencil icon to add a bio.
                    </span>
                  )}
                </p>

                {profileData.about.length > 210 && (
                  <button
                    type="button"
                    onClick={() => setIsAboutExpanded(prev => !prev)}
                    className="text-xs text-[var(--acube-gold)] font-semibold hover:underline block pt-0.5"
                  >
                    {isAboutExpanded ? 'Show less' : 'Read full summary'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Resume & Career Documentation Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck size={14} className="text-[var(--acube-gold)]" />
                Resume & Career Documentation
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isEditingResume) {
                    handleUploadResume();
                  } else {
                    setIsEditingResume(true);
                    setStagedResumeFile(null);
                    setStagedResumeName(profileData.resumeName);
                    setResumeUploadError(null);
                  }
                }}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                title={isEditingResume ? "Done Editing Resume" : "Upload / Edit Resume"}
              >
                {isEditingResume ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
              </button>
            </div>

            {/* EDIT MODE: Upload/Import mechanism supporting .pdf, .docx, .doc */}
            {isEditingResume ? (
              <div className="space-y-3 animate-fade-up">
                <input
                  ref={resumeFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleResumeFileSelect(file);
                  }}
                />

                {!stagedResumeFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingResume(true);
                    }}
                    onDragLeave={() => setIsDraggingResume(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingResume(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleResumeFileSelect(file);
                    }}
                    onClick={() => resumeFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDraggingResume
                        ? 'border-[var(--acube-gold)] bg-amber-500/10 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-[var(--acube-gold)] dark:hover:border-[var(--acube-gold)] bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-[var(--acube-gold)] flex items-center justify-center shadow-xs">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          Click to browse or drag & drop resume file
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Supported formats: <span className="font-semibold text-[var(--acube-gold)]">.pdf, .docx, .doc</span> (up to 15MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/90 border-2 border-[var(--acube-gold)] rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${getResumeFileMeta(stagedResumeFile.name).badgeClass}`}>
                        <FileCheck size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {stagedResumeFile.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatFileSize(stagedResumeFile.size)} • {getResumeFileMeta(stagedResumeFile.name).typeLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStagedResumeFile(null);
                          setStagedResumeName(profileData.resumeName);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Remove selected file"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Custom document display name */}
                    <div className="pt-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                        Document Display Label:
                      </label>
                      <input
                        type="text"
                        value={stagedResumeName}
                        onChange={(e) => setStagedResumeName(e.target.value)}
                        className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[var(--acube-gold)]"
                        placeholder="Document name"
                      />
                    </div>
                  </div>
                )}

                {resumeUploadError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{resumeUploadError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {!stagedResumeFile ? (
                    <button
                      type="button"
                      onClick={() => resumeFileInputRef.current?.click()}
                      className="text-xs text-[var(--acube-gold)] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Upload size={12} /> Choose from device
                    </button>
                  ) : <div />}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingResume(false);
                        setStagedResumeFile(null);
                        setResumeUploadError(null);
                      }}
                      className="text-xs px-3.5 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadResume}
                      disabled={saving}
                      className="text-xs px-4 py-1.5 bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      <span>{stagedResumeFile ? 'Upload & Save to Profile' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : profileData.resumeData ? (
              /* VIEW MODE: Actual Uploaded Document Display Card */
              <div className="bg-slate-50 hover:bg-slate-100/90 dark:bg-slate-900/70 dark:hover:bg-slate-900 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700/80 rounded-xl p-3.5 flex items-center gap-3.5 transition-all shadow-xs">
                {/* Format-specific badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${getResumeFileMeta(profileData.resumeName).badgeClass}`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">
                    {profileData.resumeName || 'Resume.pdf'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {profileData.resumeSize ? `${profileData.resumeSize} • ` : ''}
                    {getResumeFileMeta(profileData.resumeName).typeLabel} • Ready for Review
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingResume(true);
                      setStagedResumeFile(null);
                      setStagedResumeName(profileData.resumeName || '');
                      setResumeUploadError(null);
                      setTimeout(() => resumeFileInputRef.current?.click(), 100);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Import / Upload new resume (.pdf, .docx, .doc)"
                  >
                    <Upload size={13} className="text-[var(--acube-gold)]" />
                    <span>Import</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Download Resume"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW MODE: When no document is uploaded */
              <div className="py-2.5 px-0.5">
                <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                  no document uploaded yet.
                </p>
              </div>
            )}
          </div>

          {/* 3. Skills Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--acube-gold)]" />
                Technical Competencies & Skills
              </span>
              <button
                type="button"
                onClick={() => setIsEditingSkills(prev => !prev)}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-[var(--acube-gold)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                title={isEditingSkills ? "Done Editing Skills" : "Edit Skills"}
              >
                {isEditingSkills ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Pencil size={13} />}
              </button>
            </div>

            {isEditingSkills && (
              <form onSubmit={handleAddSkill} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add skill (e.g. Next.js, Kubernetes, Docker)..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[var(--acube-gold)] text-slate-900 dark:text-slate-100 font-sans"
                />
                <button
                  type="submit"
                  className="bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus size={13} /> Add
                </button>
              </form>
            )}

            {/* Pill Badges matching PulsePM Design Language in both Light & Dark modes */}
            <div className="flex flex-wrap gap-2 pt-1">
              {profileData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/80 hover:border-[var(--acube-gold)]/60 dark:hover:border-[var(--acube-gold)]/60 transition-all shadow-2xs"
                >
                  <span>{skill}</span>
                  {isEditingSkills && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 ml-0.5"
                      title="Remove skill"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {profileData.skills.length === 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">No skills listed yet. Click pencil icon to add skills.</span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── PROFILE PHOTO MODAL (Remove Existing Image / Upload New Image) ── */}
      {showAvatarModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowAvatarModal(false)}
        >
          <div 
            className="jira-card w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-5 border border-slate-200 dark:border-slate-800 transition-all transform scale-100"
            style={{ background: 'var(--color-surface-solid)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-[var(--acube-gold)] flex items-center justify-center">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose an option for your avatar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Photo Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--acube-gold)] shadow-md flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                {profileData.avatarUrl ? (
                  <img 
                    src={profileData.avatarUrl} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span 
                    className="text-2xl font-black text-[var(--acube-gold)]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {getInitials(profileData.name)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {profileData.avatarUrl ? 'Current Profile Image' : 'Default Monogram Avatar'}
              </p>
            </div>

            {/* Actions: Upload a new image & Remove the existing image */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleTriggerUploadImage}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--acube-gold)] hover:bg-yellow-400 text-slate-950 flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Upload size={14} />
                <span>Upload a new image</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={!profileData.avatarUrl}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  profileData.avatarUrl
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:scale-[1.01] cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 size={14} />
                <span>{profileData.avatarUrl ? 'Remove the existing image' : 'No existing image to remove'}</span>
              </button>
            </div>

            {/* Cancel button */}
            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
