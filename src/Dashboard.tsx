import { STANDARD_CHRONOTYPE_PROFILES } from '../services/analytics';
import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Moon, Sun, Zap, Smartphone, Activity, Clock,
  AlertCircle, CheckCircle2, Info, ChevronRight, Share2, ExternalLink, User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CircadianProfile, DailyMetrics, Recommendation } from '../types';

interface DashboardProps {
  profile: CircadianProfile;
  dailyMetrics: DailyMetrics[];
  recommendations: Recommendation[];
  hourlyActivity: { hour: number; activity: number }[];
  hourlyScreen: { hour: number; usage: number }[];
  todayActivity?: { hour: number; activity: number }[];
  todayScreen?: { hour: number; usage: number }[];
  onOpenDoctorView: () => void;
}

interface LegendItem { color: string; dashed?: boolean; label: string; }

const ChartLegend: React.FC<{ items: LegendItem[] }> = ({ items }) => (
  <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
    {items.map(item => (
      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {item.dashed ? (
          <div style={{ width: 16, height: 0, borderTop: `2px dashed ${item.color}`, borderRadius: 2 }} />
        ) : (
          <div style={{ width: 12, height: 3, borderRadius: 2, background: item.color }} />
        )}
        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{item.label}</span>
      </div>
    ))}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  profile, dailyMetrics, recommendations,
  hourlyActivity, hourlyScreen,
  todayActivity, todayScreen,
  onOpenDoctorView,
}) => {

  const stabilityColor = useMemo(() => {
    switch (profile.rhythmStability) {
      case 'Stable':            return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Moderately stable': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Irregular':         return 'text-rose-600 bg-rose-50 border-rose-200';
      default:                  return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  }, [profile.rhythmStability]);

  // Standard chronotype reference 
  const standardActivityData = useMemo(() => {
    const key = profile.chronotype as keyof typeof STANDARD_CHRONOTYPE_PROFILES;
    return (STANDARD_CHRONOTYPE_PROFILES[key] ?? STANDARD_CHRONOTYPE_PROFILES['Intermediate Type'])
      .map(h => ({ name: `${h.hour}:00`, standard: h.activity }));
  }, [profile.chronotype]);

  // Activity merged data
  const mergedActivityData = useMemo(() =>
    hourlyActivity.map((d, i) => ({
      name:     `${d.hour}:00`,
      baseline: parseFloat(d.activity.toFixed(1)),
      standard: standardActivityData[i]?.standard ?? 0,
      today:    todayActivity ? parseFloat((todayActivity[i]?.activity ?? 0).toFixed(1)) : undefined,
    })),
    [hourlyActivity, standardActivityData, todayActivity]
  );

  // Screen merged data
  const standardScreenData = useMemo(() => {
    const key = profile.chronotype as keyof typeof STANDARD_CHRONOTYPE_PROFILES;
    const ref = STANDARD_CHRONOTYPE_PROFILES[key] ?? STANDARD_CHRONOTYPE_PROFILES['Intermediate Type'];
    return ref.map(h => ({ standard: parseFloat((h.activity * 0.4).toFixed(1)) }));
  }, [profile.chronotype]);

  const mergedScreenData = useMemo(() =>
    hourlyScreen.map((d, i) => ({
      name:     `${d.hour}:00`,
      baseline: parseFloat(d.usage.toFixed(1)),
      standard: standardScreenData[i]?.standard ?? 0,
      today:    todayScreen ? parseFloat((todayScreen[i]?.usage ?? 0).toFixed(1)) : undefined,
    })),
    [hourlyScreen, standardScreenData, todayScreen]
  );

  // Sleep trend data 
  const recommendedSleep = 8;

  const sleepTrendData = useMemo(() => {
    const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    let runningSum = 0;
    return sorted.map((m, i) => {
      runningSum += m.sleepDuration;
      return {
        date:        m.date.split('-').slice(1).join('/'),
        duration:    parseFloat(m.sleepDuration.toFixed(1)),
        baseline:    parseFloat((runningSum / (i + 1)).toFixed(2)),
        recommended: recommendedSleep,
        lateScreen:  m.screenUsageLate,
      };
    });
  }, [dailyMetrics]);

  const avgLateScreen = Math.round(
    dailyMetrics.reduce((sum, m) => sum + m.screenUsageLate, 0) / dailyMetrics.length
  );

  const sharedChartProps = { margin: { top: 4, right: 0, left: 0, bottom: 0 } };
  const tooltipStyle = {
    contentStyle: { borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 },
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px',
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    }}>

      {/* Header */}
      <header style={{
        background: '#ffffff', borderBottom: '1px solid #e2e8f0',
        padding: '20px 24px 16px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Circadia
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Your Circadian Health Dashboard</p>
        </div>
        <button onClick={onOpenDoctorView} style={{
          width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
        }}>
          <Share2 size={16} />
        </button>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

        {/* Core Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#fff', borderRadius: 20, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', marginBottom: 8 }}>
              <Sun size={13} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Day Start</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{profile.biologicalDayStart}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Avg. Wake Time</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            style={{ background: '#fff', borderRadius: 20, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', marginBottom: 8 }}>
              <Zap size={13} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Peak Window</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{profile.peakActivityWindow}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Max Productivity</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            style={{
              gridColumn: '1 / -1',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              borderRadius: 20, padding: '18px 20px',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)', color: '#fff',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.75, marginBottom: 6 }}>
              <User size={13} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Chronotype</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{profile.chronotype}</div>
            <p style={{ fontSize: 10, opacity: 0.65, marginTop: 6, lineHeight: 1.5 }}>
              Based on your average sleep mid-point and activity peaks.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            style={{
              gridColumn: '1 / -1', borderRadius: 20, padding: '16px 20px', border: '1px solid',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
            className={stabilityColor}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Activity size={14} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rhythm Stability</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{profile.rhythmStability}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{profile.sleepRegularityScore.toFixed(1)}%</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Regularity Score</div>
            </div>
          </motion.div>
        </div>

        {/* Activity Distribution */}
        <Card title="Activity Distribution" badge="24H AVERAGE" mb={16}>
          <ChartLegend items={[
            { color: '#6366f1', label: 'My Baseline' },
            { color: '#94a3b8', dashed: true, label: `Std ${profile.chronotype}` },
            ...(todayActivity ? [{ color: '#f59e0b', label: "Today's Activity" }] : []),
          ]} />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedActivityData} {...sharedChartProps}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="todayActGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'baseline' ? 'My Baseline'
                      : name === 'standard' ? `Std (${profile.chronotype})`
                      : "Today's Activity",
                  ]}
                />
                <Area type="monotone" dataKey="standard"
                  stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5}
                  fill="none" dot={false} />
                <Area type="monotone" dataKey="baseline"
                  stroke="#6366f1" strokeWidth={2}
                  fill="url(#actGrad)" dot={false} />
                {todayActivity && (
                  <Area type="monotone" dataKey="today"
                    stroke="#f59e0b" strokeWidth={2}
                    fill="url(#todayActGrad)" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <TimeAxis />
        </Card>

        {/* Screen Distribution */}
        <Card title="Screen Distribution" badge="24H USAGE %" mb={16}>
          <ChartLegend items={[
            { color: '#818cf8', label: 'My Baseline' },
            { color: '#94a3b8', dashed: true, label: `Std ${profile.chronotype}` },
            ...(todayScreen ? [{ color: '#f59e0b', label: "Today's Screen" }] : []),
          ]} />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedScreenData} {...sharedChartProps}>
                <defs>
                  <linearGradient id="scrnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="todayScrnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'baseline' ? 'My Baseline'
                      : name === 'standard' ? `Std (${profile.chronotype})`
                      : "Today's Screen",
                  ]}
                />
                <Area type="monotone" dataKey="standard"
                  stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5}
                  fill="none" dot={false} />
                <Area type="monotone" dataKey="baseline"
                  stroke="#818cf8" strokeWidth={2}
                  fill="url(#scrnGrad)" dot={false} />
                {todayScreen && (
                  <Area type="monotone" dataKey="today"
                    stroke="#f59e0b" strokeWidth={2}
                    fill="url(#todayScrnGrad)" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <TimeAxis />
        </Card>

        {/* Sleep Duration Trend */}
        <Card title="Sleep Duration Trend" badge={`LAST ${dailyMetrics.length} DAYS`} mb={16}>
          <ChartLegend items={[
            { color: '#0ea5e9', label: 'Actual Sleep' },
            { color: '#94a3b8', dashed: true, label: 'NSF Recommended' },
            { color: '#6366f1', label: 'Personal Avg' },
          ]} />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sleepTrendData} {...sharedChartProps}>
                <defs>
                  <linearGradient id="sleepDurGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="baselineSlpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 12]} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [
                    `${v}h`,
                    name === 'duration'    ? 'Actual Sleep'
                      : name === 'recommended' ? 'NSF Recommended'
                      : 'Personal Avg',
                  ]}
                />
                <Area type="monotone" dataKey="recommended"
                  stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5}
                  fill="none" dot={false} />
                <Area type="monotone" dataKey="baseline"
                  stroke="#6366f1" strokeWidth={1.5}
                  fill="url(#baselineSlpGrad)" dot={false} />
                <Area type="monotone" dataKey="duration"
                  stroke="#0ea5e9" strokeWidth={2.5}
                  fill="url(#sleepDurGrad)"
                  dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }}
                  activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 8, paddingInline: 4 }}>
            <span>{sleepTrendData[0]?.date}</span>
            <span>{sleepTrendData[Math.floor(sleepTrendData.length / 2)]?.date}</span>
            <span>{sleepTrendData[sleepTrendData.length - 1]?.date}</span>
          </div>
        </Card>

        {/* Recommendations */}
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, paddingInline: 2 }}>Recommendations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations.map((rec, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + idx * 0.07 }}
                whileHover={{ scale: 1.01, x: 4 }}
                style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                  padding: '14px 16px', display: 'flex', gap: 12,
                  alignItems: 'flex-start', cursor: 'pointer',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: '#eef2ff', color: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rec.icon === 'Moon'       && <Moon size={18} />}
                  {rec.icon === 'Sun'        && <Sun size={18} />}
                  {rec.icon === 'Zap'        && <Zap size={18} />}
                  {rec.icon === 'Smartphone' && <Smartphone size={18} />}
                  {rec.icon === 'Coffee'     && <Info size={18} />}
                  {!['Moon','Sun','Zap','Smartphone','Coffee'].includes(rec.icon) && <CheckCircle2 size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{rec.title}</h4>
                    <ChevronRight size={14} style={{ color: '#cbd5e1', flexShrink: 0, marginTop: 2 }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>{rec.description}</p>
                  {rec.articleUrl && (
                    <a href={rec.articleUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#6366f1', marginTop: 6, textDecoration: 'none' }}>
                      Read Scientific Article <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Late-Night Screen Impact */}
        <div style={{
          background: '#0f172a', borderRadius: 20, padding: '20px 20px 16px',
          color: '#fff', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Late-Night Screen Impact</h3>
              <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Correlation with Sleep Quality</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fb7185' }}>
              <AlertCircle size={12} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>HIGH IMPACT</span>
            </div>
          </div>

          {/* Bar chart - sleep duration per day, coloured by late-screen threshold */}
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepTrendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 9 }}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v}h`, 'Sleep']}
                />
                <Bar dataKey="duration" radius={[3, 3, 0, 0]} maxBarSize={12}>
                  {sleepTrendData.map((entry, index) => (
                    <Cell
                      key={`lnsi-${index}`}
                      fill={entry.lateScreen > 30 ? '#fb7185' : '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingInline: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#38bdf8' }} />
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>≤30 min late screen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fb7185' }} />
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>&gt;30 min late screen</span>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #1e293b', paddingTop: 14, marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(251,113,133,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fb7185', flexShrink: 0,
            }}>
              <Smartphone size={16} />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>Insight:</span>{' '}
              Late-night screen usage (avg.{' '}
              <span style={{ color: '#fb7185', fontWeight: 700 }}>{avgLateScreen}m</span>
              ){' '}
              {profile.lateNightScreenCorrelation === 0
                ? 'does not correlate with'
                : `correlates with a ${Math.abs(profile.lateNightScreenCorrelation * 25).toFixed(1)}%`
              }{' '}
              delay in your biological day start this week.
            </p>
          </div>
        </div>

        <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', paddingInline: 16 }}>
          "We automatically collect sleep, activity, and screen usage to generate a personalized circadian profile using time-series analysis."
        </p>
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '10px 32px', maxWidth: 480, margin: '0 auto',
      }}>
        <NavTab icon={<Activity size={20} />} label="Profile" active />
        <NavTab icon={<Clock size={20} />} label="History" />
        <NavTab icon={<Smartphone size={20} />} label="Devices" />
      </nav>
    </div>
  );
};

const Card: React.FC<{ title: string; badge: string; mb?: number; children: React.ReactNode }> =
  ({ title, badge, mb = 0, children }) => (
    <div style={{
      background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
      padding: '16px 18px', marginBottom: mb, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em' }}>{badge}</span>
      </div>
      {children}
    </div>
  );

const TimeAxis: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 8, paddingInline: 4 }}>
    {['00:00', '06:00', '12:00', '18:00', '23:59'].map(t => <span key={t}>{t}</span>)}
  </div>
);

const NavTab: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> =
  ({ icon, label, active }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? '#6366f1' : '#94a3b8' }}>
      {icon}
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </div>
  );
