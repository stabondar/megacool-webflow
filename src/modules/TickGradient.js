import gsap from 'gsap'

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

        this.paintGradient()
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

    resetGradient()
    {
        this.instance.querySelectorAll(this.tickSelector).forEach((tick) => tick.style.removeProperty('--tick-glow'))
    }

    resize()
    {
        if (this.destroyed) return
        if (!this.tickSelector) return

        this.paintGradient()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        if (!this.tickSelector) return

        this.resetGradient()
    }
}
