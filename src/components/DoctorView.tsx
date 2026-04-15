import React from 'react';
import { 
  X, Download, FileJson, Table as TableIcon, 
  ExternalLink, Clipboard, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CircadianProfile, DailyMetrics } from '../types';

interface DoctorViewProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CircadianProfile;
  dailyMetrics: DailyMetrics[];
}

export const DoctorView: React.FC<DoctorViewProps> = ({ 
  isOpen, onClose, profile, dailyMetrics 
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyJson = () => {
    const data = {
      profile,
      recent_metrics: dailyMetrics.slice(-7)
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportReport = () => {
    const report = `
CIRCADIA CLINICAL SUMMARY REPORT
Generated: ${new Date().toLocaleString()}

CHRONOTYPE: ${profile.chronotype}

CIRCADIAN PHASE ANALYSIS:
- Estimated Phase (Day Start): ${profile.biologicalDayStart}
- Activity Peak Window: ${profile.peakActivityWindow}
- Rhythm Stability: ${profile.rhythmStability}
- Sleep Regularity Score: ${profile.sleepRegularityScore.toFixed(2)}%
- Average Sleep Duration: ${profile.averageSleepDuration.toFixed(1)} hours
- Sleep Debt: ${profile.sleepDebt.toFixed(1)} hours

LATE-NIGHT SCREEN IMPACT:
- Correlation with Delay: ${profile.lateNightScreenCorrelation.toFixed(4)}

RECENT DAILY METRICS:
${dailyMetrics.slice(-7).map(m => `
Date: ${m.date}
- Sleep Duration: ${m.sleepDuration.toFixed(1)} hours
- Screen Usage Late: ${m.screenUsageLate} minutes
- Total Screen Time: ${m.totalScreenTime} minutes
`).join('\n')}

DISCLAIMER: This report is generated based on behavioral markers and is intended for informational purposes only.
`;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `circadia_clinical_report_${new Date().getTime()}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <TableIcon size={20} className="text-indigo-600" />
                  Clinical Summary
                </h2>
                <p className="text-xs text-slate-500 mt-1">Partner & Professional View</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-8">
              {/* Summary Table */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Circadian Phase Analysis</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Metric</th>
                        <th className="px-4 py-3">Estimated Value</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-4 font-medium text-slate-700">Chronotype</td>
                        <td className="px-4 py-4 text-slate-900 font-bold">{profile.chronotype}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">IDENTIFIED</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-slate-700">Estimated Phase</td>
                        <td className="px-4 py-4 text-slate-900">{profile.biologicalDayStart}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">NORMAL</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-slate-700">Activity Peak</td>
                        <td className="px-4 py-4 text-slate-900">{profile.peakActivityWindow}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold">STABLE</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-slate-700">Rhythm Stability</td>
                        <td className="px-4 py-4 text-slate-900">{profile.rhythmStability}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            profile.rhythmStability === 'Stable' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {profile.rhythmStability.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-slate-700">Sleep Debt</td>
                        <td className="px-4 py-4 text-slate-900">{profile.sleepDebt.toFixed(1)} hrs</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            profile.sleepDebt < 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {profile.sleepDebt < 1 ? 'LOW' : 'HIGH'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Integration Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Data Integration</h3>
                  <button 
                    onClick={handleCopyJson}
                    className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-slate-400 overflow-x-auto">
                  <pre>{JSON.stringify({
                    user_id: "circ-8821",
                    timestamp: new Date().toISOString(),
                    metrics: {
                      chronotype: profile.chronotype,
                      phase_start: profile.biologicalDayStart,
                      stability_index: parseFloat((profile.sleepRegularityScore / 100).toFixed(4)),
                      peak_window: profile.peakActivityWindow,
                      correlation_screen_delay: profile.lateNightScreenCorrelation
                    }
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={handleExportReport}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileJson size={18} />
                Export Full Clinical Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
