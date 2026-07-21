import gsap from 'gsap'

import TransitionLogo from '@utils/TransitionLogo.js'

const MASK_LEFT = 'linear-gradient(to right, transparent -150%, #000 -125%, #000 -25%, transparent 0%, transparent 0%)'
const MASK_COVER = 'linear-gradient(to right, transparent -25%, #000 0%, #000 100%, transparent 125%, transparent 125%)'
const MASK_RIGHT =
    'linear-gradient(to right, transparent 100%, #000 125%, #000 225%, transparent 250%, transparent 250%)'

class GradientTransition
{
    constructor({ duration = 1, ease = 'expo.inOut' } = {})
    {
        this.duration = duration
        this.ease = ease

        this.reduced =
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
                : false

        this._deferred = null
    }

    // Shared completion signal: Leave awaits it, run()/skip() resolve it.
    // Lazily created so it works no matter whether barba executes the leave or
    // the enter hook first in sync mode.
    whenFinished()
    {
        if (!this._deferred)
        {
            let resolve
            const promise = new Promise((r) => (resolve = r))
            this._deferred = { promise, resolve }
        }
        return this._deferred.promise
    }

    finish()
    {
        const deferred = this._deferred
        this._deferred = null
        deferred?.resolve()
    }

    // Reduced-motion path: no curtain, just release the leave hook.
    skip()
    {
        const curtain = this.ensureOverlay(false)
        if (curtain) gsap.set(curtain, { autoAlpha: 0 })

        this.whenFinished()
        this.finish()
    }

    ensureOverlay(inject = true)
    {
        if (this.curtain?.isConnected)
        {
            // The logo markup can land after the first lookup (publish order,
            // late embeds) — re-scan the curtain until paths are found.
            if (!this.logo?.items.length) this.logo = new TransitionLogo(this.curtain)
            return this.curtain
        }

        let curtain = document.querySelector('.transition')
        if (!curtain)
        {
            if (!inject) return null

            curtain = document.createElement('div')
            curtain.classList.add('transition')
            curtain.style.cssText = 'position: fixed; inset: 0; background-color: #07ffe4; pointer-events: none;'
            document.body.appendChild(curtain)
        }

        // The curtain must clear the pinned containers (the incoming page sits
        // at z 90); respect any higher Webflow-authored stacking.
        const z = parseInt(getComputedStyle(curtain).zIndex, 10)
        if (!(z > 90)) curtain.style.zIndex = '100'

        this.curtain = curtain
        this.logo = new TransitionLogo(curtain)
        return curtain
    }

    sweep(from, to, delay)
    {
        return gsap.fromTo(
            this.curtain,
            { maskImage: from },
            { maskImage: to, duration: this.duration, ease: this.ease, delay: delay ? delay : 0 }
        )
    }

    // First-load logo intro: the letters assemble element by element on the
    // curtain while the page loads behind it. hideCurtain() waits for the
    // assembly before sweeping out. Called as soon as the loader boots.
    intro()
    {
        const curtain = this.ensureOverlay(false)
        if (!curtain || this.reduced) return

        this.logo.hide()
        this.loadMorph = this.logo.morphIn({ delay: 0.2 })
    }

    // First-load reveal: the band slides off to the right, uncovering the page
    // left → right.
    async hideCurtain()
    {
        const curtain = this.ensureOverlay(false)
        if (!curtain) return

        if (this.reduced)
        {
            gsap.set(curtain, { autoAlpha: 0 })
            return
        }

        // Chase the logo assembly instead of waiting it out: the letters
        // build left → right and the sweep also hides left → right, so the
        // wipe can start while the last (right-most) letters finish ahead of
        // its edge. `chase` is how much of the morph tail overlaps the sweep —
        // raise it to start the curtain even sooner, 0 to wait for the full
        // assembly again.
        const chase = 0.4
        const morph = this.loadMorph
        if (morph)
        {
            const remaining = Math.max(0, morph.totalDuration() - morph.totalTime() - chase)
            if (remaining) await new Promise((resolve) => gsap.delayedCall(remaining, resolve))

            // A transition took over the curtain mid-wait — its pass owns the
            // exit now.
            if (this.loadMorph !== morph) return
            this.loadMorph = null
        }

        // onComplete, not .then(): a transition starting mid-sweep kills this
        // tween, and the late autoAlpha 0 must die with it or it would hide
        // the curtain in the middle of that transition's pass.
        const tween = this.sweep(MASK_COVER, MASK_RIGHT)
        tween.eventCallback('onComplete', () => gsap.set(curtain, { autoAlpha: 0 }))
    }

    /**
     * Page-transition curtain. `next` is the incoming barba container, already
     * pinned above the old page but kept invisible. The curtain sweeps in over
     * the old page; once `ready` (the page build) resolves the containers swap
     * under full cover — onSwap fires there — and the curtain sweeps out to
     * reveal the new page. Resolves whenFinished() after the exit sweep.
     */
    run(next, { ready = Promise.resolve(), onSwap } = {})
    {
        const finished = this.whenFinished()
        const curtain = this.ensureOverlay()

        // A transition can start while the first-load sweep or logo intro is
        // still playing — take over the curtain cleanly, with the logo in its
        // final authored state (transitions show it formed, no morph).
        gsap.killTweensOf(curtain)
        if (this.loadMorph)
        {
            this.loadMorph.kill()
            this.loadMorph = null
            this.logo.reset()
        }

        gsap.set(next, { autoAlpha: 0, maxHeight: '100dvh' })
        gsap.set(curtain, { autoAlpha: 1, maskImage: MASK_LEFT })

        const play = async () =>
        {
            await this.sweep(MASK_LEFT, MASK_COVER)
            await ready

            gsap.set(next, { autoAlpha: 1 })
            onSwap?.()

            await this.sweep(MASK_COVER, MASK_RIGHT)

            gsap.set(curtain, { autoAlpha: 0 })
            gsap.set(next, { clearProps: 'maxHeight' })
            this.finish()
        }

        play()

        return finished
    }
}

export const gradientTransition = new GradientTransition()
export default GradientTransition
