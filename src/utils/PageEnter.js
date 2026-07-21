import { gsap } from '@utils/GSAP.js'

let instanceCount = 0

export default class PageEnter
{
    constructor(main, app)
    {
        this.main = main
        this.app = app

        this.destroyed = false

        this.tl = gsap.timeline({
            paused: true,
            defaults: { duration: 1, ease: 'power4' },
            onComplete: () => this.complete(),
            onStart: () => gsap.set([this.main, 'nav'], { autoAlpha: 1 }),
            delay: this.app.options.onceLoaded ? 0.5 : 0.7,
        })

        this.ns = `pageEnter${++instanceCount}`

        this.app.on(`destroy.${this.ns}`, () => this.destroy())
    }

    start()
    {
        if (this.app.loaderActive) this.app.on(`reveal.${this.ns}`, () => this.tl.play())
        else this.tl.play()
    }

    complete()
    {}

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.app.off(`reveal.${this.ns}`)
        this.app.off(`destroy.${this.ns}`)
        this.tl?.kill()
    }
}
