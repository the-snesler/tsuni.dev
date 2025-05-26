# Water Effect Implementation Plan

## Technical Specifications

### Dependencies

- **OGL**: `pnpm add ogl` (~20KB WebGL library)

### File Structure

```
src/components/
├── BackgroundWater.astro          # Main component (update existing)
├── BackgroundWater.frag.glsl      # Fragment shader (existing)
├── water/
│   ├── WaterEffect.ts             # Main water effect class
│   ├── water.vert.glsl            # Vertex shader for ripples
│   └── types.ts                   # TypeScript interfaces
```

### Core Implementation

#### 1. Geometry

- **Type**: Subdivided plane (32x32 default)
- **Size**: Extends beyond viewport to ensure coverage
- **Positioning**: Positioned above camera, parallel to screen

#### 2. Camera Setup

```typescript
// Camera positioned below water surface
camera.position.set(0, -2, 0);
camera.lookAt(0, 0, 0);
camera.rotation.x = Math.PI / 3; // ~60° angle to match CSS mockup
```

#### 3. Vertex Shader (water.vert.glsl)

```glsl
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uWaveAmplitude;
uniform float uAnimationSpeed;

void main() {
    vec3 pos = position;

    // Multi-frequency ripples
    float wave1 = sin(pos.x * 2.0 + uTime * uAnimationSpeed) * 0.01;
    float wave2 = sin(pos.z * 3.0 + uTime * uAnimationSpeed * 1.3) * 0.005;
    float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * uAnimationSpeed * 0.8) * 0.003;

    pos.y += (wave1 + wave2 + wave3) * uWaveAmplitude;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

#### 4. Fragment Shader Integration

- Adapt existing `BackgroundWater.frag.glsl` for OGL
- Add required uniforms: `uTime`, `uResolution`, `uCameraDirection`
- Maintain existing water colors and foam patterns

#### 5. Component Props

```typescript
interface WaterConfig {
  height?: number; // Canvas height (default: 300px)
  perspective?: number; // Camera angle in degrees (default: 60)
  subdivisions?: number; // Plane detail (default: 32)
  animationSpeed?: number; // Animation multiplier (default: 1.0)
  waveAmplitude?: number; // Ripple strength (default: 0.02)
}
```

#### 6. Main Effect Class Structure

```typescript
export class WaterEffect {
  private renderer: Renderer;
  private camera: Camera;
  private scene: Transform;
  private plane: Mesh;

  constructor(canvas: HTMLCanvasElement, config: WaterConfig) {
    // Initialize OGL components
    // Create geometry and materials
    // Set up animation loop
  }

  public resize(width: number, height: number): void;
  public destroy(): void;
  public updateConfig(config: Partial<WaterConfig>): void;
}
```

### Performance Optimizations

- Frustum culling (automatic with OGL)
- Respect `prefers-reduced-motion`
- WebGL context loss handling
- Efficient uniform updates

### Integration Points

- Position canvas absolutely over header area
- Z-index below header content, above background
- Responsive canvas sizing
- Blend with existing Astro background system

### Browser Support

- Modern browsers with WebGL support
- Graceful fallback for unsupported browsers
- Progressive enhancement approach
