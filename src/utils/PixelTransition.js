import gsap from 'gsap'

/**
 * Pixelated-wave page transition — faithful port of the Osmo Supply resource,
 * run in Barba sync mode: both containers are in the DOM, and run(next)
 * reveals the incoming container with a stepped clip-path mask while each
 * column's pixels quickly fade in, then back out, along the wavefront — the
 * shimmering pixel wipe. Portrait viewports rebuild the grid and sweep top to
 * bottom instead of left to right.
 *
 * Leave waits on whenFinished() so the old container stays in the DOM until
 * the wave has fully passed; Enter starts run(next) and builds the page while
 * it plays.
 *
 * The overlay markup is authored in Webflow ([data-transition-wrap] outside
 * the barba container); if it's absent or empty the scaffold is injected, so
 * it also works locally.
 */

const PANEL_HTML = `
    <div data-transition-panel class="transition__panel">
        <div data-transition-col class="transition__col">
            <div data-transition-pixel class="transition__pixel"></div>
        </div>
    </div>`

class PixelTransition
{
    constructor({ columns = 12, duration = 1, fade = 0.2, overlap = 0.3 } = {})
    {
        this.columns = Math.max(1, columns)
        this.duration = duration
        this.fade = fade
        this.overlap = Math.max(0, Math.min(1, overlap))

        this.reduced =
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
                : false

        this._deferred = null
    }

    // Shared completion signal: Leave awaits it, run()/skip() resolve it.
    // Lazily created so it works no matter whether barba executes the leave or
    // the enter hook first in sync mode.
    whenFinished()
    {
        if (!this._deferred)
        {
            let resolve
            const promise = new Promise((r) => (resolve = r))
            this._deferred = { promise, resolve }
        }
        return this._deferred.promise
    }

    finish()
    {
        const deferred = this._deferred
        this._deferred = null
        deferred?.resolve()
    }

    // Reduced-motion path: no wave, just release the leave hook.
    skip()
    {
        this.whenFinished()
        this.finish()
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

        // The wrapper may be authored in Webflow but empty. Inject the
        // panel/col/pixel scaffold whenever the pixel template isn't there, so
        // buildGrid always has something to clone.
        if (!wrap.querySelector('[data-transition-pixel]'))
        {
            wrap.innerHTML = PANEL_HTML
        }

        this.panel = wrap.querySelector('[data-transition-panel]')
        return this.panel
    }

    // Fill the panel with `columns` lines, each holding enough pixels to span
    // the cross axis — the Osmo pixelGrid helper, keyed off the panel size.
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

    // Osmo animates the clip with a start-jumping steps ease; fall back to the
    // plain form if this gsap build can't parse the two-arg config.
    stepEase()
    {
        const configured = `steps(${this.columns}, start)`
        try
        {
            return gsap.parseEase(configured) ? configured : `steps(${this.columns})`
        }
        catch
        {
            return `steps(${this.columns})`
        }
    }

    /**
     * The Osmo leave animation, verbatim: stepped clip-path reveal of `next`
     * (already pinned on top of the old page) + per-column pixel in/out
     * flicker travelling with the wavefront. Resolves whenFinished() at
     * duration + endDelay.
     */
    run(next)
    {
        const finished = this.whenFinished()

        const panel = this.ensureOverlay()
        const portrait = window.innerHeight > window.innerWidth
        this.buildGrid(portrait)

        const lines = Array.from(panel.querySelectorAll('[data-transition-col]'))
        const allPixels = panel.querySelectorAll('[data-transition-pixel]')

        // Landscape: all four points start on the LEFT edge and the two right
        // points sweep to 100%, so the new container is revealed left → right.
        // Portrait: same idea from the TOP edge, revealing top → bottom.
        const clipFrom = portrait
            ? 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'
            : 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
        const clipTo = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
        const clipStart = Math.min(this.fade, this.duration * 0.5)
        const clipDuration = Math.max(0.001, this.duration - 2 * clipStart)
        const stepDur = clipDuration / this.columns
        const endDelay = this.duration / this.columns

        const tl = gsap.timeline()

        gsap.set(allPixels, { opacity: 0, willChange: 'opacity' })
        gsap.set(panel, { opacity: 1, willChange: 'opacity' })

        gsap.set(next, {
            autoAlpha: 1,
            clipPath: clipFrom,
            webkitClipPath: clipFrom,
            willChange: 'clip-path',
            force3D: true,
            maxHeight: '100dvh',
        })

        lines.forEach((line, i) =>
        {
            const pixels = Array.from(line.querySelectorAll('[data-transition-pixel]'))
            if (!pixels.length) return

            const revealTime = clipStart + i * stepDur
            const fillStart = Math.max(0, revealTime - this.fade)
            const fadeStart = Math.min(this.duration, revealTime + stepDur)
            const perPixel = this.perPixelDuration(pixels.length)
            const spread = Math.max(0, this.fade - perPixel)

            // Pixels in, just ahead of the wavefront
            tl.to(
                pixels,
                {
                    opacity: 1,
                    duration: Math.max(0.001, perPixel),
                    ease: 'none',
                    stagger: { amount: spread, from: 'random' },
                },
                fillStart
            )

            // Pixels out, right behind it
            tl.to(
                pixels,
                {
                    opacity: 0,
                    duration: Math.max(0.001, perPixel),
                    ease: 'none',
                    stagger: { amount: spread, from: 'random' },
                },
                fadeStart
            )
        })

        // The stepped mask reveal of the incoming page
        tl.to(
            next,
            { clipPath: clipTo, webkitClipPath: clipTo, ease: this.stepEase(), duration: clipDuration },
            clipStart
        )

        tl.set(next, { clearProps: 'clipPath,webkitClipPath,willChange,force3D,maxHeight' }, clipStart + clipDuration)

        tl.set(allPixels, { clearProps: 'willChange' }, this.duration + endDelay)
        tl.set(panel, { opacity: 0, clearProps: 'willChange' }, this.duration + endDelay)
        tl.call(() => this.finish(), null, this.duration + endDelay)

        return finished
    }
}

export const pixelTransition = new PixelTransition()
export default PixelTransition
