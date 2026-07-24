import { gsap, ScrollTrigger, SplitText } from 'gsap/all'

gsap.registerPlugin(ScrollTrigger, SplitText)

let instanceCount = 0

export default class Title
{
    constructor(instance, app)
    {
        this.instance = instance
        this.app = app

        this.destroyed = false
        this.completed = false
        this.ns = `textReveal${++instanceCount}`

        // Splitting with fallback-font metrics groups the wrong lines and the
        // masks inherit the error, so wait for the real font before measuring.
        ;(document.fonts?.ready ?? Promise.resolve()).then(() =>
        {
            if (this.destroyed) return
            this.init()
        })

        this.app.on(`resize.${this.ns}`, () => this.resize())
        this.app.on(`destroy.${this.ns}`, () => this.destroy())
    }

    init()
    {
        this.textEl = this.instance.querySelectorAll('h1, h2, h3, h4, h5, p')
        this.text = this.textEl.length > 0 ? this.textEl : this.instance

        this.split = new SplitText(this.text, { type: 'lines' })
        this.splitSecond = new SplitText(this.split.lines, { type: 'lines' })
        // clip-path instead of overflow+padding: zero layout impact (the old
        // padding/negative-margin pair drifted line spacing via margin
        // collapsing, so the revert on complete visibly snapped), while the
        // negative insets keep ascenders and descenders unclipped.
        gsap.set(this.split.lines, { clipPath: 'inset(-0.15em -0.1em)' })

        this.tl = gsap.timeline({
            paused: true,
            defaults: { duration: 1, ease: 'power3' },
            onComplete: () => this.complete(),
        })

        this.tl.fromTo(
            this.splitSecond.lines,
            { yPercent: 110 },
            { yPercent: 0, stagger: this.split.lines.length > 3 ? 0.04 : 0.1 }
        )

        this.scroll = ScrollTrigger.create({
            trigger: this.instance,
            start: 'top 80%',
            onEnter: () => this.play(),
        })
    }

    // Above-the-fold triggers fire while the loader curtain still covers the
    // page — hold those until the reveal cue so the roll-up is actually seen.
    play()
    {
        if (this.app.loaderActive) this.app.on(`reveal.${this.ns}`, () => this.tl.play())
        else this.tl.play()
    }

    // The masks exist only for the animation: reverting to the plain heading
    // means no overflow clip or stale transform can ever cut a resting line,
    // whatever the viewport does afterwards.
    complete()
    {
        this.completed = true
        this.revert()
    }

    revert()
    {
        this.splitSecond?.revert()
        this.split?.revert()
        this.splitSecond = this.split = null
    }

    resize()
    {
        if (this.destroyed || this.completed) return
        if (!this.split) return

        this.teardown()
        this.init()
    }

    teardown()
    {
        this.scroll?.kill()
        this.tl?.kill()
        this.revert()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.app.off(`resize.${this.ns}`)
        this.app.off(`destroy.${this.ns}`)
        this.app.off(`reveal.${this.ns}`)
        this.teardown()
    }
}
