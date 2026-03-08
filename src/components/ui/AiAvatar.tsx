import React, { Suspense, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface AiAvatarProps {
  isActive: boolean;
  volume: number;
  onClick: () => void;
  isLoading?: boolean;
}

/* ── Animated Eye with Blinking ───────────────────────────── */
function Eye({ position, isActive, volume }: { position: [number, number, number]; isActive: boolean; volume: number }) {
  const irisRef = useRef<THREE.Group>(null!);
  const pupilRef = useRef<THREE.Mesh>(null!);
  const lidRef = useRef<THREE.Mesh>(null!);
  const blinkTimer = useRef(0);
  const blinkState = useRef(0); // 0 = open, 1 = closing, 2 = opening

  const irisColor = useMemo(() => new THREE.Color('hsl(195, 85%, 45%)'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Blinking logic
    blinkTimer.current += state.clock.getDelta();
    if (blinkState.current === 0 && blinkTimer.current > 3 + Math.random() * 2) {
      blinkState.current = 1;
      blinkTimer.current = 0;
    }
    if (blinkState.current === 1) {
      lidRef.current.scale.y = THREE.MathUtils.lerp(lidRef.current.scale.y, 1.2, 0.35);
      if (lidRef.current.scale.y > 1.15) blinkState.current = 2;
    } else if (blinkState.current === 2) {
      lidRef.current.scale.y = THREE.MathUtils.lerp(lidRef.current.scale.y, 0, 0.2);
      if (lidRef.current.scale.y < 0.05) {
        lidRef.current.scale.y = 0;
        blinkState.current = 0;
        blinkTimer.current = 0;
      }
    }

    // Subtle eye look-around
    if (irisRef.current) {
      irisRef.current.position.x = Math.sin(t * 0.5) * 0.012;
      irisRef.current.position.y = Math.cos(t * 0.7) * 0.008;
    }

    // Pupil dilation based on activity
    if (pupilRef.current) {
      const targetScale = isActive ? 0.9 + volume * 0.3 : 0.75;
      pupilRef.current.scale.setScalar(
        THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.1)
      );
    }
  });

  return (
    <group position={position}>
      {/* Eyeball */}
      <Sphere args={[0.13, 32, 32]}>
        <meshStandardMaterial color="#f0f0f0" roughness={0.15} metalness={0.05} />
      </Sphere>
      {/* Iris */}
      <group ref={irisRef}>
        <Sphere args={[0.075, 32, 32]} position={[0, 0, 0.095]}>
          <meshStandardMaterial
            color={irisColor}
            emissive={irisColor}
            emissiveIntensity={isActive ? 0.6 + volume * 1.5 : 0.2}
            roughness={0.2}
            metalness={0.1}
          />
        </Sphere>
        {/* Pupil */}
        <Sphere ref={pupilRef} args={[0.035, 24, 24]} position={[0, 0, 0.125]}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
        </Sphere>
        {/* Eye highlight / specular dot */}
        <Sphere args={[0.018, 16, 16]} position={[0.025, 0.025, 0.14]}>
          <meshStandardMaterial
            color="white"
            emissive="white"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </Sphere>
      </group>
      {/* Eyelid (for blinking) */}
      <mesh ref={lidRef} position={[0, 0.06, 0.06]} scale={[1, 0, 1]}>
        <sphereGeometry args={[0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="hsl(195, 50%, 38%)" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ── Eyebrow ──────────────────────────────────────────────── */
function Eyebrow({ position, mirrorX, isActive, volume }: { position: [number, number, number]; mirrorX?: boolean; isActive: boolean; volume: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      const raise = isActive ? 0.02 + volume * 0.04 : Math.sin(t * 0.6) * 0.005;
      ref.current.position.y = position[1] + raise;
      ref.current.rotation.z = (mirrorX ? -1 : 1) * (isActive ? -0.05 - volume * 0.08 : Math.sin(t * 0.4) * 0.02);
    }
  });
  return (
    <RoundedBox ref={ref} args={[0.18, 0.035, 0.06]} radius={0.015} smoothness={4} position={position}>
      <meshStandardMaterial color="hsl(195, 45%, 30%)" roughness={0.7} />
    </RoundedBox>
  );
}

/* ── 3D Head ─────────────────────────────────────────────── */
function AvatarHead({ isActive, volume, isLoading }: { isActive: boolean; volume: number; isLoading: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const mouthTopRef = useRef<THREE.Mesh>(null!);
  const mouthBottomRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const noseRef = useRef<THREE.Mesh>(null!);
  const smoothVol = useRef(0);
  const breathRef = useRef(0);

  const skinColor = useMemo(() => new THREE.Color('hsl(195, 55%, 45%)'), []);
  const skinColorDark = useMemo(() => new THREE.Color('hsl(195, 50%, 35%)'), []);
  const glowColor = useMemo(() => new THREE.Color('hsl(200, 70%, 55%)'), []);
  const lipColor = useMemo(() => new THREE.Color('hsl(350, 40%, 45%)'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta();

    smoothVol.current = THREE.MathUtils.lerp(smoothVol.current, volume, 0.12);
    const v = smoothVol.current;

    // Breathing
    breathRef.current = Math.sin(t * 1.2) * 0.008;

    if (isLoading) {
      groupRef.current.rotation.y = t * 0.8;
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.06;
      return;
    }

    // Idle float — gentle, organic
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.08 + breathRef.current;
    groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.12;

    // Active — subtle head movement driven by voice
    if (isActive) {
      groupRef.current.rotation.z = Math.sin(t * 1.8) * 0.04 * (1 + v * 1.5);
      groupRef.current.rotation.x = Math.sin(t * 1.3) * 0.03 + v * 0.02;
    } else {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
    }

    // Mouth animation — top lip barely moves, bottom jaw drops
    if (mouthBottomRef.current) {
      const jawDrop = isActive ? v * 0.08 : 0;
      mouthBottomRef.current.position.y = THREE.MathUtils.lerp(
        mouthBottomRef.current.position.y, -0.32 - jawDrop, 0.15
      );
      mouthBottomRef.current.scale.x = THREE.MathUtils.lerp(
        mouthBottomRef.current.scale.x, 1 + v * 0.3, 0.12
      );
    }
    if (mouthTopRef.current) {
      mouthTopRef.current.scale.x = THREE.MathUtils.lerp(
        mouthTopRef.current.scale.x, 1 + v * 0.15, 0.1
      );
    }

    // Outer glow
    if (glowRef.current) {
      const glowScale = isActive ? 1.2 + v * 0.4 : 1.12 + Math.sin(t * 0.8) * 0.03;
      glowRef.current.scale.setScalar(
        THREE.MathUtils.lerp(glowRef.current.scale.x, glowScale, 0.06)
      );
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity, isActive ? 0.3 + v * 0.5 : 0.15, 0.08
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient glow sphere */}
      <Sphere ref={glowRef} args={[1.1, 32, 32]} scale={1.12}>
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.06}
          emissive={glowColor}
          emissiveIntensity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Head — slightly elongated vertically for realism */}
      <Sphere args={[1, 48, 48]} scale={[0.92, 1.02, 0.95]}>
        <meshStandardMaterial
          color={skinColor}
          metalness={0.15}
          roughness={0.55}
          emissive={skinColor}
          emissiveIntensity={0.05}
        />
      </Sphere>

      {/* Forehead ridge — subtle geometry */}
      <Sphere args={[0.5, 32, 16]} position={[0, 0.55, 0.6]} scale={[1.5, 0.35, 0.5]}>
        <meshStandardMaterial color={skinColor} metalness={0.15} roughness={0.55} />
      </Sphere>

      {/* Cheeks */}
      <Sphere args={[0.22, 24, 24]} position={[-0.55, -0.1, 0.6]}>
        <meshStandardMaterial color={skinColor} roughness={0.6} metalness={0.1} />
      </Sphere>
      <Sphere args={[0.22, 24, 24]} position={[0.55, -0.1, 0.6]}>
        <meshStandardMaterial color={skinColor} roughness={0.6} metalness={0.1} />
      </Sphere>

      {/* Eye sockets — slight indentations */}
      <Sphere args={[0.19, 24, 24]} position={[-0.3, 0.2, 0.78]}>
        <meshStandardMaterial color={skinColorDark} roughness={0.7} />
      </Sphere>
      <Sphere args={[0.19, 24, 24]} position={[0.3, 0.2, 0.78]}>
        <meshStandardMaterial color={skinColorDark} roughness={0.7} />
      </Sphere>

      {/* Eyes */}
      <Eye position={[-0.3, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} />
      <Eye position={[0.3, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} />

      {/* Eyebrows */}
      <Eyebrow position={[-0.3, 0.42, 0.82]} isActive={isActive} volume={smoothVol.current} />
      <Eyebrow position={[0.3, 0.42, 0.82]} mirrorX isActive={isActive} volume={smoothVol.current} />

      {/* Nose — subtle bridge + tip */}
      <group ref={noseRef}>
        <RoundedBox args={[0.08, 0.18, 0.12]} radius={0.04} smoothness={4} position={[0, 0.02, 0.92]}>
          <meshStandardMaterial color={skinColor} roughness={0.5} metalness={0.1} />
        </RoundedBox>
        <Sphere args={[0.065, 24, 24]} position={[0, -0.08, 0.96]}>
          <meshStandardMaterial color={skinColor} roughness={0.5} metalness={0.1} />
        </Sphere>
        {/* Nostrils */}
        <Sphere args={[0.025, 16, 16]} position={[-0.04, -0.1, 0.94]}>
          <meshStandardMaterial color={skinColorDark} roughness={0.8} />
        </Sphere>
        <Sphere args={[0.025, 16, 16]} position={[0.04, -0.1, 0.94]}>
          <meshStandardMaterial color={skinColorDark} roughness={0.8} />
        </Sphere>
      </group>

      {/* Upper lip */}
      <RoundedBox
        ref={mouthTopRef}
        args={[0.28, 0.04, 0.08]}
        radius={0.02}
        smoothness={4}
        position={[0, -0.27, 0.9]}
      >
        <meshStandardMaterial color={lipColor} roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Lower lip / jaw */}
      <RoundedBox
        ref={mouthBottomRef}
        args={[0.24, 0.045, 0.07]}
        radius={0.02}
        smoothness={4}
        position={[0, -0.32, 0.88]}
      >
        <meshStandardMaterial color={lipColor} roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Mouth interior (dark, visible when jaw drops) */}
      <Sphere args={[0.1, 16, 16]} position={[0, -0.29, 0.82]} scale={[1.8, 0.5, 0.6]}>
        <meshStandardMaterial color="#1a0a0a" roughness={0.9} />
      </Sphere>

      {/* Chin */}
      <Sphere args={[0.18, 24, 24]} position={[0, -0.58, 0.65]}>
        <meshStandardMaterial color={skinColor} roughness={0.55} metalness={0.1} />
      </Sphere>

      {/* Ears */}
      <group position={[-0.88, 0.05, 0]}>
        <Sphere args={[0.14, 16, 16]} scale={[0.4, 1, 0.7]}>
          <meshStandardMaterial color={skinColor} roughness={0.6} metalness={0.1} />
        </Sphere>
      </group>
      <group position={[0.88, 0.05, 0]}>
        <Sphere args={[0.14, 16, 16]} scale={[0.4, 1, 0.7]}>
          <meshStandardMaterial color={skinColor} roughness={0.6} metalness={0.1} />
        </Sphere>
      </group>

      {/* Subtle tech accent — glowing forehead gem */}
      <Sphere args={[0.045, 24, 24]} position={[0, 0.68, 0.78]}>
        <meshStandardMaterial
          color="white"
          emissive={new THREE.Color('hsl(195, 90%, 60%)')}
          emissiveIntensity={isActive ? 1.5 : 0.6}
          transparent
          opacity={0.9}
        />
      </Sphere>
    </group>
  );
}

/* ── Wrapper ─────────────────────────────────────────────── */
const AiAvatar: React.FC<AiAvatarProps> = ({ isActive, volume, onClick, isLoading = false }) => {
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
          camera={{ position: [0, 0, 3.5], fov: 38 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 3, 5]} intensity={1.0} color="hsl(200, 60%, 80%)" />
          <pointLight position={[-3, 1, 4]} intensity={0.5} color="hsl(195, 80%, 60%)" />
          <pointLight position={[3, -2, 3]} intensity={0.3} color="hsl(220, 50%, 55%)" />
          {/* Rim light for depth */}
          <pointLight position={[0, 0, -3]} intensity={0.4} color="hsl(200, 70%, 50%)" />

          <AvatarHead isActive={isActive} volume={volume} isLoading={isLoading} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default AiAvatar;
