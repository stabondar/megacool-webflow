import './css/style.scss'
import barba from '@barba/core'
import barbaPrefetch from '@barba/prefetch'
import EventEmitter from '@utils/EventEmitter.js'
import { RestartWebflow } from '@utils/RestartWebflow.js'
import { defaultTransition } from '@transitions/schema/defaultTransition.js'
import { CheckPages } from '@transitions/CheckPages.js'
import { ensureLang, isCrossLocale, syncLocaleLinks } from '@utils/Locale.js'
import FontFaceObserver from 'fontfaceobserver'

let instance = null

export default class app extends EventEmitter
{
    constructor()
    {
        if (instance) return instance

        super()

        instance = this
        this.app = null

        history.scrollRestoration = 'manual'
        ensureLang()

        this.loadFonts().then(() => this.init())
    }

    async loadFonts()
    {
        const font = new FontFaceObserver('Alliance No')

        return font.load(null, 3000).catch(() => console.warn('Alliance No font failed to load'))
    }

    init()
    {
        barba.use(barbaPrefetch)

        barba.init({
            schema: {
                prefix: 'data-transition',
                namespace: 'page',
            },
            debug: true,
            timeout: 7000,
            preventRunning: true,
            prevent: ({ el, event, href }) =>
            {
                // The nav, footer and <html lang> live outside the container, so a language switch needs a real load
                const crossLocale = isCrossLocale(href || el.href)

                if (event.type == 'click')
                {
                    event.preventDefault()
                    event.stopPropagation()

                    if (el.classList.contains('go') || crossLocale) window.location = el.href

                    if (el.classList.contains('prevent')) return true
                    if (el.href.includes('#')) return true
                }

                return crossLocale
            },
            transitions: [
                {
                    name: 'once',
                    once: ({ next }) => this.onceLoad(next),
                },
                defaultTransition('transition', this, CheckPages),
                defaultTransition('self', this, CheckPages),
            ],
        })

        // Collapse the mobile nav the moment a transition starts — tapping a
        // menu link should close the fullscreen tile as the new page wipes in.
        // Guarded by isOpen() so it only runs (and touches lenis) when the menu
        // is actually open; this.navigation is undefined during the once load,
        // hence the optional chain.
        barba.hooks.before(() =>
        {
            if (this.navigation?.isOpen()) this.navigation.close()
        })

        barba.hooks.enter((data) =>
        {
            const videos = data.next.container.querySelectorAll('video')
            if (videos.length > 0) videos.forEach((video) => video.load())
        })

        barba.hooks.after(async (data) =>
        {
            await RestartWebflow()
            syncLocaleLinks(data.next.html ? new DOMParser().parseFromString(data.next.html, 'text/html') : document)
        })
    }

    async loadMainComponentsOnce(main, app)
    {
        app.options = {
            onceLoaded: false,
        }

        const [Scroll, Sizes, Time, ModuleLoader, Observer, Nav, Navigation, CookieConsent] = await Promise.all([
            import('@utils/Scroll.js'),
            import('@utils/Sizes.js'),
            import('@utils/Tick.js'),
            import('@utils/ModuleLoader.js'),
            import('@utils/Observer.js'),
            import('@utils/Nav.js'),
            import('@modules/Navigation.js'),
            import('@modules/CookieConsent.js'),
        ])

        app.scroll = new Scroll.default()
        app.sizes = new Sizes.default()
        app.tick = new Time.default()
        app.moduleLoader = new ModuleLoader.default(app)
        app.observer = new Observer.default()

        await CheckPages(main, app)
        await app.moduleLoader.loadModules(main)

        app.sizes.on('resize', () => app.trigger('resize'))
        app.tick.on('tick', () => app.trigger('tick'))

        app.nav = new Nav.default(document.querySelector('.nav__wrap'), app, main)

        // The nav sits outside the Barba container, so the container-scoped
        // module loader never picks up its data-module="navigation". Wire the
        // toggle here, once, as a persistent module (isNav = true keeps it out
        // of the transition teardown so the hamburger keeps working after page
        // changes).
        const navToggle = document.querySelector('[data-module="navigation"]')
        if (navToggle) app.navigation = new Navigation.default(navToggle, app, main, true)

        syncLocaleLinks()

        // Consent UI: same story as the nav — it injects itself into <body>,
        // outside the Barba container, so it is created once here and never
        // torn down by a transition. utils/Consent.js has already run by this
        // point (imported by the module), so gated tags stay inert from the
        // first frame regardless of when the banner becomes visible.
        app.cookieConsent = new CookieConsent.default(app)
    }

    async onceLoad(next)
    {
        this.once = await import('@transitions/GlobalLoader.js').then(
            (module) => new module.default(next, this.loadMainComponentsOnce, this)
        )
    }
}

const appInstance = new app()
