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

        if (document.documentElement.classList.contains('w-editor')) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        this.hero = this.main.querySelector('.hero') ?? this.main.querySelector('section')
        if (!this.hero) return

        this.build()
        this.start()
    }

    // split into clip-masked lines (+ words); returns the words to roll
    words(el)
    {
        const split = new SplitText(el, { type: 'lines, words' })
        gsap.set(split.lines, { overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' })
        this.splits.push(split)
        return split.words
    }

    build()
    {
        const heading = this.hero.querySelector('h1, .h-h1')
        const descrs = [...this.hero.querySelectorAll('.paragraph, p')]
        const btns = [...this.hero.querySelectorAll('.button, .btn')]

        if (heading) this.tl.fromTo(this.words(heading), { yPercent: 110 }, { yPercent: 0, stagger: 0.05 }, 0.2)

        // descriptions reveal as whole elements (no SplitText), fading up
        if (descrs.length) this.tl.fromTo(descrs, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, '<0.2')

        if (btns.length) this.tl.fromTo(btns, { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.1 }, '<0.2')
    }

    complete()
    {
        this.revert()
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
        this.revert()
    }
}
