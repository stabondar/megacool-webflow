import Tempus from 'tempus'
import EventEmitter from '@utils/EventEmitter'

export default class Time extends EventEmitter
{
    constructor()
    {
        super()

        this.start = Date.now()
        this.current = this.start
        this.elapsed = 0
        this.delta = 16

        // Tempus's rAF loop schedules the next frame AFTER running callbacks
        // and doesn't catch — an exception escaping here would stop rAF for
        // the whole site (gsap, lenis, every module) permanently.
        Tempus.add(() =>
        {
            try
            {
                this.tick()
            }
            catch (error)
            {
                console.warn('Tick handler failed:', error)
            }
        })
    }

    tick()
    {
        const currentTime = Date.now()
        this.delta = currentTime - this.current
        this.current = currentTime
        this.elapsed = this.current - this.start

        this.trigger('tick')
    }
}
