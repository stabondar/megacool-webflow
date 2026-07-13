import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { pixelTransition } from '@utils/PixelTransition.js'

gsap.registerPlugin(ScrollTrigger)

export default class Leave
{
    constructor(data, done, app)
    {
        this.app = app
        this.container = data.current.container
        this.done = done
        this.scroll = this.app.scroll.lenis

        this.scroll.stop()

        this.start()
    }

    start()
    {
        if (pixelTransition.reduced)
        {
            gsap.to(this.container, { autoAlpha: 0, onComplete: () => this.finish() })
            return
        }

        // Pixel grid sweeps in to cover the screen; the page swap + teardown
        // then happen hidden underneath, and Enter sweeps it back out.
        pixelTransition.cover().then(() => this.finish())
    }

    finish()
    {
        ScrollTrigger.killAll()
        this.done()

        this.app.trigger('destroy')
        this.app.onceCompleted = true

        this.app.scroll.destroy()
        window.scrollTo(0, 0)
    }
}
