import ExcelJS from 'exceljs';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA } from './data';
import { buildConfigurationExport, buildExcelExport, parseBackupBytes } from './export';
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

describe('exports séparés', () => {
  it('produit un fichier JSON réimportable avec un nom daté', () => {
    const configuration = buildConfigurationExport(sample, '2026-10-01');

    expect(configuration.filename).toBe('le-chemin-configuration-2026-10-01.json');
    expect(configuration.mimeType).toBe('application/json');
    const restored = parseBackupBytes(configuration.bytes, configuration.filename) as AppData;
    expect(restored.profile.name).toBe('Sokhan');
    expect(restored.days['2026-10-01'].counts['obey-first']).toBe(2);
  });

  it('produit directement un classeur Excel lisible avec les réglages et l’historique', async () => {
    const excel = await buildExcelExport(sample, '2026-10-01');

    expect(excel.filename).toBe('le-chemin-tableau-2026-10-01.xlsx');
    expect(excel.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(excel.bytes.slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excel.bytes.slice().buffer as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Synthèse',
      'Comportements',
      'Récompenses',
      'Historique',
    ]);
    expect(workbook.getWorksheet('Synthèse')?.getCell('B5').value).toBe('Sokhan');
    expect(workbook.getWorksheet('Historique')?.rowCount).toBeGreaterThan(4);
  });

  it('continue à importer les anciennes sauvegardes ZIP', () => {
    const legacyZip = zipSync({
      'le-chemin-donnees.json': strToU8(JSON.stringify(sample)),
      'LISEZ-MOI.txt': strToU8('Ancienne sauvegarde Le Chemin'),
    });

    const restored = parseBackupBytes(legacyZip, 'ancienne-sauvegarde.zip') as AppData;
    expect(restored.profile.name).toBe('Sokhan');
    expect(restored.redemptions).toHaveLength(1);
  });
});
