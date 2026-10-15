import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Users, 
  KeyRound, 
  UserPlus, 
  Fingerprint, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Login: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'initial' | 'signin' | 'signup'>('initial');
  const [formData, setFormData] = useState({ 
    name: '', 
    employeeKey: '', 
    password: '', 
    role: 'employee', 
    department: 'Operations'
  });
  const [preferences, setPreferences] = useState(['Morning', 'Afternoon', 'Night']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePrefChange = (index: number, value: string) => {
    const newPrefs = [...preferences];
    const oldVal = newPrefs[index];
    const conflictIndex = newPrefs.indexOf(value);
    
    if (conflictIndex !== -1) {
      newPrefs[conflictIndex] = oldVal;
    }
    newPrefs[index] = value;
    setPreferences(newPrefs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const employeeKey = formData.employeeKey.trim();

      if (view === 'signup') {
        const success = await signUp({
          name: formData.name,
          employeeKey,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          preferences: formData.role === 'employee' ? preferences : undefined
        });
        if (success) {
          navigate('/');
        } else {
          setError('Registration failed. Please check your credentials.');
        }
      } else {
        const success = await signIn(employeeKey, formData.password);
        if (success) {
          navigate('/');
        } else {
          setError('Identity verification failed. Invalid credentials.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const OptionButton = ({ icon: Icon, title, desc, onClick, colorClass }: any) => (
    <motion.button
      whileHover={{ scale: 1.05, translateY: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex-1 p-8 rounded-[2.5rem] glass-morphism border-white/5 transition-all text-left relative overflow-hidden group mb-4 sm:mb-0",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 hover:before:opacity-10 transition-opacity",
        colorClass
      )}
    >
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10", colorClass)}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-xs text-slate-500 font-mono uppercase tracking-widest leading-relaxed">{desc}</p>
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
         <Sparkles className="w-4 h-4 text-white/20" />
      </div>
    </motion.button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep p-6 relative perspective-container">
      {/* Background Ornaments */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {view === 'initial' ? (
          <motion.div 
            key="initial"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="w-full max-w-4xl grid sm:grid-cols-2 gap-8"
          >
            <OptionButton 
              icon={Fingerprint}
              title="Identity Entry"
              desc="Existing personnel validation and command session resumption."
              onClick={() => setView('signin')}
              colorClass="from-indigo-500/20 to-indigo-500/5 text-indigo-400"
            />
            <OptionButton 
              icon={UserPlus}
              title="Terminal Enrollment"
              desc="Register new credentials into the workforce orchestration matrix."
              onClick={() => setView('signup')}
              colorClass="from-emerald-500/20 to-emerald-500/5 text-emerald-400"
            />
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, rotateX: 20, y: 40 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, rotateX: -20, y: -40 }}
            className="w-full max-w-md glass-morphism rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl border border-white/5"
          >
            {/* Animated Accent Line */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent transition-colors duration-1000",
              view === 'signup' ? "via-emerald-500" : "via-indigo-500"
            )} />

            <div className="text-center mb-8 relative">
              <button 
                type="button"
                onClick={() => {
                  setView('initial');
                  setError('');
                }}
                className="absolute top-0 left-0 p-2 text-slate-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                title="Return to selection"
              >
                <Users className="w-5 h-5" />
              </button>
              
              <motion.div 
                whileHover={{ scale: 1.1, rotateY: 180 }}
                className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/5 relative"
              >
                {view === 'signup' ? <UserPlus className="w-10 h-10 text-emerald-400" /> : <Fingerprint className="w-10 h-10 text-indigo-400" />}
                <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              <h2 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">
                {view === 'signup' ? 'Enroll' : 'Identify'} <span className={view === 'signup' ? 'text-emerald-400' : 'text-indigo-400'}>Unit</span>
              </h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                {view === 'signup' ? 'Personnel Enrollment' : 'Secure Credential Proxy'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <AnimatePresence mode="popLayout">
                {view === 'signup' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        placeholder="FULL NAME"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold uppercase tracking-widest focus:border-emerald-500/50 focus:outline-none transition-colors text-white placeholder-slate-600"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <select 
                         className="bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold uppercase tracking-widest focus:border-emerald-500/50 focus:outline-none text-white cursor-pointer"
                         value={formData.role}
                         onChange={e => setFormData({...formData, role: e.target.value})}
                       >
                         <option value="employee" className="bg-slate-900 text-white">Staff Member</option>
                         <option value="admin" className="bg-slate-900 text-white">Operations Lead</option>
                       </select>
                       <input
                        placeholder="DEPARTMENT"
                        className="bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold uppercase tracking-widest focus:border-emerald-500/50 focus:outline-none text-white placeholder-slate-600"
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                        required
                      />
                    </div>

                    {formData.role === 'employee' && (
                      <div className="space-y-4 pt-2">
                        <label className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.3em] ml-2">Shift Priorities (Select 1st, 2nd, 3rd)</label>
                        <div className="grid grid-cols-3 gap-3">
                          {preferences.map((pref, idx) => (
                            <div key={idx} className="space-y-1">
                              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest block text-center">P{idx + 1}</span>
                              <select 
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-3 px-2 text-[10px] font-bold uppercase tracking-tighter text-white focus:border-emerald-500/30 outline-none transition-all cursor-pointer"
                                value={pref}
                                onChange={(e) => handlePrefChange(idx, e.target.value)}
                              >
                                <option value="Morning" className="bg-slate-900">Morning</option>
                                <option value="Afternoon" className="bg-slate-900">Afternoon</option>
                                <option value="Night" className="bg-slate-900">Night</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="EMPLOYEE KEY"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold uppercase tracking-widest focus:border-indigo-500/50 focus:outline-none transition-colors text-white placeholder-slate-600"
                    value={formData.employeeKey}
                    onChange={e => setFormData({ ...formData, employeeKey: e.target.value })}
                    required
                  />
                </div>

                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="ACCESS KEY"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold uppercase tracking-widest focus:border-indigo-500/50 focus:outline-none transition-colors text-white placeholder-slate-600"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full text-white rounded-2xl py-5 text-sm font-black uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-xl disabled:opacity-50 relative overflow-hidden group cursor-pointer",
                  view === 'signup' 
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30" 
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/30"
                )}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {view === 'signup' ? 'Complete Enrollment' : 'Authorize Entry'}
                    </>
                  )}
                </div>
              </button>

              <div className="flex justify-between gap-4 pt-2">
                 <button
                  type="button"
                  onClick={() => {
                    setView(view === 'signup' ? 'signin' : 'signup');
                    setError('');
                  }}
                  className="flex-1 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors py-2"
                >
                  {view === 'signup' ? 'I have an identity' : 'Create new identity'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('initial');
                    setError('');
                  }}
                  className="flex-1 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors py-2"
                >
                  Return to portal select
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};