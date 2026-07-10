export const lerp = (v0, v1, t) => v0 * (1 - t) + v1 * t

export const map = (value, low1, high1, low2, high2) => low2 + ((high2 - low2) * (value - low1)) / (high1 - low1)

export const clamp = (min, max, num) => Math.min(Math.max(num, min), max)

export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt))

export const toNumber = (value, fallback) =>
{
    const num = parseFloat(value)
    return Number.isFinite(num) ? num : fallback
}
