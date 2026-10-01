// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA } from './data';
import { downloadBackup } from './export';

const createObjectURL = vi.fn(() => 'blob:le-chemin-test');
const revokeObjectURL = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

afterEach(() => {
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('téléchargement web de la sauvegarde', () => {
  it('déclenche le téléchargement du ZIP puis nettoie le lien temporaire', async () => {
    let downloadedName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture(this: HTMLAnchorElement) {
      downloadedName = this.download;
    });

    const destination = await downloadBackup(structuredClone(DEFAULT_DATA));

    expect(destination).toBe('browser-download');
    expect(click).toHaveBeenCalledOnce();
    expect(downloadedName).toMatch(/^le-chemin-sauvegarde-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('a')).toHaveLength(0);

  });
});
