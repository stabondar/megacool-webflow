import gsap from 'gsap'

/**
 * Pixel-wave page transition, adapted from the Osmo Supply resource to fit a
 * sequential Barba flow (leave → build next → enter). The overlay is a grid of
 * square pixels; the wave is pure per-pixel opacity — no clip-path — so the
 * pixelated shimmer is actually visible:
 *
 *   cover()  — during leave, columns light up along the wave direction, each
 *              column's pixels popping in with a random scatter, until the
 *              panel is solid. Teardown then runs hidden underneath.
 *   reveal() — during enter, once the next page is built and shown under the
 *              panel, columns dissolve the same way, uncovering the page.
 *
 * Both return a Promise that resolves when the sweep completes. The overlay
 * markup is authored in Webflow ([data-transition-wrap] outside the barba
 * container); if it's absent or empty the scaffold is injected, so this also
 * works locally.
 */

const PANEL_HTML = `
    <div data-transition-panel class="transition__panel">
        <div data-transition-col class="transition__col">
            <div data-transition-pixel class="transition__pixel"></div>
        </div>
    </div>`

class PixelTransition
{
    constructor({ columns = 12, duration = 0.8, fade = 0.25, overlap = 0.3 } = {})
    {
        this.columns = Math.max(1, columns)
        this.duration = duration
        this.fade = fade
        this.overlap = Math.max(0, Math.min(1, overlap))

        this.reduced =
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
                : false

        this.portrait = false
    }

    ensureOverlay()
    {
        let wrap = document.querySelector('[data-transition-wrap]')
        if (!wrap)
        {
            wrap = document.createElement('div')
            wrap.setAttribute('data-transition-wrap', '')
            document.body.appendChild(wrap)
        }

        // Fixed full-screen positioning must hold even if the Webflow-authored
        // wrapper is missing the class.
        wrap.classList.add('transition')

        // The wrapper may be authored in Webflow but empty (or missing the
        // panel/col/pixel scaffold). Inject the scaffold whenever the pixel
        // template isn't there, so buildGrid always has something to clone.
        if (!wrap.querySelector('[data-transition-pixel]'))
        {
            wrap.innerHTML = PANEL_HTML
        }

        this.panel = wrap.querySelector('[data-transition-panel]')
        return this.panel
    }

    // Fill the panel with `columns` lines, each holding enough pixels to span
    // the cross axis. Faithful to the Osmo helper, keyed off the panel size.
    buildGrid(portrait)
    {
        const panel = this.panel
        const rect = panel.getBoundingClientRect()
        panel.style.flexDirection = portrait ? 'column' : 'row'

        const lineSize = portrait ? rect.height / this.columns : rect.width / this.columns
        const crossAmount = Math.max(1, Math.ceil((portrait ? rect.width : rect.height) / (lineSize || 1)))

        let lines = panel.querySelectorAll('[data-transition-col]')
        const lineTemplate = lines[0]
        const pixelTemplate = lineTemplate.querySelector('[data-transition-pixel]')

        if (lines.length !== this.columns)
        {
            const frag = document.createDocumentFragment()
            for (let i = 0; i < this.columns; i++) frag.appendChild(lineTemplate.cloneNode(false))
            panel.replaceChildren(frag)
            lines = panel.querySelectorAll('[data-transition-col]')
        }

        lines.forEach((line) =>
        {
            line.style.flexDirection = portrait ? 'row' : 'column'
            line.style.flex = '1 1 auto'
            line.style.justifyContent = 'center'

            const diff = crossAmount - line.childElementCount
            if (diff > 0)
            {
                const frag = document.createDocumentFragment()
                for (let i = 0; i < diff; i++) frag.appendChild(pixelTemplate.cloneNode(true))
                line.appendChild(frag)
            }
            else if (diff < 0)
            {
                for (let i = diff; i < 0; i++) line.lastElementChild.remove()
            }
        })
    }

    perPixelDuration(count)
    {
        const perPixelMin = this.fade / Math.max(1, count)
        return perPixelMin * (1 - this.overlap) + this.fade * this.overlap
    }

    // The wave, matching the Osmo reference: a hard stepped mask edge with a
    // band of translucent pixels flashing behind it. Per column i, the pixels
    // scatter to random partial opacities during the fade window, then SNAP
    // together to the end state at the column's step time — the synchronized
    // snap is the hard mask edge; the scatter is the pixel shimmer band. The
    // flash window ends exactly at the snap, so nothing fights the set.
    sweep(toOpacity)
    {
        const panel = this.panel
        const lines = Array.from(panel.querySelectorAll('[data-transition-col]'))
        const stepDur = Math.max(0.001, (this.duration - this.fade) / this.columns)

        const tl = gsap.timeline()

        lines.forEach((line, i) =>
        {
            const pixels = line.querySelectorAll('[data-transition-pixel]')
            if (!pixels.length) return

            const snapAt = this.fade + i * stepDur
            const perPixel = this.perPixelDuration(pixels.length)
            const spread = Math.max(0, this.fade - perPixel)

            tl.to(
                pixels,
                {
                    opacity: () => gsap.utils.random(0.25, 0.75),
                    duration: Math.max(0.001, perPixel),
                    ease: 'none',
                    stagger: { amount: spread, from: 'random' },
                },
                snapAt - this.fade
            )
            tl.set(pixels, { opacity: toOpacity }, snapAt)
        })

        return tl
    }

    cover()
    {
        const panel = this.ensureOverlay()
        this.portrait = window.innerHeight > window.innerWidth
        this.buildGrid(this.portrait)

        const allPixels = panel.querySelectorAll('[data-transition-pixel]')
        gsap.set(allPixels, { opacity: 0, willChange: 'opacity' })
        gsap.set(panel, { opacity: 1 })

        const tl = this.sweep(1)

        return this.toPromise(tl)
    }

    reveal()
    {
        const panel = this.ensureOverlay()
        const allPixels = panel.querySelectorAll('[data-transition-pixel]')

        const tl = this.sweep(0)
        tl.set(panel, { opacity: 0 })
        tl.set(allPixels, { clearProps: 'willChange' })

        return this.toPromise(tl)
    }

    toPromise(tl)
    {
        return new Promise((resolve) => tl.eventCallback('onComplete', resolve))
    }
}

export const pixelTransition = new PixelTransition()
export default PixelTransition
