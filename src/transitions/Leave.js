import { pixelTransition } from '@utils/PixelTransition.js'

export default class Leave
{
    constructor(data, done, app)
    {
        this.app = app

        // Sync mode: Enter drives the whole transition (teardown, wave, page
        // build). Leave's only job is to keep the old container in the DOM
        // until the wave has fully covered it — barba removes it on done().
        pixelTransition.whenFinished().then(() => done())
    }
}
