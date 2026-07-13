import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { pixelTransition } from '@utils/PixelTransition.js'

gsap.registerPlugin(ScrollTrigger)

export default class Enter
{
    constructor(data, checkPages, app)
    {
        this.app = app
        this.container = data.next.container
        this.checkPages = checkPages

        // Sync mode: both containers are in the DOM. Pin the incoming page on
        // top immediately; the wave's clip-path controls what's visible.
        // Stacking is made explicit — the old container becomes its own
        // stacking context at z 1, capping every z-indexed element inside it
        // (nav, hero overlays), and the new container sits at z 90: above the
        // old page, below the pixel overlay (z 100).
        gsap.set(data.current.container, { position: 'relative', zIndex: 1 })
        gsap.set(this.container, { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90 })

        this.app.loaderActive = true

        this.finished = this.run(data)
    }

    async run()
    {
        // Tear down the old page BEFORE building the new one. Module event
        // namespaces (tick.background, …) and ScrollTrigger.killAll are
        // global — the old page must release them first, or its teardown would
        // take the new page's listeners and triggers down with it.
        this.app.scroll.lenis?.stop()
        ScrollTrigger.killAll()
        this.app.trigger('destroy')
        this.app.onceCompleted = true
        this.app.scroll.destroy()

        if (pixelTransition.reduced)
        {
            gsap.set(this.container, { autoAlpha: 1 })
            await this.build()
            this.settle()
            this.app.loaderActive = false
            this.app.trigger('reveal')
            pixelTransition.skip()
            return
        }

        // Start the wave — stepped clip reveal of this container + pixel
        // flicker — and build the page underneath while it plays.
        const wave = pixelTransition.run(this.container)

        await this.build()

        // Page is ready mid-wave: cue the intros as the mask uncovers them.
        this.app.loaderActive = false
        this.app.trigger('reveal')

        await wave

        this.settle()
    }

    async build()
    {
        // Lenis must exist BEFORE modules load — they subscribe to
        // app.scroll.lenis in init(); keep it stopped until the page settles.
        this.app.scroll.init()
        this.app.scroll.lenis.stop()

        this.app.moduleLoader.loadModules(this.container)

        // Instantiate the page class and run its load — transitions get the
        // same per-page setup as the first load
        await this.checkPages(this.container, this.app)
        await this.app.page?.triggerLoad()
    }

    // Wave done, old container gone: put the new page back into normal flow at
    // the top and re-measure everything.
    settle()
    {
        gsap.set(this.container, { clearProps: 'position,top,left,right,zIndex' })

        document.documentElement.style.scrollBehavior = 'instant'
        window.scrollTo(0, 0)
        document.documentElement.style.scrollBehavior = ''

        this.app.scroll.lenis.start()
        ScrollTrigger.refresh()
    }
}
