

## Analysis

The current avatar builds a human face from ~40+ geometric primitives (spheres, boxes, torus shapes). No matter how many primitives we stack, this approach hits a hard ceiling -- it will always look like a mannequin or alien because:
- Visible seams between shapes
- No smooth surface continuity (skin doesn't work as discrete lumps)
- Geometric artifacts at every junction

**The honest truth**: Photorealistic faces require smooth mesh topology (thousands of connected vertices), which primitive stacking cannot achieve.

## Proposed Approach: Hybrid Realistic Avatar

Instead of fighting primitives, we take a smarter approach that actually looks good:

### 1. Simplified, cleaner head geometry
- Use ONE primary sphere for the head with careful scaling, not 15 overlapping spheres
- Remove the dozens of additive bumps (temples, cheek flesh, chin dimple, philtrum boxes) that create the lumpy mannequin look
- Keep only essential features: eyes, nose tip, lips, ears -- with cleaner positioning

### 2. Advanced material system for realism
- Add `Environment` preset from drei for realistic reflections on skin and eyes
- Implement a proper skin shader with subsurface scattering simulation using `transmission` and `thickness` on `meshPhysicalMaterial`
- Add subtle Fresnel rim glow for skin edge lighting (the #1 trick for selling 3D face realism)

### 3. Better eye realism (most important feature)
- Eyes are what make or break face realism
- Add a transparent cornea dome over the iris for wet refraction
- Improve specular highlights with environment reflections
- Better iris detail with radial gradient simulation

### 4. Improved animation
- Smoother transitions between sleep/idle/active states
- More natural head micro-movements (slight drift, not mechanical sine waves)
- Better breathing animation on the whole head scale

### 5. Lighting overhaul
- Use `Environment` preset (e.g., "studio" or "city") for image-based lighting
- This alone will dramatically improve how the skin materials look
- Reduce direct lights, lean on environment for natural fill

### Files Changed
- `src/components/ui/AiAvatar.tsx` -- Complete rewrite of the head composition, materials, and lighting

### Key Tradeoffs
- Fewer geometric details but dramatically better material/lighting = net improvement in perceived realism
- The avatar will look more like a polished stylized character (think Apple Memoji quality) rather than a lumpy primitive stack

