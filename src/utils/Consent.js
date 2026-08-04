/**
 * Consent engine — the single source of truth for what this site is allowed to
 * load. The banner (modules/CookieConsent.js) is only a face on top of it;
 * everything that actually enforces a choice lives here:
 *
 *   - nothing outside "necessary" runs until the visitor opts in (GDPR art. 6
 *     — prior consent, no pre-ticked boxes, silence is a refusal)
 *   - the choice is recorded with a timestamp, an id and the version of the
 *     categories it was given against, so it can be produced as proof
 *   - Google Consent Mode v2 signals are emitted for tags that understand them
 *   - cookies belonging to a category that was refused (or withdrawn) are
 *     swept from the browser instead of being left to expire
 *
 * How to gate something on consent:
 *
 *   Markup (the tag stays inert until its category is granted):
 *     <script type="text/plain" data-consent-category="marketing" data-consent-src="https://..."></script>
 *     <iframe data-consent-category="functional" data-consent-src="https://..."></iframe>
 *
 *   Code:
 *     import { consent } from '@utils/Consent.js'
 *     consent.onConsent('performance', () => startAnalytics())
 *
 * Google tags must be told to hold back BEFORE they load, which is earlier than
 * this bundle. Put this in the Webflow head custom code, above any GTM/GA
 * snippet — it is the same default this file re-asserts on boot:
 *
 *   <script>
 *     window.dataLayer = window.dataLayer || []
 *     function gtag(){dataLayer.push(arguments)}
 *     gtag('consent', 'default', {
 *       ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
 *       analytics_storage: 'denied', functionality_storage: 'denied',
 *       personalization_storage: 'denied', security_storage: 'granted',
 *       wait_for_update: 2000
 *     })
 *   </script>
 */

const STORE_KEY = 'mc-consent'
const COOKIE_NAME = 'mc-consent'

// Bump when the categories, the tools behind them, or the policy text change:
// every visitor is asked again, because consent has to be informed about what
// it is actually consenting to.
export const CONSENT_VERSION = 1

// The version of the published Cookie Policy the record was given against —
// stored with the record so an audit can tell which text the visitor saw.
export const POLICY_VERSION = '2026-07'

// EDPB guidance treats ~6 months as the practical ceiling before a site should
// ask again rather than assume the old answer still holds.
const LIFETIME_DAYS = 182

export const CATEGORIES = ['necessary', 'performance', 'functional', 'marketing']

// The pre-decision state, and what a refusal returns to. Necessary is true
// because it covers what the site cannot work without — it is never asked for.
const DENIED = { necessary: true, performance: false, functional: false, marketing: false }

// Cookies the tools this site can load are known to drop, grouped by the
// category that authorises them. Used to clear up after a refusal or a
// withdrawal — regex because most of these carry a per-property suffix.
const KNOWN_COOKIES = {
    performance: [/^_ga/, /^_gid$/, /^_gat/, /^__hstc$/, /^__hssrc$/, /^__hssc$/, /^hubspotutk$/],
    functional: [/^__hs_opt_out$/, /^__hs_initial_opt_in$/, /^__hs_cookie_cat_pref$/],
    marketing: [
        /^_gcl/,
        /^_fbp$/,
        /^_fbc$/,
        /^li_/,
        /^bcookie$/,
        /^bscookie$/,
        /^lidc$/,
        /^UserMatchHistory$/,
        /^_uet/,
    ],
}

// Consent Mode v2 signal names per category — tags read these, not our state.
const GOOGLE_SIGNALS = {
    performance: ['analytics_storage'],
    functional: ['functionality_storage', 'personalization_storage'],
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
}

class Consent
{
    constructor()
    {
        this.callbacks = {}

        const stored = this.read()

        this.decided = Boolean(stored)
        this.state = stored ? { ...DENIED, ...stored.categories, necessary: true } : { ...DENIED }
        this.stored = stored

        // Assert the deny-by-default signal as early as this bundle can, then
        // immediately replay a stored decision on top of it.
        this.pushGoogleConsent('default')
        if (this.decided) this.pushGoogleConsent('update')

        this.apply()
    }

    /* ---------------------------------------------------------------- state */

    has(category)
    {
        return Boolean(this.state[category])
    }

    hasDecision()
    {
        return this.decided
    }

    categories()
    {
        return { ...this.state }
    }

    // The proof-of-consent record: who said what, when, and against which
    // version of the categories and the policy text.
    record()
    {
        return this.stored ? { ...this.stored } : null
    }

    /* ------------------------------------------------------------- decisions */

    acceptAll()
    {
        this.commit({ performance: true, functional: true, marketing: true })
    }

    rejectAll()
    {
        this.commit({ performance: false, functional: false, marketing: false })
    }

    // Partial update — anything omitted keeps its current value, so the
    // preference panel can save exactly what its toggles show.
    update(categories)
    {
        this.commit(categories)
    }

    // Erase the record entirely: the next page view is back to pre-consent,
    // banner included. This is the "withdraw at any time" leg of art. 7(3).
    withdraw()
    {
        this.decided = false
        this.stored = null
        this.state = { ...DENIED }

        try
        {
            window.localStorage?.removeItem(STORE_KEY)
        }
        catch (error)
        {
            // Storage can be blocked outright (Safari private mode, iframes)
        }

        this.writeCookie(null)
        this.pushGoogleConsent('update')
        this.apply()
        this.emit('change', { categories: this.categories(), decided: false })
    }

    commit(categories)
    {
        const next = { ...this.state }
        CATEGORIES.forEach((category) =>
        {
            if (category === 'necessary') return
            if (typeof categories[category] === 'boolean') next[category] = categories[category]
        })

        this.state = { ...next, necessary: true }
        this.decided = true
        this.stored = {
            id: this.stored?.id || this.uid(),
            version: CONSENT_VERSION,
            policy: POLICY_VERSION,
            timestamp: new Date().toISOString(),
            categories: this.categories(),
        }

        this.persist()
        this.pushGoogleConsent('update')
        this.apply()
        this.emit('change', { categories: this.categories(), decided: true, record: this.record() })
    }

    /* -------------------------------------------------------------- storage */

    read()
    {
        const raw = this.readStorage() || this.readCookie()
        if (!raw) return null

        let parsed = null
        try
        {
            parsed = JSON.parse(raw)
        }
        catch (error)
        {
            return null
        }

        if (!parsed || typeof parsed !== 'object' || !parsed.categories) return null

        // A record given against an older set of categories, or one older than
        // the lifetime, is not a decision about today's site — ask again.
        if (parsed.version !== CONSENT_VERSION) return null

        const age = Date.now() - Date.parse(parsed.timestamp || '')
        if (!Number.isFinite(age) || age > LIFETIME_DAYS * 864e5) return null

        return parsed
    }

    readStorage()
    {
        try
        {
            return window.localStorage?.getItem(STORE_KEY) || null
        }
        catch (error)
        {
            return null
        }
    }

    // Mirrored into a first-party cookie so the decision is also readable
    // outside this bundle — server side, at the edge, or by a tag manager.
    readCookie()
    {
        const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
        return match ? decodeURIComponent(match[1]) : null
    }

    persist()
    {
        const raw = JSON.stringify(this.stored)

        try
        {
            window.localStorage?.setItem(STORE_KEY, raw)
        }
        catch (error)
        {
            // Cookie mirror below still carries the record
        }

        this.writeCookie(raw)
    }

    writeCookie(raw)
    {
        const secure = window.location.protocol === 'https:' ? '; Secure' : ''

        if (raw === null)
        {
            document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
            return
        }

        const maxAge = LIFETIME_DAYS * 86400
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(raw)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
    }

    uid()
    {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID()
        return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    }

    /* ----------------------------------------------------------- enforcement */

    // Everything that has to happen when the state changes, in the order that
    // matters: stop feeding what is now refused, then release what is allowed.
    apply()
    {
        this.sweepCookies()
        this.activate()
    }

    // Swap gated tags for live ones. Inert scripts are declared as
    // type="text/plain" so the browser never fetches or runs them; iframes and
    // images hold their URL in data-consent-src for the same reason.
    activate(root = document)
    {
        const scripts = root.querySelectorAll('script[type="text/plain"][data-consent-category]')
        scripts.forEach((node) =>
        {
            if (!this.has(node.dataset.consentCategory)) return

            const script = document.createElement('script')

            for (const { name, value } of node.attributes)
            {
                if (name === 'type' || name === 'data-consent-src') continue
                script.setAttribute(name, value)
            }

            const src = node.dataset.consentSrc
            if (src) script.src = src
            else script.text = node.textContent

            node.replaceWith(script)
        })

        const embeds = root.querySelectorAll('iframe[data-consent-src], img[data-consent-src]')
        embeds.forEach((node) =>
        {
            if (!this.has(node.dataset.consentCategory)) return
            if (node.src === node.dataset.consentSrc) return

            node.src = node.dataset.consentSrc
        })
    }

    // Best effort: a page can only delete cookies its own document can see, so
    // third-party cookies set on another domain are out of reach — but the
    // first-party ones the trackers wrote here (_ga, hubspotutk, _fbp …) are
    // ours to remove, and leaving them behind after a refusal is exactly what
    // supervisory authorities flag.
    sweepCookies()
    {
        const denied = CATEGORIES.filter((category) => category !== 'necessary' && !this.has(category))
        if (!denied.length) return

        const patterns = denied.flatMap((category) => KNOWN_COOKIES[category] || [])
        if (!patterns.length) return

        const host = window.location.hostname
        const domains = [undefined, host, `.${host}`]

        // A cookie set on ".example.com" is not cleared by a delete scoped to
        // "www.example.com", so walk the parent domains too.
        const parts = host.split('.')
        for (let i = 1; i < parts.length - 1; i++) domains.push(`.${parts.slice(i).join('.')}`)

        document.cookie.split('; ').forEach((entry) =>
        {
            const name = entry.split('=')[0]
            if (!name || !patterns.some((pattern) => pattern.test(name))) return

            domains.forEach((domain) =>
            {
                const scope = domain ? `; Domain=${domain}` : ''
                document.cookie = `${name}=; Path=/; Max-Age=0${scope}`
            })
        })
    }

    pushGoogleConsent(type)
    {
        window.dataLayer = window.dataLayer || []

        // Google's own snippet shape: the command must reach dataLayer as an
        // Arguments object, which is what this wrapper produces. Reused if the
        // head snippet already defined it.
        window.gtag =
            window.gtag ||
            function gtag()
            {
                window.dataLayer.push(arguments)
            }

        const payload = { security_storage: 'granted' }
        Object.entries(GOOGLE_SIGNALS).forEach(([category, signals]) =>
        {
            const value = this.has(category) ? 'granted' : 'denied'
            signals.forEach((signal) => (payload[signal] = value))
        })

        // Give tags that load before a stored decision is replayed a moment to
        // wait for it instead of firing on the default deny.
        if (type === 'default') payload.wait_for_update = 2000

        window.gtag('consent', type, payload)
    }

    /* --------------------------------------------------------------- events */

    // Reopen the preference centre from anywhere — a footer link, an embed, a
    // console call. The UI module listens for this; if it never mounted (the
    // Webflow editor), nothing happens rather than throwing.
    open()
    {
        document.dispatchEvent(new CustomEvent('consent:open'))
    }

    on(event, callback)
    {
        if (!this.callbacks[event]) this.callbacks[event] = []
        this.callbacks[event].push(callback)

        return () => this.off(event, callback)
    }

    off(event, callback)
    {
        const list = this.callbacks[event]
        if (!list) return

        this.callbacks[event] = list.filter((entry) => entry !== callback)
    }

    // Run now if the category is already granted, otherwise the first time it
    // is — the shape most integrations want ("start this when you may").
    onConsent(category, callback)
    {
        if (this.has(category))
        {
            callback(this.categories())
            return () =>
            {}
        }

        const unsubscribe = this.on('change', () =>
        {
            if (!this.has(category)) return
            unsubscribe()
            callback(this.categories())
        })

        return unsubscribe
    }

    emit(event, detail)
    {
        ;(this.callbacks[event] || []).forEach((callback) => callback(detail))

        // Also surfaced on the document so Webflow embeds and third-party
        // snippets can listen without importing anything.
        document.dispatchEvent(new CustomEvent(`consent:${event}`, { detail }))
    }
}

export const consent = new Consent()

// Public handle for the Webflow side of the site: onetrust-style calls like
// window.megacoolConsent.open() from a footer link or an embed.
window.megacoolConsent = consent

export default consent
