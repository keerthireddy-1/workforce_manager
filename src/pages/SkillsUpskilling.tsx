import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { EmployeeSkill, SkillProficiency } from '../types';
import { 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Cpu, 
  Layers, 
  UserCheck, 
  Briefcase, 
  Building2, 
  Save, 
  Loader2, 
  Check, 
  ChevronDown, 
  Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SelectedSkillState {
  skillName: string;
  proficiency: SkillProficiency;
  yearsOfExperience: number | '';
  domain?: string;
  isCustom?: boolean;
}

export function SkillsUpskilling() {
  const { user } = useAuth();

  // Domains & Catalog State
  const [domains, setDomains] = useState<string[]>([]);
  const [domainCatalog, setDomainCatalog] = useState<Record<string, string[]>>({});

  // Form State
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [isBeginner, setIsBeginner] = useState<boolean>(false);
  const [skillsMap, setSkillsMap] = useState<Record<string, SelectedSkillState>>({});
  const [customSkillInput, setCustomSkillInput] = useState<string>('');
  const [customSkillProficiency, setCustomSkillProficiency] = useState<SkillProficiency>('Intermediate');
  const [customSkillExperience, setCustomSkillExperience] = useState<number | ''>('');

  // Page Status
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Initial Data & Previously Saved Skills
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('sm_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user?.id) headers['x-user-id'] = user.id;

        const [domainsRes, userSkillsRes] = await Promise.all([
          fetch('/api/skills/domains').then(r => r.json()),
          fetch(`/api/skills/my-skills?userId=${user?.id || ''}`, { headers }).then(r => r.json())
        ]);

        if (!isMounted) return;

        if (domainsRes?.domains) {
          setDomains(domainsRes.domains);
          setDomainCatalog(domainsRes.catalog || {});
        }

        // Hydrate previously saved profile if available
        if (userSkillsRes?.profile) {
          const profile = userSkillsRes.profile;
          setSelectedDomain(profile.domain || '');
          setCustomDomain(profile.customDomain || '');
          setIsBeginner(!!profile.isBeginner);
          if (profile.updatedAt) {
            setLastSavedTime(new Date(profile.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }));
          }
        }

        if (Array.isArray(userSkillsRes?.skills)) {
          const loadedMap: Record<string, SelectedSkillState> = {};
          userSkillsRes.skills.forEach((s: EmployeeSkill) => {
            loadedMap[s.skillName] = {
              skillName: s.skillName,
              proficiency: s.proficiency || 'Intermediate',
              yearsOfExperience: s.yearsOfExperience !== undefined ? s.yearsOfExperience : '',
              domain: s.domain,
              isCustom: !!s.isCustom
            };
          });
          setSkillsMap(loadedMap);
        }
      } catch (err) {
        console.error('Failed to load skills profile:', err);
        setFeedback({
          type: 'error',
          message: 'Unable to synchronize skills profile with the server. Please refresh or retry.'
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (user) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Skill Selection Toggles
  const toggleSkill = (skillName: string) => {
    if (isBeginner) return;

    setSkillsMap(prev => {
      const copy = { ...prev };
      if (copy[skillName]) {
        delete copy[skillName];
      } else {
        copy[skillName] = {
          skillName,
          proficiency: 'Intermediate',
          yearsOfExperience: '',
          domain: selectedDomain === 'Other' ? customDomain : selectedDomain,
          isCustom: false
        };
      }
      return copy;
    });
  };

  const updateSkillProficiency = (skillName: string, proficiency: SkillProficiency) => {
    setSkillsMap(prev => {
      if (!prev[skillName]) return prev;
      return {
        ...prev,
        [skillName]: {
          ...prev[skillName],
          proficiency
        }
      };
    });
  };

  const updateSkillExperience = (skillName: string, years: number | '') => {
    setSkillsMap(prev => {
      if (!prev[skillName]) return prev;
      return {
        ...prev,
        [skillName]: {
          ...prev[skillName],
          yearsOfExperience: years
        }
      };
    });
  };

  const removeSkill = (skillName: string) => {
    setSkillsMap(prev => {
      const copy = { ...prev };
      delete copy[skillName];
      return copy;
    });
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;

    if (skillsMap[trimmed]) {
      setFeedback({
        type: 'error',
        message: `The skill "${trimmed}" is already in your selected list.`
      });
      return;
    }

    setSkillsMap(prev => ({
      ...prev,
      [trimmed]: {
        skillName: trimmed,
        proficiency: customSkillProficiency,
        yearsOfExperience: customSkillExperience,
        domain: selectedDomain === 'Other' ? customDomain : selectedDomain,
        isCustom: true
      }
    }));

    setCustomSkillInput('');
    setCustomSkillExperience('');
    setFeedback(null);
  };

  // Save Skills to Database
  const handleSaveSkills = async () => {
    setFeedback(null);

    // Validation
    if (!isBeginner) {
      if (!selectedDomain || !selectedDomain.trim()) {
        setFeedback({
          type: 'error',
          message: 'Please select your professional domain before saving.'
        });
        return;
      }

      if (selectedDomain === 'Other' && (!customDomain || !customDomain.trim())) {
        setFeedback({
          type: 'error',
          message: 'Please specify your custom professional domain name.'
        });
        return;
      }
    }

    const skillsArray: SelectedSkillState[] = isBeginner ? [] : (Object.values(skillsMap) as SelectedSkillState[]);

    setSaving(true);
    try {
      const token = localStorage.getItem('sm_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (user?.id) headers['x-user-id'] = user.id;

      const payload = {
        userId: user?.id,
        targetUserId: user?.id,
        domain: isBeginner ? (selectedDomain || 'Starting from Scratch') : selectedDomain,
        customDomain: selectedDomain === 'Other' ? customDomain.trim() : '',
        isBeginner,
        skills: skillsArray
      };

      const res = await fetch('/api/skills/my-skills', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save professional skills.');
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      setLastSavedTime(timestamp);
      setFeedback({
        type: 'success',
        message: 'Your professional domain, skills, and proficiency records have been securely saved to the database.'
      });
    } catch (err: any) {
      console.error('Error saving skills:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'An error occurred while saving your skills. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Available skills list for currently selected domain
  const availableDefaultSkills = selectedDomain && selectedDomain !== 'Other' 
    ? (domainCatalog[selectedDomain] || []) 
    : [];

  const selectedSkillsCount = Object.keys(skillsMap).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500">
          Synchronizing Professional Skill Matrix...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
              <GraduationCap className="w-6 h-6" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-indigo-400 font-bold">
              Talent Protocol // Skill Registry
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            Skills & <span className="text-indigo-400">Upskilling</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Record and maintain your verified professional domain, technical proficiencies, and experience duration under your ShiftMaster employee profile.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {lastSavedTime && (
            <div className="px-4 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-[9px] font-mono text-slate-400">
              <span className="text-emerald-400 font-bold uppercase tracking-wider mr-1.5">● PERSISTED</span>
              {lastSavedTime}
            </div>
          )}
          <button
            onClick={handleSaveSkills}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Protocol...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save My Skills</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Feedback Banners */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium",
              feedback.type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            )}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div className="flex-1">{feedback.message}</div>
            <button 
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION A: Employee Information */}
      <section className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 relative overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Section A // Employee Authentication & Identity
              </h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Authenticated Identity Node
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
            ACTIVE SESSION
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employee Name */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Employee Name
            </div>
            <p className="text-base font-black text-white tracking-tight truncate">
              {user?.name || 'Unauthenticated'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
          </div>

          {/* Current Job Role */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              Current Designation / Role
            </div>
            <p className="text-base font-black text-white capitalize tracking-tight">
              {user?.role === 'admin' ? 'Operations Administrator' : 'Shift Specialist'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono uppercase">System Level: {user?.role}</p>
          </div>

          {/* Department */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Assigned Department
            </div>
            <p className="text-base font-black text-white tracking-tight">
              {user?.department || 'Operations'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">Max Capacity: {user?.maxWeeklyHours || 40} hrs/wk</p>
          </div>
        </div>
      </section>

      {/* SECTION B: Select Professional Domain */}
      <section className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 relative overflow-hidden backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Section B // Select Your Professional Domain
            </h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Core Discipline & Specialization Alignment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 block font-bold">
              Select Your Professional Domain
            </label>
            <div className="relative">
              <select
                value={selectedDomain}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDomain(val);
                  setFeedback(null);
                }}
                disabled={isBeginner}
                className={cn(
                  "w-full px-5 py-4 bg-slate-950/80 border border-white/10 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer",
                  isBeginner && "opacity-50 cursor-not-allowed bg-slate-950/40"
                )}
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  -- Choose Your Domain --
                </option>
                {domains.map((dom) => (
                  <option key={dom} value={dom} className="bg-slate-900 text-white">
                    {dom}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Choose the primary technical or operational discipline relevant to your current scope.
            </p>
          </div>

          {/* If Domain is "Other", show custom domain text input */}
          {selectedDomain === 'Other' && !isBeginner && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 block font-bold">
                Specify Custom Professional Domain
              </label>
              <input
                type="text"
                placeholder="e.g., Quantum Computing, Bioinformatics, Robotics"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/80 border border-indigo-500/30 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-400 transition-all font-medium"
              />
              <p className="text-[10px] text-slate-500 font-mono">
                Your custom domain will be indexed in your normalized skills profile.
              </p>
            </motion.div>
          )}

          {/* Beginner / Starting from scratch toggle */}
          <div className="md:col-span-2 pt-2 border-t border-white/5">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={isBeginner}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsBeginner(checked);
                  if (checked) {
                    setFeedback(null);
                  }
                }}
                className="mt-1 w-4 h-4 rounded text-indigo-500 bg-slate-900 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-500"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-indigo-300 transition-colors">
                  I am starting from scratch and currently have no professional skills
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Check this if you are a career starter or transitioning fields without prior competencies.
                </p>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* SECTION C: Add Current Skills */}
      {!isBeginner && (
        <section className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 relative overflow-hidden backdrop-blur-xl shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Section C // Add Current Skills & Proficiencies
                </h2>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Proficiency Grading & Experience Duration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                {selectedSkillsCount} SKILLS SELECTED
              </span>
            </div>
          </div>

          {/* Dynamic Domain Skills Catalog */}
          {selectedDomain && selectedDomain !== 'Other' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
                  Recommended Skills for {selectedDomain}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  Click to select or deselect skills
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availableDefaultSkills.map((skillName) => {
                  const isSelected = !!skillsMap[skillName];
                  return (
                    <button
                      key={skillName}
                      type="button"
                      onClick={() => toggleSkill(skillName)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left transition-all duration-200 relative group flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:text-white hover:border-white/20"
                      )}
                    >
                      <span className="text-xs font-semibold tracking-tight truncate pr-2">
                        {skillName}
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-indigo-500 text-white" : "border border-white/10 group-hover:border-white/30"
                      )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Skill Input Field */}
          <div className="bg-slate-950/70 p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Custom Skill (Not Listed Above)
            </div>

            <form onSubmit={handleAddCustomSkill} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Custom Skill Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., GraphQL, Rust, Kafka, Solidity"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Initial Proficiency
                </label>
                <select
                  value={customSkillProficiency}
                  onChange={(e) => setCustomSkillProficiency(e.target.value as SkillProficiency)}
                  className="w-full px-3 py-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Years Exp. (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  placeholder="e.g., 2"
                  value={customSkillExperience}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomSkillExperience(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className="w-full px-3 py-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!customSkillInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Skill
                </button>
              </div>
            </form>
          </div>

          {/* Active Skills Table & Proficiency Configurator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
                Configure Proficiency & Experience Details
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                Specify Beginner, Intermediate, or Advanced for each skill
              </span>
            </div>

            {selectedSkillsCount === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-white/10 text-center space-y-2">
                <Info className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No skills selected yet.</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Pick skills from the suggested domain cards above or use the custom input form.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.values(skillsMap) as SelectedSkillState[]).map((skill) => (
                  <div
                    key={skill.skillName}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-4 relative group hover:border-white/15 transition-all shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-tight">
                            {skill.skillName}
                          </span>
                          {skill.isCustom && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[8px] font-mono uppercase font-bold">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                          Domain: {skill.domain || selectedDomain || 'General'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSkill(skill.skillName)}
                        title="Remove skill"
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      {/* Proficiency Segmented Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-mono uppercase tracking-[0.2em] text-slate-400 block font-bold">
                          Proficiency Level
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                          {(['Beginner', 'Intermediate', 'Advanced'] as SkillProficiency[]).map((level) => {
                            const isCurrent = skill.proficiency === level;
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => updateSkillProficiency(skill.skillName, level)}
                                className={cn(
                                  "py-1.5 text-[8px] font-mono font-bold uppercase rounded-lg transition-all",
                                  isCurrent
                                    ? level === 'Advanced' 
                                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                                      : level === 'Intermediate'
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                      : "bg-slate-700 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                                )}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Years of Experience Input */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-mono uppercase tracking-[0.2em] text-slate-400 block font-bold">
                          Years of Experience
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            step="0.5"
                            placeholder="Years (optional)"
                            value={skill.yearsOfExperience}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateSkillExperience(skill.skillName, val === '' ? '' : Math.max(0, Number(val)));
                            }}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 pointer-events-none">
                            YRS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION D: Save Skills Action Bar */}
      <section className="bg-gradient-to-r from-slate-900/80 via-indigo-950/20 to-slate-900/80 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Save className="w-5 h-5 text-indigo-400" />
            Persist Skills to ShiftMaster Central Database
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Saves your professional domain, selected competencies, proficiency tiers, and experience data under your authenticated employee profile (ID: {user?.id}).
          </p>
        </div>

        <button
          onClick={handleSaveSkills}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3 shrink-0"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save My Skills</span>
            </>
          )}
        </button>
      </section>
    </div>
  );
}

export default SkillsUpskilling;

