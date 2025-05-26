#version 300 es
// @see https://jayconrod.com/posts/34/water-simulation-in-glsl
in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uWaveAmplitude;
uniform float uAnimationSpeed;

out vec2 vUv;
out vec3 vPosition;
out vec3 vNormal;

float M_2PI = 6.283185307;
int numWaves = 8;
float wavelength[8] = float[8](8.5, 6.6, 5.7, 10.8, 7.2, 9.1, 4.5, 3.8);
float speed[8] = float[8](1.5, 1.7, 2.2, 0.4, 1.6, 1.3, 0.5, 1.4);
float amplitude[8] = float[8](0.1, 0.05, 0.1, 0.15, 0.02, 0.14, 0.1, 0.06);
vec2 direction[8] = vec2[8](
    vec2(1.0, 0.0),
    vec2(0.0, 1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, 0.0),
    vec2(0.0, -1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(-1.0, 1.0)
);


float dWavedx(int i, float x, float y) {
    float frequency = M_2PI/wavelength[i];
    float phase = speed[i] * frequency;
    float theta = dot(direction[i], vec2(x, y));
    float A = amplitude[i] * direction[i].x * frequency;
    return A * cos(theta * frequency + uTime * phase);
}

float dWavedy(int i, float x, float y) {
    float frequency = M_2PI/wavelength[i];
    float phase = speed[i] * frequency;
    float theta = dot(direction[i], vec2(x, y));
    float A = amplitude[i] * direction[i].y * frequency;
    return A * cos(theta * frequency + uTime * phase);
}

vec3 waveNormal(float x, float y) {
    float dx = 0.0;
    float dy = 0.0;
    for (int i = 0; i < numWaves; ++i) {
        dx += dWavedx(i, x, y);
        dy += dWavedy(i, x, y);
    }
    vec3 n = vec3(-dx, -dy, 1.0);
    return normalize(n);
}

float wave(int i, float x, float y) {
    float frequency = M_2PI/wavelength[i];
    float phase = speed[i] * frequency;
    float theta = dot(direction[i], vec2(x, y));
    return amplitude[i] * sin(theta * frequency + uTime * phase);
}

float waveHeight(float x, float y) {
    float height = 0.0;
    for (int i = 0; i < numWaves; ++i)
        height += wave(i, x, y);
    return height;
}

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * waveNormal(position.x, position.y));
    float height = waveHeight(position.x, position.y);
    vec3 displacedPosition = vec3(position.xy, position.z + height);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
