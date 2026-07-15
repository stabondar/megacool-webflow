uniform vec3 uEdgeColor;
uniform float uEdgeWidth;
uniform float uEdgeIntensity;
uniform float uBladeWidth;
uniform float uEndBand;
uniform float uEndGlow;
uniform vec3 uPoolAColor;
uniform vec2 uPoolACenter;
uniform float uPoolARadius;
uniform float uPoolAIntensity;
uniform vec3 uPoolBColor;
uniform vec2 uPoolBCenter;
uniform float uPoolBRadius;
uniform float uPoolBIntensity;

varying float vHeightRatio;
varying float vRand;
varying float vAlongX;
varying vec3 vWorldPos;

void main()
{
    // Emissive rim hugging the top edge — this is the visible "line".
    float rim = smoothstep(1.0 - uEdgeWidth, 1.0, vHeightRatio);
    rim *= rim;

    // End-column glow: near the blade ends the vertical edge stays lit a
    // little below the top corner, so the ends read as short fading strokes.
    float endBand = smoothstep(uBladeWidth * 0.5 - uEndBand, uBladeWidth * 0.5, abs(vAlongX));
    float endFade = pow(max(vHeightRatio, 0.0), 6.0);
    rim = max(rim, endBand * endFade * uEndGlow);

    // Two gaussian light pools in world XZ give the uneven brightness across
    // the field (a cyan cluster and a softer neutral one), on top of a dim
    // base rim so every edge stays faintly readable.
    float dA = distance(vWorldPos.xz, uPoolACenter);
    float dB = distance(vWorldPos.xz, uPoolBCenter);
    float pA = exp(-(dA * dA) / (uPoolARadius * uPoolARadius));
    float pB = exp(-(dB * dB) / (uPoolBRadius * uPoolBRadius));

    vec3 glow = uEdgeColor * uEdgeIntensity + uPoolAColor * (pA * uPoolAIntensity) + uPoolBColor * (pB * uPoolBIntensity);

    // Slight per-blade brightness variance so neighbouring lines don't read
    // as a perfectly uniform grating.
    float variance = mix(0.65, 1.25, vRand);

    csm_Emissive += glow * rim * variance;
}
