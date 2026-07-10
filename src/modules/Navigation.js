const STATUS_ATTR = 'data-navigation-status'
const ACTIVE = 'active'
const NOT_ACTIVE = 'not-active'

export default class Navigation
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        if (!this.instance.getAttribute(STATUS_ATTR))
        {
            this.instance.setAttribute(STATUS_ATTR, NOT_ACTIVE)
        }

        this.toggleButtons = Array.from(document.querySelectorAll('[data-navigation-toggle="toggle"]'))
        this.closeButtons = Array.from(document.querySelectorAll('[data-navigation-toggle="close"]'))

        this.onToggleClick = () => this.toggle()
        this.onCloseClick = () => this.close()
        this.onKeydown = (event) =>
        {
            if (event.key === 'Escape' && this.isOpen()) this.close()
        }

        this.toggleButtons.forEach((btn) => btn.addEventListener('click', this.onToggleClick))
        this.closeButtons.forEach((btn) => btn.addEventListener('click', this.onCloseClick))
        document.addEventListener('keydown', this.onKeydown)

        this.bound = true
    }

    isOpen()
    {
        return this.instance.getAttribute(STATUS_ATTR) === ACTIVE
    }

    setStatus(status)
    {
        this.instance.setAttribute(STATUS_ATTR, status)

        if (status === ACTIVE) this.app.scroll.lenis.stop()
        else this.app.scroll.lenis.start()
    }

    open()
    {
        this.setStatus(ACTIVE)
    }

    close()
    {
        this.setStatus(NOT_ACTIVE)
    }

    toggle()
    {
        if (this.isOpen()) this.close()
        else this.open()
    }

    resize()
    {
        if (this.destroyed) return
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        if (!this.bound) return

        this.toggleButtons.forEach((btn) => btn.removeEventListener('click', this.onToggleClick))
        this.closeButtons.forEach((btn) => btn.removeEventListener('click', this.onCloseClick))
        document.removeEventListener('keydown', this.onKeydown)

        if (this.isOpen()) this.app.scroll.lenis.start()
    }
}
