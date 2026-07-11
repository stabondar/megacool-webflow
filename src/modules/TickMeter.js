import gsap from 'gsap'

import { shuffle, toNumber } from '@utils/Math.js'

const TICK_CLASS = 'smh__tick'
const CHAR_CLASS = 'tm-char'
const TEXT_SELECTOR = '.eyebrow'
const ACTIVE_CLASS = 'is-active'
const READY_CLASS = 'is-ready'

export default class TickMeter
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        const dataset = this.instance.dataset

        this.config = {
            count: Math.max(1, Math.round(toNumber(dataset.count, 70))),
            speed: toNumber(dataset.speed, 24),
            width: toNumber(dataset.width, 8),
            plateau: toNumber(dataset.plateau, 0.2),
            fade: toNumber(dataset.fade, 0.7),
            reveal: toNumber(dataset.reveal, 0.12),
        }

        const styles = getComputedStyle(this.instance)
        this.idle = styles.getPropertyValue('--idle').trim() || '#3a3a3a'
        this.active = styles.getPropertyValue('--active').trim() || '#4fd6c4'
        this.min = toNumber(styles.getPropertyValue('--min'), 0.22)

        this.lerpColor = gsap.utils.interpolate(this.idle, this.active)
        this.span = this.config.count + this.config.width * 2

        const scope = this.instance.parentElement ?? document
        this.labelsWrap = scope.querySelector('.smh__data-labels-wrap') ?? null
        this.labels = Array.from(scope.querySelectorAll('[data-label]'))

        this.texts = this.labels.map((label) =>
        {
            const textEl = this.getTextEl(label)
            return (textEl.textContent ?? '').trim() || ' '
        })

        this.ticks = []
        this.charEls = []
        this.running = false
        this.activeLabel = 0
        this.cycle = 0
        this.startTime = 0

        this.isEditor = document.documentElement.classList.contains('w-editor')
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        this.createTicks()

        this.app.on('tick', () => this.render())

        if (!this.isEditor && !this.reduced)
        {
            this.resetLabels()
            this.start()
        }
        else
        {
            this.staticState()
            if (this.labels.length) this.showLabel(this.activeLabel)
        }
    }

    getTextEl(label)
    {
        return label.querySelector(TEXT_SELECTOR) ?? label.firstElementChild ?? label
    }

    createTicks()
    {
        if (this.ticks.length) return
        this.instance.querySelectorAll(`.${TICK_CLASS}`).forEach((el) => el.remove())

        const fragment = document.createDocumentFragment()
        for (let i = 0; i < this.config.count; i++)
        {
            const tick = document.createElement('span')
            tick.className = TICK_CLASS
            fragment.appendChild(tick)
            this.ticks.push(tick)
        }
        this.instance.appendChild(fragment)
    }

    removeTicks()
    {
        this.ticks.forEach((tick) => tick.remove())
        this.ticks = []
    }

    killLabelTweens()
    {
        if (this.charEls.length) gsap.killTweensOf(this.charEls)
        this.charEls = []
    }

    restoreLabel(label, text)
    {
        this.getTextEl(label).textContent = text
    }

    setLabelActive(index)
    {
        this.labels.forEach((label, i) =>
        {
            label.classList.toggle(ACTIVE_CLASS, i === index)
        })
    }

    buildChars(label, text)
    {
        const textEl = this.getTextEl(label)
        this.killLabelTweens()
        textEl.textContent = ''

        this.charEls = text.split('').map((char) =>
        {
            const span = document.createElement('span')
            span.className = CHAR_CLASS
            span.textContent = char
            textEl.appendChild(span)
            return span
        })

        return this.charEls
    }

    setTextInstant(label, text)
    {
        this.killLabelTweens()
        this.restoreLabel(label, text)
    }

    revealText(label, text)
    {
        const chars = this.buildChars(label, text)
        if (!chars.length) return

        if (this.reduced)
        {
            gsap.set(chars, { opacity: 1 })
            return
        }

        gsap.set(chars, { opacity: 0 })

        shuffle(chars).forEach((char) =>
        {
            gsap.to(char, {
                opacity: 1,
                duration: this.config.reveal,
                delay: Math.random() * this.config.fade,
                ease: 'power2.out',
            })
        })
    }

    showLabel(index)
    {
        this.labels.forEach((label, i) =>
        {
            if (i === index)
            {
                this.setTextInstant(label, this.texts[i])
            }
            else
            {
                this.restoreLabel(label, this.texts[i])
            }
        })
        this.setLabelActive(index)
    }

    resetLabels()
    {
        if (!this.labels.length) return
        this.activeLabel = 0
        this.showLabel(0)
        this.labelsWrap?.classList.add(READY_CLASS)
    }

    swapLabel()
    {
        if (this.labels.length < 2) return

        const next = (this.activeLabel + 1) % this.labels.length

        this.restoreLabel(this.labels[this.activeLabel], this.texts[this.activeLabel])
        this.setLabelActive(next)
        this.revealText(this.labels[next], this.texts[next])

        this.activeLabel = next
    }

    render()
    {
        if (this.destroyed || !this.running) return

        const time = (this.app.tick.elapsed - this.startTime) / 1000
        const travelled = time * this.config.speed
        const currentCycle = Math.floor(travelled / this.span)

        if (currentCycle !== this.cycle)
        {
            this.cycle = currentCycle
            this.swapLabel()
        }

        const head = (travelled % this.span) - this.config.width

        for (let i = 0; i < this.ticks.length; i++)
        {
            const distance = Math.abs(i - head) / this.config.width
            let falloff = 0

            if (distance <= this.config.plateau)
            {
                falloff = 1
            }
            else if (distance < 1)
            {
                falloff = (1 - distance) / (1 - this.config.plateau)
            }

            const tick = this.ticks[i]
            tick.style.transform = `scaleY(${this.min + (1 - this.min) * falloff})`
            tick.style.backgroundColor = this.lerpColor(falloff)
        }
    }

    stop()
    {
        this.running = false
    }

    start()
    {
        if (this.running || this.isEditor || this.reduced) return
        this.cycle = 0
        this.startTime = this.app.tick.elapsed
        this.running = true
    }

    staticState()
    {
        this.ticks.forEach((tick) =>
        {
            tick.style.transform = `scaleY(${this.min})`
            tick.style.backgroundColor = this.idle
        })
    }

    cleanupLabels()
    {
        this.killLabelTweens()
        this.labels.forEach((label, i) =>
        {
            this.restoreLabel(label, this.texts[i])
            label.classList.remove(ACTIVE_CLASS)
        })
        this.labelsWrap?.classList.remove(READY_CLASS)
    }

    resize()
    {
        if (this.destroyed) return
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.stop()
        this.cleanupLabels()
        this.removeTicks()
    }
}
