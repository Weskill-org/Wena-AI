import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

interface AiAvatarProps {
  isActive: boolean;
  volume: number;
  onClick: () => void;
  isLoading?: boolean;
}

/* ── Skin Material with SSS simulation ──────────────────── */
function SkinMaterial({ color, roughness = 0.45 }: {
  color: THREE.Color | string;
  roughness?: number;
}) {
  const col = useMemo(() => typeof color === 'string' ? new THREE.Color(color) : color, [color]);
  const warmTint = useMemo(() => new THREE.Color('#e8a088'), []);

  return (
    <meshPhysicalMaterial
      color={col}
      roughness={roughness}
      metalness={0.01}
      clearcoat={0.08}
      clearcoatRoughness={0.7}
      sheen={0.5}
      sheenColor={warmTint}
      sheenRoughness={0.4}
      envMapIntensity={0.6}
    />
  );
}

/* ── Realistic Eye ──────────────────────────────────────── */
function Eye({ position, isActive, volume, isSleeping }: {
  position: [number, number, number];
  isActive: boolean;
  volume: number;
  isSleeping?: boolean;
}) {
  const irisGroupRef = useRef<THREE.Group>(null!);
  const pupilRef = useRef<THREE.Mesh>(null!);
  const upperLidRef = useRef<THREE.Mesh>(null!);
  const lowerLidRef = useRef<THREE.Mesh>(null!);
  const corneaRef = useRef<THREE.Mesh>(null!);
  const blinkTimer = useRef(0);
  const blinkPhase = useRef<'open' | 'closing' | 'opening'>('open');

  const irisColor = useMemo(() => new THREE.Color('#1a7a8a'), []);
  const irisEdge = useMemo(() => new THREE.Color('#0d4f5c'), []);
  const skinCol = useMemo(() => new THREE.Color('#c49a78'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta();

    // === Eyelid logic ===
    let upperTarget = 0;
    let lowerTarget = 0;

    if (isSleeping) {
      upperTarget = 1.6;
      lowerTarget = 1.2;
    } else {
      // Blinking
      blinkTimer.current += dt;
      if (blinkPhase.current === 'open' && blinkTimer.current > 2.8 + Math.random() * 2.5) {
        blinkPhase.current = 'closing';
        blinkTimer.current = 0;
      }
      if (blinkPhase.current === 'closing') {
        upperTarget = 1.5;
        lowerTarget = 0.7;
        if (upperLidRef.current.scale.y > 1.3) {
          blinkPhase.current = 'opening';
        }
      } else if (blinkPhase.current === 'opening') {
        upperTarget = 0;
        lowerTarget = 0;
        if (upperLidRef.current.scale.y < 0.05) {
          upperLidRef.current.scale.y = 0;
          lowerLidRef.current.scale.y = 0;
          blinkPhase.current = 'open';
          blinkTimer.current = 0;
        }
      }
    }

    const lidSpeed = blinkPhase.current === 'closing' ? 0.4 : (isSleeping ? 0.08 : 0.15);
    upperLidRef.current.scale.y = THREE.MathUtils.lerp(upperLidRef.current.scale.y, upperTarget, lidSpeed);
    lowerLidRef.current.scale.y = THREE.MathUtils.lerp(lowerLidRef.current.scale.y, lowerTarget, lidSpeed);

    // === Eye movement (micro-saccades) ===
    if (irisGroupRef.current && !isSleeping) {
      const sx = Math.sin(t * 0.4) * 0.012 + Math.sin(t * 7) * 0.002;
      const sy = Math.cos(t * 0.55) * 0.008 + Math.cos(t * 5) * 0.001;
      irisGroupRef.current.position.x = sx;
      irisGroupRef.current.position.y = sy;
    }

    // === Pupil dilation ===
    if (pupilRef.current) {
      const ps = isSleeping ? 0.5 : (isActive ? 0.85 + volume * 0.3 : 0.7);
      pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, ps, 0.06));
    }

    // === Cornea shimmer ===
    if (corneaRef.current) {
      const mat = corneaRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = isSleeping ? 0.02 : 0.12;
    }
  });

  return (
    <group position={position}>
      {/* Eyeball */}
      <Sphere args={[0.13, 48, 48]}>
        <meshPhysicalMaterial
          color="#f0ece6"
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={0.3}
        />
      </Sphere>

      {/* Iris + Pupil group */}
      <group ref={irisGroupRef}>
        {/* Iris outer ring */}
        <Sphere args={[0.065, 48, 48]} position={[0, 0, 0.09]}>
          <meshPhysicalMaterial
            color={irisEdge}
            roughness={0.12}
            metalness={0.05}
            clearcoat={0.9}
            emissive={irisColor}
            emissiveIntensity={isActive ? 0.35 + volume * 0.6 : 0.08}
            envMapIntensity={0.5}
          />
        </Sphere>

        {/* Iris inner */}
        <Sphere args={[0.048, 48, 48]} position={[0, 0, 0.1]}>
          <meshPhysicalMaterial
            color={irisColor}
            roughness={0.08}
            metalness={0.03}
            clearcoat={1}
            emissive={irisColor}
            emissiveIntensity={isActive ? 0.4 + volume * 0.8 : 0.12}
            envMapIntensity={0.6}
          />
        </Sphere>

        {/* Pupil */}
        <Sphere ref={pupilRef} args={[0.028, 32, 32]} position={[0, 0, 0.115]}>
          <meshStandardMaterial color="#020202" roughness={0.4} />
        </Sphere>

        {/* Cornea dome — transparent refraction layer */}
        <Sphere ref={corneaRef} args={[0.095, 48, 48]} position={[0, 0, 0.06]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.12}
            roughness={0}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={1.5}
            ior={1.4}
          />
        </Sphere>
      </group>

      {/* Upper eyelid */}
      <mesh ref={upperLidRef} position={[0, 0.05, 0.04]} scale={[1, 0, 1]}>
        <sphereGeometry args={[0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <SkinMaterial color={skinCol} roughness={0.55} />
      </mesh>

      {/* Lower eyelid */}
      <mesh ref={lowerLidRef} position={[0, -0.05, 0.04]} scale={[1, 0, 1]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
        <SkinMaterial color={skinCol} roughness={0.55} />
      </mesh>

      {/* Lash line hint */}
      <mesh position={[0, 0.055, 0.085]}>
        <torusGeometry args={[0.095, 0.004, 6, 24, Math.PI]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Eyebrow ──────────────────────────────────────────────── */
function Eyebrow({ position, mirrorX, isActive, volume }: {
  position: [number, number, number];
  mirrorX?: boolean;
  isActive: boolean;
  volume: number;
}) {
  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      const raise = isActive ? 0.01 + volume * 0.025 : Math.sin(t * 0.5) * 0.003;
      ref.current.position.y = position[1] + raise;
      ref.current.rotation.z = (mirrorX ? -1 : 1) * (isActive ? -0.03 - volume * 0.04 : Math.sin(t * 0.35) * 0.01);
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <capsuleGeometry args={[0.012, 0.16, 4, 12]} />
        <meshStandardMaterial color="#4a3220" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ── Lips ─────────────────────────────────────────────────── */
function Lips({ isActive, volume, mouthTopRef, mouthBottomRef }: {
  isActive: boolean;
  volume: number;
  mouthTopRef: React.RefObject<THREE.Mesh>;
  mouthBottomRef: React.RefObject<THREE.Mesh>;
}) {
  const lipColor = useMemo(() => new THREE.Color('#b86e60'), []);

  return (
    <group>
      {/* Upper lip */}
      <Sphere ref={mouthTopRef} args={[0.08, 32, 16]} position={[0, -0.28, 0.88]} scale={[1.5, 0.35, 0.7]}>
        <meshPhysicalMaterial
          color={lipColor}
          roughness={0.25}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
          sheen={0.6}
          sheenColor={new THREE.Color('#e08888')}
          sheenRoughness={0.3}
          envMapIntensity={0.4}
        />
      </Sphere>

      {/* Lower lip — slightly fuller */}
      <Sphere ref={mouthBottomRef} args={[0.08, 32, 16]} position={[0, -0.32, 0.87]} scale={[1.35, 0.4, 0.65]}>
        <meshPhysicalMaterial
          color={lipColor}
          roughness={0.2}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          sheen={0.7}
          sheenColor={new THREE.Color('#e08888')}
          sheenRoughness={0.25}
          envMapIntensity={0.5}
        />
      </Sphere>

      {/* Lip seam */}
      <mesh position={[0, -0.3, 0.91]}>
        <boxGeometry args={[0.14, 0.002, 0.01]} />
        <meshStandardMaterial color="#7a3f35" roughness={0.8} />
      </mesh>

      {/* Mouth interior */}
      <Sphere args={[0.07, 24, 24]} position={[0, -0.3, 0.78]} scale={[1.4, 0.45, 0.4]}>
        <meshStandardMaterial color="#1a0505" roughness={0.95} />
      </Sphere>
    </group>
  );
}

/* ── Nose ─────────────────────────────────────────────────── */
function Nose() {
  const skin = useMemo(() => new THREE.Color('#c49a78'), []);

  return (
    <group>
      {/* Nose bridge — single smooth shape */}
      <mesh position={[0, 0.02, 0.88]}>
        <capsuleGeometry args={[0.025, 0.18, 8, 16]} />
        <SkinMaterial color={skin} roughness={0.48} />
      </mesh>

      {/* Nose tip */}
      <Sphere args={[0.055, 32, 32]} position={[0, -0.09, 0.95]}>
        <SkinMaterial color={skin} roughness={0.38} />
      </Sphere>

      {/* Nose wings */}
      <Sphere args={[0.03, 24, 24]} position={[-0.045, -0.08, 0.92]}>
        <SkinMaterial color={skin} roughness={0.5} />
      </Sphere>
      <Sphere args={[0.03, 24, 24]} position={[0.045, -0.08, 0.92]}>
        <SkinMaterial color={skin} roughness={0.5} />
      </Sphere>

      {/* Nostrils */}
      <Sphere args={[0.014, 12, 12]} position={[-0.028, -0.095, 0.93]}>
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </Sphere>
      <Sphere args={[0.014, 12, 12]} position={[0.028, -0.095, 0.93]}>
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </Sphere>
    </group>
  );
}

/* ── Ear ──────────────────────────────────────────────────── */
function Ear({ side }: { side: 'left' | 'right' }) {
  const x = side === 'left' ? -0.84 : 0.84;
  const skin = useMemo(() => new THREE.Color('#c49a78'), []);

  return (
    <group position={[x, 0.05, -0.05]}>
      <Sphere args={[0.12, 24, 24]} scale={[0.3, 0.9, 0.6]}>
        <SkinMaterial color={skin} roughness={0.55} />
      </Sphere>
      <Sphere args={[0.04, 16, 16]} position={[0, -0.09, 0.02]}>
        <SkinMaterial color={skin} roughness={0.5} />
      </Sphere>
    </group>
  );
}

/* ── Sleeping Zzz ─────────────────────────────────────────── */
function ZLetter({ delay, startX }: { delay: number; startX: number }) {
  const ref = useRef<THREE.Group>(null!);
  const offset = useRef(delay);

  useFrame((state) => {
    const t = (state.clock.elapsedTime + offset.current) % 4;
    const p = t / 4;
    if (ref.current) {
      ref.current.position.x = startX + Math.sin(p * Math.PI * 2) * 0.12;
      ref.current.position.y = 0.5 + p * 1.0;
      ref.current.position.z = 1.0;
      ref.current.scale.setScalar(0.12 + p * 0.2);
      ref.current.rotation.z = Math.sin(p * Math.PI) * 0.3;
      const child = ref.current.children[0] as any;
      if (child?.material) {
        const fade = p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1;
        child.material.opacity = fade * 0.6;
      }
    }
  });

  return (
    <group ref={ref}>
      <Text fontSize={0.2} color="#4ab8d4" anchorX="center" anchorY="middle" font={undefined}>
        Z
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={0.6}
          transparent
          opacity={0.6}
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

/* ── Fresnel Rim Glow ─────────────────────────────────────── */
function RimGlow({ isActive, volume }: { isActive: boolean; volume: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowColor = useMemo(() => new THREE.Color('#4ab8d4'), []);

  useFrame(() => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isActive ? 0.15 + volume * 0.3 : 0.05;
    }
  });

  return (
    <Sphere ref={ref} args={[1.02, 48, 48]} scale={[0.9, 1.03, 0.92]}>
      <meshStandardMaterial
        color={glowColor}
        transparent
        opacity={0.03}
        emissive={glowColor}
        emissiveIntensity={0.05}
        side={THREE.BackSide}
      />
    </Sphere>
  );
}

/* ── 3D Head (Clean, Minimal Primitives) ─────────────────── */
function AvatarHead({ isActive, volume, isLoading }: {
  isActive: boolean;
  volume: number;
  isLoading: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const mouthTopRef = useRef<THREE.Mesh>(null!);
  const mouthBottomRef = useRef<THREE.Mesh>(null!);
  const smoothVol = useRef(0);

  const skinBase = useMemo(() => new THREE.Color('#c49a78'), []);
  const skinLight = useMemo(() => new THREE.Color('#d4aa8a'), []);
  const skinDark = useMemo(() => new THREE.Color('#a87e62'), []);
  const isSleeping = !isActive && !isLoading;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    smoothVol.current = THREE.MathUtils.lerp(smoothVol.current, volume, 0.1);
    const v = smoothVol.current;

    if (isLoading) {
      groupRef.current.rotation.y = t * 0.5;
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.03;
      return;
    }

    if (isSleeping) {
      // Natural sleeping pose: head droops gently
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(t * 0.25) * 0.015 - 0.06, 0.015);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.15, 0.012);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0.08, 0.01);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0.1, 0.01);
    } else if (isActive) {
      // Active: voice-reactive micro-movements
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.03;
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.06;
      groupRef.current.rotation.z = Math.sin(t * 1.3) * 0.02 * (1 + v);
      groupRef.current.rotation.x = Math.sin(t * 0.9) * 0.015 + v * 0.01;
    } else {
      // Idle: gentle float with natural drift
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.06;
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.03);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.03);
    }

    // Mouth animation
    if (mouthBottomRef.current) {
      const jawDrop = isActive ? v * 0.06 : 0;
      mouthBottomRef.current.position.y = THREE.MathUtils.lerp(
        mouthBottomRef.current.position.y, -0.32 - jawDrop, 0.1
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Rim glow */}
      <RimGlow isActive={isActive} volume={smoothVol.current} />

      {/* === HEAD — single clean sphere === */}
      <Sphere args={[1, 64, 64]} scale={[0.88, 1.02, 0.9]}>
        <SkinMaterial color={skinBase} roughness={0.48} />
      </Sphere>

      {/* Forehead highlight */}
      <Sphere args={[0.5, 32, 32]} position={[0, 0.5, 0.52]} scale={[1.3, 0.35, 0.5]}>
        <SkinMaterial color={skinLight} roughness={0.42} />
      </Sphere>

      {/* Cheekbones */}
      <Sphere args={[0.16, 32, 32]} position={[-0.45, -0.05, 0.65]}>
        <SkinMaterial color={skinLight} roughness={0.44} />
      </Sphere>
      <Sphere args={[0.16, 32, 32]} position={[0.45, -0.05, 0.65]}>
        <SkinMaterial color={skinLight} roughness={0.44} />
      </Sphere>

      {/* Eye sockets — subtle depth */}
      <Sphere args={[0.15, 32, 32]} position={[-0.28, 0.2, 0.76]}>
        <SkinMaterial color={skinDark} roughness={0.6} />
      </Sphere>
      <Sphere args={[0.15, 32, 32]} position={[0.28, 0.2, 0.76]}>
        <SkinMaterial color={skinDark} roughness={0.6} />
      </Sphere>

      {/* Eyes */}
      <Eye position={[-0.28, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} isSleeping={isSleeping} />
      <Eye position={[0.28, 0.2, 0.82]} isActive={isActive} volume={smoothVol.current} isSleeping={isSleeping} />

      {/* Eyebrows */}
      <Eyebrow position={[-0.28, 0.38, 0.83]} isActive={isActive} volume={smoothVol.current} />
      <Eyebrow position={[0.28, 0.38, 0.83]} mirrorX isActive={isActive} volume={smoothVol.current} />

      {/* Nose */}
      <Nose />

      {/* Lips */}
      <Lips isActive={isActive} volume={smoothVol.current} mouthTopRef={mouthTopRef} mouthBottomRef={mouthBottomRef} />

      {/* Chin */}
      <Sphere args={[0.14, 32, 32]} position={[0, -0.52, 0.6]}>
        <SkinMaterial color={skinBase} roughness={0.5} />
      </Sphere>

      {/* Jaw transition */}
      <Sphere args={[0.3, 24, 24]} position={[0, -0.65, 0.15]} scale={[1.1, 0.45, 0.75]}>
        <SkinMaterial color={skinDark} roughness={0.58} />
      </Sphere>

      {/* Ears */}
      <Ear side="left" />
      <Ear side="right" />

      {/* AI temple indicators */}
      <Sphere args={[0.018, 16, 16]} position={[-0.8, 0.25, 0.25]}>
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={isActive ? 1.8 : 0.4}
          transparent
          opacity={0.75}
        />
      </Sphere>
      <Sphere args={[0.018, 16, 16]} position={[0.8, 0.25, 0.25]}>
        <meshStandardMaterial
          color="#4ab8d4"
          emissive={new THREE.Color('#4ab8d4')}
          emissiveIntensity={isActive ? 1.8 : 0.4}
          transparent
          opacity={0.75}
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
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
          style={{ background: 'transparent' }}
        >
          {/* Environment-based lighting for realistic reflections */}
          <Environment preset="studio" />

          {/* Subtle fill lights to complement environment */}
          <ambientLight intensity={0.2} color="#ffeedd" />
          <directionalLight position={[3, 4, 5]} intensity={0.8} color="#fff0dd" />
          <directionalLight position={[-3, 1, 3]} intensity={0.3} color="#aaccee" />
          <pointLight position={[0, 2, -4]} intensity={0.5} color="#6688cc" />
          <pointLight position={[1, 1, 5]} intensity={0.2} color="#ffffff" />

          <AvatarHead isActive={isActive} volume={volume} isLoading={isLoading} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default AiAvatar;
