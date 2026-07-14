import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { pixelTransition } from '@utils/PixelTransition.js'
import { scrollToAnchor } from '@utils/ScrollToAnchor.js'

gsap.registerPlugin(ScrollTrigger)

export default class Enter
{
    constructor(data, checkPages, app)
    {
        this.app = app
        this.container = data.next.container
        this.checkPages = checkPages

        // The clicked link (or 'back'/'forward'/'popstate' for history nav).
        // A data-anchor value on it is scrolled to once the page settles.
        this.trigger = data.trigger

        // Sync mode: both containers are in the DOM. Pin the incoming page on
        // top immediately; the wave's clip-path controls what's visible.
        // Stacking is made explicit — the old container becomes its own
        // stacking context at z 1, capping every z-indexed element inside it
        // (nav, hero overlays), and the new container sits at z 90: above the
        // old page, below the pixel overlay (z 100).
        //
        // The old container is FROZEN at its current scroll offset (fixed,
        // negative top) so the window can jump to scroll 0 right away — the
        // new page's modules must create their ScrollTriggers under fresh-load
        // conditions, or triggers below the fold evaluate against the OLD
        // page's scroll position and fire before the page is even visible.
        this.scrollY = window.scrollY
        gsap.set(data.current.container, { position: 'fixed', top: -this.scrollY, left: 0, right: 0, zIndex: 1 })
        gsap.set(this.container, { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90 })

        this.app.loaderActive = true

        this.nav = document.querySelector('.nav')
        if (this.container.hasAttribute('data-nav-black'))
        {
            this.nav.classList.add('black')
        }
        else
        {
            this.nav.classList.remove('black')
        }

        this.finished = this.run()
    }

    async run()
    {
        // Scope the teardown before anything new registers: every listener on
        // the app emitter and every live ScrollTrigger at this moment belongs
        // to the old page. The new page's registrations land after this point,
        // so the deferred destroy below can tell the two apart. The old page
        // itself keeps running (canvas, ticks) until the wave has hidden it.
        this.oldCallbacks = this.snapshotCallbacks()
        this.oldTriggers = ScrollTrigger.getAll()

        this.app.scroll.lenis?.stop()
        this.app.onceCompleted = true
        this.app.scroll.destroy()

        // With both containers fixed, jumping to top is invisible — the old
        // page keeps its frozen offset. Must happen BEFORE build() so the new
        // page measures and arms exactly like a first load.
        document.documentElement.style.scrollBehavior = 'instant'
        window.scrollTo(0, 0)
        document.documentElement.style.scrollBehavior = ''

        if (pixelTransition.reduced)
        {
            gsap.set(this.container, { autoAlpha: 1 })
            await this.build()
            this.destroyPrevious()
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

        // The old container is now fully hidden behind the finished wave.
        this.destroyPrevious()
        this.settle()
    }

    async build()
    {
        // Lenis must exist BEFORE modules load — they subscribe to
        // app.scroll.lenis in init(); keep it stopped until the page settles.
        this.app.scroll.init()
        this.app.scroll.lenis.stop()

        await this.app.moduleLoader.loadModules(this.container)

        // Instantiate the page class and run its load — transitions get the
        // same per-page setup as the first load
        await this.checkPages(this.container, this.app)
        await this.app.page?.triggerLoad()
    }

    snapshotCallbacks()
    {
        const snapshot = {}
        const callbacks = this.app.callbacks

        for (const namespace in callbacks)
        {
            snapshot[namespace] = {}
            for (const event in callbacks[namespace])
            {
                snapshot[namespace][event] = [...callbacks[namespace][event]]
            }
        }

        return snapshot
    }

    // Listeners added to the app emitter since the snapshot — the new page's.
    keptCallbacks()
    {
        const kept = { base: {} }
        const callbacks = this.app.callbacks

        for (const namespace in callbacks)
        {
            for (const event in callbacks[namespace])
            {
                const old = this.oldCallbacks[namespace]?.[event] ?? []
                const fresh = callbacks[namespace][event].filter((callback) => !old.includes(callback))
                if (!fresh.length) continue

                if (!kept[namespace]) kept[namespace] = {}
                kept[namespace][event] = fresh
            }
        }

        return kept
    }

    // Runs the OLD page's destroy handlers only — never the new page's — and
    // repairs the fallout: some destroys (Background) off() entire namespaces,
    // which would also drop listeners the new page just registered, so the
    // emitter is rebuilt with exactly the post-snapshot listeners afterwards.
    // Old ScrollTriggers are killed by snapshot for the same reason.
    destroyPrevious()
    {
        const kept = this.keptCallbacks()

        for (const namespace in this.oldCallbacks)
        {
            const handlers = this.oldCallbacks[namespace].destroy
            if (handlers) handlers.forEach((handler) => handler())
        }

        this.app.callbacks = kept
        this.oldTriggers.forEach((trigger) => trigger.kill())
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
        this.app.trigger('transitionSettled')

        // Layout is final and Lenis is live — if the trigger carried a
        // data-anchor, scroll to it now (jump instantly under reduced motion).
        scrollToAnchor(this.trigger, this.app, { immediate: pixelTransition.reduced })
    }
}
