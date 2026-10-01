import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA } from './data';

const native = vi.hoisted(() => ({
  saveFile: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({ saveFile: native.saveFile }),
}));

import { downloadConfiguration, downloadExcel } from './export';

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

afterEach(() => {
  native.saveFile.mockReset();
});

describe('enregistrements Android séparés', () => {
  it('confie le JSON réimportable au sélecteur de document natif', async () => {
    native.saveFile.mockResolvedValue({ canceled: false, uri: 'content://documents/configuration.json' });

    const destination = await downloadConfiguration(structuredClone(DEFAULT_DATA));

    expect(destination).toBe('native-save');
    expect(native.saveFile).toHaveBeenCalledOnce();
    const options = native.saveFile.mock.calls[0][0];
    expect(options.filename).toMatch(/^le-chemin-configuration-\d{4}-\d{2}-\d{2}\.json$/);
    expect(options.mimeType).toBe('application/json');
    const restored = JSON.parse(new TextDecoder().decode(decodeBase64(options.data)));
    expect(restored.profile.name).toBe('Sokhan');
  });

  it('confie directement le classeur XLSX au sélecteur de document natif', async () => {
    native.saveFile.mockResolvedValue({ canceled: false, uri: 'content://documents/tableau.xlsx' });

    const destination = await downloadExcel(structuredClone(DEFAULT_DATA));

    expect(destination).toBe('native-save');
    expect(native.saveFile).toHaveBeenCalledOnce();
    const options = native.saveFile.mock.calls[0][0];
    expect(options.filename).toMatch(/^le-chemin-tableau-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(options.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(decodeBase64(options.data).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  });

  it('signale une annulation sans la transformer en erreur', async () => {
    native.saveFile.mockResolvedValue({ canceled: true });

    await expect(downloadConfiguration(structuredClone(DEFAULT_DATA))).resolves.toBe('native-canceled');
  });
});
