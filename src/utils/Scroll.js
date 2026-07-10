import Lenis from 'lenis'
import Tempus from 'tempus'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

export default class Scroll
{
    constructor()
    {
        this.init()

        ScrollTrigger.addEventListener('refresh', () => this.lenis.resize())

        this.lenis.on('scroll', ScrollTrigger.update)

        Tempus.add(({time}) => this.lenis.raf(time))

        gsap.ticker.remove(gsap.updateRoot)
        Tempus.add(({time}) => gsap.updateRoot(time / 1000))


        this.watchContentHeight()
    }

    // Content-height growth (lazy images/fonts below the fold) never fires a window
    // resize, leaving Lenis's scroll limit and ScrollTrigger positions stale
    watchContentHeight()
    {
        let refreshTimer = null

        const scheduleRefresh = () =>
        {
            if (refreshTimer) clearTimeout(refreshTimer)
            refreshTimer = setTimeout(() =>
            {
                refreshTimer = null
                this.lenis?.resize()
                ScrollTrigger.refresh()
            }, 150)
        }

        window.addEventListener('load', scheduleRefresh)
        document.fonts?.ready.then(scheduleRefresh)

        if (typeof ResizeObserver !== 'undefined')
        {
            let lastHeight = document.body.offsetHeight

            const observer = new ResizeObserver(() =>
            {
                const height = document.body.offsetHeight
                if (height !== lastHeight)
                {
                    lastHeight = height
                    this.lenis?.resize()
                    scheduleRefresh()
                }
            })
            observer.observe(document.body)
        }
    }

    init()
    {
        this.lenis = new Lenis({
            duration: 1.4,
            easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
            direction: 'vertical', // vertical, horizontal
            gestureDirection: 'vertical', // vertical, horizontal, both
            smoothWheel: true,
            syncTouch: false,
            syncTouchLerp: 0.08,
            wheelMultiplier: 1.6,
        })
    }

    destroy()
    {
        this.lenis.destroy()
    }
}
