import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, RoundedBox, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

interface AiAvatarProps {
  isActive: boolean;
  volume: number;
  onClick: () => void;
  isLoading?: boolean;
}

/* ── Custom Skin Shader Material ─────────────────────────── */
function SkinMaterial({ color, roughness = 0.45, subsurface = 0.3, emissiveIntensity = 0.02 }: {
  color: THREE.Color | string;
  roughness?: number;
  subsurface?: number;
  emissiveIntensity?: number;
}) {
  const col = useMemo(() => typeof color === 'string' ? new THREE.Color(color) : color, [color]);
  const warmTint = useMemo(() => new THREE.Color('#ff9966').multiplyScalar(subsurface), [subsurface]);

  return (
    <meshPhysicalMaterial
      color={col}
      roughness={roughness}
      metalness={0.02}
      clearcoat={0.15}
      clearcoatRoughness={0.6}
      sheen={0.4}
      sheenColor={warmTint}
      sheenRoughness={0.5}
      emissive={col}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

/* ── Animated Eye with Blinking ───────────────────────────── */
function Eye({ position, isActive, volume, isSleeping }: { position: [number, number, number]; isActive: boolean; volume: number; isSleeping?: boolean }) {
  const irisRef = useRef<THREE.Group>(null!);
  const pupilRef = useRef<THREE.Mesh>(null!);
  const upperLidRef = useRef<THREE.Mesh>(null!);
  const lowerLidRef = useRef<THREE.Mesh>(null!);
  const blinkTimer = useRef(0);
  const blinkState = useRef(0);

  const irisColor = useMemo(() => new THREE.Color('#2d8fad'), []);
  const irisRing = useMemo(() => new THREE.Color('#1a6680'), []);
  const skinTone = useMemo(() => new THREE.Color('#d4a574'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta();

    // Sleeping: eyes fully closed — lids cover entire eye
    if (isSleeping) {
      upperLidRef.current.scale.y = THREE.MathUtils.lerp(upperLidRef.current.scale.y, 2.5, 0.12);
      lowerLidRef.current.scale.y = THREE.MathUtils.lerp(lowerLidRef.current.scale.y, 1.8, 0.12);
      // Hide iris group behind lids
      if (irisRef.current) {
        irisRef.current.position.z = THREE.MathUtils.lerp(irisRef.current.position.z, 0.02, 0.1);
      }
      if (pupilRef.current) {
        pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, 0.3, 0.05));
      }
      return;
    }
    // When waking up, reset iris z
    if (irisRef.current && irisRef.current.position.z < 0.05) {
      irisRef.current.position.z = THREE.MathUtils.lerp(irisRef.current.position.z, 0.088, 0.05);
    }

    // Realistic blinking — ~every 3-5 seconds, fast close, slower open
    blinkTimer.current += dt;
    if (blinkState.current === 0 && blinkTimer.current > 2.5 + Math.random() * 3) {
      blinkState.current = 1;
      blinkTimer.current = 0;
    }
    if (blinkState.current === 1) {
      upperLidRef.current.scale.y = THREE.MathUtils.lerp(upperLidRef.current.scale.y, 1.3, 0.45);
      lowerLidRef.current.scale.y = THREE.MathUtils.lerp(lowerLidRef.current.scale.y, 0.8, 0.35);
      if (upperLidRef.current.scale.y > 1.2) blinkState.current = 2;
    } else if (blinkState.current === 2) {
      upperLidRef.current.scale.y = THREE.MathUtils.lerp(upperLidRef.current.scale.y, 0, 0.18);
      lowerLidRef.current.scale.y = THREE.MathUtils.lerp(lowerLidRef.current.scale.y, 0, 0.15);
      if (upperLidRef.current.scale.y < 0.05) {
        upperLidRef.current.scale.y = 0;
        lowerLidRef.current.scale.y = 0;
        blinkState.current = 0;
        blinkTimer.current = 0;
      }
    }

    // Subtle saccadic eye movement (micro-saccades for realism)
    if (irisRef.current) {
      const saccade = Math.sin(t * 8) * 0.001 + Math.sin(t * 0.3) * 0.015;
      irisRef.current.position.x = saccade;
      irisRef.current.position.y = Math.cos(t * 0.5) * 0.008 + Math.sin(t * 6) * 0.001;
    }

    // Pupil dilation
    if (pupilRef.current) {
      const targetScale = isActive ? 0.95 + volume * 0.25 : 0.7;
      pupilRef.current.scale.setScalar(
        THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.08)
      );
    }
  });

  return (
    <group position={position}>
      {/* Eyeball — slightly glossy wet look */}
      <Sphere args={[0.125, 48, 48]}>
        <meshPhysicalMaterial
          color="#f5f0ea"
          roughness={0.05}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          sheen={0}
        />
      </Sphere>

      {/* Sclera blood vessel hint (very subtle red tint ring) */}
      <Sphere args={[0.126, 32, 32]} scale={[1, 1, 0.5]}>
        <meshStandardMaterial color="#eee0d8" transparent opacity={0.15} roughness={0.3} />
      </Sphere>

      {/* Iris group */}
      <group ref={irisRef}>
        {/* Iris — outer ring darker */}
        <Sphere args={[0.072, 48, 48]} position={[0, 0, 0.088]}>
          <meshPhysicalMaterial
            color={irisRing}
            roughness={0.15}
            metalness={0.05}
            clearcoat={0.8}
            emissive={irisColor}
            emissiveIntensity={isActive ? 0.4 + volume * 0.8 : 0.1}
          />
        </Sphere>

        {/* Iris — inner lighter part */}
        <Sphere args={[0.055, 48, 48]} position={[0, 0, 0.095]}>
          <meshPhysicalMaterial
            color={irisColor}
            roughness={0.1}
            metalness={0.05}
            clearcoat={0.9}
            emissive={irisColor}
            emissiveIntensity={isActive ? 0.5 + volume * 1.0 : 0.15}
          />
        </Sphere>

        {/* Pupil */}
        <Sphere ref={pupilRef} args={[0.032, 32, 32]} position={[0, 0, 0.115]}>
          <meshStandardMaterial color="#050505" roughness={0.3} metalness={0} />
        </Sphere>

        {/* Eye specular highlights — two dots for realism */}
        <Sphere args={[0.014, 16, 16]} position={[0.02, 0.02, 0.13]}>
          <meshStandardMaterial
            color="white"
            emissive="white"
            emissiveIntensity={1.2}
            transparent
            opacity={0.95}
          />
        </Sphere>
        <Sphere args={[0.007, 12, 12]} position={[-0.015, -0.01, 0.13]}>
          <meshStandardMaterial
            color="white"
            emissive="white"
            emissiveIntensity={0.6}
            transparent
            opacity={0.6}
          />
        </Sphere>
      </group>

      {/* Upper eyelid */}
      <mesh ref={upperLidRef} position={[0, 0.055, 0.05]} scale={[1, 0, 1]}>
        <sphereGeometry args={[0.135, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <SkinMaterial color={skinTone} roughness={0.55} />
      </mesh>

      {/* Lower eyelid */}
      <mesh ref={lowerLidRef} position={[0, -0.055, 0.05]} scale={[1, 0, 1]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.135, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
        <SkinMaterial color={skinTone} roughness={0.55} />
      </mesh>

      {/* Eyelid crease (upper) */}
      <mesh position={[0, 0.1, 0.03]}>
        <torusGeometry args={[0.11, 0.008, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#b8906e" transparent opacity={0.3} roughness={0.8} />
      </mesh>

      {/* Eyelash hint (upper) */}
      <mesh position={[0, 0.06, 0.09]}>
        <torusGeometry args={[0.1, 0.005, 6, 24, Math.PI]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Eyebrow ──────────────────────────────────────────────── */
function Eyebrow({ position, mirrorX, isActive, volume }: { position: [number, number, number]; mirrorX?: boolean; isActive: boolean; volume: number }) {
  const ref = useRef<THREE.Group>(null!);
  const skinTone = useMemo(() => new THREE.Color('#d4a574'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      const raise = isActive ? 0.015 + volume * 0.03 : Math.sin(t * 0.6) * 0.003;
      ref.current.position.y = position[1] + raise;
      ref.current.rotation.z = (mirrorX ? -1 : 1) * (isActive ? -0.04 - volume * 0.06 : Math.sin(t * 0.4) * 0.015);
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Main brow shape — tapered */}
      <RoundedBox args={[0.2, 0.028, 0.05]} radius={0.012} smoothness={4}>
        <meshStandardMaterial color="#5a3e28" roughness={0.85} />
      </RoundedBox>
      {/* Brow ridge underneath */}
      <mesh position={[0, -0.015, 0.01]}>
        <sphereGeometry args={[0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
        <SkinMaterial color={skinTone} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ── Lips Component ─────────────────────────────────────── */
function Lips({ isActive, volume, mouthTopRef, mouthBottomRef }: {
  isActive: boolean;
  volume: number;
  mouthTopRef: React.RefObject<THREE.Mesh>;
  mouthBottomRef: React.RefObject<THREE.Mesh>;
}) {
  const lipColor = useMemo(() => new THREE.Color('#c47a6a'), []);
  const innerMouthColor = useMemo(() => new THREE.Color('#2a0808'), []);

  return (
    <group>
      {/* Upper lip — Cupid's bow shape */}
      <RoundedBox
        ref={mouthTopRef}
        args={[0.22, 0.032, 0.07]}
        radius={0.015}
        smoothness={4}
        position={[0, -0.27, 0.88]}
      >
        <meshPhysicalMaterial
          color={lipColor}
          roughness={0.3}
          metalness={0.0}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
          sheen={0.6}
          sheenColor={new THREE.Color('#ff8888')}
          sheenRoughness={0.3}
        />
      </RoundedBox>

      {/* Cupid's bow dip */}
      <Sphere args={[0.015, 16, 16]} position={[0, -0.255, 0.92]}>
        <meshPhysicalMaterial color={lipColor} roughness={0.3} clearcoat={0.3} />
      </Sphere>

      {/* Lower lip — fuller */}
      <RoundedBox
        ref={mouthBottomRef}
        args={[0.19, 0.038, 0.065]}
        radius={0.018}
        smoothness={4}
        position={[0, -0.31, 0.87]}
      >
        <meshPhysicalMaterial
          color={lipColor}
          roughness={0.25}
          metalness={0.0}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          sheen={0.7}
          sheenColor={new THREE.Color('#ff8888')}
          sheenRoughness={0.25}
        />
      </RoundedBox>

      {/* Lip line / mouth seam */}
      <mesh position={[0, -0.29, 0.91]}>
        <boxGeometry args={[0.18, 0.003, 0.02]} />
        <meshStandardMaterial color="#8a4a3a" roughness={0.8} />
      </mesh>

      {/* Mouth interior */}
      <Sphere args={[0.09, 24, 24]} position={[0, -0.29, 0.8]} scale={[1.6, 0.5, 0.5]}>
        <meshStandardMaterial color={innerMouthColor} roughness={0.95} />
      </Sphere>

      {/* Teeth hint — barely visible */}
      <mesh position={[0, -0.275, 0.84]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color="#f0ebe0" roughness={0.3} metalness={0} />
      </mesh>
    </group>
  );
}

/* ── Nose Component ─────────────────────────────────────── */
function Nose() {
  const skinTone = useMemo(() => new THREE.Color('#d4a574'), []);
  const shadowTone = useMemo(() => new THREE.Color('#b8906e'), []);

  return (
    <group>
      {/* Nose bridge */}
      <RoundedBox args={[0.065, 0.22, 0.1]} radius={0.03} smoothness={4} position={[0, 0.04, 0.9]}>
        <SkinMaterial color={skinTone} roughness={0.5} />
      </RoundedBox>

      {/* Nose tip — rounded and slightly bulbous */}
      <Sphere args={[0.06, 32, 32]} position={[0, -0.08, 0.96]}>
        <SkinMaterial color={skinTone} roughness={0.4} subsurface={0.4} />
      </Sphere>

      {/* Nose wings / alae */}
      <Sphere args={[0.035, 24, 24]} position={[-0.05, -0.07, 0.93]}>
        <SkinMaterial color={skinTone} roughness={0.5} />
      </Sphere>
      <Sphere args={[0.035, 24, 24]} position={[0.05, -0.07, 0.93]}>
        <SkinMaterial color={skinTone} roughness={0.5} />
      </Sphere>

      {/* Nostrils — darker */}
      <Sphere args={[0.018, 16, 16]} position={[-0.035, -0.09, 0.94]}>
        <meshStandardMaterial color="#6a4a3a" roughness={0.9} />
      </Sphere>
      <Sphere args={[0.018, 16, 16]} position={[0.035, -0.09, 0.94]}>
        <meshStandardMaterial color="#6a4a3a" roughness={0.9} />
      </Sphere>

      {/* Nasolabial folds (subtle shadow lines from nose to mouth) */}
      <mesh position={[-0.12, -0.16, 0.87]} rotation={[0, 0.15, -0.3]}>
        <boxGeometry args={[0.01, 0.18, 0.01]} />
        <meshStandardMaterial color={shadowTone} transparent opacity={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[0.12, -0.16, 0.87]} rotation={[0, -0.15, 0.3]}>
        <boxGeometry args={[0.01, 0.18, 0.01]} />
        <meshStandardMaterial color={shadowTone} transparent opacity={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ── Ear Component ──────────────────────────────────────── */
function Ear({ side }: { side: 'left' | 'right' }) {
  const x = side === 'left' ? -0.86 : 0.86;
  const skinTone = useMemo(() => new THREE.Color('#d4a574'), []);
  const innerTone = useMemo(() => new THREE.Color('#c49070'), []);

  return (
    <group position={[x, 0.05, -0.05]}>
      {/* Outer ear / helix */}
      <Sphere args={[0.13, 24, 24]} scale={[0.35, 1, 0.65]}>
        <SkinMaterial color={skinTone} roughness={0.55} />
      </Sphere>
      {/* Inner ear / concha */}
      <Sphere args={[0.06, 16, 16]} position={[side === 'left' ? 0.02 : -0.02, 0, 0.02]} scale={[0.3, 0.7, 0.5]}>
        <SkinMaterial color={innerTone} roughness={0.7} />
      </Sphere>
      {/* Earlobe */}
      <Sphere args={[0.04, 16, 16]} position={[0, -0.1, 0.02]}>
        <SkinMaterial color={skinTone} roughness={0.5} subsurface={0.5} />
      </Sphere>
    </group>
  );
}

/* ── Sleeping Zzz Particles ───────────────────────────────── */
function ZLetter({ delay, startX }: { delay: number; startX: number }) {
  const ref = useRef<THREE.Group>(null!);
  const timeOffset = useRef(delay);

  useFrame((state) => {
    const t = (state.clock.elapsedTime + timeOffset.current) % 4;
    const progress = t / 4;
    if (ref.current) {
      ref.current.position.x = startX + Math.sin(progress * Math.PI * 2) * 0.15;
      ref.current.position.y = 0.4 + progress * 1.2;
      ref.current.position.z = 1.0;
      const scale = 0.15 + progress * 0.25;
      ref.current.scale.setScalar(scale);
      // Fade in then out
      const opacity = progress < 0.15 ? progress / 0.15 : progress > 0.75 ? (1 - progress) / 0.25 : 1;
      const mat = ref.current.children[0] as any;
      if (mat?.material) {
        mat.material.opacity = opacity * 0.7;
      }
    }
  });

  return (
    <group ref={ref}>
      <Text
        fontSize={0.2}
        color="#4ab8d4"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        Z
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </Text>
    </group>
  );
}

function SleepingZzz() {
  return (
    <group>
      <ZLetter delay={0} startX={0.5} />
      <ZLetter delay={1.3} startX={0.6} />
      <ZLetter delay={2.6} startX={0.55} />
    </group>
  );
}

/* ── 3D Head ─────────────────────────────────────────────── */
function AvatarHead({ isActive, volume, isLoading }: { isActive: boolean; volume: number; isLoading: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const mouthTopRef = useRef<THREE.Mesh>(null!);
  const mouthBottomRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const smoothVol = useRef(0);
  const breathRef = useRef(0);

  const skinTone = useMemo(() => new THREE.Color('#d4a574'), []);
  const skinHighlight = useMemo(() => new THREE.Color('#e0b890'), []);
  const skinShadow = useMemo(() => new THREE.Color('#b8906e'), []);
  const glowColor = useMemo(() => new THREE.Color('#4ab8d4'), []);
  const isSleeping = !isActive && !isLoading;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    smoothVol.current = THREE.MathUtils.lerp(smoothVol.current, volume, 0.1);
    const v = smoothVol.current;

    // Subtle breathing
    breathRef.current = Math.sin(t * 1.0) * 0.005;

    const isSleeping = !isActive && !isLoading;

    if (isLoading) {
      groupRef.current.rotation.y = t * 0.6;
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.04;
      return;
    }

    if (isSleeping) {
      // Sleeping: slow breathing bob, head drooped forward and tilted
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y, Math.sin(t * 0.3) * 0.02 - 0.08, 0.02
      );
      // Head tilted to side and drooped forward
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0.1, 0.015);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0.15, 0.015);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.18, 0.015);
    } else {
      // Idle: gentle float
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.05 + breathRef.current;
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    }

    // Active: voice-driven micro-movements
    if (isActive) {
      groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.025 * (1 + v * 1.2);
      groupRef.current.rotation.x = Math.sin(t * 1.1) * 0.02 + v * 0.015;
    } else if (!isSleeping) {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.04);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.04);
    }

    // Mouth animation
    if (mouthBottomRef.current) {
      const jawDrop = isActive ? v * 0.07 : 0;
      mouthBottomRef.current.position.y = THREE.MathUtils.lerp(
        mouthBottomRef.current.position.y, -0.31 - jawDrop, 0.12
      );
      mouthBottomRef.current.scale.x = THREE.MathUtils.lerp(
        mouthBottomRef.current.scale.x, 1 + v * 0.2, 0.1
      );
    }
    if (mouthTopRef.current) {
      mouthTopRef.current.scale.x = THREE.MathUtils.lerp(
        mouthTopRef.current.scale.x, 1 + v * 0.1, 0.08
      );
    }

    // Ambient glow
    if (glowRef.current) {
      const glowScale = isActive ? 1.15 + v * 0.3 : 1.08 + Math.sin(t * 0.7) * 0.02;
      glowRef.current.scale.setScalar(
        THREE.MathUtils.lerp(glowRef.current.scale.x, glowScale, 0.05)
      );
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity, isActive ? 0.2 + v * 0.4 : 0.08, 0.06
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient glow sphere */}
      <Sphere ref={glowRef} args={[1.1, 32, 32]} scale={1.08}>
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.04}
          emissive={glowColor}
          emissiveIntensity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Cranium — slightly elongated vertically, wider at temples */}
      <Sphere args={[1, 64, 64]} scale={[0.9, 1.04, 0.93]}>
        <SkinMaterial color={skinTone} roughness={0.5} subsurface={0.35} />
      </Sphere>

      {/* Forehead — smooth convex */}
      <Sphere args={[0.55, 32, 32]} position={[0, 0.52, 0.55]} scale={[1.4, 0.4, 0.55]}>
        <SkinMaterial color={skinHighlight} roughness={0.4} subsurface={0.3} />
      </Sphere>

      {/* Temples — slight indentation */}
      <Sphere args={[0.15, 24, 24]} position={[-0.75, 0.3, 0.35]}>
        <SkinMaterial color={skinShadow} roughness={0.6} />
      </Sphere>
      <Sphere args={[0.15, 24, 24]} position={[0.75, 0.3, 0.35]}>
        <SkinMaterial color={skinShadow} roughness={0.6} />
      </Sphere>

      {/* Cheekbones — prominent for structure */}
      <Sphere args={[0.2, 32, 32]} position={[-0.5, -0.05, 0.65]}>
        <SkinMaterial color={skinHighlight} roughness={0.45} subsurface={0.4} />
      </Sphere>
      <Sphere args={[0.2, 32, 32]} position={[0.5, -0.05, 0.65]}>
        <SkinMaterial color={skinHighlight} roughness={0.45} subsurface={0.4} />
      </Sphere>

      {/* Cheek flesh — softer, rounder */}
      <Sphere args={[0.18, 24, 24]} position={[-0.42, -0.18, 0.7]}>
        <SkinMaterial color="#daa88a" roughness={0.55} subsurface={0.5} />
      </Sphere>
      <Sphere args={[0.18, 24, 24]} position={[0.42, -0.18, 0.7]}>
        <SkinMaterial color="#daa88a" roughness={0.55} subsurface={0.5} />
      </Sphere>

      {/* Eye sockets — subtle depth */}
      <Sphere args={[0.17, 32, 32]} position={[-0.28, 0.2, 0.76]}>
        <SkinMaterial color={skinShadow} roughness={0.65} />
      </Sphere>
      <Sphere args={[0.17, 32, 32]} position={[0.28, 0.2, 0.76]}>
        <SkinMaterial color={skinShadow} roughness={0.65} />
      </Sphere>

      {/* Eyes */}
      <Eye position={[-0.28, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} isSleeping={!isActive && !isLoading} />
      <Eye position={[0.28, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} isSleeping={!isActive && !isLoading} />

      {/* Eyebrows */}
      <Eyebrow position={[-0.28, 0.4, 0.82]} isActive={isActive} volume={smoothVol.current} />
      <Eyebrow position={[0.28, 0.4, 0.82]} mirrorX isActive={isActive} volume={smoothVol.current} />

      {/* Nose */}
      <Nose />

      {/* Lips */}
      <Lips
        isActive={isActive}
        volume={smoothVol.current}
        mouthTopRef={mouthTopRef}
        mouthBottomRef={mouthBottomRef}
      />

      {/* Philtrum (groove above upper lip) */}
      <mesh position={[0, -0.22, 0.91]}>
        <boxGeometry args={[0.03, 0.06, 0.01]} />
        <meshStandardMaterial color={skinShadow} transparent opacity={0.15} roughness={0.8} />
      </mesh>

      {/* Chin — rounded and prominent */}
      <Sphere args={[0.16, 32, 32]} position={[0, -0.55, 0.62]}>
        <SkinMaterial color={skinTone} roughness={0.5} subsurface={0.35} />
      </Sphere>
      {/* Chin dimple hint */}
      <Sphere args={[0.02, 12, 12]} position={[0, -0.52, 0.72]}>
        <meshStandardMaterial color={skinShadow} transparent opacity={0.15} roughness={0.8} />
      </Sphere>

      {/* Jawline — angular for definition */}
      <RoundedBox args={[0.12, 0.06, 0.35]} radius={0.03} smoothness={4} position={[-0.55, -0.4, 0.35]} rotation={[0, 0.4, 0.1]}>
        <SkinMaterial color={skinTone} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.06, 0.35]} radius={0.03} smoothness={4} position={[0.55, -0.4, 0.35]} rotation={[0, -0.4, -0.1]}>
        <SkinMaterial color={skinTone} roughness={0.55} />
      </RoundedBox>

      {/* Under-jaw / neck transition */}
      <Sphere args={[0.35, 24, 24]} position={[0, -0.7, 0.2]} scale={[1.2, 0.5, 0.8]}>
        <SkinMaterial color={skinShadow} roughness={0.6} />
      </Sphere>

      {/* Ears */}
      <Ear side="left" />
      <Ear side="right" />

      {/* Subtle AI indicator — soft glowing dot on temple */}
      <Sphere args={[0.02, 16, 16]} position={[-0.82, 0.25, 0.25]}>
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={isActive ? 2.0 : 0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>
      <Sphere args={[0.02, 16, 16]} position={[0.82, 0.25, 0.25]}>
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={isActive ? 2.0 : 0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Sleeping Zzz */}
      {isSleeping && <SleepingZzz />}
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
          camera={{ position: [0, 0, 3.2], fov: 36 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          style={{ background: 'transparent' }}
        >
          {/* Realistic 3-point lighting setup */}
          <ambientLight intensity={0.35} color="#ffeedd" />

          {/* Key light — warm, from upper right */}
          <directionalLight position={[3, 4, 5]} intensity={1.2} color="#fff0dd" castShadow />

          {/* Fill light — cooler, from left */}
          <directionalLight position={[-3, 1, 3]} intensity={0.4} color="#aaccee" />

          {/* Back/rim light — cool blue for edge definition */}
          <pointLight position={[0, 2, -4]} intensity={0.8} color="#6688cc" />

          {/* Under light — subtle warm bounce */}
          <pointLight position={[0, -3, 2]} intensity={0.15} color="#ffddbb" />

          {/* Specular kicker for eyes */}
          <pointLight position={[1, 1, 5]} intensity={0.3} color="#ffffff" />

          <AvatarHead isActive={isActive} volume={volume} isLoading={isLoading} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default AiAvatar;
