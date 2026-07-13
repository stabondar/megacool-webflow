import gsap from 'gsap'

import { clamp, map } from '@utils/Math.js'

/**
 * Scroll-scrubbed footer parallax. data-module="footer-parallax" on the wrapper.
 * Children: [data-footer-parallax-inner] slides up from yPercent -25,
 * [data-footer-parallax-dark] fades in from opacity 0.5.
 *
 * Progress is read from the footer's *live* bounding rect every scroll frame
 * rather than from a cached scrub. On tall, image-heavy pages lazy images above
 * the footer load as you scroll and shift it, which would freeze a cached scrub;
 * reading the rect each frame is immune to those layout shifts.
 */
export default class FooterParallax
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        this.inner = this.instance.querySelector('[data-footer-parallax-inner]')
        this.dark = this.instance.querySelector('[data-footer-parallax-dark]')

        if (!this.inner && !this.dark) return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        this.lastProgress = -1
        this.started = false

        // bind once so lenis.off() can remove the exact same reference
        this.onScroll = this.render.bind(this)

        this.start()
    }

    start()
    {
        if (this.started) return
        this.started = true

        this.render()
        this.subscribedLenis = this.app.scroll.lenis
        this.subscribedLenis.on('scroll', this.onScroll)
    }

    render()
    {
        if (this.destroyed) return

        // progress: 0 when the footer's top sits at the viewport bottom,
        // 1 when it reaches the viewport top.
        const top = this.instance.getBoundingClientRect().top
        const progress = clamp(0, 1, map(top, window.innerHeight, 0, 0, 1))

        if (progress === this.lastProgress) return
        this.lastProgress = progress

        const remaining = 1 - progress
        if (this.inner) gsap.set(this.inner, { yPercent: -25 * remaining })
        if (this.dark) gsap.set(this.dark, { opacity: 0.5 * remaining })
    }

    resize()
    {
        if (this.destroyed) return
        if (!this.started) return

        this.render()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        if (!this.started) return

        // off() the instance we subscribed to — by deferred-destroy time,
        // app.scroll.lenis is already the NEXT page's Lenis
        this.subscribedLenis?.off('scroll', this.onScroll)

        if (this.inner) gsap.set(this.inner, { clearProps: 'transform' })
        if (this.dark) gsap.set(this.dark, { clearProps: 'opacity' })

        this.lastProgress = -1
    }
}
