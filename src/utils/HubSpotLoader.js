const SCRIPT_ID = 'hubspot-forms-v2'

/**
 * Loads the HubSpot forms embed script once and shares the same promise across
 * every form instance on the page.
 *
 * HubSpot serves a region-specific host — na1 lives on the bare js.hsforms.net,
 * every other region is prefixed (eu1 -> js-eu1.hsforms.net). The v2 create()
 * call also takes a region, but the script host must match or EU/AP portals
 * silently fail to resolve the form. The URL is therefore derived from region.
 */
class HubSpotLoader
{
    constructor()
    {
        this.loading = false
        this.loaded = false
        this.callbacks = []
    }

    scriptUrl(region)
    {
        const host = !region || region === 'na1' ? 'js' : `js-${region}`
        return `https://${host}.hsforms.net/forms/embed/v2.js`
    }

    load(region = 'na1')
    {
        return new Promise((resolve, reject) =>
        {
            // Already available
            if (window.hbspt)
            {
                this.loaded = true
                resolve(window.hbspt)
                return
            }

            // A load is already in flight — queue onto it
            if (this.loading)
            {
                this.callbacks.push({ resolve, reject })
                return
            }

            this.loading = true
            this.callbacks.push({ resolve, reject })

            const script = document.createElement('script')
            script.src = this.scriptUrl(region)
            script.id = SCRIPT_ID
            script.async = true
            script.charset = 'utf-8'

            script.onload = () =>
            {
                this.loaded = true
                this.loading = false

                this.callbacks.forEach((cb) => cb.resolve(window.hbspt))
                this.callbacks = []
            }

            script.onerror = () =>
            {
                this.loading = false
                const error = new Error('Failed to load HubSpot forms script')

                this.callbacks.forEach((cb) => cb.reject(error))
                this.callbacks = []
            }

            document.head.appendChild(script)
        })
    }

    isLoaded()
    {
        return this.loaded || !!window.hbspt
    }
}

// Singleton — one script for the whole app
export default new HubSpotLoader()
