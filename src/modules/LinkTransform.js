/**
 * data-module="link-transform" with a data-link URL. Webflow can't nest an
 * anchor inside certain components, so the element is authored as a <div> and
 * this swaps it for an <a href="..."> at runtime — carrying over every
 * attribute (classes, ids, Webflow interaction hooks) and all child nodes so
 * styling and content are untouched.
 */
export default class LinkTransform
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.link = this.instance.getAttribute('data-link')

        this.init()
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (this.destroyed) return

        // Nothing to point at, or already an anchor — leave the DOM alone.
        if (!this.link) return
        if (this.instance.tagName === 'A')
        {
            this.instance.setAttribute('href', this.link)
            return
        }

        const parent = this.instance.parentNode
        if (!parent) return

        const anchor = document.createElement('a')

        // Preserve every attribute (class, id, data-*, aria-*, …); href is set
        // afterwards so it wins over anything the source element carried.
        for (const attr of [...this.instance.attributes])
        {
            anchor.setAttribute(attr.name, attr.value)
        }
        anchor.setAttribute('href', this.link)

        // Move children over — appending a node relocates it, so this empties
        // the original element as it goes.
        anchor.append(...this.instance.childNodes)

        parent.replaceChild(anchor, this.instance)

        // Re-point at the new node so anything reading this.instance later
        // (including destroy) sees the anchor, not the detached div.
        this.instance = anchor
    }

    destroy()
    {
        if (this.destroyed) return

        this.destroyed = true
    }
}
