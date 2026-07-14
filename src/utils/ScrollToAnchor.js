/**
 * Scroll-to-anchor on arrival for Barba transitions.
 *
 * app.js deliberately routes any href containing '#' AROUND Barba (native
 * jump, no wave), so hash links can't carry a cross-page scroll target through
 * a transition. Instead, author a plain link with a data-anchor value:
 *
 *     <a href="/technology" data-anchor="specs">See the specs</a>
 *
 * The link still runs the pixel-wave transition; once the incoming page has
 * settled, Enter.settle() calls this to Lenis-scroll to the matching element.
 *
 * The value resolves, in order, to: the value used directly as a selector
 * ("#specs", ".specs", "[data-x]"), an element id ("specs"), or a
 * [data-anchor-target="specs"] element — so the target works whether it has a
 * Webflow id or a custom attribute.
 *
 * A fixed .nav would otherwise cover the target, so the default scroll offset
 * is the nav's height; override per-link with data-anchor-offset (px).
 */
export const scrollToAnchor = (trigger, app, { immediate = false } = {}) =>
{
    // Browser back/forward/popstate come through as strings, not elements.
    if (!trigger || typeof trigger.getAttribute !== 'function') return false

    const value = trigger.getAttribute('data-anchor')
    if (!value) return false

    const target = resolveTarget(value)
    if (!target)
    {
        console.warn(`scrollToAnchor: no target found for data-anchor="${value}"`)
        return false
    }

    const lenis = app.scroll?.lenis
    if (!lenis) return false

    const nav = document.querySelector('.nav')
    const attrOffset = trigger.getAttribute('data-anchor-offset')
    const offset = attrOffset !== null && attrOffset !== '' ? Number(attrOffset) : -(nav?.offsetHeight ?? 0)

    lenis.scrollTo(target, {
        offset: Number.isFinite(offset) ? offset : 0,
        immediate,
    })

    return true
}

const resolveTarget = (value) =>
{
    // Full selector first ("#specs", ".specs", "[data-x]"). A bare word like
    // "specs" is a valid (tag) selector that simply matches nothing, so it
    // falls through to the id / data-anchor-target lookups below.
    try
    {
        const direct = document.querySelector(value)
        if (direct) return direct
    }
    catch (error)
    {
        // value wasn't a valid selector (e.g. it contains spaces) — ignore and
        // fall through to the id / attribute lookups.
    }

    return document.getElementById(value) ?? document.querySelector(`[data-anchor-target="${CSS.escape(value)}"]`)
}
