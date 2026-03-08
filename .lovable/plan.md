

## Plan: Replace VoiceOrb with Animated 3D AI Avatar

### Overview
Replace the current `VoiceOrb` component with a 3D animated avatar head using React Three Fiber. The avatar will have idle breathing/floating animation, react to voice volume with mouth movement and glow intensity, and show a loading state.

### Dependencies to Install
- `@react-three/fiber@^8.18`
- `three@^0.160.0`
- `@react-three/drei@^9.122.0`

### Files to Create/Edit

#### 1. Create `src/components/ui/AiAvatar.tsx`
A new component replacing VoiceOrb with the same props interface (`isActive`, `volume`, `onClick`, `isLoading`).

**3D Scene contents:**
- A stylized robot/character head using Drei primitives (sphere for head, smaller spheres for eyes, a rounded box for mouth)
- Cyan/purple gradient material matching the app theme
- **Idle state**: Slow floating bob animation (sin wave on Y), subtle rotation, soft glow
- **Active/speaking state**: Mouth scales vertically based on `volume`, eyes glow brighter, outer glow ring pulses with volume, head tilts slightly
- **Loading state**: Head spins slowly with pulsing opacity
- Ambient + point lights for dramatic lighting matching the dark theme
- `OrbitControls` disabled (static camera), but the head auto-rotates slightly

**Fallback**: Canvas wrapped in Suspense with a simple loading spinner fallback.

#### 2. Edit `src/components/ui/VoiceMode.tsx`
- Replace `import VoiceOrb` with `import AiAvatar`
- Swap `<VoiceOrb ... />` for `<AiAvatar ... />` (same props)

#### 3. Edit `src/components/modules/CurriculumVoiceSession.tsx`
- Same swap: replace VoiceOrb with AiAvatar

### Technical Details

The avatar geometry is built from Drei/Three primitives (no external 3D model files needed):
- Head: `<Sphere>` with MeshStandardMaterial, metalness 0.3, roughness 0.4, cyan color
- Eyes: Two small `<Sphere>` elements with emissive white/cyan glow
- Mouth: `<RoundedBox>` that scales on Y axis proportional to `volume`
- Outer glow: `<Sphere>` with transparent emissive material, scale driven by volume
- All animations via `useFrame` hook for smooth 60fps updates

### Files Summary
| File | Action |
|------|--------|
| `src/components/ui/AiAvatar.tsx` | Create |
| `src/components/ui/VoiceMode.tsx` | Edit (swap component) |
| `src/components/modules/CurriculumVoiceSession.tsx` | Edit (swap component) |

