import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA } from './data';
import { buildBackupArchive, parseBackupBytes } from './export';
import type { AppData } from './types';

const sample: AppData = {
  ...structuredClone(DEFAULT_DATA),
  days: {
    '2026-10-01': {
      checks: { 'morning-ready': true, 'meal-breakfast': true },
      counts: { 'obey-first': 2 },
    },
  },
  redemptions: [{
    id: 'exchange-1',
    rewardId: 'cards',
    title: 'Un paquet de cartes (ex. Pokémon)',
    cost: 50,
    date: '2026-10-01',
    createdAt: '2026-10-01T12:00:00.000Z',
  }],
  updatedAt: '2026-10-01T12:00:00.000Z',
};

describe('sauvegarde exportée', () => {
  it('regroupe un JSON réimportable, un Excel et une notice dans un seul ZIP', async () => {
    const archive = await buildBackupArchive(sample, '2026-10-01');
    expect(archive.filename).toBe('le-chemin-sauvegarde-2026-10-01.zip');

    const files = unzipSync(archive.bytes);
    expect(Object.keys(files).sort()).toEqual([
      'LISEZ-MOI.txt',
      'le-chemin-donnees.json',
      'le-chemin-tableau.xlsx',
    ]);
    expect(files['le-chemin-tableau.xlsx'].slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));

    const restored = parseBackupBytes(archive.bytes, archive.filename) as AppData;
    expect(restored.profile.name).toBe('Sokhan');
    expect(restored.days['2026-10-01'].counts['obey-first']).toBe(2);
  });

  it('produit un classeur Excel lisible avec les réglages et l’historique', async () => {
    const archive = await buildBackupArchive(sample, '2026-10-01');
    const excel = unzipSync(archive.bytes)['le-chemin-tableau.xlsx'];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excel.slice().buffer as ArrayBuffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Synthèse',
      'Comportements',
      'Récompenses',
      'Historique',
    ]);
    expect(workbook.getWorksheet('Synthèse')?.getCell('B5').value).toBe('Sokhan');
    expect(workbook.getWorksheet('Historique')?.rowCount).toBeGreaterThan(4);
  });
});
