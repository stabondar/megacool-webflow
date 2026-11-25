import HubSpotLoader from '@utils/HubSpotLoader'
import TextHover from '@modules/TextHover.js'
import { ScrollTrigger } from '@utils/GSAP.js'
import { locale, localize } from '@utils/Locale.js'

// Client-provided values (MegaCool EU portal). Each can be overridden per
// element with data-portal-id / data-form-id / data-region so the same module
// drives any HubSpot form on the site.
const DEFAULTS = {
    portalId: '147924457',
    formId: 'fa7d3834-c944-49f3-a65f-c4b5601e5cf0',
    region: 'eu1',
    privacyUrl: '/privacy-policy',
}

// HubSpot stores the GDPR consent copy as a plain string, so the "Privacy
// Policy" it mentions arrives as text with no link. Matched case-insensitively.
const PRIVACY_PHRASE = 'Privacy Policy'

const CONSENT = [
    'By checking the boxes below, you agree to receive communications from MegaCool Technologies. You can unsubscribe anytime.',
    'I agree to receive other communications from MegaCool Technologies.',
    'We care about your privacy. Learn how we handle your data in our Privacy Policy.',
    'To deliver your service, we need your permission to store and process your personal data.',
]

// HubSpot translates its own validation messages via `locale`; consent rows match CONSENT by index
const COPY = {
    'zh-cn': {
        labels: { firstname: '名字', lastname: '姓', email: '电子邮箱', company: '公司名称', message: '留言内容' },
        submit: '发送消息',
        privacy: '隐私政策',
        thanks: '<p><strong>谢谢！</strong></p><p>我们已收到您的留言。我们的团队成员将审阅您的信息，并尽快与您联系。</p>',
        consent: [
            '勾选下方复选框即表示您同意接收来自 MegaCool Technologies 的资讯。您可以随时取消订阅。',
            '我同意接收来自 MegaCool Technologies 的其他资讯。',
            '我们重视您的隐私。请查阅我们的《隐私政策》，了解我们如何处理您的数据。',
            '为了向您提供服务，我们需要征得您的同意，以便存储和处理您的个人数据。',
        ],
    },
    'zh-tw': {
        labels: { firstname: '名字', lastname: '姓', email: '電子郵箱', company: '公司名稱', message: '留言內容' },
        submit: '發送消息',
        privacy: '隱私政策',
        thanks: '<p><strong>謝謝！</strong></p><p>我們已收到您的留言。我們的團隊成員將審閱您的資訊，並儘快與您聯繫。</p>',
        consent: [
            '勾選下方複選框即表示您同意接收來自 MegaCool Technologies 的資訊。您可以隨時取消訂閱。',
            '我同意接收來自 MegaCool Technologies 的其他資訊。',
            '我們重視您的隱私。請查閱我們的《隱私政策》，了解我們如何處理您的資料。',
            '為了向您提供服務，我們需要徵得您的同意，以便存儲和處理您的個人資料。',
        ],
    },
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
 *   data-privacy-url="/privacy-policy"  target for the "Privacy Policy" mention
 *                                in the consent copy (see linkifyPrivacyPolicy)
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

        const copy = COPY[locale]

        window.hbspt.forms.create({
            region,
            portalId,
            formId,
            locale,
            ...(copy && {
                translations: { [locale]: { submitText: copy.submit, fieldLabels: copy.labels } },
                inlineMessage: copy.thanks,
            }),
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

        this.translateConsent()
        this.linkifyPrivacyPolicy()

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

    // Turn the "Privacy Policy" mention in the GDPR consent copy into a real
    // link. HubSpot's form editor keeps that sentence as a plain string, so the
    // reference ships unlinked — patch it here instead of maintaining a fork of
    // the copy. Opens in a new tab: the visitor is mid-form, and a same-tab
    // navigation (Barba or not) would throw away everything they've typed.
    linkifyPrivacyPolicy()
    {
        const href = this.instance.dataset.privacyUrl || DEFAULTS.privacyUrl
        if (!href) return

        const target = href.startsWith('/') ? localize(href) : href
        const phrase = COPY[locale]?.privacy ?? PRIVACY_PHRASE

        const blocks = this.instance.querySelectorAll('.legal-consent-container .hs-richtext')
        blocks.forEach((block) => this.linkPhrase(block, phrase, target))
    }

    translateConsent()
    {
        const copy = COPY[locale]
        if (!copy) return

        const rows = this.instance.querySelectorAll(
            '.legal-consent-container .hs-richtext, .legal-consent-container label span'
        )
        rows.forEach((row) =>
        {
            const index = CONSENT.indexOf(row.textContent.replace(/\s+/g, ' ').trim())
            if (index !== -1) row.textContent = copy.consent[index]
        })
    }

    // Wrap the first occurrence of `phrase` in every text node under `root`,
    // leaving the surrounding copy untouched. Collect first, mutate after —
    // splitting text nodes while the walker is live would revisit the halves.
    linkPhrase(root, phrase, href)
    {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        const targets = []

        while (walker.nextNode())
        {
            const node = walker.currentNode

            // Never nest an anchor, in case HubSpot starts shipping one itself
            if (node.parentElement?.closest('a')) continue

            const index = node.textContent.toLowerCase().indexOf(phrase.toLowerCase())
            if (index !== -1) targets.push({ node, index })
        }

        targets.forEach(({ node, index }) =>
        {
            // node -> [before][phrase][after], then swap the middle for the link
            const match = node.splitText(index)
            match.splitText(phrase.length)

            const link = document.createElement('a')
            link.href = href
            link.className = 'hs-privacy-link'
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            link.textContent = match.textContent

            match.replaceWith(link)
        })
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
