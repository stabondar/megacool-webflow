let instanceCount = 0
const DESKTOP_QUERY = '(min-width: 992px)'

/**
 * data-module="hero-title" — scales the module instance's font size until its
 * single line fills the available inner width of its direct parent.
 */
export default class HeroTitle
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false
        this.enabled = false
        this.frame = null
        this.observer = null
        this.parent = null
        this.gridItem = null
        this.layoutStyles = null
        this.mediaQuery = null
        this.ns = `heroTitle${++instanceCount}`

        this.originalStyles = {
            display: this.instance.style.display,
            whiteSpace: this.instance.style.whiteSpace,
            fontSize: this.instance.style.fontSize,
        }

        this.schedule = this.schedule.bind(this)
        this.onBreakpointChange = this.onBreakpointChange.bind(this)

        this.init()
        this.app.on(`resize.${this.ns}`, () => this.resize())
        this.app.on(`destroy.${this.ns}`, () => this.destroy())
    }

    init()
    {
        this.parent = this.instance.parentElement
        if (!this.parent) return

        this.gridItem = this.findGridItem()
        this.mediaQuery = window.matchMedia(DESKTOP_QUERY)
        this.mediaQuery.addEventListener('change', this.onBreakpointChange)
        this.updateMode()
        document.fonts?.ready.then(this.schedule)
    }

    findGridItem()
    {
        let element = this.parent

        while (element?.parentElement && element !== this.main)
        {
            if (getComputedStyle(element.parentElement).display === 'grid') return element

            element = element.parentElement
        }

        return null
    }

    stretchContainer()
    {
        if (!this.gridItem) return

        if (!this.layoutStyles)
        {
            const elements = this.gridItem === this.parent ? [this.parent] : [this.parent, this.gridItem]
            this.layoutStyles = elements.map((element) => ({ element, width: element.style.width }))
        }

        this.layoutStyles.forEach(({ element }) =>
        {
            element.style.width = '100%'
        })
    }

    restoreContainer()
    {
        this.layoutStyles?.forEach(({ element, width }) =>
        {
            element.style.width = width
        })
    }

    updateMode()
    {
        if (this.destroyed || !this.mediaQuery) return

        if (this.mediaQuery.matches)
        {
            this.enable()
        }
        else
        {
            this.disable()
        }
    }

    enable()
    {
        if (this.enabled || !this.parent) return

        this.enabled = true
        this.stretchContainer()
        this.instance.style.display = 'inline-block'
        this.instance.style.whiteSpace = 'nowrap'

        if (window.ResizeObserver)
        {
            this.observer ||= new ResizeObserver(this.schedule)
            this.observer.observe(this.parent)
        }

        this.refit()
    }

    disable()
    {
        if (!this.enabled) return

        this.enabled = false

        if (this.frame !== null)
        {
            cancelAnimationFrame(this.frame)
            this.frame = null
        }

        this.observer?.disconnect()
        this.restoreStyles()
        this.restoreContainer()
    }

    restoreStyles()
    {
        this.instance.style.display = this.originalStyles.display
        this.instance.style.whiteSpace = this.originalStyles.whiteSpace
        this.instance.style.fontSize = this.originalStyles.fontSize
    }

    onBreakpointChange()
    {
        this.updateMode()
    }

    getAvailableWidth()
    {
        if (!this.parent) return 0

        const styles = getComputedStyle(this.parent)
        const paddingLeft = parseFloat(styles.paddingLeft) || 0
        const paddingRight = parseFloat(styles.paddingRight) || 0

        return this.parent.clientWidth - paddingLeft - paddingRight
    }

    fit(availableWidth)
    {
        if (availableWidth <= 0) return

        let fontSize = parseFloat(getComputedStyle(this.instance).fontSize) || 16

        for (let i = 0; i < 5; i++)
        {
            const width = this.instance.getBoundingClientRect().width
            if (width <= 0) break

            const ratio = availableWidth / width
            if (Math.abs(ratio - 1) < 0.002) break

            fontSize *= ratio
            this.instance.style.fontSize = `${fontSize}px`
        }
    }

    refit()
    {
        if (this.destroyed || !this.enabled || !this.parent) return

        this.fit(this.getAvailableWidth())
    }

    schedule()
    {
        if (this.destroyed || !this.enabled || this.frame !== null) return

        this.frame = requestAnimationFrame(() =>
        {
            this.frame = null
            this.refit()
        })
    }

    resize()
    {
        if (this.destroyed) return

        this.updateMode()
        if (this.enabled) this.schedule()
    }

    destroy()
    {
        if (this.destroyed) return

        this.destroyed = true
        this.app.off(`resize.${this.ns}`)
        this.app.off(`destroy.${this.ns}`)
        this.mediaQuery?.removeEventListener('change', this.onBreakpointChange)

        if (this.frame !== null)
        {
            cancelAnimationFrame(this.frame)
            this.frame = null
        }

        this.observer?.disconnect()
        this.observer = null
        this.restoreStyles()
        this.restoreContainer()
    }
}
