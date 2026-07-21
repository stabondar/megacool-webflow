import gsap from 'gsap'
import MorphSVGPlugin from 'gsap/MorphSVGPlugin'

gsap.registerPlugin(MorphSVGPlugin)

/**
 * Element-by-element morph intro for the logo inside the transition curtain.
 * Every path's authored letterform is cached up front along with a tiny
 * circle centred on that letter's own box. hide() parks the paths as
 * invisible dots; morphIn() pops each dot in and morphs it into its
 * letterform one by one, ordered by horizontal position — the same left →
 * right direction the curtain travels.
 *
 * morphIn() must play while the curtain fully covers the viewport: the
 * curtain's mask hides its children too, so anything animated mid-sweep runs
 * behind the transparent part of the gradient and is never seen.
 */
export default class TransitionLogo
{
    constructor(wrap)
    {
        // The logo may ship hidden in Webflow (the intro owns its
        // visibility) — force the wrapper chain visible BEFORE measuring:
        // display: none would zero out every getBBox() below, and an
        // opacity-0 wrapper would keep the whole morph invisible.
        this.logoWrap = wrap.querySelector('.transition_logo')
        if (this.logoWrap)
        {
            if (getComputedStyle(this.logoWrap).display === 'none') this.logoWrap.style.display = 'block'
            gsap.set(this.logoWrap, { autoAlpha: 1 })
        }

        const paths = [...wrap.querySelectorAll('.transition_logo path')]

        // Letterform and dot geometry must come from the authored markup —
        // capture both before hide() ever rewrites the d attributes.
        this.items = paths.map((path) =>
        {
            const box = path.getBBox()
            const cx = box.x + box.width / 2
            const cy = box.y + box.height / 2
            const r = Math.max(box.height, 1) * 0.1

            return {
                path,
                shape: path.getAttribute('d'),
                dot: `M ${cx - r},${cy} a ${r},${r} 0 1 0 ${r * 2},0 a ${r},${r} 0 1 0 ${r * -2},0`,
                cx,
            }
        })

        // DOM order puts the wordmark before the monogram; stagger by actual
        // horizontal position instead, matching the sweep direction.
        this.items.sort((a, b) => a.cx - b.cx)
        this.paths = this.items.map((item) => item.path)

        if (!this.items.length)
        {
            console.warn(
                '[TransitionLogo] no .transition_logo path elements found inside the curtain — logo morph disabled'
            )
        }
    }

    // Park every letter as an invisible dot — runs in the same frame the
    // curtain becomes visible, so the authored logo is never seen.
    hide()
    {
        if (!this.items.length) return

        gsap.killTweensOf(this.paths)
        this.items.forEach((item) => item.path.setAttribute('d', item.dot))
        gsap.set(this.paths, { autoAlpha: 0 })
        gsap.set(this.logoWrap, { autoAlpha: 1 })
    }

    // Letters pop in and morph dot → letterform one after another.
    morphIn({ delay = 0, duration = 0.4, each = 0.025 } = {})
    {
        const tl = gsap.timeline({ delay })

        this.items.forEach((item, i) =>
        {
            tl.to(item.path, { autoAlpha: 1, duration: 0.15, ease: 'none' }, i * each)
            tl.to(item.path, { morphSVG: item.shape, duration, ease: 'expo.out' }, i * each)
        })

        return tl
    }

    // Restore the authored markup once the curtain has passed, so the
    // first-load state and the next run start clean.
    reset()
    {
        if (!this.items.length) return

        gsap.killTweensOf(this.paths)
        this.items.forEach((item) => item.path.setAttribute('d', item.shape))
        gsap.set(this.paths, { clearProps: 'opacity,visibility' })
    }
}
