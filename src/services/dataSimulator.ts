import { BehavioralDataPoint } from '../types';
import { UserConfig } from '../types';

const REQUIRED_COLS = ['timestamp', 'activitylevel', 'isscreenon'];
// PlannedSleepTime, PlannedWakeTime, AccelX, AccelY, AccelZ

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface ParseResult {
  data: BehavioralDataPoint[];
  userConfigOverrides: Partial<UserConfig>;
  warnings: string[];
}

export async function parseUploadedCSV(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV appears empty — must have a header row and at least one data row.');
  }

  const rawHeaders = lines[0].split(',');
  const headers = rawHeaders.map(normalizeHeader);

  // Validate required columns
  const missing = REQUIRED_COLS.filter(req => !headers.includes(req));
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required columns: ${missing.join(', ')}.\n` +
      `Found columns: ${rawHeaders.join(', ')}`
    );
  }

  const idx = (name: string): number => headers.indexOf(normalizeHeader(name));

  const tsIdx        = idx('Timestamp');
  const actIdx       = idx('ActivityLevel');
  const screenIdx    = idx('IsScreenOn');
  const sleepTIdx    = idx('PlannedSleepTime');
  const wakeTIdx     = idx('PlannedWakeTime');
  const accelXIdx    = idx('AccelX');
  const accelYIdx    = idx('AccelY');
  const accelZIdx    = idx('AccelZ');
  const genderIdx    = idx('Gender');
  const ageIdx       = idx('Age');
  const heightIdx    = idx('Height');
  const weightIdx    = idx('Weight');

  const data: BehavioralDataPoint[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  const firstRow = lines[1].split(',');
  const userConfigOverrides: Partial<UserConfig> = {};

  if (genderIdx >= 0 && firstRow[genderIdx]) {
    const g = firstRow[genderIdx].trim().toLowerCase();
    if (['male', 'female', 'other'].includes(g)) {
      userConfigOverrides.gender = g as UserConfig['gender'];
    }
  }
  if (ageIdx >= 0 && firstRow[ageIdx]) {
    const a = parseInt(firstRow[ageIdx]);
    if (!isNaN(a) && a > 0 && a < 120) userConfigOverrides.age = a;
  }
  if (heightIdx >= 0 && firstRow[heightIdx]) {
    const h = parseInt(firstRow[heightIdx]);
    if (!isNaN(h) && h > 0) userConfigOverrides.height = h;
  }
  if (weightIdx >= 0 && firstRow[weightIdx]) {
    const w = parseInt(firstRow[weightIdx]);
    if (!isNaN(w) && w > 0) userConfigOverrides.weight = w;
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < Math.max(tsIdx, actIdx, screenIdx) + 1) {
      skipped++;
      continue;
    }

    try {
      const timestamp = new Date(cols[tsIdx].trim());
      if (isNaN(timestamp.getTime())) {
        skipped++;
        continue;
      }

      const activityLevel = parseFloat(cols[actIdx].trim());
      if (isNaN(activityLevel)) {
        skipped++;
        continue;
      }

      const screenRaw = cols[screenIdx].trim().toLowerCase();
      const isScreenOn = screenRaw === '1' || screenRaw === 'true' || screenRaw === 'yes';

      const point: BehavioralDataPoint = {
        timestamp,
        activityLevel: Math.min(1, Math.max(0, activityLevel)), // clamp to [0,1]
        isScreenOn,
        sleepTime: sleepTIdx >= 0 ? cols[sleepTIdx]?.trim() : undefined,
        wakeTime:  wakeTIdx  >= 0 ? cols[wakeTIdx]?.trim()  : undefined,
      };

      data.push(point);
    } catch {
      skipped++;
    }
  }

  if (skipped > 0) {
    warnings.push(`${skipped} rows were skipped due to parse errors or missing required values.`);
  }

  if (data.length < 48) {
    throw new Error(
      `Only ${data.length} valid data points found. A minimum of 48 points (12 hours at 15-min intervals) is required.`
    );
  }

  return { data, userConfigOverrides, warnings };
}

export async function extractUserConfigFromCSV(file: File): Promise<Partial<UserConfig>> {
  const { userConfigOverrides } = await parseUploadedCSV(file);
  return userConfigOverrides;
}

import { addDays, setHours, setMinutes, subDays, startOfDay, endOfDay, addMinutes } from 'date-fns';

export function generateSimulatedData(days: number = 18): BehavioralDataPoint[] {
  const data: BehavioralDataPoint[] = [];
  const now = new Date();

  const chronotypeOffset = (Math.random() * 4 - 2);
  const baseSleepStart = 23 + chronotypeOffset;
  const baseWakeTime = 7 + chronotypeOffset;

  for (let i = days; i >= 0; i--) {
    const currentDate = startOfDay(subDays(now, i));

    const daySleepStart = baseSleepStart + (Math.random() * 3 - 1.5);
    const dayWakeTime = baseWakeTime + (Math.random() * 2 - 1);

    const sleepTimeStr = `${Math.floor(daySleepStart % 24).toString().padStart(2, '0')}:${Math.floor((daySleepStart % 1) * 60).toString().padStart(2, '0')}`;
    const wakeTimeStr = `${Math.floor(dayWakeTime % 24).toString().padStart(2, '0')}:${Math.floor((dayWakeTime % 1) * 60).toString().padStart(2, '0')}`;

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timestamp = addMinutes(addHours(currentDate, hour), minute);

        const isSleeping = daySleepStart > dayWakeTime
          ? (hour >= daySleepStart || hour < dayWakeTime)
          : (hour >= daySleepStart && hour < dayWakeTime);

        let activityLevel = 0;
        let isScreenOn = false;

        if (!isSleeping) {
          const peakHour = (dayWakeTime + 7) % 24;
          const distFromPeak = Math.abs(hour - peakHour);
          const sleepDuration = dayWakeTime > daySleepStart
            ? dayWakeTime - daySleepStart
            : (dayWakeTime + 24) - daySleepStart;
          const sleepQualityFactor = Math.min(1, sleepDuration / 8);
          activityLevel = Math.max(0.1, 1 - (distFromPeak / 12)) * (0.4 + Math.random() * 0.6) * sleepQualityFactor;
          const screenProb = hour > 18 ? 0.85 : 0.25;
          isScreenOn = Math.random() < screenProb;
        } else {
          activityLevel = Math.random() < 0.08 ? Math.random() * 0.15 : 0;
          if ((hour >= 22 || hour < 2) && hour < daySleepStart) {
            isScreenOn = Math.random() < 0.75;
          }
        }

        data.push({ timestamp, activityLevel, isScreenOn, sleepTime: sleepTimeStr, wakeTime: wakeTimeStr });
      }
    }
  }

  return data;
}

export function downloadAsCSV(data: BehavioralDataPoint[]) {
  const headers = ['Timestamp', 'ActivityLevel', 'IsScreenOn', 'PlannedSleepTime', 'PlannedWakeTime'];
  const rows = data.map(p => [
    p.timestamp.toISOString(),
    p.activityLevel.toFixed(4),
    p.isScreenOn ? '1' : '0',
    p.sleepTime || '',
    p.wakeTime || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `circadia_data_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(hours);
  return d;
}