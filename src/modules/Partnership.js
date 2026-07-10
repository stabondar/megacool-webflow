import gsap from 'gsap'

import { clamp, toNumber } from '@utils/Math.js'

const DESKTOP_MQ = '(min-width: 992px) and (min-height: 701px)'

/**
 * data-module="partnership" on .partner-track.
 *
 * Three coupled behaviors:
 *  - matchMedia (min-width:992px) and (min-height:701px): below breakpoint,
 *    force every .accordion open; above, drive an active index from scroll.
 *  - scroll-driven active index over the .partner-track height.
 *  - optional linked target stack: accordions carrying data-trigger="1..n" slide
 *    matching [data-target="1..n"] elements (stacked in an overflow:hidden
 *    container) into view. data-duration / data-ease tune the slide.
 */
export default class Partnership
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

        this.items = Array.from(this.instance.querySelectorAll('.accordion'))

        if (!this.items.length) return

        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.desktopMq = window.matchMedia(DESKTOP_MQ)
        this.count = this.items.length

        // --- Optional linked target stack ---
        this.targets = new Map()
        this.instance.querySelectorAll('[data-target]').forEach((el) =>
        {
            const key = el.dataset.target
            if (key && !this.targets.has(key)) this.targets.set(key, el)
        })

        this.targetEls = Array.from(this.targets.values())
        this.hasTargets = this.targetEls.length > 0 && this.items.some((it) => it.dataset.trigger != null)

        this.slideDuration = toNumber(this.instance.dataset.duration, 0.9)
        this.slideEase = this.instance.dataset.ease || 'expo.out'

        this.activeIndex = -1
        this.started = false

        // bind once so add/removeEventListener and lenis on/off share references
        this.onScroll = this.onScroll.bind(this)
        this.applyMode = this.applyMode.bind(this)

        this.start()
    }

    positionTargets(value, animate = true)
    {
        if (!this.hasTargets) return

        const target = value != null ? this.targets.get(value) : undefined
        const base = this.targetEls[0].offsetTop
        const y = target ? -(target.offsetTop - base) : 0

        if (animate && !this.reduced)
        {
            gsap.to(this.targetEls, { y, duration: this.slideDuration, ease: this.slideEase, overwrite: true })
        }
        else
        {
            gsap.set(this.targetEls, { y })
        }
    }

    setAllOpen(open)
    {
        this.activeIndex = -1
        this.items.forEach((it) => it.classList.toggle('is-open', open))
        this.positionTargets(undefined)
    }

    setActive(index)
    {
        if (index === this.activeIndex) return
        this.activeIndex = index
        this.items.forEach((it, i) => it.classList.toggle('is-open', i === index))
        this.positionTargets(this.items[index]?.dataset.trigger)
    }

    updateDesktop()
    {
        const rect = this.instance.getBoundingClientRect()
        const scrollRoom = rect.height - window.innerHeight
        if (scrollRoom <= 0) return

        const progress = clamp(0, 0.999, -rect.top / scrollRoom)
        this.setActive(Math.floor(progress * this.count))
    }

    applyMode()
    {
        this.activeIndex = -1
        if (!this.desktopMq.matches) this.setAllOpen(true)
        else this.updateDesktop()
    }

    onScroll()
    {
        if (this.destroyed) return
        if (!this.desktopMq.matches) return
        this.updateDesktop()
    }

    start()
    {
        if (this.started) return
        this.started = true

        this.desktopMq.addEventListener('change', this.applyMode)
        this.app.scroll.lenis.on('scroll', this.onScroll)
        this.applyMode()
    }

    resize()
    {
        if (this.destroyed) return
        if (!this.started) return

        this.applyMode()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        if (!this.started) return

        this.desktopMq.removeEventListener('change', this.applyMode)

        if (this.hasTargets) gsap.set(this.targetEls, { clearProps: 'transform' })
    }
}
