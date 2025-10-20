export interface WaterConfig {
  height?: number; // Canvas height (default: 300px)
  subdivisions?: number; // Plane detail (default: 32)
  animationSpeed?: number; // Animation multiplier (default: 1.0)
  waveAmplitude?: number; // Ripple strength (default: 0.02)
}

export interface WaterUniforms {
  uTime: { value: number };
  uWaveAmplitude: { value: number };
  uAnimationSpeed: { value: number };
  uResolution: { value: [number, number] };
  uCameraDirection: { value: [number, number, number] };
  uWaterCol: { value: number[] };
  uWater2Col: { value: number[] };
  uFoamCol: { value: number[] };
  uCameraPosition: { value: [number, number, number] };
}
