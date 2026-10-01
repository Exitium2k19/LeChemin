import { BEHAVIORS, DEFAULT_DATA, DEFAULT_REWARDS } from './data';
import type { AppData, DayRecord, Reward } from './types';

export const EMPTY_DAY: DayRecord = { checks: {}, counts: {} };

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatLongDate(key: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dateFromKey(key));
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(dateFromKey(key));
}

export function formatCompactDate(key: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(dateFromKey(key));
}

export function pointsForDay(day?: DayRecord): number {
  if (!day) return 0;
  return BEHAVIORS.reduce((total, behavior) => {
    if (behavior.type === 'check') {
      return total + (day.checks?.[behavior.id] ? behavior.points : 0);
    }
    const count = Math.max(0, Number(day.counts?.[behavior.id]) || 0);
    return total + count * behavior.points;
  }, 0);
}

export function totalEarned(data: AppData): number {
  return Object.values(data.days).reduce((sum, day) => sum + pointsForDay(day), 0);
}

export function totalSpent(data: AppData): number {
  return data.redemptions.reduce((sum, redemption) => sum + Math.max(0, redemption.cost || 0), 0);
}

export function balanceFor(data: AppData): number {
  return Math.max(0, totalEarned(data) - totalSpent(data));
}

export function behaviorValue(day: DayRecord | undefined, ids: string[]): number {
  if (!day) return 0;
  return ids.reduce((sum, id) => {
    const behavior = BEHAVIORS.find((item) => item.id === id);
    if (!behavior) return sum;
    return sum + (behavior.type === 'check' ? (day.checks?.[id] ? 1 : 0) : Math.max(0, day.counts?.[id] || 0));
  }, 0);
}

export function behaviorPoints(day: DayRecord | undefined, ids: string[]): number {
  if (!day) return 0;
  return ids.reduce((sum, id) => {
    const behavior = BEHAVIORS.find((item) => item.id === id);
    if (!behavior) return sum;
    const multiplier = behavior.type === 'check' ? (day.checks?.[id] ? 1 : 0) : Math.max(0, day.counts?.[id] || 0);
    return sum + behavior.points * multiplier;
  }, 0);
}

export interface IsoWeek {
  year: number;
  week: number;
  start: Date;
  end: Date;
}

export function isoWeekForDate(input: Date): IsoWeek {
  const date = new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const isoYear = date.getFullYear();
  const yearStart = new Date(isoYear, 0, 1, 12);
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const start = new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12);
  const inputDay = start.getDay() || 7;
  start.setDate(start.getDate() - inputDay + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { year: isoYear, week, start, end };
}

export function shiftWeek(week: IsoWeek, delta: number): IsoWeek {
  const date = new Date(week.start);
  date.setDate(date.getDate() + delta * 7);
  return isoWeekForDate(date);
}

export function weekDateKeys(week: IsoWeek): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week.start);
    date.setDate(date.getDate() + index);
    return localDateKey(date);
  });
}

export function sameIsoWeek(a: IsoWeek, b: IsoWeek): boolean {
  return a.year === b.year && a.week === b.week;
}

export function safeName(name: unknown): string {
  if (typeof name !== 'string') return DEFAULT_DATA.profile.name;
  const cleaned = name.replace(/\s+/g, ' ').trim().slice(0, 32);
  return cleaned || DEFAULT_DATA.profile.name;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeRewards(value: unknown): Reward[] {
  if (!Array.isArray(value)) return DEFAULT_REWARDS.map((reward) => ({ ...reward }));
  const seen = new Set<string>();
  const rewards = value.flatMap((item): Reward[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<Reward>;
    const title = typeof candidate.title === 'string' ? candidate.title.trim().slice(0, 100) : '';
    const cost = Math.round(Number(candidate.cost));
    let id = typeof candidate.id === 'string' && candidate.id ? candidate.id : crypto.randomUUID();
    if (seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    if (!title || !Number.isFinite(cost) || cost < 1 || cost > 99999) return [];
    const image = typeof candidate.image === 'string' && candidate.image.startsWith('data:image/') && candidate.image.length < 400_000
      ? candidate.image
      : undefined;
    return [{ id, title, cost, emoji: typeof candidate.emoji === 'string' ? candidate.emoji.slice(0, 8) : '🎁', image }];
  });
  return rewards.length ? rewards : DEFAULT_REWARDS.map((reward) => ({ ...reward }));
}

export function normalizeData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_DATA);
  const raw = value as Partial<AppData>;
  const days: AppData['days'] = {};
  if (raw.days && typeof raw.days === 'object') {
    Object.entries(raw.days).forEach(([key, day]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !day || typeof day !== 'object') return;
      const source = day as DayRecord;
      const checks: Record<string, boolean> = {};
      const counts: Record<string, number> = {};
      BEHAVIORS.forEach((behavior) => {
        if (behavior.type === 'check' && source.checks?.[behavior.id] === true) checks[behavior.id] = true;
        if (behavior.type === 'counter') {
          const count = Math.max(0, Math.min(999, Math.round(Number(source.counts?.[behavior.id]) || 0)));
          if (count) counts[behavior.id] = count;
        }
      });
      if (Object.keys(checks).length || Object.keys(counts).length) days[key] = { checks, counts };
    });
  }

  const redemptions = Array.isArray(raw.redemptions)
    ? raw.redemptions.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const redemption = item as Partial<AppData['redemptions'][number]>;
        const cost = Math.max(0, Math.round(Number(redemption.cost) || 0));
        const date = typeof redemption.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(redemption.date)
          ? redemption.date
          : localDateKey();
        if (!redemption.title || !cost) return [];
        return [{
          id: typeof redemption.id === 'string' ? redemption.id : crypto.randomUUID(),
          rewardId: typeof redemption.rewardId === 'string' ? redemption.rewardId : '',
          title: String(redemption.title).slice(0, 100),
          cost,
          date,
          createdAt: typeof redemption.createdAt === 'string' ? redemption.createdAt : new Date().toISOString(),
        }];
      })
    : [];

  return {
    version: 1,
    profile: {
      name: safeName(raw.profile?.name),
      accent: isHexColor(raw.profile?.accent) ? raw.profile.accent : DEFAULT_DATA.profile.accent,
      highlight: isHexColor(raw.profile?.highlight) ? raw.profile.highlight : DEFAULT_DATA.profile.highlight,
      theme: raw.profile?.theme === 'light' || raw.profile?.theme === 'dark' || raw.profile?.theme === 'system'
        ? raw.profile.theme
        : DEFAULT_DATA.profile.theme,
    },
    days,
    rewards: normalizeRewards(raw.rewards),
    redemptions,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
  };
}

export function nextReward(data: AppData): Reward | undefined {
  const balance = balanceFor(data);
  return [...data.rewards].sort((a, b) => a.cost - b.cost).find((reward) => reward.cost > balance);
}

export function uid(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
