import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { downloadAsCSV, generateSimulatedData, parseUploadedCSV } from './services/dataSimulator';
import { analyzeCircadianData } from './services/analytics';
import { getAIRecommendations } from './services/gemini';
import { Dashboard } from './components/Dashboard';
import { DoctorView } from './components/DoctorView';
import { CircadianProfile, DailyMetrics, Recommendation, UserConfig, DataSource } from './types';
import { User, LogIn, UserPlus, Database, Cpu, History as HistoryIcon, Smartphone, Activity as ActivityIcon, Clock } from 'lucide-react';

type AppState = 'landing' | 'login' | 'signup' | 'profile_setup' | 'data_source' | 'connecting' | 'dashboard' | 'history' | 'user_profile';

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [isDoctorViewOpen, setIsDoctorViewOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [userConfig, setUserConfig] = useState<UserConfig>({
    gender: 'male',
    age: 25,
    hasHighIrregularity: false,
    height: 175,
    weight: 70,
    name: 'Alex'
  });
  const [dataSource, setDataSource] = useState<DataSource>('sensors');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [data, setData] = useState<{
    profile: CircadianProfile;
    dailyMetrics: DailyMetrics[];
    recommendations: Recommendation[];
    hourlyActivity: { hour: number, activity: number }[];
    hourlyScreen: { hour: number, usage: number }[];
  } | null>(null);

  const calculateRequiredDays = (config: UserConfig) => {
    let days = 18; // Default: standard adult

    if (config.gender === 'female' && config.age >= 12 && config.age <= 50) {
      days = 35; // Menstrual cycle context — captures full 28-day cycle
    } else if (config.age < 18) {
      days = 25; // Adolescent phase delay variability
    } else if (config.gender === 'female' && config.age > 50) {
      days = 18;
    } else if (config.gender === 'male' && config.age >= 18 && config.age <= 60) {
      days = 18;
    }

    if (config.hasHighIrregularity) {
      days += 10; // +10 days for shift workers / high lifestyle variability
    }

    return days;
  };

  const validateAuth = () => {
    let newErrors: { email?: string; password?: string } = {};
  
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Enter correct email id';
    }
  
    // Password validation 
    const passwordRegex = /^(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password = 'Password must be at least 6 characters with 1 number';
    }
  
    setErrors(newErrors);
  
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = async () => {
    // Validate: if manual mode, a file must be selected
    if (dataSource === 'manual' && !uploadedFile) {
      setUploadError('Please select a CSV file before starting analysis.');
      return;
    }
  
    setUploadError(null);
    setState('connecting');
    const requiredDays = calculateRequiredDays(userConfig);
  
    setTimeout(async () => {
      try {
        let rawData;
        let configOverrides = {};
  
        if (dataSource === 'manual' && uploadedFile) {
          // ── Parse uploaded CSV ──────────────────────────────────────────
          const { data, userConfigOverrides, warnings } = await parseUploadedCSV(uploadedFile);
          rawData = data;
          configOverrides = userConfigOverrides;
          setParseWarnings(warnings);
  
          // Apply demographic overrides from CSV (age, gender, height, weight)
          // so the analytics use the correct age-stratified targets
          if (Object.keys(userConfigOverrides).length > 0) {
            setUserConfig(prev => ({ ...prev, ...userConfigOverrides }));
          }
        } else {
          // ── Fallback: generate simulated data ──────────────────────────
          rawData = generateSimulatedData(requiredDays);
          downloadAsCSV(rawData);
        }
  
        // Pass effective age (CSV override takes priority) to analytics
        const effectiveAge = (configOverrides as any).age ?? userConfig.age;
  
        const { profile, dailyMetrics, hourlyActivity, hourlyScreen } = analyzeCircadianData(rawData, effectiveAge);
        const recommendations = await getAIRecommendations(profile);
  
        setData({ profile, dailyMetrics, recommendations, hourlyActivity, hourlyScreen });
        setState('dashboard');
      } catch (err: any) {
        console.error('[Circadia] Analysis failed:', err);
        setUploadError(err?.message ?? 'Analysis failed. Please check your file and try again.');
        setState('data_source');
      }
    }, 100); // minimal delay — CSV parsing replaces the 3s simulated wait
  };

  const renderBottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-around items-center max-w-2xl mx-auto z-50">
      <button
        onClick={() => setState('dashboard')}
        className={`flex flex-col items-center gap-1 ${state === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <ActivityIcon size={20} />
        <span className="text-[10px] font-bold">Profile</span>
      </button>
      <button
        onClick={() => setState('history')}
        className={`flex flex-col items-center gap-1 ${state === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <Clock size={20} />
        <span className="text-[10px] font-bold">History</span>
      </button>
      <button
        onClick={() => alert('Wearables to be integrated later')}
        className="flex flex-col items-center gap-1 text-slate-400"
      >
        <Smartphone size={20} />
        <span className="text-[10px] font-bold">Devices</span>
      </button>
      <button
        onClick={() => setState('user_profile')}
        className={`flex flex-col items-center gap-1 ${state === 'user_profile' ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <User size={20} />
        <span className="text-[10px] font-bold">Account</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AnimatePresence mode="wait">
        {state === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-12"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
                <ActivityIcon size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Circadia</h1>
              <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
                Unlock your biological clock. We analyze your behavior to optimize your performance.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-4">
              
              <button
                onClick={() => setState('signup')}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
              >
                Create Account
                <UserPlus size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {(state === 'login' || state === 'signup') && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 max-w-sm mx-auto"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">{state === 'login' ? 'Welcome Back' : 'Join Circadia'}</h2>
              <p className="text-sm text-slate-500">Enter your details to continue.</p>
            </div>
            <div className="w-full space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
/>
{errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

<input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
/>
{errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
              <button
                onClick={() => {
                  if (!validateAuth()) return;
                
                  if (state === 'login') {
                    setState('data_source');
                  } else {
                    setState('profile_setup');
                  }
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                {state === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
              <button onClick={() => setState('landing')} className="w-full text-sm text-slate-400 font-medium">Back to Home</button>
            </div>
          </motion.div>
        )}

        {state === 'profile_setup' && (
          <motion.div
            key="profile_setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 max-w-sm mx-auto"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Personalize Analysis</h2>
              <p className="text-sm text-slate-500">We adjust data requirements based on your biological profile.</p>
            </div>

            <div className="w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</label>
                <input
                  type="text"
                  value={userConfig.name}
                  onChange={(e) => setUserConfig({ ...userConfig, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setUserConfig({ ...userConfig, gender: g })}
                      className={`py-2 text-sm rounded-xl border transition-all ${
                        userConfig.gender === g
                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Age</label>
                  <input
                    type="number"
                    value={userConfig.age}
                    onChange={(e) => setUserConfig({ ...userConfig, age: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Height (cm)</label>
                  <input
                    type="number"
                    value={userConfig.height}
                    onChange={(e) => setUserConfig({ ...userConfig, height: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Weight (kg)</label>
                <input
                  type="number"
                  value={userConfig.weight}
                  onChange={(e) => setUserConfig({ ...userConfig, weight: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <button
                onClick={() => setState('data_source')}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Next Step
              </button>
            </div>
          </motion.div>
        )}

{state === 'data_source' && (
  <motion.div
    key="data_source"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 max-w-sm mx-auto"
  >
    <div className="text-center space-y-2">
      <h2 className="text-2xl font-bold">Data Source</h2>
      <p className="text-sm text-slate-500">How would you like to provide your behavioral data?</p>
    </div>

    <div className="w-full space-y-4">
      {/* Sensors button */}
      <button
        onClick={() => { setDataSource('sensors'); setUploadError(null); }}
        className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${
          dataSource === 'sensors' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'
        }`}
      >
        <div className={`p-3 rounded-2xl ${dataSource === 'sensors' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          <Cpu size={24} />
        </div>
        <div>
          <h4 className="font-bold">Automated Sensors</h4>
          <p className="text-xs text-slate-500">Collect from phone sensors and smartwatches automatically.</p>
        </div>
      </button>

      {/* Upload CSV button */}
      <button
        onClick={() => { setDataSource('manual'); setUploadError(null); }}
        className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${
          dataSource === 'manual' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'
        }`}
      >
        <div className={`p-3 rounded-2xl ${dataSource === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          <Database size={24} />
        </div>
        <div>
          <h4 className="font-bold">Upload Dataset</h4>
          <p className="text-xs text-slate-500">Upload a behavioral CSV with timestamps, activity, screen & accelerometer data.</p>
        </div>
      </button>

      {/* File picker */}
      {dataSource === 'manual' && (
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4"
      >
        {/* File picker */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setUploadedFile(f);
              setUploadError(null);
              setParseWarnings([]);
            }}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {uploadedFile && (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">
              ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
    
        {/* Required columns list */}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Required columns in your CSV</p>
          <div className="space-y-1">
            {[
              { col: 'Timestamp',       note: 'ISO 8601 datetime — e.g. 2024-03-01T22:00:00.000Z', required: true },
              { col: 'IsScreenOn',      note: '1 = screen on, 0 = screen off',                      required: true },
              { col: 'PlannedSleepTime',note: 'HH:MM — self-reported or inferred sleep onset',      required: true },
              { col: 'PlannedWakeTime', note: 'HH:MM — self-reported or inferred wake time',        required: true },
              { col: 'AccelX / AccelY / AccelZ', note: 'Raw accelerometer axes (m/s²)',             required: true },
            ].map(({ col, note, required }) => (
              <div key={col} className="flex items-start gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                  required ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {required ? 'REQ' : 'OPT'}
                </span>
                <div>
                  <span className="text-[10px] font-bold text-slate-700">{col}</span>
                  <span className="text-[10px] text-slate-400"> — {note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      )}

      {/* Validation error */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl"
        >
          <p className="text-xs text-rose-700 font-semibold leading-relaxed">{uploadError}</p>
        </motion.div>
      )}

      {/* Parse warnings */}
      {parseWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
          {parseWarnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {/* Start Analysis button */}
      <button
        onClick={handleConnect}
        disabled={dataSource === 'manual' && !uploadedFile}
        className={`w-full py-5 rounded-3xl font-bold text-lg shadow-lg transition-all mt-4 ${
          dataSource === 'manual' && !uploadedFile
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
        }`}
      >
        {dataSource === 'manual' ? 'Analyze Uploaded Data' : 'Start Analysis'}
      </button>
    </div>
  </motion.div>
)}

        {state === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={40} className="text-indigo-600 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Profiling Your Rhythm</h2>
              <p className="text-sm text-slate-500 animate-pulse">
                Analyzing {calculateRequiredDays(userConfig)} days of behavioral markers...
              </p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-4">
                We're processing historical activity and screen usage to build your biological clock.
              </p>
            </div>
          </motion.div>
        )}

        {state === 'dashboard' && data && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Dashboard
              profile={data.profile}
              dailyMetrics={data.dailyMetrics}
              recommendations={data.recommendations}
              hourlyActivity={data.hourlyActivity}
              hourlyScreen={data.hourlyScreen}
              onOpenDoctorView={() => setIsDoctorViewOpen(true)}
            />
            <DoctorView
              isOpen={isDoctorViewOpen}
              onClose={() => setIsDoctorViewOpen(false)}
              profile={data.profile}
              dailyMetrics={data.dailyMetrics}
            />
            {renderBottomNav()}
          </motion.div>
        )}

        {state === 'history' && data && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-slate-50 pb-24 p-6"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <HistoryIcon className="text-indigo-600" />
                Rhythm History
              </h2>
              <div className="space-y-4">
                {data.dailyMetrics.slice().reverse().map((m, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">{m.date}</p>
                      <p className="text-sm font-bold text-slate-900">{m.sleepDuration.toFixed(1)}h Sleep</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Screen: {m.totalScreenTime}m</p>
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        m.screenUsageLate > 30 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {m.screenUsageLate > 30 ? 'High Late Usage' : 'Optimal'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {renderBottomNav()}
          </motion.div>
        )}

        {state === 'user_profile' && (
          <motion.div
            key="user_profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-slate-50 pb-24 p-6"
          >
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex flex-col items-center space-y-4 pt-8">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <User size={48} />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{userConfig.name}</h2>
                  <p className="text-sm text-slate-500">Circadian Explorer</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Age</p>
                  <p className="text-xl font-bold">{userConfig.age} years</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                  <p className="text-xl font-bold capitalize">{userConfig.gender}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Height</p>
                  <p className="text-xl font-bold">{userConfig.height} cm</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p>
                  <p className="text-xl font-bold">{userConfig.weight} kg</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">BMI</p>
                  <p className="text-xl font-bold">
                    {(userConfig.weight! / Math.pow(userConfig.height! / 100, 2)).toFixed(1)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setState('landing')}
                className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-300 transition-all"
              >
                Sign Out
              </button>
            </div>
            {renderBottomNav()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
