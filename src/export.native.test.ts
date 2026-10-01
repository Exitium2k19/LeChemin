import { afterEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { DEFAULT_DATA } from './data';

const native = vi.hoisted(() => ({
  saveFile: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({ saveFile: native.saveFile }),
}));

import { downloadBackup } from './export';

afterEach(() => {
  native.saveFile.mockReset();
});

describe('enregistrement Android de la sauvegarde', () => {
  it('confie le ZIP au sélecteur de document natif avec son nom et son contenu', async () => {
    native.saveFile.mockResolvedValue({ canceled: false, uri: 'content://documents/backup.zip' });

    const destination = await downloadBackup(structuredClone(DEFAULT_DATA));

    expect(destination).toBe('native-save');
    expect(native.saveFile).toHaveBeenCalledOnce();
    const options = native.saveFile.mock.calls[0][0];
    expect(options.filename).toMatch(/^le-chemin-sauvegarde-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(options.mimeType).toBe('application/zip');

    const bytes = Uint8Array.from(atob(options.data), (character) => character.charCodeAt(0));
    expect(Object.keys(unzipSync(bytes)).sort()).toEqual([
      'LISEZ-MOI.txt',
      'le-chemin-donnees.json',
      'le-chemin-tableau.xlsx',
    ]);
  });

  it('signale une annulation sans la transformer en erreur', async () => {
    native.saveFile.mockResolvedValue({ canceled: true });

    await expect(downloadBackup(structuredClone(DEFAULT_DATA))).resolves.toBe('native-canceled');
  });
});
