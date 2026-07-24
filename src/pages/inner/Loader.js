import { gsap, SplitText } from '@utils/GSAP.js'

import PageEnter from '@utils/PageEnter.js'

// Home hero entrance: the heading rolls up word-by-word behind a line clip, then
// the supporting copy fades up and the buttons fade in. Extends PageEnter, which
// plays it on the 'reveal' cue (first load and barba transitions both fire it as
// the page becomes visible).
export default class Loader extends PageEnter
{
    constructor(main, app)
    {
        super(main, app)

        this.splits = [] // every SplitText, reverted on complete/destroy

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        this.hero = this.main.querySelector('.hero') ?? this.main.querySelector('section')
        if (!this.hero) return

        this.build()
        this.start()

        this.app.on(`resize.${this.ns}`, () => this.resize())
    }

    // split into clip-masked lines (+ words); returns the words to roll.
    // clip-path (not overflow+padding) so the split lines lay out exactly like
    // the plain heading and the revert on complete is seamless; the negative
    // insets keep ascenders and descenders unclipped.
    words(el)
    {
        const split = new SplitText(el, { type: 'lines, words' })
        gsap.set(split.lines, { clipPath: 'inset(-0.15em -0.1em)' })
        this.splits.push(split)
        return split.words
    }

    build()
    {
        const heading = this.adopt(this.hero.querySelector('h1, .h-h1'))
        const descrs = [...this.hero.querySelectorAll('.paragraph, p')].map((el) => this.adopt(el))
        const btns = [...this.hero.querySelectorAll('.button, .btn')]
        const els = this.hero.querySelectorAll('[data-load]')

        if (heading) this.tl.fromTo(this.words(heading), { yPercent: 110 }, { yPercent: 0, stagger: 0.05 }, 0.2)

        // descriptions reveal as whole elements (no SplitText), fading up
        if (descrs.length) this.tl.fromTo(descrs, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, '<0.2')

        if (btns.length) this.tl.fromTo(btns, { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.1 }, '<0.2')
        if (els.length) this.tl.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.1 }, '<0.2')
    }

    complete()
    {
        this.revert()
    }

    // A resize mid-entrance leaves the split lines measured for the old
    // viewport: re-split if the roll hasn't been revealed yet, land it if it
    // is in flight (complete() then reverts to the plain, unclippable text).
    resize()
    {
        if (this.destroyed || !this.splits.length) return

        if (this.tl.paused())
        {
            this.revert()
            this.tl.clear()
            this.build()
        }
        else if (this.tl.progress() < 1) this.tl.progress(1)
    }

    // revert inner-most splits first so nested (double) splits unwind cleanly
    revert()
    {
        ;[...this.splits].reverse().forEach((s) => s.revert())
        this.splits = []
    }

    destroy()
    {
        super.destroy()
        this.app.off(`resize.${this.ns}`)
        this.revert()
    }
}
