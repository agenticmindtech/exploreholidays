"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { useAuthStore } from "@/lib/stores/authStore";

const PARTICLE_COLOR = "#38B6BC";
const ACCENT_COLOR = "#FBB024";

// Deterministic pseudo-random hash (pure function of `seed`) — Math.random() itself is
// flagged as an impure call during render by the React Compiler's purity rule, even
// inside useMemo, since a memo function must still be idempotent per render attempt.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function FlowField({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Points>(null);
  const count = 90;

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (pseudoRandom(i) - 0.5) * 14;
      pos[i * 3 + 1] = (pseudoRandom(i + 1000) - 0.5) * 3.2;
      pos[i * 3 + 2] = (pseudoRandom(i + 2000) - 0.5) * 4;
      spd[i] = 0.2 + pseudoRandom(i + 3000) * 0.4;
    }
    return [pos, spd];
  }, []);

  useFrame((state, delta) => {
    if (reduceMotion || !groupRef.current) return;
    const posAttr = groupRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let x = posAttr.getX(i) + speeds[i] * delta;
      if (x > 7) x = -7;
      const y = Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.4 + (positions[idx + 1] % 3.2);
      posAttr.setX(i, x);
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={groupRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={PARTICLE_COLOR} size={0.06} sizeAttenuation transparent opacity={0.75} />
    </points>
  );
}

function GlowOrb({ position, color, reduceMotion }: { position: [number, number, number]; color: string; reduceMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reduceMotion || !ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.25;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.7, 24, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} />
    </mesh>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const GREETING_BY_HOUR = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

interface DashboardHeroBannerProps {
  /** e.g. "Here's what's moving across the agency today." */
  tagline: string;
}

/**
 * Slim 3D/GSAP banner for the 4 role dashboards only (per the chosen redesign scope —
 * tables/forms/CRUD screens stay flat and fast, this is the "light page" flourish).
 * Purely decorative: sits above each dashboard's existing PageHeader/filters/KPIs, which
 * are untouched.
 */
export default function DashboardHeroBanner({ tagline }: DashboardHeroBannerProps) {
  const user = useAuthStore((s) => s.user);
  const textRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(".dash-hero-line", { opacity: 0, y: 16, stagger: 0.1, duration: 0.6, ease: "power3.out" });
    }, textRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const greeting = `${GREETING_BY_HOUR(new Date().getHours())}${user ? `, ${user.name.split(" ")[0]}` : ""}`;

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl" style={{ background: "var(--grad-horizon)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <SceneErrorBoundary>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ alpha: true, antialias: true }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <FlowField reduceMotion={reduceMotion} />
              <GlowOrb position={[-4, 0.5, -1]} color={PARTICLE_COLOR} reduceMotion={reduceMotion} />
              <GlowOrb position={[4, -0.5, -1]} color={ACCENT_COLOR} reduceMotion={reduceMotion} />
            </Suspense>
          </Canvas>
        </SceneErrorBoundary>
      </div>
      <div ref={textRef} className="relative z-10 px-6 py-6 sm:px-8 sm:py-7">
        <p className="dash-hero-line font-display text-xl font-bold text-white sm:text-2xl">{greeting}</p>
        <p className="dash-hero-line mt-1 text-sm text-white/70">{tagline}</p>
      </div>
    </div>
  );
}
