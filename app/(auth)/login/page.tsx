"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { BarChart3, Eye, EyeOff, Lock, Mail, Plane, ShieldCheck, Users } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoginScene from "@/components/system/LoginScene";
import { useToast } from "@/components/ui/Toast";
import DemoAccountButtons from "@/components/auth/DemoAccountButtons";
import { useAuthStore } from "@/lib/stores/authStore";
import { landingFor } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

const FEATURES = [
  { icon: ShieldCheck, text: "Every sale verified before it's posted" },
  { icon: Users, text: "Role-based access for staff, accounts, and management" },
  { icon: BarChart3, text: "Real-time dashboards and a complete audit trail" },
];

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // GSAP entrance choreography: headline → feature rows → form card. gsap.context scopes
  // the selector queries to heroRef and its cleanup reverts every tween on unmount.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduceMotion) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(headlineRef.current, { opacity: 0, y: 26, duration: 0.7 })
        .from(".login-feature-row", { opacity: 0, x: -18, stagger: 0.12, duration: 0.5 }, "-=0.3")
        .from(cardRef.current, { opacity: 0, y: 22, scale: 0.97, duration: 0.6 }, "-=0.55");
    }, heroRef);
    return () => ctx.revert();
  }, []);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setEmailError(undefined);
    setPasswordError(undefined);
    try {
      const user = await login(loginEmail, loginPassword);
      toast.success("Welcome back", user.name);
      router.push(landingFor(user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setPasswordError(message);
      toast.error("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextEmailError = email.trim() ? undefined : "Email is required.";
    const nextPasswordError = password ? undefined : "Password is required.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;
    void performLogin(email.trim(), password);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---------------- Left hero ---------------- */}
      <div
        ref={heroRef}
        className="relative flex shrink-0 items-center overflow-hidden px-8 py-10 lg:w-1/2 lg:px-16 lg:py-0"
        style={{ background: "var(--grad-login)", minHeight: "clamp(220px, 32vh, 100vh)" }}
      >
        <LoginScene />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 top-10 hidden h-72 w-72 rounded-full bg-primary-400/15 blur-3xl lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 hidden h-64 w-64 rounded-full bg-secondary-500/20 blur-3xl lg:block"
        />

        <div className="relative z-10 w-full max-w-md">
          <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-lg">
            <Plane className="h-5 w-5" />
          </span>
          <h1 ref={headlineRef} className="font-display text-3xl font-bold leading-tight text-white lg:text-4xl">
            Every sale.
            <br />
            <span className="text-grad-aurora">Verified. Posted.</span>
          </h1>
          <p className="mt-3 text-sm text-white/70">
            TravelDesk Pro keeps every booking, payment, and approval in one auditable system.
          </p>

          <div className="mt-10 hidden flex-col gap-4 lg:flex">
            {FEATURES.map((feature) => (
              <div key={feature.text} className="login-feature-row flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <feature.icon className="h-4 w-4" />
                </span>
                <p className="text-sm text-white/80">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- Right form ---------------- */}
      <div className="flex flex-1 items-center justify-center bg-bg px-6 py-10">
        <div ref={cardRef} className="w-full max-w-[420px]">
        <Card glass className="p-8">
          <h2 className="font-display text-2xl font-bold text-ink">Welcome back</h2>
          <p className="mt-1 text-sm text-inkMuted">Sign in to your TravelDesk Pro account.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              error={emailError}
              required
            />

            <div className="w-full">
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn("input pl-10 pr-10", passwordError && "input-error")}
                  aria-invalid={!!passwordError}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-inkMuted hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1 text-xs text-danger-600">{passwordError}</p>}
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-wide text-inkMuted">Quick demo access</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <DemoAccountButtons onSelect={performLogin} disabled={loading} />
        </Card>
        </div>
      </div>
    </div>
  );
}
