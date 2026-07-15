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

        // Tempus's rAF loop schedules the next frame AFTER running callbacks
        // and doesn't catch — an exception escaping either driver below would
        // stop rAF for the whole site (gsap, lenis, every module) permanently.
        // gsap.updateRoot runs every tween AND their user callbacks, so this
        // is the single most exposed spot in the app.
        Tempus.add(({ time }) =>
        {
            try
            {
                this.lenis.raf(time)
            }
            catch (error)
            {
                console.warn('Lenis raf failed:', error)
            }
        })

        gsap.ticker.remove(gsap.updateRoot)
        Tempus.add(({ time }) =>
        {
            try
            {
                gsap.updateRoot(time / 1000)
            }
            catch (error)
            {
                console.warn('GSAP update failed:', error)
            }
        })

        // this.watchContentHeight()
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

        // wired here (not in the constructor) so every re-created Lenis
        // after a page transition drives ScrollTrigger again
        this.lenis.on('scroll', ScrollTrigger.update)
    }

    destroy()
    {
        this.lenis.destroy()
    }
}
