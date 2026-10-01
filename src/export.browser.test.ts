// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA } from './data';
import { downloadConfiguration, downloadExcel } from './export';

const createObjectURL = vi.fn((_blob: Blob) => 'blob:le-chemin-test');
const revokeObjectURL = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

afterEach(() => {
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('téléchargements web séparés', () => {
  it('télécharge indépendamment le JSON et le XLSX puis nettoie les liens temporaires', async () => {
    const downloadedNames: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture(this: HTMLAnchorElement) {
      downloadedNames.push(this.download);
    });

    const configurationDestination = await downloadConfiguration(structuredClone(DEFAULT_DATA));
    const excelDestination = await downloadExcel(structuredClone(DEFAULT_DATA));

    expect(configurationDestination).toBe('browser-download');
    expect(excelDestination).toBe('browser-download');
    expect(click).toHaveBeenCalledTimes(2);
    expect(downloadedNames[0]).toMatch(/^le-chemin-configuration-\d{4}-\d{2}-\d{2}\.json$/);
    expect(downloadedNames[1]).toMatch(/^le-chemin-tableau-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/json');
    expect((createObjectURL.mock.calls[1][0] as Blob).type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });
});
