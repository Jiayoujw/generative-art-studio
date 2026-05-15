uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;

varying float vAlpha;
varying vec3 vColor;
varying float vDist;

void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft edge
    float a = 1.0 - smoothstep(0.3, 0.5, dist);

    // Mix noise-driven color with user palette
    vec3 mixedColor = mix(uColorA, uColorB, vColor.x * 0.5 + 0.5);
    mixedColor = mix(mixedColor, vColor, 0.3);

    // Distance fog
    float fog = 1.0 - smoothstep(5.0, 25.0, vDist);

    gl_FragColor = vec4(mixedColor, a * vAlpha * uAlpha * fog);
}
