import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

type Method = "email" | "phone";

const Auth = () => {
  const [method, setMethod] = useState<Method>("email");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMode, setOtpMode] = useState<"signin" | "recovery">("signin");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const normalizePhone = (p: string) => {
    const trimmed = p.trim().replace(/\s|-/g, "");
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Willkommen!", description: "Dein Account wurde erstellt." });
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const phoneE164 = normalizePhone(phone);
      if (isLogin) {
        // Login: try password first, fallback to OTP
        if (password) {
          const { error } = await supabase.auth.signInWithPassword({ phone: phoneE164, password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
          if (error) throw error;
          setOtpMode("signin");
          setOtpSent(true);
          toast({ title: "Code gesendet", description: "Prüfe deine SMS." });
        }
      } else {
        const { error } = await supabase.auth.signUp({ phone: phoneE164, password });
        if (error) throw error;
        setOtpMode("signin");
        setOtpSent(true);
        toast({ title: "Code gesendet", description: "Bestätige deine Nummer per SMS." });
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const phoneE164 = normalizePhone(phone);
      const type = otpMode === "recovery" ? "recovery" : "sms";
      const { error } = await supabase.auth.verifyOtp({ phone: phoneE164, token: otp, type: type as any });
      if (error) throw error;
      if (otpMode === "recovery") {
        // After recovery OTP, set a new password
        if (!password) {
          toast({ title: "Neues Passwort", description: "Gib unten ein neues Passwort ein und bestätige." });
          setLoading(false);
          return;
        }
        const { error: updErr } = await supabase.auth.updateUser({ password });
        if (updErr) throw updErr;
        toast({ title: "Passwort aktualisiert" });
      }
      setOtpSent(false);
      setOtp("");
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneReset = async () => {
    if (!phone) {
      toast({ title: "Nummer eingeben", description: "Bitte gib zuerst deine Telefonnummer ein.", variant: "destructive" });
      return;
    }
    try {
      const phoneE164 = normalizePhone(phone);
      // Send a recovery OTP via SMS
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
      if (error) throw error;
      setOtpMode("recovery");
      setOtpSent(true);
      setPassword("");
      toast({ title: "Code gesendet", description: "Bestätige per SMS und setze ein neues Passwort." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      GoogleAuth.initialize({
        clientId: "348302225955-ehusea1m68cufui0tud2sv9b3e8b0qa9.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        grantOfflineAccess: false,
      });
    } catch (err) {
      console.error("GoogleAuth init failed", err);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">life.</h1>
          <p className="text-sm text-muted-foreground">
            Dein Raum für Produktivität & Gemeinschaft
          </p>
        </div>

        {/* Google */}
        <Button variant="outline" className="w-full h-12 rounded-xl text-sm font-medium" onClick={handleGoogleLogin}>
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Mit Google fortfahren
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">oder</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Method Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary">
          <button
            type="button"
            onClick={() => { setMethod("email"); setOtpSent(false); }}
            className={`h-9 rounded-lg text-sm font-medium transition ${method === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            E-Mail
          </button>
          <button
            type="button"
            onClick={() => { setMethod("phone"); setOtpSent(false); }}
            className={`h-9 rounded-lg text-sm font-medium transition ${method === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Telefon
          </button>
        </div>

        {/* Email Form */}
        {method === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground"
              />
              <Input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-medium">
              {loading ? "..." : isLogin ? "Anmelden" : "Registrieren"}
            </Button>
            {isLogin && (
              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: "E-Mail eingeben", description: "Bitte gib zuerst deine E-Mail ein.", variant: "destructive" });
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) {
                      toast({ title: "Fehler", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "E-Mail gesendet", description: "Prüfe dein Postfach für den Reset-Link." });
                    }
                  }}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  Passwort vergessen?
                </button>
              </p>
            )}
          </form>
        )}

        {/* Phone Form */}
        {method === "phone" && !otpSent && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="tel"
                placeholder="Telefon (+491701234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground"
              />
              <Input
                type="password"
                placeholder={isLogin ? "Passwort (optional, sonst SMS-Code)" : "Passwort"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isLogin}
                minLength={6}
                className="h-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-medium">
              {loading ? "..." : isLogin ? "Anmelden" : "Registrieren"}
            </Button>
            {isLogin && (
              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={handlePhoneReset}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  Passwort vergessen?
                </button>
              </p>
            )}
          </form>
        )}

        {/* OTP Verification */}
        {method === "phone" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {otpMode === "recovery"
                ? "Gib den SMS-Code und ein neues Passwort ein."
                : "Gib den SMS-Code zur Bestätigung ein."}
            </p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="SMS-Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="h-12 rounded-xl bg-secondary border-0 text-center tracking-widest"
            />
            {otpMode === "recovery" && (
              <Input
                type="password"
                placeholder="Neues Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-secondary border-0"
              />
            )}
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl">
              {loading ? "..." : "Bestätigen"}
            </Button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(""); }}
              className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              Abbrechen
            </button>
          </form>
        )}

        {/* Toggle */}
        {!otpSent && (
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Noch kein Account?" : "Bereits registriert?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {isLogin ? "Registrieren" : "Anmelden"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
