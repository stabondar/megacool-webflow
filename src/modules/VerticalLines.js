import gsap from 'gsap'

const LINE_SELECTOR = '.sm__tick:not(.is--big)'

/**
 * data-module="vertical-lines" on a wrapper holding a row of `.sm__tick`
 * ticks. As the pointer nears a tick, that tick's `--scale` is eased up
 * (peaking at 2 right under the cursor, fading to 0 beyond `threshold` px) so
 * the row swells around the cursor. Only the small ticks react —
 * `.sm__tick.is--big` are skipped.
 *
 * The CSS must consume the variable, e.g. `.sm__tick { transform: scaleY(calc(1 + var(--scale, 0))) }`.
 */
export default class VerticalLines
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false
        this.threshold = 100
        this.mouseX = -Infinity

        this.lines = Array.from(this.instance.querySelectorAll(LINE_SELECTOR))
        this.centers = []
        this.quicks = this.lines.map((line) => gsap.quickTo(line, '--scale', { duration: 0.2, ease: 'power2' }))

        this.onMouseMove = this.onMouseMove.bind(this)

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        gsap.set(this.lines, { '--scale': 0 })

        // Observer flips instance.dataset.visible; move() no-ops while off-screen.
        this.app.observer?.instance.observe(this.instance)

        this.measure()
        window.addEventListener('mousemove', this.onMouseMove)
    }

    // Cache each tick's viewport-x center so move() stays reflow-free on every
    // pointer event; refreshed on resize (rect.left only shifts with layout).
    measure()
    {
        this.centers = this.lines.map((line) =>
        {
            const rect = line.getBoundingClientRect()
            return rect.left + rect.width / 2
        })
    }

    onMouseMove(e)
    {
        this.mouseX = e.clientX
        this.move()
    }

    move()
    {
        if (this.destroyed) return
        if (this.instance.dataset.visible !== 'true') return

        for (let i = 0; i < this.lines.length; i++)
        {
            const diff = Math.abs(this.mouseX - this.centers[i])
            this.quicks[i](diff < this.threshold ? (1 - diff / this.threshold) * 2 : 0)
        }
    }

    resize()
    {
        if (this.destroyed) return
        this.measure()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        window.removeEventListener('mousemove', this.onMouseMove)
        this.app.observer?.instance.unobserve(this.instance)
        this.quicks.forEach((quick) => quick(0))
        gsap.killTweensOf(this.lines)
    }
}
