uniform float uTime;
uniform vec2 uResolution;
uniform float uPower;
uniform int uIterations;
uniform float uBailout;
uniform float uCameraDistance;
uniform vec2 uRotation;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uGlow;
uniform int uColorPalette;

#define MAX_STEPS 128
#define MAX_DIST 40.0
#define SURF_DIST 0.001

mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

// Mandelbulb distance estimator
float mandelbulbDE(vec3 pos, float power, int iterations, float bailout) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < 20; i++) {
        if (i >= iterations) break;

        r = length(z);
        if (r > bailout) break;

        // Convert to spherical coordinates
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);

        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;

        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta),
            cos(theta)
        );

        z += pos;
    }

    return 0.5 * log(r) * r / dr;
}

// Color palette helpers
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 getPaletteColor(float t, int paletteId, vec3 colorA, vec3 colorB) {
    if (paletteId == 0) {
        // Cosmic - deep purple/blue/gold
        return palette(t,
            vec3(0.5, 0.5, 0.5),
            vec3(0.5, 0.5, 0.5),
            vec3(1.0, 1.0, 1.0),
            vec3(0.0, 0.33, 0.67)
        );
    } else if (paletteId == 1) {
        // Fire - red/orange/yellow
        return palette(t,
            vec3(0.5, 0.0, 0.0),
            vec3(0.5, 0.5, 0.0),
            vec3(1.0, 1.0, 0.5),
            vec3(0.0, 0.1, 0.2)
        );
    } else if (paletteId == 2) {
        // Ocean - blue/teal/cyan
        return palette(t,
            vec3(0.0, 0.3, 0.5),
            vec3(0.0, 0.2, 0.3),
            vec3(0.5, 0.5, 0.8),
            vec3(0.0, 0.5, 0.6)
        );
    } else if (paletteId == 3) {
        // User custom
        return mix(colorA, colorB, t);
    }
    return vec3(1.0);
}

float sceneSDF(vec3 p) {
    return mandelbulbDE(p, uPower, uIterations, uBailout);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

vec3 render(vec2 uv) {
    // Camera
    float camTime = uTime * 0.2;
    vec3 ro = vec3(0.0, 0.0, -uCameraDistance);
    ro = rotateX(uRotation.y) * rotateY(uRotation.x + camTime) * ro;

    vec3 lookAt = vec3(0.0);
    vec3 ww = normalize(lookAt - ro);
    vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
    vec3 vv = normalize(cross(ww, uu));

    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);

    // Raymarch
    float dO = 0.0;
    float orbit = 0.0;
    int steps = 0;

    for (int i = 0; i < MAX_STEPS; i++) {
        steps = i;
        vec3 p = ro + rd * dO;
        float dS = sceneSDF(p);
        dO += dS;
        orbit += exp(-dS * 2.0);
        if (dO > MAX_DIST || dS < SURF_DIST) break;
    }

    vec3 col = vec3(0.0);

    if (dO < MAX_DIST) {
        vec3 p = ro + rd * dO;
        vec3 n = calcNormal(p);

        // Lighting
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float amb = 0.3 + 0.7 * (n.y * 0.5 + 0.5);

        // Color based on position / orbit
        float colorT = length(p) * 0.15 + float(steps) / float(MAX_STEPS);
        vec3 baseColor = getPaletteColor(colorT, uColorPalette, uColorA, uColorB);

        col = baseColor * (diff * 0.6 + amb * 0.4);

        // Specular
        vec3 halfDir = normalize(lightDir - rd);
        float spec = pow(max(dot(n, halfDir), 0.0), 32.0);
        col += vec3(1.0) * spec * 0.3;
    }

    // Glow / orbit trap
    col += vec3(0.3, 0.15, 0.5) * orbit * uGlow * 0.5;

    // Fog
    col *= exp(-dO * 0.03);

    // Gamma correction
    col = pow(col, vec3(0.4545));

    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    vec3 col = render(uv);

    gl_FragColor = vec4(col, 1.0);
}
