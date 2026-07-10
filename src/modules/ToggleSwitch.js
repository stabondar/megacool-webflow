const BTN_ATTR = 'data-toggle-btn'
const ACTIVE_ATTR = 'data-toggle-active'
const EXCLUDED_VALUE = 'contact'

export default class ToggleSwitch
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
        this.buttons = Array.from(this.instance.querySelectorAll(`[${BTN_ATTR}]`))

        if (this.buttons.length < 2) return

        this.instance.style.setProperty('--toggle-count', String(this.buttons.length))

        const initialIndex = this.getInitialIndex()
        if (initialIndex < 0) return

        this.setActive(initialIndex)
    }

    isExcluded(btn)
    {
        return btn.getAttribute(BTN_ATTR) === EXCLUDED_VALUE
    }

    normalizePath(path)
    {
        return path.replace(/\/+$/, '').toLowerCase() || '/'
    }

    getHref(btn)
    {
        const anchor = (btn instanceof HTMLAnchorElement ? btn : null) ?? btn.closest('a') ?? btn.querySelector('a')
        return anchor?.getAttribute('href') ?? null
    }

    getCurrentPageIndex()
    {
        const current = this.normalizePath(window.location.pathname)
        return this.buttons.findIndex((btn) =>
        {
            if (this.isExcluded(btn)) return false
            const href = this.getHref(btn)
            if (!href) return false
            try
            {
                return this.normalizePath(new URL(href, window.location.origin).pathname) === current
            }
            catch
            {
                return false
            }
        })
    }

    getInitialIndex()
    {
        let index = this.getCurrentPageIndex()
        if (index >= 0) return index

        index = this.buttons.findIndex((btn) => btn.hasAttribute(ACTIVE_ATTR) && !this.isExcluded(btn))
        if (index < 0) index = this.buttons.findIndex((btn) => !this.isExcluded(btn))
        return index
    }

    setActive(index)
    {
        this.instance.style.setProperty('--toggle-active', String(index))
        this.buttons.forEach((btn, i) =>
        {
            const isActive = i === index
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false')
            btn.toggleAttribute(ACTIVE_ATTR, isActive)
        })
    }

    resize()
    {
        if (this.destroyed) return
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true
    }
}
