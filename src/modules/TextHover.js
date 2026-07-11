import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

import { shuffle, toNumber } from '@utils/Math'

gsap.registerPlugin(SplitText)

const CHAR_CLASS = 'th-char'
const SPLIT_CLASS = 'th-is-split'

/**
 * data-module="text-hover" on any text element.
 * Optional data-attributes: data-duration (per-char fade), data-fade (scatter window).
 *
 * Splits into chars and, on hover, re-reveals them in random order — the same
 * scattered fade the tick-meter labels use (TickMeter.revealText). Hover is
 * bound to the closest [data-cta] wrapper so the whole button triggers it,
 * not just the text. Only active when motion is allowed and the device has a
 * real hover pointer.
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
        this.duration = toNumber(dataset.duration, 0.12)
        this.fade = toNumber(dataset.fade, 0.7)

        this.trigger = this.instance.closest('[data-cta]') ?? this.instance

        this.onEnter = () => this.reveal()
        this.onLeave = () => this.settle()

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

        this.instance.classList.add(SPLIT_CLASS)

        this.trigger.addEventListener('mouseenter', this.onEnter)
        this.trigger.addEventListener('mouseleave', this.onLeave)
    }

    teardown()
    {
        if (this.trigger)
        {
            this.trigger.removeEventListener('mouseenter', this.onEnter)
            this.trigger.removeEventListener('mouseleave', this.onLeave)
        }

        if (this.split)
        {
            gsap.killTweensOf(this.split.chars)
            this.split.revert()
        }
        this.split = null
        this.instance.classList.remove(SPLIT_CLASS)
    }

    reveal()
    {
        if (this.destroyed || !this.split) return

        const chars = this.split.chars
        gsap.killTweensOf(chars)
        gsap.set(chars, { opacity: 0 })

        shuffle(chars).forEach((char) =>
        {
            gsap.to(char, {
                opacity: 1,
                duration: this.duration,
                delay: Math.random() * this.fade,
                ease: 'power2.out',
            })
        })
    }

    // Leaving mid-reveal must not strand half-hidden chars — fade them all back.
    settle()
    {
        if (this.destroyed || !this.split) return

        const chars = this.split.chars
        gsap.killTweensOf(chars)
        gsap.to(chars, { opacity: 1, duration: this.duration, ease: 'power2.out' })
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
