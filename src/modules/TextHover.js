import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

import { toNumber } from '@utils/Math'

gsap.registerPlugin(SplitText)

const CHAR_CLASS = 'th-char'
const SPLIT_CLASS = 'th-is-split'

/**
 * data-module="text-hover" on any text element.
 * Optional data-attributes: data-shift, data-stagger, data-duration.
 *
 * Splits into chars, staggers per-char transitionDelay, and lets the CSS
 * (text-hover.scss) run the shadow-duplicate slide on :hover. Only splits when
 * motion is allowed and the device has a real hover pointer.
 */
export default class TextHover
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.split = null

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        const dataset = this.instance.dataset

        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.shift = toNumber(dataset.shift, 1.3)
        this.stagger = toNumber(dataset.stagger, 0.01)
        this.duration = toNumber(dataset.duration, 0.3)

        this.instance.style.setProperty('--text-hover-shift', `${this.shift}em`)
        this.instance.style.setProperty('--text-hover-duration', `${this.duration}s`)

        this.apply()
    }

    canSplit()
    {
        return !this.reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    }

    setup()
    {
        if (this.split || !this.canSplit()) return

        this.split = new SplitText(this.instance, {
            type: 'chars',
            charsClass: CHAR_CLASS,
        })

        this.split.chars.forEach((char, i) =>
        {
            char.style.transitionDelay = `${i * this.stagger}s`
        })

        this.instance.classList.add(SPLIT_CLASS)
    }

    teardown()
    {
        if (this.split) this.split.revert()
        this.split = null
        this.instance.classList.remove(SPLIT_CLASS)
    }

    apply()
    {
        if (this.canSplit()) this.setup()
        else this.teardown()
    }

    resize()
    {
        if (this.destroyed) return

        this.apply()
    }

    destroy()
    {
        if (this.destroyed) return

        this.destroyed = true
        this.teardown()
    }
}
