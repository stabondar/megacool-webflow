import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

import { toNumber } from '@utils/Math'

gsap.registerPlugin(SplitText)

const LINE_CLASS = 'tr-line'
const LINE_WRAP_CLASS = 'tr-line-wrap'
const ANIMATED_CLASS = 'tr-animated'
const READY_CLASS = 'tr-ready'
const REFLOW_DEBOUNCE_MS = 150
const DEFAULT_TARGET = '.h-h1, .h-h2, .h-h3, .h-h4, .h-h5, .h-h6, .paragraph, h1, h2, h3, h4, h5, h6, p'

// Resolves once the display fonts have loaded. Used to re-split blocks that
// were split with a fallback font so their line breaks match the final font.
const fontsReady =
    typeof document !== 'undefined' && document.fonts?.ready
        ? document.fonts.ready.then(() => undefined)
        : Promise.resolve()

const getTargets = (wrapper, dataset) =>
{
    const marked = Array.from(wrapper.querySelectorAll('[data-text-reveal]'))
    if (marked.length) return marked

    const selector = dataset.target || DEFAULT_TARGET
    const found = Array.from(wrapper.querySelectorAll(selector))
    if (found.length) return found

    if (wrapper.matches('[data-text-reveal]') || wrapper.matches(selector))
    {
        return [wrapper]
    }

    if (wrapper.dataset.module === 'text-reveal')
    {
        return [wrapper]
    }

    return []
}

const createReveal = (element, config, reduced) =>
{
    const sourceHTML = element.innerHTML.trim()

    let split = null
    let wraps = []
    let observer = null
    let srText = null
    let animatedText = null
    // Editor is handled by the module-level w-editor guard, so this stays false
    // here; the guards below are preserved from the source for fidelity.
    let isEditor = false
    let hasPlayed = false
    let prepared = false
    let playing = false
    let isRevealed = false
    let resizeObserver = null
    let reflowTimer = null
    let lastWidth = -1
    let lastFontSize = ''

    const splitConfig = {
        type: 'lines',
        linesClass: LINE_CLASS,
        autoSplit: false,
        deepSlice: true,
        onSplit: (self) => applyState(self),
    }

    const setVisuallyHidden = (node) =>
    {
        node.style.position = 'absolute'
        node.style.left = '-9999px'
        node.style.top = '-9999px'
        node.style.width = '1px'
        node.style.height = '1px'
        node.style.overflow = 'hidden'
        node.style.whiteSpace = 'nowrap'
    }

    const buildTextCopies = () =>
    {
        if (srText || animatedText) return

        srText = document.createElement('span')
        srText.innerHTML = sourceHTML
        setVisuallyHidden(srText)

        animatedText = document.createElement('span')
        animatedText.className = ANIMATED_CLASS
        animatedText.innerHTML = sourceHTML
        animatedText.setAttribute('aria-hidden', 'true')
        animatedText.style.display = 'block'
        animatedText.style.width = '100%'

        element.innerHTML = ''
        element.appendChild(srText)
        element.appendChild(animatedText)
    }

    const applyLineWraps = (lines) =>
    {
        wraps = []
        lines.forEach((line) =>
        {
            const wrap = document.createElement('div')
            wrap.className = LINE_WRAP_CLASS
            line.parentNode.insertBefore(wrap, line)
            wrap.appendChild(line)
            wraps.push(wrap)
        })
    }

    // Apply the correct static state to freshly-created lines. NEVER animates
    // here — animation is driven explicitly by play(). This is called on the
    // initial split and on every reflow re-split, so it must be idempotent.
    const applyState = (self) =>
    {
        applyLineWraps(self.lines)

        if (isEditor || reduced)
        {
            gsap.set(self.lines, { clearProps: 'transform' })
            return
        }

        // Already shown (revealed once, or currently mid-reveal): keep visible so a
        // reflow re-split can't drop it back to the hidden offset and flash.
        if ((config.once && hasPlayed) || isRevealed || playing)
        {
            gsap.set(self.lines, { yPercent: 0 })
            return
        }

        gsap.set(self.lines, { yPercent: config.y })
        prepared = true
    }

    const unbindReflow = () =>
    {
        if (reflowTimer)
        {
            clearTimeout(reflowTimer)
            reflowTimer = null
        }
        if (resizeObserver) resizeObserver.disconnect()
        resizeObserver = null
    }

    const reflowSplit = (force = false) =>
    {
        if (!split || isEditor || reduced || !animatedText || !split.isSplit) return

        const width = element.clientWidth
        const fontSize = getComputedStyle(element).fontSize
        if (!force && width === lastWidth && fontSize === lastFontSize) return

        lastWidth = width
        lastFontSize = fontSize

        // revert() momentarily restores raw text — hide so it can't flash on screen.
        animatedText.style.visibility = 'hidden'
        split.revert()
        animatedText.innerHTML = sourceHTML
        split.split(splitConfig)
        animatedText.style.visibility = ''
    }

    const scheduleReflow = () =>
    {
        if (reflowTimer) clearTimeout(reflowTimer)
        reflowTimer = setTimeout(() =>
        {
            reflowTimer = null
            reflowSplit()
        }, REFLOW_DEBOUNCE_MS)
    }

    const bindReflow = () =>
    {
        unbindReflow()
        lastWidth = element.clientWidth
        lastFontSize = getComputedStyle(element).fontSize

        if (typeof ResizeObserver !== 'undefined')
        {
            resizeObserver = new ResizeObserver(scheduleReflow)
            resizeObserver.observe(element)
        }
    }

    const clearSplit = (restoreText = true) =>
    {
        if (split?.lines) gsap.killTweensOf(split.lines)

        unbindReflow()
        wraps = []
        split?.revert()
        split = null
        srText = null
        animatedText = null
        hasPlayed = false
        prepared = false
        playing = false
        isRevealed = false
        lastWidth = -1
        lastFontSize = ''

        if (restoreText) element.innerHTML = sourceHTML
    }

    const destroyObserver = () =>
    {
        if (observer) observer.disconnect()
        observer = null
    }

    const ensureSplit = () =>
    {
        if (split?.isSplit) return true
        buildTextCopies()
        if (!animatedText) return false

        split = new SplitText(animatedText, splitConfig)

        if (!split.lines.length)
        {
            split.revert()
            split = null
            return false
        }

        return true
    }

    const prepareHidden = () =>
    {
        if (prepared || isEditor || reduced) return
        ensureSplit()
    }

    const play = () =>
    {
        if (isEditor || reduced) return
        if (config.once && hasPlayed) return
        if (playing || isRevealed) return
        if (!ensureSplit() || !split?.lines.length) return

        playing = true
        gsap.fromTo(
            split.lines,
            { yPercent: config.y },
            {
                yPercent: 0,
                duration: config.duration,
                delay: config.delay,
                stagger: config.stagger,
                ease: config.ease,
                onComplete: () =>
                {
                    playing = false
                    isRevealed = true
                    if (config.once) hasPlayed = true
                },
            }
        )
    }

    const reset = () =>
    {
        if (config.once || !split?.isSplit) return

        isRevealed = false
        playing = false
        gsap.killTweensOf(split.lines)
        gsap.set(split.lines, { yPercent: config.y })
    }

    // onView(element, { autoStart, once, rootMargin, callback }) — an
    // IntersectionObserver that fires immediately with the current state (so a
    // block already scrolled past on load plays right away), plays on enter,
    // resets on leave, and (when once) unbinds after the first enter.
    const bindObserver = () =>
    {
        if (observer || isEditor || reduced) return

        observer = new IntersectionObserver(
            (entries) =>
            {
                entries.forEach((entry) =>
                {
                    if (entry.isIntersecting)
                    {
                        play()
                        if (config.once) destroyObserver()
                    }
                    else
                    {
                        reset()
                    }
                })
            },
            { rootMargin: config.rootMargin, threshold: [0] }
        )
        observer.observe(element)
    }

    const start = () =>
    {
        if (isEditor || reduced || observer) return
        prepareHidden()
        bindReflow()
        bindObserver()
    }

    const stop = () =>
    {
        destroyObserver()
        clearSplit()
    }

    return {
        prepareHidden,
        reflowAfterFonts()
        {
            reflowSplit(true)
        },
        start,
        stop,
        resize: scheduleReflow,
    }
}

/**
 * data-module="text-reveal" on a wrapper — finds child text automatically.
 * Optional: data-target=".h-h1, .paragraph" or mark items with data-text-reveal.
 * Leaf mode: data-module on the text element itself still works.
 */
export default class TextReveal
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.instances = []
        this.booted = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    reveal()
    {
        this.instance.classList.add(READY_CLASS)
    }

    init()
    {
        if (document.documentElement.classList.contains('w-editor')) return

        const dataset = this.instance.dataset

        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const baseConfig = {
            stagger: toNumber(dataset.stagger, 0.08),
            duration: toNumber(dataset.duration, 1),
            delay: toNumber(dataset.delay, 0),
            y: toNumber(dataset.y, 100),
            once: dataset.once !== 'false',
            rootMargin: dataset.rootMargin || '0px 0px -10% 0px',
            ease: dataset.ease || 'expo.out',
        }

        const targets = getTargets(this.instance, dataset)
        if (!targets.length)
        {
            this.reveal()
            return
        }

        this.instances = targets.map((target) =>
        {
            const d = target.dataset
            const config = {
                stagger: toNumber(d.stagger, baseConfig.stagger),
                duration: toNumber(d.duration, baseConfig.duration),
                delay: toNumber(d.delay, baseConfig.delay),
                y: toNumber(d.y, baseConfig.y),
                once: d.once === 'false' ? false : d.once === 'true' ? true : baseConfig.once,
                rootMargin: d.rootMargin || baseConfig.rootMargin,
                ease: d.ease || baseConfig.ease,
            }
            return createReveal(target, config, this.reduced)
        })

        if (this.reduced)
        {
            this.reveal()
            return
        }

        this.boot()
    }

    boot()
    {
        if (this.booted || this.reduced) return
        this.booted = true

        // If fonts are already loaded, the initial split used the real font — line
        // breaks are correct and a fonts-ready re-split would be pure waste (and a
        // needless revert of every block). Only reflow when fonts were still
        // loading at split time and could have changed line wrapping.
        const fontsWereLoading = document.fonts?.status === 'loading'

        this.instances.forEach((instance) => instance.start())
        this.reveal()

        if (fontsWereLoading)
        {
            fontsReady.then(() =>
            {
                if (this.destroyed) return
                this.instances.forEach((instance) => instance.reflowAfterFonts())
            })
        }
    }

    resize()
    {
        if (this.destroyed) return

        this.instances.forEach((instance) => instance.resize())
    }

    destroy()
    {
        if (this.destroyed) return

        this.destroyed = true
        this.instances.forEach((instance) => instance.stop())
    }
}
