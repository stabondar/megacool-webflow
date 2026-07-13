import gsap from 'gsap'

export default class GlobalLoader
{
    constructor(container, toLoad, app)
    {
        this.app = app
        this.toLoad = toLoad
        this.main = container.container

        this.loader = document.querySelector('.loader')

        this.app.loaderActive = true

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

        if (!this.loader) return

        gsap.to(this.loader, {
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => this.loader.classList.add('hidden'),
        })
    }
}
