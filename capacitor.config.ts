import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.dianejim.lechemin',
  appName: 'Le Chemin',
  webDir: 'dist',
  backgroundColor: '#f5f3eb',
  android: {
    backgroundColor: '#f5f3eb',
    allowMixedContent: false,
  },
};

export default config;
