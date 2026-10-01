export type CheckValue = boolean;

export interface DayRecord {
  checks: Record<string, CheckValue>;
  counts: Record<string, number>;
}

export interface Reward {
  id: string;
  title: string;
  cost: number;
  emoji: string;
  image?: string;
}

export interface Redemption {
  id: string;
  rewardId: string;
  title: string;
  cost: number;
  date: string;
  createdAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppProfile {
  name: string;
  accent: string;
  highlight: string;
  theme: ThemePreference;
}

export interface AppData {
  version: number;
  profile: AppProfile;
  days: Record<string, DayRecord>;
  rewards: Reward[];
  redemptions: Redemption[];
  updatedAt: string;
}

export interface BehaviorDefinition {
  id: string;
  label: string;
  shortLabel: string;
  points: number;
  type: 'check' | 'counter';
  section: 'essential' | 'meal' | 'relationships' | 'counters';
  icon: string;
  hint: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
