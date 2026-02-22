"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { authClient } from "@/lib/auth-client";
import { AtSignIcon, ChevronLeftIcon, Loader2Icon, LockIcon, UserIcon, GlobeIcon, CheckIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type React from "react";
import { FloatingPaths } from "@/components/floating-paths";
import { useTranslation } from "react-i18next";

type AuthStep = "language" | "auth";
type AuthMode = "login" | "register";

const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
] as const;

type AuthPageProps = {
  onAuthenticated?: () => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<AuthStep>("language");
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language.startsWith("hi") ? "hi" : "en");
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, isPending: isCheckingSession } = authClient.useSession();
  const user = session?.user ?? null;

  // Auto-advance to auth step when user is already logged in
  useEffect(() => {
    if (step === "language" && user && !isCheckingSession) {
      setStep("auth");
    }
  }, [step, user, isCheckingSession]);

  const onLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  const onLanguageContinue = () => {
    i18n.changeLanguage(selectedLanguage);
    setStep("auth");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "register" && name.trim().length < 2) {
      setError(t("auth.name_min_error"));
      return;
    }

    setIsSubmitting(true);

    try {
      const authResult =
        mode === "register"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(({ language: selectedLanguage }) as any),
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
            });

      if (authResult.error) {
        setError(authResult.error.message ?? t("auth.auth_failed"));
        return;
      }

      setPassword("");
      if (mode === "register") {
        setName("");
      }
      onAuthenticated?.();
    } catch {
      setError(t("auth.server_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLogout = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message ?? t("auth.sign_out_failed"));
      }
    } catch {
      setError(t("auth.sign_out_failed"));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-e bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <Logo className="me-auto h-5" />

        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;{t("auth.quote")}&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              {t("auth.quote_author")}
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="-z-10 absolute inset-0 isolate opacity-60 contain-strict"
        >
          <div className="-translate-y-87.5 absolute top-0 end-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 end-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="-translate-y-87.5 absolute top-0 end-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>

        {/* Language Selection Step */}
        {step === "language" && !user && !isCheckingSession && (
          <div className="mx-auto space-y-6 sm:w-sm">
            <Logo className="h-5 lg:hidden" />
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <GlobeIcon className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-2xl tracking-wide">
                  {t("language_select.title")}
                </h1>
              </div>
              <p className="text-base text-muted-foreground">
                {t("language_select.subtitle")}
              </p>
            </div>

            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onLanguageSelect(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-start transition-all ${
                    selectedLanguage === lang.code
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium">{lang.nativeLabel}</p>
                    {lang.nativeLabel !== lang.label && (
                      <p className="text-muted-foreground text-xs">{lang.label}</p>
                    )}
                  </div>
                  {selectedLanguage === lang.code && (
                    <CheckIcon className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={onLanguageContinue}
            >
              {t("language_select.continue")}
            </Button>
          </div>
        )}

        {/* Auth Step */}
        {step === "auth" && (
          <>
            <Button
              className="absolute top-7 start-5"
              variant="ghost"
              type="button"
              onClick={() => setStep("language")}
            >
              <ChevronLeftIcon />
              {t("auth.home")}
            </Button>
            <div className="mx-auto space-y-4 sm:w-sm">
              <Logo className="h-5 lg:hidden" />
              <div className="flex flex-col space-y-1">
                <h1 className="font-bold text-2xl tracking-wide">
                  {user ? t("auth.signed_in") : t("auth.sign_in_or_join")}
                </h1>
                <p className="text-base text-muted-foreground">
                  {user
                    ? t("auth.session_active")
                    : t("auth.login_or_create")}
                </p>
              </div>

              {!user && !isCheckingSession && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={mode === "login" ? "default" : "outline"}
                      onClick={() => setMode("login")}
                    >
                      {t("auth.sign_in")}
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "register" ? "default" : "outline"}
                      onClick={() => setMode("register")}
                    >
                      {t("auth.register")}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" size="lg" type="button" disabled>
                      <GoogleIcon />
                      {t("auth.google_soon")}
                    </Button>
                  </div>

                  <div className="flex w-full items-center justify-center">
                    <div className="h-px w-full bg-border" />
                    <span className="px-2 text-muted-foreground text-xs">{t("auth.or")}</span>
                    <div className="h-px w-full bg-border" />
                  </div>

                  <form className="space-y-2" onSubmit={onSubmit}>
                    <p className="text-start text-muted-foreground text-xs">
                      {mode === "register"
                        ? t("auth.create_prompt")
                        : t("auth.login_prompt")}
                    </p>

                    {mode === "register" && (
                      <InputGroup>
                        <InputGroupInput
                          placeholder={t("auth.full_name")}
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                        <InputGroupAddon>
                          <UserIcon />
                        </InputGroupAddon>
                      </InputGroup>
                    )}

                    <InputGroup>
                      <InputGroupInput
                        placeholder={t("auth.email_placeholder")}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <InputGroupAddon>
                        <AtSignIcon />
                      </InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                      <InputGroupInput
                        type="password"
                        placeholder={t("auth.password")}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <InputGroupAddon>
                        <LockIcon />
                      </InputGroupAddon>
                    </InputGroup>

                    {error && <p className="text-destructive text-sm">{error}</p>}

                    <Button className="w-full" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2Icon className="animate-spin" />
                          {t("auth.processing")}
                        </>
                      ) : mode === "register" ? (
                        t("auth.create_account")
                      ) : (
                        t("auth.continue_email")
                      )}
                    </Button>
                  </form>

                  <p className="mt-8 text-muted-foreground text-sm">
                    {t("auth.terms_agree")}{" "}
                    <a
                      className="underline underline-offset-4 hover:text-primary"
                      href="#"
                    >
                      {t("auth.terms_of_service")}
                    </a>{" "}
                    {t("auth.and")}{" "}
                    <a
                      className="underline underline-offset-4 hover:text-primary"
                      href="#"
                    >
                      {t("auth.privacy_policy")}
                    </a>
                    .
                  </p>
                </>
              )}

              {isCheckingSession && (
                <div className="flex items-center justify-center gap-2 rounded-md border p-6 text-muted-foreground text-sm">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  {t("auth.checking_session")}
                </div>
              )}

              {user && (
                <div className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
                  <p className="font-medium">{t("auth.welcome_back", { name: user.name })}</p>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                  <Button
                    className="w-full"
                    variant="outline"
                    type="button"
                    onClick={onLogout}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <>
                        <Loader2Icon className="animate-spin" />
                        {t("auth.signing_out")}
                      </>
                    ) : (
                      t("auth.sign_out")
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Show checking session on language step too */}
        {step === "language" && isCheckingSession && (
          <div className="mx-auto sm:w-sm">
            <div className="flex items-center justify-center gap-2 rounded-md border p-6 text-muted-foreground text-sm">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              {t("auth.checking_session")}
            </div>
          </div>
        )}


      </div>
    </main>
  );
}

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);
