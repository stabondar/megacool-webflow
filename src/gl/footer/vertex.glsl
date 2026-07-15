attribute float aIndex;
attribute float aPhase;

uniform float uTime;
uniform float uBladeWidth;
uniform float uBladeHeight;
uniform float uCornerRadius;
uniform float uWaveAmp;
uniform float uWaveRamp;
uniform float uWavePlateau;
uniform float uWaveSpeed;
uniform float uWaveSlope;
uniform float uWaveJitter;

varying float vHeightRatio;
varying float vRand;
varying float vAlongX;
varying vec3 vWorldPos;

void main()
{
    vec3 pos = position;

    // pos.y runs from 0 at the base to uBladeHeight at the top edge
    // (geometry pivot is translated to y=0 at the base).
    float heightRatio = clamp(pos.y / uBladeHeight, 0.0, 1.0);
    float halfW = uBladeWidth * 0.5;

    // Round the silhouette at both blade ends: the top edge drops along a
    // quarter circle so the glowing line curves away instead of stopping dead.
    float u = 1.0 - clamp((halfW - abs(pos.x)) / uCornerRadius, 0.0, 1.0);
    float drop = (1.0 - sqrt(max(0.0, 1.0 - u * u))) * uCornerRadius;
    pos.y -= drop * heightRatio;

    // Travelling plateau kink: the top edge steps down, holds, and steps back
    // up. The centre drifts along the blade over time and is offset per
    // blade (aIndex) so the kinks form a diagonal front across the stack.
    // The wrap span is much longer than the blade so each kink spends most of
    // its cycle parked off-blade — at any moment only a fraction of the stack
    // is kinked, like the reference.
    float span = uBladeWidth * 4.0;
    float xc = mod(uTime * uWaveSpeed + aIndex * uWaveSlope + aPhase * uWaveJitter, span) - span * 0.5;
    float k = smoothstep(xc - uWavePlateau * 0.5 - uWaveRamp, xc - uWavePlateau * 0.5, pos.x) *
        (1.0 - smoothstep(xc + uWavePlateau * 0.5, xc + uWavePlateau * 0.5 + uWaveRamp, pos.x));
    pos.y += k * uWaveAmp * heightRatio;

    vHeightRatio = heightRatio;
    vRand = aPhase;
    vAlongX = position.x;
    vWorldPos = (modelMatrix * instanceMatrix * vec4(pos, 1.0)).xyz;

    csm_Position = pos;
}
