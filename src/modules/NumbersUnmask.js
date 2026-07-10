import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { clamp, map, toNumber } from '@utils/Math.js'

gsap.registerPlugin(ScrollTrigger)

const TARGET_SELECTOR = '[data-unmask-target], .numbers'
const DEFAULT_FROM = -110
/** Scroll progress when reveal begins (negative = starts before item enters track). */
const DEFAULT_START = -0.12
const DEFAULT_END = 0.48

/**
 * data-module="numbers-unmask". Item: [data-unmask-item] (or .number__w);
 * target: [data-unmask-target] (or .numbers). Clip-reveals targets by sliding
 * them up from translate3d(0, from%, 0) as the item scrolls through its track.
 * Optional per-item: data-start, data-end, data-from, data-once, data-top, data-bottom.
 *
 * The source bespoke onTrack (Scroll.scroll mapped between element document
 * bounds) is replaced by a ScrollTrigger whose start/end reproduce the same
 * bounds: top-config 'bottom'|'center'|'top' -> `top <pos>`, bottom-config
 * -> `bottom <pos>` (pos map is identity). self.progress equals the old track
 * value (default bounds [0,1]); the callback logic is preserved verbatim.
 */
export default class NumbersUnmask
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
        this.triggers = []
        this.cleanups = []

        this.items = Array.from(this.instance.querySelectorAll('[data-unmask-item], .number__w'))

        if (!this.items.length) return

        const isEditor = document.documentElement.classList.contains('w-editor')
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        // In editor / reduced motion: skip tracking, show the final (revealed) state.
        if (isEditor || reduced)
        {
            this.items.forEach((item) =>
            {
                item.style.overflow = 'hidden'
                this.applyTargets(this.getTargets(item), 1, DEFAULT_FROM)
            })
            return
        }

        this.items.forEach((item) => this.initItem(item))
    }

    getTargets(item)
    {
        return Array.from(item.querySelectorAll(TARGET_SELECTOR))
    }

    applyTargets(targets, progress, fromPercent)
    {
        const p = clamp(0, 1, progress)
        const y = (1 - p) * fromPercent
        targets.forEach((target) =>
        {
            target.style.transform = `translate3d(0, ${y}%, 0)`
        })
    }

    initItem(item)
    {
        const targets = this.getTargets(item)
        if (!targets.length) return

        const start = toNumber(item.dataset.start, DEFAULT_START)
        const end = toNumber(item.dataset.end, DEFAULT_END)
        const from = toNumber(item.dataset.from, DEFAULT_FROM)
        const once = item.dataset.once === 'true'
        const positions = ['top', 'center', 'bottom']
        const cfgTop = positions.includes(item.dataset.top) ? item.dataset.top : 'bottom'
        const cfgBottom = positions.includes(item.dataset.bottom) ? item.dataset.bottom : 'top'

        let done = false
        let lastProgress = -1

        item.style.overflow = 'hidden'
        this.applyTargets(targets, 0, from)

        const update = (self) =>
        {
            if (done) return
            // only apply while the item is inside its track (mirrors the old inView gate)
            if (!self.isActive) return

            const value = self.progress
            const progress = clamp(0, 1, map(value, start, end, 0, 1))

            if (progress === lastProgress) return
            lastProgress = progress

            this.applyTargets(targets, progress, from)

            if (once && progress >= 1) done = true
        }

        const st = ScrollTrigger.create({
            trigger: item,
            start: () => `top ${cfgTop}`,
            end: () => `bottom ${cfgBottom}`,
            onUpdate: update,
            onRefresh: update,
        })

        // initial evaluation for items already inside their track on load
        update(st)

        this.triggers.push(st)
        this.cleanups.push(() =>
        {
            targets.forEach((target) =>
            {
                target.style.transform = ''
            })
            item.style.overflow = ''
        })
    }

    resize()
    {
        if (this.destroyed) return
        // ScrollTrigger auto-refreshes on window resize; onRefresh re-applies bounds.
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.triggers.forEach((st) => st.kill())
        this.cleanups.forEach((fn) => fn())
        this.triggers = []
        this.cleanups = []
    }
}
