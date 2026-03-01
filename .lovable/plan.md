

## Native App für App Store & Play Store

Um deine App als echte native App in den App Store (iOS) und Google Play Store (Android) zu bringen, nutzen wir **Capacitor**. Capacitor verpackt deine bestehende Web-App in eine native Hülle mit vollem Zugriff auf Geräte-Features.

### Was zu tun ist

1. **Capacitor Dependencies installieren**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`

2. **Capacitor initialisieren** mit:
   - App-ID: `app.lovable.3caacf7ba9714008b9b428b505eb2859`
   - App-Name: `focus-share-do`
   - Live-Reload Server-URL für Entwicklung

3. **Lokale Schritte auf deinem Rechner** (das kann nicht in Lovable gemacht werden):
   - Projekt auf GitHub exportieren ("Export to Github" Button)
   - Repository klonen und `npm install` ausführen
   - `npx cap add ios` und/oder `npx cap add android`
   - `npx cap update ios` / `npx cap update android`
   - `npm run build` dann `npx cap sync`
   - `npx cap run ios` (braucht Mac + Xcode) oder `npx cap run android` (braucht Android Studio)

4. **Für den Store-Upload**:
   - iOS: Über Xcode archivieren und an App Store Connect senden (Apple Developer Account nötig, 99€/Jahr)
   - Android: APK/AAB erstellen und in Google Play Console hochladen (Google Developer Account nötig, einmalig 25$)

### Voraussetzungen

| Plattform | Was du brauchst |
|-----------|----------------|
| iOS | Mac mit Xcode, Apple Developer Account (99€/Jahr) |
| Android | Android Studio, Google Play Developer Account (25$ einmalig) |

### Wichtig

Nach jedem Update in Lovable musst du lokal `git pull` und `npx cap sync` ausführen, um die Änderungen auf die native App zu übertragen.

Ausführliche Anleitung: [Lovable Blog – Mobile Apps mit Capacitor](https://lovable.dev/blog/lovable-mobile)

Soll ich Capacitor jetzt im Projekt einrichten?

