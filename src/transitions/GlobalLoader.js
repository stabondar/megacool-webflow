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
        await this.toLoad(this.main, this.app)
        await this.app.page?.triggerLoad()

        this.hide()
    }

    hide()
    {
        this.app.loaderActive = false
        this.app.trigger('reveal')

        // The curtain ships covering the page; the gradient band sweeps it
        // off to the right, uncovering the page (and its intros) left to
        // right.
        gradientTransition.hideCurtain()
    }
}
