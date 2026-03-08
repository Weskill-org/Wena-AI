import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface AiAvatarProps {
  isActive: boolean;
  volume: number;
  onClick: () => void;
  isLoading?: boolean;
}

/* ── 3D Head ─────────────────────────────────────────────── */
function AvatarHead({
  isActive,
  volume,
  isLoading,
}: {
  isActive: boolean;
  volume: number;
  isLoading: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const mouthRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const leftEyeRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rightEyeRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Smooth volume for mouth
  const smoothVol = useRef(0);

  const headColor = useMemo(() => new THREE.Color('hsl(190, 80%, 50%)'), []);
  const glowColor = useMemo(() => new THREE.Color('hsl(270, 60%, 55%)'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Smooth volume lerp
    smoothVol.current = THREE.MathUtils.lerp(smoothVol.current, volume, 0.15);
    const v = smoothVol.current;

    // ── Loading state: slow spin ──
    if (isLoading) {
      groupRef.current.rotation.y = t * 1.2;
      groupRef.current.position.y = Math.sin(t * 2) * 0.08;
      return;
    }

    // ── Idle float ──
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.12;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;

    // ── Active head tilt based on volume ──
    if (isActive) {
      groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.06 * (1 + v * 2);
      groupRef.current.rotation.x = Math.sin(t * 1.1) * 0.04;
    } else {
      groupRef.current.rotation.z = 0;
      groupRef.current.rotation.x = 0;
    }

    // ── Mouth ──
    if (mouthRef.current) {
      const mouthOpen = isActive ? 0.06 + v * 0.35 : 0.06;
      mouthRef.current.scale.y = THREE.MathUtils.lerp(
        mouthRef.current.scale.y,
        mouthOpen / 0.06,
        0.2
      );
    }

    // ── Eye emissive ──
    const eyeIntensity = isActive ? 0.6 + v * 2.5 : 0.3;
    if (leftEyeRef.current) leftEyeRef.current.emissiveIntensity = eyeIntensity;
    if (rightEyeRef.current) rightEyeRef.current.emissiveIntensity = eyeIntensity;

    // ── Outer glow ──
    if (glowRef.current) {
      const glowScale = isActive ? 1.35 + v * 0.6 : 1.25 + Math.sin(t) * 0.05;
      glowRef.current.scale.setScalar(
        THREE.MathUtils.lerp(glowRef.current.scale.x, glowScale, 0.08)
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[1, 32, 32]} scale={1.25}>
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          emissive={glowColor}
          emissiveIntensity={0.4}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Head */}
      <Sphere args={[1, 48, 48]}>
        <meshStandardMaterial
          color={headColor}
          metalness={0.35}
          roughness={0.4}
          emissive={headColor}
          emissiveIntensity={0.15}
        />
      </Sphere>

      {/* Left Eye */}
      <Sphere args={[0.14, 24, 24]} position={[-0.32, 0.22, 0.88]}>
        <meshStandardMaterial
          ref={leftEyeRef}
          color="white"
          emissive={new THREE.Color('hsl(180, 100%, 80%)')}
          emissiveIntensity={0.3}
        />
      </Sphere>

      {/* Right Eye */}
      <Sphere args={[0.14, 24, 24]} position={[0.32, 0.22, 0.88]}>
        <meshStandardMaterial
          ref={rightEyeRef}
          color="white"
          emissive={new THREE.Color('hsl(180, 100%, 80%)')}
          emissiveIntensity={0.3}
        />
      </Sphere>

      {/* Mouth */}
      <RoundedBox
        ref={mouthRef}
        args={[0.35, 0.06, 0.1]}
        radius={0.03}
        smoothness={4}
        position={[0, -0.25, 0.92]}
      >
        <meshStandardMaterial
          color={new THREE.Color('hsl(200, 90%, 35%)')}
          emissive={new THREE.Color('hsl(190, 80%, 50%)')}
          emissiveIntensity={0.5}
        />
      </RoundedBox>

      {/* Antenna / top accent */}
      <Sphere args={[0.08, 16, 16]} position={[0, 1.12, 0]}>
        <meshStandardMaterial
          color="white"
          emissive={new THREE.Color('hsl(270, 80%, 70%)')}
          emissiveIntensity={1}
        />
      </Sphere>
      <RoundedBox
        args={[0.04, 0.2, 0.04]}
        radius={0.02}
        smoothness={2}
        position={[0, 1.0, 0]}
      >
        <meshStandardMaterial color={headColor} metalness={0.6} roughness={0.3} />
      </RoundedBox>
    </group>
  );
}

/* ── Wrapper ─────────────────────────────────────────────── */
const AiAvatar: React.FC<AiAvatarProps> = ({
  isActive,
  volume,
  onClick,
  isLoading = false,
}) => {
  return (
    <div
      className="w-48 h-48 md:w-56 md:h-56 cursor-pointer select-none"
      onClick={onClick}
      role="button"
      aria-label={isActive ? 'Stop voice session' : 'Start voice session'}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-400/40 border-t-cyan-400 animate-spin" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 3.8], fov: 40 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 3, 5]} intensity={1.2} color="hsl(190, 80%, 60%)" />
          <pointLight position={[-3, -2, 4]} intensity={0.6} color="hsl(270, 60%, 60%)" />

          <AvatarHead isActive={isActive} volume={volume} isLoading={isLoading} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default AiAvatar;
