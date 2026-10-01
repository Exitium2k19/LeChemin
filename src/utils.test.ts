import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA } from './data';
import {
  balanceFor,
  behaviorPoints,
  behaviorValue,
  isoWeekForDate,
  localDateKey,
  normalizeData,
  pointsForDay,
  shiftWeek,
  weekDateKeys,
} from './utils';

const sampleDay = {
  checks: {
    'morning-ready': true,
    'meal-breakfast': true,
    'meal-dinner': true,
    'siblings-morning': true,
  },
  counts: {
    'obey-first': 3,
    'calm-corner': 1,
  },
};

describe('calcul des points', () => {
  it('additionne cases et occurrences', () => {
    // 5 + 5 + 5 + 6 + (3×3) + 6
    expect(pointsForDay(sampleDay)).toBe(36);
  });

  it('regroupe les lignes hebdomadaires', () => {
    expect(behaviorValue(sampleDay, ['meal-breakfast', 'meal-lunch', 'meal-dinner'])).toBe(2);
    expect(behaviorPoints(sampleDay, ['meal-breakfast', 'meal-lunch', 'meal-dinner'])).toBe(10);
  });

  it("n'affiche jamais un solde négatif", () => {
    expect(balanceFor({ ...DEFAULT_DATA, redemptions: [{ id: 'x', rewardId: 'x', title: 'Test', cost: 999, date: '2026-10-01', createdAt: '2026-10-01T10:00:00Z' }] })).toBe(0);
  });
});

describe('semaines ISO', () => {
  it("place le 1er janvier 2027 dans la semaine 53 de 2026", () => {
    const week = isoWeekForDate(new Date(2027, 0, 1, 12));
    expect(week.year).toBe(2026);
    expect(week.week).toBe(53);
    expect(weekDateKeys(week)).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
      '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });

  it('navigue exactement de sept jours', () => {
    const week = isoWeekForDate(new Date(2026, 9, 1, 12));
    expect(localDateKey(shiftWeek(week, -1).start)).toBe('2026-09-21');
  });
});

describe('normalisation de sauvegarde', () => {
  it('rejette les valeurs dangereuses et conserve les données valides', () => {
    const data = normalizeData({
      profile: { name: '  Sokhan  ', accent: 'red', highlight: '#123456' },
      days: {
        '2026-10-01': { checks: { 'morning-ready': true, unknown: true }, counts: { 'obey-first': -5, exceptional: 2 } },
        invalid: { checks: {} },
      },
      rewards: [{ id: 'ok', title: ' Sortie ', cost: 100, emoji: '🎁' }, { id: 'bad', title: '', cost: -1 }],
      redemptions: [],
    });
    expect(data.profile.name).toBe('Sokhan');
    expect(data.profile.accent).toBe(DEFAULT_DATA.profile.accent);
    expect(data.profile.highlight).toBe('#123456');
    expect(data.profile.theme).toBe('system');
    expect(data.days['2026-10-01'].checks).toEqual({ 'morning-ready': true });
    expect(data.days['2026-10-01'].counts['obey-first']).toBeUndefined();
    expect(data.rewards).toHaveLength(1);
    expect(data.rewards[0].title).toBe('Sortie');
  });
});
