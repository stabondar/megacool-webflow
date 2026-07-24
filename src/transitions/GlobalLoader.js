import { gradientTransition } from '@utils/GradientTransition.js'

export default class GlobalLoader
{
    constructor(container, toLoad, app)
    {
        this.app = app
        this.toLoad = toLoad
        this.main = container.container

        this.nav = document.querySelector('.nav')
        if (this.main.hasAttribute('data-nav-black'))
        {
            this.nav.classList.add('black')
        }
        else
        {
            this.nav.classList.remove('black')
        }

        this.app.loaderActive = true

        // Kick the logo intro right away — it assembles on the curtain while
        // the page loads underneath; hideCurtain() waits for it to finish.
        gradientTransition.intro()

        this.load()
    }

    async load()
    {
        // Modules and the page build load while the logo intro plays on the
        // curtain. Fonts must land first: every SplitText below measures the
        // rendered text, and fallback-font lines break in the wrong places.
        const ready = Promise.resolve()
            .then(() => document.fonts?.ready)
            .then(() => this.toLoad(this.main, this.app))
            .then(() => this.app.page?.triggerLoad())

        // The reveal waits for both the logo assembly and `ready` — whichever
        // lands last — and the reveal state flips exactly when the sweep
        // starts, so a fast load keeps the same timing as before.
        gradientTransition.hideCurtain({
            ready,
            onReveal: () =>
            {
                this.app.loaderActive = false
                this.app.trigger('reveal')
            },
        })

        await ready
    }
}
