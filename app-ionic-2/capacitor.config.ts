import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'app-ionic-2',
  webDir: 'www',
  android: {
    allowMixedContent: true
  }
};

export default config;
