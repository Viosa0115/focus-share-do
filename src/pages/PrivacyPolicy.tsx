import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Datenschutz & Bedingungen</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Datenschutzerklärung</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>Wir nehmen den Schutz deiner persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert dich darüber, wie wir deine Daten erheben, verwenden und schützen.</p>
            
            <h3 className="text-foreground font-medium">1. Erhobene Daten</h3>
            <p>Wir erheben folgende Daten: E-Mail-Adresse, Anzeigename, Profilbild, sowie von dir erstellte Inhalte wie Aufgaben, Beiträge, Nachrichten und Gruppeninformationen.</p>

            <h3 className="text-foreground font-medium">2. Verwendung der Daten</h3>
            <p>Deine Daten werden ausschließlich zur Bereitstellung der App-Funktionen verwendet. Wir verkaufen oder teilen deine Daten nicht mit Dritten zu Werbezwecken.</p>

            <h3 className="text-foreground font-medium">3. Datenspeicherung</h3>
            <p>Deine Daten werden sicher auf verschlüsselten Servern gespeichert. Nachrichten mit aktivierter Selbstlöschung werden nach 24 Stunden automatisch entfernt.</p>

            <h3 className="text-foreground font-medium">4. Deine Rechte</h3>
            <p>Du hast jederzeit das Recht, deine Daten einzusehen, zu berichtigen oder zu löschen. Du kannst dein Konto in den Profileinstellungen löschen.</p>

            <h3 className="text-foreground font-medium">5. Push-Benachrichtigungen</h3>
            <p>Push-Benachrichtigungen sind optional. Du kannst in den Einstellungen festlegen, welche Benachrichtigungen du erhalten möchtest.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Nutzungsbedingungen</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <h3 className="text-foreground font-medium">1. Nutzung der App</h3>
            <p>Die App dient der Organisation von Aufgaben, der Kommunikation mit Freunden und der Teilnahme an Gruppen-Aktivitäten. Die Nutzung ist ab 13 Jahren gestattet.</p>

            <h3 className="text-foreground font-medium">2. Nutzerverhalten</h3>
            <p>Du verpflichtest dich, keine beleidigenden, rechtswidrigen oder schädlichen Inhalte zu teilen. Verstöße können zur Sperrung deines Kontos führen.</p>

            <h3 className="text-foreground font-medium">3. Geistiges Eigentum</h3>
            <p>Alle von dir erstellten Inhalte bleiben dein Eigentum. Mit dem Hochladen räumst du uns das Recht ein, diese Inhalte zur Bereitstellung der App-Funktionen zu verwenden.</p>

            <h3 className="text-foreground font-medium">4. Haftungsausschluss</h3>
            <p>Die App wird „wie besehen" bereitgestellt. Wir übernehmen keine Garantie für die ununterbrochene Verfügbarkeit oder Fehlerfreiheit.</p>

            <h3 className="text-foreground font-medium">5. Änderungen</h3>
            <p>Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Wesentliche Änderungen werden dir vorab mitgeteilt.</p>

            <h3 className="text-foreground font-medium">6. Kündigung</h3>
            <p>Du kannst dein Konto jederzeit löschen. Mit der Löschung werden alle deine Daten unwiderruflich entfernt.</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PrivacyPolicy;
