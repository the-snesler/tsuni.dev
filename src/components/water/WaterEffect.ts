import { Renderer, Camera, Transform, Plane, Mesh, Program } from 'ogl';
import type { WaterConfig, WaterUniforms } from './types.ts';
import vertexShader from './water.vert.glsl';
import fragmentShader from './water.frag.glsl';

const checkTheme = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    uWaterCol: {
      value: isDark
        ? [0.2353, 0.0118, 0.4000] // #3c0366
        : [0.8549, 0.6980, 1.0000] // #dab2ff
    },
    uWater2Col: {
      value: isDark
        ? [0.3, 0.11, 0.56]
        : [0.6824, 0.5569, 0.8000] // #ae8ecc
    },
    uFoamCol: {
      value: isDark
        ? [0.1922, 0.1725, 0.5216] // #312c85
        : [0.9882, 0.8000, 0.9098] // #fccee8
    }
  };
}
export class WaterEffect {
  private renderer: Renderer;
  private camera: Camera;
  private scene: Transform;
  private plane: Mesh;
  private program: Program;
  private uniforms: WaterUniforms;
  private animationId: number | null = null;
  private startTime: number;
  private config: Required<WaterConfig>;

  constructor(canvas: HTMLCanvasElement, config: WaterConfig = {}) {
    // detect theme if not explicitly provided
    this.config = {
      height: 300,
      subdivisions: 32,
      animationSpeed: 1.0,
      waveAmplitude: 0.2,
      ...config
    };

    this.startTime = Date.now();

    // Initialize OGL renderer
    this.renderer = new Renderer({
      canvas,
      width: canvas.width,
      height: canvas.height,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });

    // Set up camera with perspective view from below
    this.camera = new Camera(this.renderer.gl, {
      fov: 90,
      aspect: canvas.width / canvas.height,
      near: 0.01,
      far: 100,
    });

    this.camera.position.set(0, -5, -2);
    this.camera.lookAt([0, 0, -2]);

    this.scene = new Transform();
    this.uniforms = {
      uTime: { value: 0 },
      uWaveAmplitude: { value: this.config.waveAmplitude },
      uAnimationSpeed: { value: this.config.animationSpeed },
      uResolution: { value: [canvas.width, canvas.height] },
      uCameraDirection: { value: [0, 1, -1] },
      uCameraPosition: { value: [0, -5, -2] },
      ...checkTheme(),
    };

    // Create shader program
    this.program = new Program(this.renderer.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      cullFace: false
    });

    // Create plane geometry
    const geometry = new Plane(this.renderer.gl, {
      width: 50,
      height: 20,
      widthSegments: this.config.subdivisions,
      heightSegments: this.config.subdivisions
    });

    // Create mesh
    this.plane = new Mesh(this.renderer.gl, { geometry, program: this.program });
    this.plane.setParent(this.scene);

    // Position plane above camera
    this.plane.position.set(0, 0, 0);

    // Start animation loop
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const currentTime = (Date.now() - this.startTime) / 1000;
    this.uniforms.uTime.value = currentTime;
    const theme = checkTheme();
    this.uniforms.uWaterCol.value = theme.uWaterCol.value;
    this.uniforms.uWater2Col.value = theme.uWater2Col.value;
    this.uniforms.uFoamCol.value = theme.uFoamCol.value;
    // Render scene
    this.renderer.render({ scene: this.scene, camera: this.camera });
  };

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.perspective({ aspect: width / height });
    this.uniforms.uResolution.value = [width, height];
  }

  // patch updateConfig to also handle theme toggles
  public updateConfig(newConfig: Partial<WaterConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update uniforms
    if (newConfig.waveAmplitude !== undefined) {
      this.uniforms.uWaveAmplitude.value = newConfig.waveAmplitude;
    }
    if (newConfig.animationSpeed !== undefined) {
      this.uniforms.uAnimationSpeed.value = newConfig.animationSpeed;
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clean up WebGL resources
    if (this.renderer && this.renderer.gl) {
      const gl = this.renderer.gl;

      // Delete program
      if (this.program && this.program.program) {
        gl.deleteProgram(this.program.program);
      }

      // Delete geometry buffers
      if (this.plane && this.plane.geometry) {
        const geometry = this.plane.geometry;
        if (geometry.attributes) {
          Object.values(geometry.attributes).forEach((attribute: any) => {
            if (attribute.buffer) {
              gl.deleteBuffer(attribute.buffer);
            }
          });
        }
      }
    }
  }

  public pause(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resume(): void {
    if (!this.animationId) {
      this.animate();
    }
  }
}
