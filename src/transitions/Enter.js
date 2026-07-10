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

        this.tl = gsap.timeline({ defaults: { duration: 0.8, ease: 'power2.inOut' }, onStart: () => this.start() })

        this.tl.fromTo(this.container, { autoAlpha: 0 }, { autoAlpha: 1, onComplete: () => this.complete() })
    }

    complete()
    {
        // this.loader.classList.add('hidden')
    }

    start()
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
        this.checkPages(this.container, this.app)

        ScrollTrigger.refresh()
    }
}
