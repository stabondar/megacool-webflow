import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

import { shuffle, toNumber } from '@utils/Math'

gsap.registerPlugin(SplitText)

const CHAR_CLASS = 'th-char'
const SPLIT_CLASS = 'th-is-split'

/**
 * data-module="text-hover" on a text element, or on a parent wrapper (button,
 * link, card) with the target text marked by data-text — so buttons and plain
 * text links share the same structure. Multiple data-text targets are allowed.
 * Optional data-attributes: data-duration (per-char fade), data-fade (scatter window).
 *
 * Splits into chars and, on hover, re-reveals them in random order — the same
 * scattered fade the tick-meter labels use (TickMeter.revealText). When the
 * module sits on the text itself, hover is bound to the closest [data-cta]
 * wrapper so the whole button triggers it; with data-text targets the module
 * element is the trigger. Only active when motion is allowed and the device
 * has a real hover pointer.
 */
export default class TextHover
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.splits = []
        this.chars = []

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

        this.targets = Array.from(this.instance.querySelectorAll('[data-text]'))

        if (this.targets.length)
        {
            this.trigger = this.instance
        }
        else
        {
            this.targets = [this.instance]
            this.trigger = this.instance.closest('[data-cta]') ?? this.instance
        }

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
        if (this.splits.length || !this.canSplit()) return

        this.splits = this.targets.map((target) =>
        {
            target.classList.add(SPLIT_CLASS)

            return new SplitText(target, {
                type: 'chars',
                charsClass: CHAR_CLASS,
            })
        })

        this.chars = this.splits.flatMap((split) => split.chars)

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

        if (this.chars.length) gsap.killTweensOf(this.chars)
        this.splits.forEach((split) => split.revert())

        this.splits = []
        this.chars = []
        this.targets?.forEach((target) => target.classList.remove(SPLIT_CLASS))
    }

    reveal()
    {
        if (this.destroyed || !this.chars.length) return

        gsap.killTweensOf(this.chars)
        gsap.set(this.chars, { opacity: 0 })

        shuffle(this.chars).forEach((char) =>
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
        if (this.destroyed || !this.chars.length) return

        gsap.killTweensOf(this.chars)
        gsap.to(this.chars, { opacity: 1, duration: this.duration, ease: 'power2.out' })
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
