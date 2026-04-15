import { BehavioralDataPoint, CircadianProfile, DailyMetrics } from '../types';
import { format, startOfDay, isSameDay, differenceInMinutes, getHours } from 'date-fns';

function getRecommendedSleepHours(ageYears?: number): number {
  if (ageYears === undefined) return 8; // default: adult
  if (ageYears <= 17) return 9;         // Teenagers (14–17): 8–10 hrs → midpoint 9
  if (ageYears <= 25) return 8;         // Young adults (18–25): 7–9 hrs → midpoint 8
  if (ageYears <= 64) return 8;         // Adults (26–64): 7–9 hrs → midpoint 8
  return 7.5;                           // Older adults (≥65): 7–8 hrs → midpoint 7.5
}

export function analyzeCircadianData(
    data: BehavioralDataPoint[],
    ageYears?: number
  ): {
    profile: CircadianProfile;
    dailyMetrics: DailyMetrics[];
    hourlyActivity: { hour: number; activity: number }[];
    hourlyScreen: { hour: number; usage: number }[];
    dailyHourlyActivity: Map<string, { hour: number; activity: number }[]>;
    dailyHourlyScreen: Map<string, { hour: number; usage: number }[]>;
  } {
  const dailyGroups = new Map<string, BehavioralDataPoint[]>();

  // Calculate hourly averages across all days
  const hourlySums = Array(24).fill(0);
  const hourlyCounts = Array(24).fill(0);
  const hourlyScreenSums = Array(24).fill(0);

  data.forEach(point => {
    const hour = getHours(point.timestamp);
    hourlySums[hour] += point.activityLevel;
    hourlyCounts[hour] += 1;
    if (point.isScreenOn) {
      hourlyScreenSums[hour] += 1;
    }

    const dayKey = format(point.timestamp, 'yyyy-MM-dd');
    if (!dailyGroups.has(dayKey)) dailyGroups.set(dayKey, []);
    dailyGroups.get(dayKey)!.push(point);
  });

  // Epoch Aggregation to Hourly Bins
  // HourlyActivity(h) = [ Σ ActivityLevel(h,i) ] / Count(h) × 100
  const hourlyActivity = hourlySums.map((sum, hour) => ({
    hour,
    activity: (sum / (hourlyCounts[hour] || 1)) * 100
  }));

  // ScreenUsage(h) = [ ScreenOnCount(h) / TotalObservations(h) ] × 100
  const hourlyScreen = hourlyScreenSums.map((sum, hour) => ({
    hour,
    usage: (sum / (hourlyCounts[hour] || 1)) * 100
  }));

  const dailyHourlyActivity = new Map<string, { hour: number; activity: number }[]>();
  const dailyHourlyScreen   = new Map<string, { hour: number; usage: number }[]>();

  const dailyMetrics: DailyMetrics[] = [];

  dailyGroups.forEach((points, date) => {
    // Per-day accumulators
const daySums       = Array(24).fill(0);
const dayCounts     = Array(24).fill(0);
const dayScreenSums = Array(24).fill(0);

points.forEach(p => {
  const h = getHours(p.timestamp);
  daySums[h]   += p.activityLevel;
  dayCounts[h] += 1;
  if (p.isScreenOn) dayScreenSums[h] += 1;
});

dailyHourlyActivity.set(
  date,
  daySums.map((sum, h) => ({
    hour: h,
    activity: (sum / (dayCounts[h] || 1)) * 100,
  }))
);

dailyHourlyScreen.set(
  date,
  dayScreenSums.map((sum, h) => ({
    hour: h,
    usage: (sum / (dayCounts[h] || 1)) * 100,
  }))
);
    // Infer sleep: last screen off + inactivity to first screen on + activity
// Priority 1: PlannedSleepTime / PlannedWakeTime
// Priority 2: Screen inference fallback

let sleepStart = points[0].timestamp;
let sleepEnd   = points[points.length - 1].timestamp;

const firstPoint = points[0];
const dateStr = format(firstPoint.timestamp, 'yyyy-MM-dd');

if (firstPoint.sleepTime && firstPoint.wakeTime) {
  // Parse HH:MM
  const [sleepH, sleepM] = firstPoint.sleepTime.split(':').map(Number);
  const [wakeH,  wakeM ] = firstPoint.wakeTime.split(':').map(Number);

  const wakeDate  = new Date(`${dateStr}T${firstPoint.wakeTime.padStart(5,'0')}:00`);
  let   sleepDate = new Date(`${dateStr}T${firstPoint.sleepTime.padStart(5,'0')}:00`);

  // Handle crossing midnight
  if (sleepH > wakeH || (sleepH === wakeH && sleepM > wakeM)) {
    sleepDate.setDate(sleepDate.getDate() - 1);
  }

  sleepStart = sleepDate;
  sleepEnd   = wakeDate;

} else {
  // Fallback: screen-based inference
  const eveningPoints = points.filter(p =>
    getHours(p.timestamp) >= 20 || getHours(p.timestamp) < 4
  );

  const lastScreenOn = [...eveningPoints].reverse().find(p => p.isScreenOn);
  if (lastScreenOn) sleepStart = lastScreenOn.timestamp;

  const morningPoints = points.filter(p =>
    getHours(p.timestamp) >= 4 && getHours(p.timestamp) <= 13
  );

  const firstScreenOn = morningPoints.find(p => p.isScreenOn);
  if (firstScreenOn) sleepEnd = firstScreenOn.timestamp;
}

    // Sleep Duration Computation with Midnight-Crossover Adjustment
    // SleepDuration = differenceInMinutes(WakeTime, SleepTime) / 60
    // If negative (crosses midnight): SleepDuration = SleepDuration + 24
    let sleepDuration = differenceInMinutes(sleepEnd, sleepStart) / 60;
    if (sleepDuration < 0) {
      sleepDuration += 24;
    }

    // Sliding 4-Hour Window Acrophase Estimation
    // A(h) = (1/4) × Σ Activity((h + i) mod 24) for i = 0, 1, 2, 3
    // Acrophase_estimate = argmax{ A(h) } over h = 0..23
    let maxActivity = 0;
    let peakStart = 9;
    for (let h = 0; h < 24; h++) {
      let windowActivity = 0;
      for (let i = 0; i < 4; i++) {
        const hourIdx = (h + i) % 24;
        windowActivity += hourlyActivity[hourIdx].activity;
      }
      const avgActivity = windowActivity / 4;
      if (avgActivity > maxActivity) {
        maxActivity = avgActivity;
        peakStart = h;
      }
    }

    // Late-Night Screen Exposure — window is 22:00–02:00
    // LateNightScreenTime (min) = NumberOfScreenOnEpochsInWindow × 15
    const screenUsageLate = points
      .filter(p => {
        const h = getHours(p.timestamp);
        return (h >= 22 || h < 2) && p.isScreenOn; // 22:00–02:00 
      })
      .length * 15; // each epoch = 15 minutes

    const totalScreenTime = points.filter(p => p.isScreenOn).length * 15;

    dailyMetrics.push({
      date,
      sleepStart,
      sleepEnd,
      sleepDuration,
      activityPeakWindow: [peakStart, (peakStart + 4) % 24],
      screenUsageLate,
      totalScreenTime
    });
  });

  // Aggregate into profile
  const avgWakeTimeMinutes = dailyMetrics.reduce((sum, m) => {
    return sum + (getHours(m.sleepEnd) * 60 + m.sleepEnd.getMinutes());
  }, 0) / dailyMetrics.length;

  const biologicalDayStart = `${Math.floor(avgWakeTimeMinutes / 60).toString().padStart(2, '0')}:${Math.round(avgWakeTimeMinutes % 60).toString().padStart(2, '0')}`;

  // MSF - mid-sleep on free days
  // MSF = SleepOnset_free + (SleepDuration_free / 2)
  // Using average sleep midpoint as the MSFsc approximation 
  const avgSleepStartMinutes = dailyMetrics.reduce((sum, m) => {
    let h = getHours(m.sleepStart);
    if (h < 12) h += 24; // Normalize to 12 PM – 12 PM cycle
    return sum + (h * 60 + m.sleepStart.getMinutes());
  }, 0) / dailyMetrics.length;

  const avgSleepDurationMinutes = dailyMetrics.reduce((sum, m) => sum + m.sleepDuration * 60, 0) / dailyMetrics.length;

  // MSF = SleepOnset + SleepDuration / 2, expressed in decimal hours
  const msfMinutes = avgSleepStartMinutes + avgSleepDurationMinutes / 2;
  const msfHour = (msfMinutes / 60) % 24;

  // Chronotype Classification by MSFsc thresholds 
  // Morning/Early type: MSFsc ≤ 03:59
  // Intermediate type:  04:00 ≤ MSFsc ≤ 04:59
  // Evening/Late type:  MSFsc ≥ 05:00
  let chronotype: any;
  if (msfHour <= 3.983) {
    chronotype = 'Morning Type (Early)';
  } else if (msfHour < 5.0) {
    chronotype = 'Intermediate Type';
  } else {
    chronotype = 'Evening Type (Late)';
  }

  const avgPeakStart = dailyMetrics.reduce((sum, m) => sum + m.activityPeakWindow[0], 0) / dailyMetrics.length;
  const peakActivityWindow = `${Math.floor(avgPeakStart).toString().padStart(2, '0')}:00 - ${Math.floor((avgPeakStart + 4) % 24).toString().padStart(2, '0')}:00`;

  // Sleep Midpoint Calculation & Standard Deviation
  // MS_d = SleepOnset_d + (SleepDuration_d / 2)
  // If WakeTime < SleepTime (crosses midnight): AdjustedWakeTime = WakeTime + 24 × 60
  // σ = √[ (1/N) × Σ (MS_d − μ_MS)² ] - σ in MINUTES
  const midpoints = dailyMetrics.map(m => {
    const startMin = getHours(m.sleepStart) * 60 + m.sleepStart.getMinutes();
    const endMin = getHours(m.sleepEnd) * 60 + m.sleepEnd.getMinutes();
    // Midnight crossover adjustment
    const adjustedEnd = endMin < startMin ? endMin + 24 * 60 : endMin;
    return (startMin + adjustedEnd) / 2;
  });

  const meanMidpoint = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
  // σ² = (1/N) × Σ (MS_d − μ_MS)²
  const variance = midpoints.reduce((a, b) => a + Math.pow(b - meanMidpoint, 2), 0) / midpoints.length;
  const sdMinutes = Math.sqrt(variance); // σ in minutes

  // SRS thresholds (σ in minutes):
  //   Stable:            σ ≤ 36 min  (SRS 70–100, good to excellent)
  //   Moderately stable: 36 < σ ≤ 60  (SRS 50–70)
  //   Irregular:         σ > 60 min   (SRS < 50; high cardiometabolic/depression risk)
  let rhythmStability: CircadianProfile['rhythmStability'] = 'Stable';
  if (sdMinutes > 60) rhythmStability = 'Irregular';
  else if (sdMinutes > 36) rhythmStability = 'Moderately stable';

  // Sleep Regularity Score
  // SRS = 100 − (σ_minutes / 60) × 50
  // σ = 0 → SRS 100 (perfect), σ = 60 min → SRS 50, σ = 120 min → SRS 0
  const sleepRegularityScore = Math.max(0, 100 - (sdMinutes / 60) * 50);

  // Pearson Correlation Coefficient
  // r = [ n × Σ(X_i × Y_i) − (Σ X_i)(Σ Y_i) ] / √[ (n × Σ X_i² − (Σ X_i)²) × (n × Σ Y_i² − (Σ Y_i)²) ]
  // X = late-night screen-on duration (minutes), Y = sleep onset time (decimal hours)
  const screenUsageLateValues = dailyMetrics.map(m => m.screenUsageLate);
  const sleepStartHours = dailyMetrics.map(m => {
    const h = getHours(m.sleepStart);
    return h < 12 ? h + 24 : h; // Normalize across midnight
  });

  const n = dailyMetrics.length;
  const sumX = screenUsageLateValues.reduce((a, b) => a + b, 0);
  const sumY = sleepStartHours.reduce((a, b) => a + b, 0);
  const sumXY = screenUsageLateValues.reduce((sum, x, i) => sum + x * sleepStartHours[i], 0);
  const sumX2 = screenUsageLateValues.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = sleepStartHours.reduce((sum, y) => sum + y * y, 0);

  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const lateNightCorrelation = denominator === 0 ? 0 : numerator / denominator;

  const averageSleepDuration = dailyMetrics.reduce((sum, m) => sum + m.sleepDuration, 0) / dailyMetrics.length;

  // Weekly Sleep Debt Computation
  // SleepDebt_d = max(0, RecommendedSleepDuration − ActualSleepDuration_d)
  // WeeklySleepDebt = Σ SleepDebt_d for d in the most recent 7 days
  // Recommended duration = midpoint of NSF age-stratified range 
  const recommendedSleep = getRecommendedSleepHours(ageYears);
  const sortedMetrics = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  const recentSevenDays = sortedMetrics.slice(-7);
  const sleepDebt = recentSevenDays.reduce((sum, m) => sum + Math.max(0, recommendedSleep - m.sleepDuration), 0);

  return {
    dailyMetrics,
    hourlyActivity,
    hourlyScreen,
    dailyHourlyActivity,   
    dailyHourlyScreen,     
    profile: {
      biologicalDayStart,
      peakActivityWindow,
      rhythmStability,
      sleepRegularityScore,
      lateNightScreenCorrelation: lateNightCorrelation,
      averageSleepDuration,
      sleepDebt,
      chronotype
    }
  };

}

export const STANDARD_CHRONOTYPE_PROFILES: Record<string, { hour: number; activity: number }[]> = {
  'Morning Type (Early)': Array.from({ length: 24 }, (_, h) => {
    const peak = 10;
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    const activity = h < 5 || h >= 21 ? 0 : Math.max(0, 100 - (dist / 8) * 100);
    return { hour: h, activity: parseFloat(activity.toFixed(1)) };
  }),

  'Intermediate Type': Array.from({ length: 24 }, (_, h) => {
    const peak = 12;
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    const activity = h < 7 || h >= 22 ? 0 : Math.max(0, 100 - (dist / 9) * 100);
    return { hour: h, activity: parseFloat(activity.toFixed(1)) };
  }),

  'Evening Type (Late)': Array.from({ length: 24 }, (_, h) => {
    const peak = 16;
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    const activity = h < 10 || h >= 24 ? 0 : Math.max(0, 100 - (dist / 10) * 100);
    return { hour: h, activity: parseFloat(activity.toFixed(1)) };
  }),
};