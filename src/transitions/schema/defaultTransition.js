export const defaultTransition = (name, app, CheckPages) =>
{
    const transition = {
        name: name,
        // Osmo-style pixel wave: leave and enter run concurrently, with both
        // containers in the DOM — the incoming page is revealed on top by a
        // stepped clip-path while the old one stays put underneath.
        sync: true,
        async leave(data)
        {
            const done = this.async()
            const LeaveModule = await import('@transitions/Leave.js')
            new LeaveModule.default(data, done, app)
        },
        async enter(data)
        {
            const EnterModule = await import('@transitions/Enter.js')
            const enter = new EnterModule.default(data, CheckPages, app)
            await enter.finished
        },
    }

    return transition
}
