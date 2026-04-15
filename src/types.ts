export interface UserConfig {
    gender: 'male' | 'female' | 'other';
    age: number;
    hasHighIrregularity: boolean;
    height?: number; // cm
    weight?: number; // kg
    name?: string;
  }
  
  export type DataSource = 'manual' | 'sensors';
  
  export interface BehavioralDataPoint {
    timestamp: Date;
    activityLevel: number; // 0 to 1
    isScreenOn: boolean;
    sleepTime?: string; // HH:mm
    wakeTime?: string; // HH:mm
  }
  
  export interface DailyMetrics {
    date: string;
    sleepStart: Date;
    sleepEnd: Date;
    sleepDuration: number; // hours
    activityPeakWindow: [number, number]; // [startHour, endHour]
    screenUsageLate: number; // minutes in 22:00–02:00 window
    totalScreenTime: number; // minutes
  }
  
  // MSFsc-based MCTQ classification 
  export type Chronotype =
    | 'Morning Type (Early)'
    | 'Intermediate Type'
    | 'Evening Type (Late)'
    | 'Unknown';
  
  export interface CircadianProfile {
    biologicalDayStart: string; // HH:mm
    peakActivityWindow: string; // HH:mm - HH:mm
    rhythmStability: 'Stable' | 'Moderately stable' | 'Irregular';
    sleepRegularityScore: number; // 0-100
    lateNightScreenCorrelation: number; // -1 to 1
    averageSleepDuration: number;
    sleepDebt: number; // cumulative hours over last 7 days
    chronotype: Chronotype;
  }
  
  export interface Insight {
    type: 'positive' | 'warning' | 'info';
    message: string;
  }
  
  export interface Recommendation {
    title: string;
    description: string;
    icon: string;
    articleUrl?: string;
  }