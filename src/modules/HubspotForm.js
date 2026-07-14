import HubSpotLoader from '@utils/HubSpotLoader'
import TextHover from '@modules/TextHover.js'
import { ScrollTrigger } from '@utils/GSAP.js'

// Client-provided values (MegaCool EU portal). Each can be overridden per
// element with data-portal-id / data-form-id / data-region so the same module
// drives any HubSpot form on the site.
const DEFAULTS = {
    portalId: '147924457',
    formId: 'fa7d3834-c944-49f3-a65f-c4b5601e5cf0',
    region: 'eu1',
}

/**
 * Renders a HubSpot form into [data-module="hubspot-form"]. Mirrors the
 * Archetype Form module: the embed script loads once (region-aware) and the
 * form is injected as raw HTML — HubSpot's own stylesheet is suppressed so the
 * styling is fully owned by css/modules/hubspot-form.scss.
 *
 * Optional data attributes:
 *   data-portal-id / data-form-id / data-region  (fall back to DEFAULTS)
 *   data-css-class="my-class"    extra class HubSpot adds to the <form>
 *   data-strip-richtext="true"   remove HubSpot rich-text rows (OFF by default:
 *                                EU forms often carry GDPR consent copy that
 *                                must stay visible)
 *   data-redirect="/thank-you"   navigate here after a successful submit
 */
export default class HubspotForm
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false
        this.formLoaded = false

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        this.loadForm()
    }

    async loadForm()
    {
        const portalId = this.instance.dataset.portalId || DEFAULTS.portalId
        const formId = this.instance.dataset.formId || DEFAULTS.formId
        const region = this.instance.dataset.region || DEFAULTS.region

        if (!portalId || !formId)
        {
            console.error('HubspotForm: missing portalId or formId')
            return
        }

        try
        {
            await HubSpotLoader.load(region)
            this.createForm(portalId, formId, region)
        }
        catch (error)
        {
            console.error('HubspotForm: failed to load HubSpot forms', error)
        }
    }

    createForm(portalId, formId, region)
    {
        // Guard against a late script resolve after teardown, or a double init
        if (this.destroyed || this.formLoaded) return

        // HubSpot targets a selector, so the element needs a stable id
        if (!this.instance.id)
        {
            this.instance.id = `hubspot-form-${formId}`
        }

        window.hbspt.forms.create({
            region,
            portalId,
            formId,
            target: `#${this.instance.id}`,
            // Raw HTML, no HubSpot CSS — our SCSS owns the look
            cssRequired: '',
            css: '',
            cssClass: this.instance.dataset.cssClass || '',
            onFormReady: ($form) => this.onFormReady($form),
            onFormSubmit: ($form) => this.onFormSubmit($form),
            onFormSubmitted: ($form) => this.onFormSubmitted($form),
        })
    }

    onFormReady($form)
    {
        if (this.destroyed) return

        this.formLoaded = true

        this.applyPlaceholders()
        this.enhanceSubmit()

        if (this.instance.dataset.stripRichtext === 'true') this.stripRichtext()

        // The injected form grows the document; let it lay out, then re-measure
        // so Lenis + ScrollTrigger positions stay correct (same reason the
        // Accordion refreshes after opening).
        this.refreshTimer = setTimeout(() =>
        {
            if (this.destroyed) return
            ScrollTrigger.refresh()
        }, 300)

        this.app.trigger('hubspotForm:ready')
    }

    onFormSubmit($form)
    {
        this.app.trigger('hubspotForm:submit')
    }

    onFormSubmitted($form)
    {
        this.app.trigger('hubspotForm:submitted')

        const redirect = this.instance.dataset.redirect
        if (redirect) window.location.assign(redirect)
    }

    // The Figma shows each field's name as the placeholder inside its box, but
    // HubSpot ships the fields with a visible <label> and an empty placeholder.
    // Mirror the label text into the placeholder (respecting any placeholder
    // already set in HubSpot); the label is hidden via CSS but kept for a11y.
    applyPlaceholders()
    {
        const fields = this.instance.querySelectorAll('.hs-fieldtype-text, .hs-fieldtype-textarea')
        fields.forEach((field) =>
        {
            const control = field.querySelector('input, textarea')
            const label = field.querySelector('label')
            if (!control || !label || control.placeholder) return

            // Drop the trailing required asterisk HubSpot appends to the label
            const text = label.textContent.replace(/\*+\s*$/, '').trim()
            if (text) control.placeholder = text
        })
    }

    // Give the submit button the site-wide char-scatter hover. HubSpot's submit
    // is an <input> (no splittable text nodes), so the native input keeps
    // handling submission with its own label hidden, and a [data-text] overlay
    // carries the animated text. TextHover uses .actions as the hover trigger —
    // the same pattern as the site's other buttons.
    enhanceSubmit()
    {
        const input =
            this.instance.querySelector('input.hs-button') || this.instance.querySelector('input[type="submit"]')
        if (!input) return

        const actions = input.closest('.actions') || input.parentElement
        if (!actions || actions.querySelector('.hs-button-label')) return

        const label = document.createElement('span')
        label.className = 'hs-button-label'
        label.setAttribute('data-text', '')
        label.textContent = input.value || ''
        actions.appendChild(label)

        this.textHover = new TextHover(actions, this.app, this.main)
    }

    // Optional cleanup of HubSpot rich-text rows so they don't break a tight
    // layout. Guarded — never assume a field exists.
    stripRichtext()
    {
        const form = this.instance.querySelector('form')
        if (!form) return

        const rows = [...form.children]
        rows.forEach((row) =>
        {
            const hasRichtext = [...row.children].some((child) => child.classList.contains('hs-richtext'))
            if (hasRichtext) row.remove()
        })
    }

    resize()
    {
        if (this.destroyed) return
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        clearTimeout(this.refreshTimer)

        // Revert the char-split overlay before the DOM is cleared
        this.textHover?.destroy()

        // Clear the injected markup so a re-init on the next page load starts
        // from a clean target instead of stacking a second form.
        if (this.formLoaded) this.instance.innerHTML = ''
    }
}
