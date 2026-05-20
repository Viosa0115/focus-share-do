import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3caacf7ba9714008b9b428b505eb2859',
  appName: 'focus-share-do',
  webDir: 'dist',
  server: {
    url: 'https://3caacf7b-a971-4008-b9b4-28b505eb2859.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      clientId: '348302225955-ehusea1m68cufui0tud2sv9b3e8b0qa9.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    },
  },
};

export default config;
