import { gsap, ScrollTrigger } from 'gsap/all'

gsap.registerPlugin(ScrollTrigger)

export default class ChangeNav
{
    constructor(instance, app)
    {
        this.instance = instance
        this.app = app

        this.destroyed = false

        this.nav = document.querySelector('.nav')
        this.navMob = document.querySelector('.bold-nav-full__bar')
        this.add = this.instance.hasAttribute('data-black') ? true : false
        this.onPass = this.instance.hasAttribute('data-leave')
        this.enterClass = null
        this.backClass = null
        this.once = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        const top = this.nav.offsetHeight / 2

        // this.nav = window.innerWidth > 991 ? this.navDesktop : this.navMob

        this.scroll = ScrollTrigger.create({
            trigger: this.instance,
            start: `top ${top}px`,
            onEnter: () =>
            {
                if (!this.once)
                {
                    this.enterClass = this.nav.classList.contains('black') ? true : false
                    this.once = true
                }
                if (this.add)
                {
                    this.nav.classList.add('black')
                }
                else
                {
                    this.nav.classList.remove('black')
                }
            },
            onEnterBack: () =>
            {
                if (this.onPass)
                {
                    if (!this.once)
                    {
                        this.backClass = this.nav.classList.contains('black') ? true : false
                        this.once = true
                    }
                    if (this.add)
                    {
                        this.nav.classList.add('black')
                    }
                    else
                    {
                        this.nav.classList.remove('black')
                    }
                }
            },
            onLeave: () =>
            {
                if (this.onPass)
                {
                    if (this.backClass)
                    {
                        this.nav.classList.add('black')
                    }
                    else
                    {
                        this.nav.classList.remove('black')
                    }
                }
            },
            onLeaveBack: () =>
            {
                if (this.enterClass)
                {
                    this.nav.classList.add('black')
                }
                else
                {
                    this.nav.classList.remove('black')
                }
            },
        })
    }

    resize()
    {
        if (this.destroyed) return

        this.scroll?.kill()
        this.init()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.scroll?.kill()
    }
}
