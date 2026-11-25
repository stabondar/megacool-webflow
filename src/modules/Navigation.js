import { isCJK } from '@utils/Locale.js'

const STATUS_ATTR = 'data-navigation-status'
const ACTIVE = 'active'
const NOT_ACTIVE = 'not-active'

export default class Navigation
{
    constructor(instance, app, main, isNav)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.init()

        // The nav lives outside the Barba container, so it is instantiated
        // once and must persist across every transition. isNav skips the app
        // resize/destroy bindings — otherwise the transition teardown would
        // snapshot this listener, call destroy(), and detach the toggle after
        // the first navigation. Mirrors TextHover's isNav flag.
        if (isNav) return
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        if (isCJK) this.mirrorLabels()

        if (!this.instance.getAttribute(STATUS_ATTR))
        {
            this.instance.setAttribute(STATUS_ATTR, NOT_ACTIVE)
        }

        // Scope to this page's container — in sync transitions both the old
        // and new page are in the DOM, so a document-wide query would also
        // grab the outgoing page's buttons. Fall back to document for markup
        // where the toggles live outside the container.
        const scope = this.main && this.main.querySelector('[data-navigation-toggle]') ? this.main : document
        this.toggleButtons = Array.from(scope.querySelectorAll('[data-navigation-toggle="toggle"]'))
        this.closeButtons = Array.from(scope.querySelectorAll('[data-navigation-toggle="close"]'))

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

    // Webflow can't localize the menu's custom-element labels, so reuse the translated desktop ones
    mirrorLabels()
    {
        const labels = new Map(
            [...document.querySelectorAll('.toggle-switch__btn')].map((btn) => [btn.pathname, btn.textContent.trim()])
        )

        this.instance.querySelectorAll('.bold-nav-full__link').forEach((link) =>
        {
            const label = labels.get(link.pathname)
            const text = link.querySelector('.bold-nav-full__link-text')
            if (label && text) text.textContent = label
        })
    }

    isOpen()
    {
        return this.instance.getAttribute(STATUS_ATTR) === ACTIVE
    }

    setStatus(status)
    {
        this.instance.setAttribute(STATUS_ATTR, status)

        if (status === ACTIVE) this.app.scroll.lenis?.stop()
        else this.app.scroll.lenis?.start()
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

        // Deliberately no lenis.start() here: destroy is deferred, so
        // app.scroll.lenis is already the NEXT page's instance — its
        // lifecycle belongs to the transition (Enter.settle starts it).
    }
}
