import { gradientTransition } from '@utils/GradientTransition.js'

export default class Leave
{
    constructor(data, done, app)
    {
        this.app = app
        this.app.options.onceLoaded = true

        // Sync mode: Enter drives the whole transition (teardown, curtain,
        // page build). Leave's only job is to keep the old container in the
        // DOM until the curtain has fully passed — barba removes it on done().
        gradientTransition.whenFinished().then(() => done())
    }
}
