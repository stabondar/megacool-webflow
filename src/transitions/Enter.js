import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default class Enter
{
    constructor(data, checkPages, app)
    {
        this.app = app
        this.container = data.next.container
        this.checkPages = checkPages

        // the next page builds hidden — its PageEnter waits for the 'reveal'
        // cue fired as the fade-in starts
        this.app.loaderActive = true
        gsap.set(this.container, { autoAlpha: 0 })

        this.start()
    }

    async start()
    {
        document.documentElement.style.scrollBehavior = 'instant'
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

        // Lenis must exist BEFORE modules load — they subscribe to app.scroll.lenis
        // in init(), and the delayed init() left them bound to the destroyed instance
        this.app.scroll.init()

        requestAnimationFrame(() =>
        {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

            requestAnimationFrame(() =>
            {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                document.documentElement.style.scrollBehavior = ''
            })
        })

        this.app.moduleLoader.loadModules(this.container)

        // Instantiate the page class and run its load — transitions get the same
        // per-page setup (and page enter animation) as the first load
        await this.checkPages(this.container, this.app)
        await this.app.page?.triggerLoad()

        ScrollTrigger.refresh()

        this.reveal()
    }

    // page is ready — fade it in and cue the page intro to play with the fade
    reveal()
    {
        gsap.fromTo(
            this.container,
            { autoAlpha: 0 },
            {
                autoAlpha: 1,
                duration: 0.8,
                ease: 'power2.inOut',
                onStart: () =>
                {
                    this.app.loaderActive = false
                    this.app.trigger('reveal')
                },
            }
        )
    }
}
