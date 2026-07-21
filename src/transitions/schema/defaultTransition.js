export const defaultTransition = (name, app, CheckPages) =>
{
    const transition = {
        name: name,
        // Gradient-mask curtain: leave and enter run concurrently, with both
        // containers in the DOM — the loader curtain sweeps in over the old
        // page, the containers swap under full cover, and it sweeps out.
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
