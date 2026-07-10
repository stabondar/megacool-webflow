import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

/**
 * data-module="split" — splits an element's text into chars, keeps a
 * screen-reader copy, and slides the chars up when the element scrolls into
 * view (and back down when it leaves). Toggles on every enter/leave.
 *
 * NOTE: the source relied on the global GSAP defaults (ease 'expo.out',
 * duration 1.2); those are baked in explicitly here because the target's
 * global defaults use duration 0.8.
 */
export default class Split
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.split = null
        this.observer = null

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        this.split = this.splitText(this.instance)

        this.observer = new IntersectionObserver((entries) => this.onIntersect(entries))
        this.observer.observe(this.instance)
    }

    setVisuallyHidden(element)
    {
        element.setAttribute('aria-hidden', 'true')
        element.style.position = 'absolute'
        element.style.left = '-9999px'
        element.style.top = '-9999px'
        element.style.width = '1px'
    }

    splitText(element)
    {
        const content = element.textContent
        element.textContent = ''

        const span = document.createElement('span')
        span.textContent = content
        element.appendChild(span)
        this.setVisuallyHidden(span)

        const anotherSpan = document.createElement('span')
        anotherSpan.setAttribute('data-css', 'overflow-clip')
        anotherSpan.textContent = content
        anotherSpan.setAttribute('aria-hidden', 'true')
        element.appendChild(anotherSpan)

        return new SplitText(anotherSpan, {
            type: 'chars',
        })
    }

    onIntersect(entries)
    {
        if (this.destroyed || !this.split) return

        entries.forEach((entry) =>
        {
            if (entry.isIntersecting)
            {
                gsap.to(this.split.chars, {
                    yPercent: 0,
                    duration: 1.2,
                    ease: 'expo.out',
                    stagger: 0.02,
                })
            }
            else
            {
                gsap.killTweensOf(this.split.chars)
                gsap.set(this.split.chars, {
                    yPercent: 100,
                })
            }
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

        if (this.observer)
        {
            this.observer.disconnect()
            this.observer = null
        }

        if (this.split)
        {
            gsap.killTweensOf(this.split.chars)
            this.split.revert()
            this.split = null
        }
    }
}
