"use client";

import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PRIMARY = "#38B6BC";
const PRIMARY_DIM = "#0E7C86";
const ACCENT = "#FBB024";

function DestinationDots({ radius }: { radius: number }) {
  const points = useMemo(() => {
    // A handful of points scattered over the globe's surface — "destinations" on the
    // travel network, not a literal geo-accurate map (this is a brand moment, not data-viz).
    const count = 22;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / count));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, [radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color={ACCENT} size={0.045} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function Globe({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduceMotion) return;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12;
    if (innerRef.current) innerRef.current.rotation.y -= delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshBasicMaterial color={PRIMARY} wireframe transparent opacity={0.35} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshBasicMaterial color={PRIMARY_DIM} wireframe transparent opacity={0.2} />
      </mesh>
      <group ref={innerRef}>
        <DestinationDots radius={1.62} />
      </group>
    </group>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    // WebGL can be unavailable in some environments (headless CI, locked-down browsers) —
    // the rest of the login page must keep working either way, so this just renders
    // nothing rather than taking the whole hero panel down.
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/** Ambient 3D globe for the login hero — a brand moment on a light, low-density page (per the chosen redesign scope: 3D stays off tables/forms/CRUD screens). */
export default function LoginScene() {
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90">
      <SceneErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <Globe reduceMotion={reduceMotion} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
