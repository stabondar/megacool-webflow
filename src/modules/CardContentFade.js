import gsap from 'gsap'

import { clamp, map, toNumber } from '@utils/Math.js'

const TRIGGER_SELECTOR = '[data-card-trigger]'
const CONTENT_SELECTOR = '[data-card-content]'

/**
 * data-module="card-content-fade". Fades [data-card-content] elements as a
 * [data-card-trigger] (or dataset.trigger selector) scrolls up.
 * Progress is read from the trigger's live bounding rect each scroll frame.
 */
export default class CardContentFade
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

        this.trigger =
            this.instance.querySelector(TRIGGER_SELECTOR) ??
            (this.instance.dataset.trigger ? this.instance.querySelector(this.instance.dataset.trigger) : null)

        this.contents = Array.from(this.instance.querySelectorAll(CONTENT_SELECTOR))

        if (!this.trigger || !this.contents.length) return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        this.endVh = toNumber(this.instance.dataset.endVh, 20) / 100
        this.fadeAmount = toNumber(this.instance.dataset.fade, 0.5)

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
        this.app.scroll.lenis.on('scroll', this.onScroll)
    }

    render()
    {
        if (this.destroyed) return

        const endTop = window.innerHeight * this.endVh
        const progress = clamp(0, 1, map(this.trigger.getBoundingClientRect().top, window.innerHeight, endTop, 0, 1))

        if (progress === this.lastProgress) return
        this.lastProgress = progress

        const opacity = 1 - progress * this.fadeAmount
        this.contents.forEach((el) => gsap.set(el, { opacity }))
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

        this.app.scroll.lenis.off('scroll', this.onScroll)

        this.contents.forEach((el) => gsap.set(el, { clearProps: 'opacity' }))
        this.lastProgress = -1
    }
}
