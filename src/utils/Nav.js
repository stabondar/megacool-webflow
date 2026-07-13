import TextHover from '../modules/TextHover'

export default class Nav
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.links = this.instance.querySelectorAll('[data-module="text-hover"]')
        this.links.forEach((item) => new TextHover(item, this.app, this.main, true))

        this.init()
    }

    init()
    {}
}
