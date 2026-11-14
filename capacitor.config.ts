import type { CapacitorConfig } from '@capacitor/cli'

/**
 * iPhone'a IPA olarak kurulum için yerel kabuk. Uygulama aynı web derlemesidir (dist);
 * iOS'ta WKWebView içinde, capacitor://localhost güvenli adresinden çalışır.
 * Bu sayede kamera (şınav sayımı) https gerekmeden açılır.
 */
const config: CapacitorConfig = {
  appId: 'app.kor.fitness',
  appName: 'Kor',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0e0d0c',
  },
}

export default config
