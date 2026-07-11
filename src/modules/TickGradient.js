import gsap from 'gsap'

import { toNumber } from '@utils/Math.js'

const DEFAULT_TICK_SELECTOR = '.sm__tick'
const DEFAULT_FROM = '#e8503a'
const DEFAULT_TO = '#3ab3a3'

export default class TickGradient
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

        const dataset = this.instance.dataset
        this.tickSelector = dataset.tickSelector || DEFAULT_TICK_SELECTOR
        this.from = dataset.from || DEFAULT_FROM
        this.to = dataset.to || DEFAULT_TO
        this.pulseDuration = toNumber(dataset.pulseDuration, 1.2)

        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.pulseTween = null

        this.paintGradient()
        if (!this.reduced) this.startPulse()
    }

    getVisibleTicks()
    {
        return Array.from(this.instance.querySelectorAll(this.tickSelector)).filter(
            (tick) => tick.offsetParent !== null
        )
    }

    paintGradient()
    {
        const ticks = this.getVisibleTicks()
        const last = ticks.length - 1

        ticks.forEach((tick, index) =>
        {
            const ratio = last > 0 ? index / last : 0
            tick.style.setProperty('--tick-glow', gsap.utils.interpolate(this.from, this.to, ratio))
        })
    }

    startPulse()
    {
        if (this.pulseTween || this.reduced) return

        const ticks = this.getVisibleTicks()
        if (!ticks.length) return

        this.pulseTween = gsap.to(ticks, {
            opacity: 1,
            duration: this.pulseDuration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
        })
    }

    stopPulse()
    {
        this.pulseTween?.kill()
        this.pulseTween = null

        this.instance.querySelectorAll(this.tickSelector).forEach((tick) =>
        {
            gsap.killTweensOf(tick)
            gsap.set(tick, { clearProps: 'opacity' })
        })
    }

    resetGradient()
    {
        this.instance.querySelectorAll(this.tickSelector).forEach((tick) => tick.style.removeProperty('--tick-glow'))
    }

    resize()
    {
        if (this.destroyed) return
        if (!this.tickSelector) return

        this.paintGradient()

        // the pulse tween targets the tick set captured at creation — rebuild
        // it against the ticks visible at the new size
        this.stopPulse()
        this.startPulse()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        if (!this.tickSelector) return

        this.stopPulse()
        this.resetGradient()
    }
}
