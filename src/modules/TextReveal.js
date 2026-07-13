import { gsap, ScrollTrigger, SplitText } from 'gsap/all'

gsap.registerPlugin(ScrollTrigger, SplitText)

export default class Title
{
    constructor(instance, app)
    {
        this.instance = instance
        this.app = app

        this.destroyed = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        this.textEl = this.instance.querySelectorAll('p')
        this.text = this.textEl.length > 0 ? this.textEl : this.instance

        this.split = new SplitText(this.text, { type: 'lines' })
        this.splitSecond = new SplitText(this.split.lines, { type: 'lines' })
        gsap.set(this.split.lines, { overflow: 'hidden' })

        this.tl = gsap.timeline({ paused: true, defaults: { duration: 1, ease: 'power3' } })

        this.tl.fromTo(this.splitSecond.lines, { yPercent: 110 }, { yPercent: 0, stagger: 0.1 })

        this.scroll = ScrollTrigger.create({
            trigger: this.instance,
            start: 'top 80%',
            onEnter: () => this.tl.play(),
        })
    }

    resize()
    {
        if (this.destroyed) return

        this.split?.revert()
        this.tl?.kill()
        this.scroll?.kill()

        this.init()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true
    }
}
