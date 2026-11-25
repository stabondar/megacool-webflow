import { consent, CATEGORIES } from '@utils/Consent.js'
import { localize, pick } from '@utils/Locale.js'

/**
 * The consent UI: the first-visit banner and the preference centre behind it.
 * All it does is read and write utils/Consent.js — the engine owns the rules,
 * the record and the script gating, so nothing here can leave the site in a
 * state the engine does not know about.
 *
 * It is injected into <body> rather than authored in Webflow, so it exists on
 * every page (including ones added later) and survives Barba transitions —
 * hence it is instantiated once from app.loadMainComponentsOnce, like the nav,
 * and never registers the app destroy hook.
 *
 * Reopening it from anywhere on the site:
 *   <a href="#" data-cookie-settings>Cookie Preference Settings</a>
 *   window.megacoolConsent.open()
 */

const COPY = {
    en: {
        banner: {
            title: 'We value your privacy',
            body: 'We use cookies and similar technologies to improve your browsing experience, analyse website traffic, and provide relevant content.',
            detail: 'The details regarding the types of cookies, their purpose and the third parties involved are described below and in our {policy}. Please click on “Accept All” to consent to our usage of cookies in order to have the best possible experience on our websites. You can also set your preferences or reject cookies (except for strictly necessary cookies).',
            policyLabel: 'Cookie Policy',
        },
        panel: {
            eyebrow: 'Cookie Preference Center',
            title: 'Cookie Preferences',
            body: 'Please select the cookie categories you consent to. You can update your preferences or withdraw your consent at any time.',
        },
        actions: {
            accept: 'Accept All',
            reject: 'Reject All',
            manage: 'Manage Preferences',
            save: 'Save Preferences',
            close: 'Close cookie preferences',
        },
        categories: {
            necessary: {
                title: 'Strictly Necessary Cookies',
                status: 'Always active',
                body: 'These cookies are required for the basic operation of our website. They enable essential functions such as security, navigation, and remembering your privacy preferences. These cookies cannot be disabled.',
            },
            performance: {
                title: 'Performance Cookies',
                body: 'These cookies help us understand how visitors use our website by collecting anonymous statistical information. They allow us to improve website performance and user experience.',
            },
            functional: {
                title: 'Functional Cookies',
                body: 'These cookies allow the website to remember your choices and provide enhanced features, such as language preferences or embedded content.',
            },
            marketing: {
                title: 'Marketing Cookies',
                body: 'These cookies are used to provide more relevant advertising and measure the effectiveness of marketing campaigns. They may be placed by third-party providers.',
            },
        },
    },
    'zh-cn': {
        banner: {
            title: '我们重视您的隐私',
            body: '我们使用 Cookie 及类似技术来改善您的浏览体验、分析网站流量并提供相关内容。',
            detail: '有关 Cookie 的类型、用途及所涉及第三方的详细信息，请参阅下文及我们的《{policy}》。请点击“全部接受”，同意我们使用 Cookie，以便在我们的网站上获得最佳体验。您也可以设置偏好或拒绝 Cookie（绝对必要的 Cookie 除外）。',
            policyLabel: 'Cookie 政策',
        },
        panel: {
            eyebrow: 'Cookie 偏好中心',
            title: 'Cookie 偏好设置',
            body: '请选择您同意使用的 Cookie 类别。您可以随时更新偏好设置或撤回同意。',
        },
        actions: {
            accept: '全部接受',
            reject: '全部拒绝',
            manage: '管理偏好',
            save: '保存偏好',
            close: '关闭 Cookie 偏好设置',
        },
        categories: {
            necessary: {
                title: '绝对必要的 Cookie',
                status: '始终启用',
                body: '这些 Cookie 是网站基本运行所必需的，可实现安全、导航以及记住您的隐私偏好等基本功能。这些 Cookie 无法停用。',
            },
            performance: {
                title: '性能 Cookie',
                body: '这些 Cookie 通过收集匿名统计信息，帮助我们了解访客如何使用我们的网站，从而改进网站性能和用户体验。',
            },
            functional: {
                title: '功能 Cookie',
                body: '这些 Cookie 使网站能够记住您的选择并提供增强功能，例如语言偏好或嵌入内容。',
            },
            marketing: {
                title: '营销 Cookie',
                body: '这些 Cookie 用于提供更相关的广告并衡量营销活动的效果，可能由第三方提供商设置。',
            },
        },
    },
    'zh-tw': {
        banner: {
            title: '我們重視您的隱私',
            body: '我們使用 Cookie 及類似技術來改善您的瀏覽體驗、分析網站流量並提供相關內容。',
            detail: '有關 Cookie 的類型、用途及所涉及第三方的詳細資訊，請參閱下文及我們的《{policy}》。請點擊「全部接受」，同意我們使用 Cookie，以便在我們的網站上獲得最佳體驗。您也可以設定偏好或拒絕 Cookie（絕對必要的 Cookie 除外）。',
            policyLabel: 'Cookie 政策',
        },
        panel: {
            eyebrow: 'Cookie 偏好中心',
            title: 'Cookie 偏好設定',
            body: '請選擇您同意使用的 Cookie 類別。您可以隨時更新偏好設定或撤回同意。',
        },
        actions: {
            accept: '全部接受',
            reject: '全部拒絕',
            manage: '管理偏好',
            save: '儲存偏好',
            close: '關閉 Cookie 偏好設定',
        },
        categories: {
            necessary: {
                title: '絕對必要的 Cookie',
                status: '始終啟用',
                body: '這些 Cookie 是網站基本運作所必需的，可實現安全、導覽以及記住您的隱私偏好等基本功能。這些 Cookie 無法停用。',
            },
            performance: {
                title: '效能 Cookie',
                body: '這些 Cookie 透過收集匿名統計資訊，協助我們了解訪客如何使用我們的網站，從而改善網站效能和使用者體驗。',
            },
            functional: {
                title: '功能性 Cookie',
                body: '這些 Cookie 讓網站能夠記住您的選擇並提供強化功能，例如語言偏好或嵌入內容。',
            },
            marketing: {
                title: '行銷 Cookie',
                body: '這些 Cookie 用於提供更相關的廣告並衡量行銷活動的成效，可能由第三方供應商設定。',
            },
        },
    },
}

const TEXT = pick(COPY)
const POLICY_HREF = localize('/cookie-policy')

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'

// Breathing room between the page being revealed and the banner appearing.
const BANNER_DELAY = 1000

export default class CookieConsent
{
    constructor(app)
    {
        this.app = app
        this.destroyed = false
        this.panelOpen = false
        this.draft = consent.categories()

        this.init()
    }

    init()
    {
        // The Designer canvas renders the published body; a fixed banner there
        // just sits on top of the editing surface.
        if (document.documentElement.classList.contains('w-editor')) return

        this.build()
        this.bind()

        // Reopening always works; the first-visit banner waits for the loader
        // curtain to clear so it does not slide in behind it. The emitter has
        // no once(), so the handler re-checks the decision instead — by the
        // time a later reveal fires there usually is one.
        if (consent.hasDecision()) return

        if (this.app?.loaderActive) this.app.on('reveal', () => this.scheduleBanner())
        else this.scheduleBanner()
    }

    /* ---------------------------------------------------------------- markup */

    build()
    {
        this.root = document.createElement('div')
        this.root.className = 'cc'
        this.root.setAttribute('data-cookie-consent', '')

        const { banner, panel, actions } = TEXT
        const [detailBefore, detailAfter] = banner.detail.split('{policy}')

        this.root.innerHTML = `
            <section class="cc__banner" role="region" aria-label="${banner.title}" hidden>
                <div class="cc__banner-text">
                    <h2 class="cc__title">${banner.title}</h2>
                    <p class="cc__body">${banner.body}</p>
                    <p class="cc__body cc__body--small">${detailBefore}<a class="cc__link" href="${POLICY_HREF}">${banner.policyLabel}</a>${detailAfter}</p>
                </div>
                <div class="cc__actions">
                    <button type="button" class="cc__btn cc__btn--solid" data-cc-action="accept">${actions.accept}</button>
                    <button type="button" class="cc__btn cc__btn--solid" data-cc-action="reject">${actions.reject}</button>
                    <button type="button" class="cc__btn cc__btn--ghost" data-cc-action="manage">${actions.manage}</button>
                </div>
            </section>
            <div class="cc__overlay" hidden>
                <div class="cc__backdrop" data-cc-action="close"></div>
                <div class="cc__panel" role="dialog" aria-modal="true" aria-labelledby="cc-panel-title">
                    <header class="cc__panel-head">
                        <p class="cc__eyebrow">${panel.eyebrow}</p>
                        <h2 class="cc__title" id="cc-panel-title">${panel.title}</h2>
                        <button type="button" class="cc__close" data-cc-action="close" aria-label="${actions.close}">
                            <span aria-hidden="true">✕</span>
                        </button>
                    </header>
                    <p class="cc__body">${panel.body}</p>
                    <ul class="cc__list">${CATEGORIES.map((category) => this.categoryMarkup(category)).join('')}</ul>
                    <footer class="cc__panel-actions">
                        <button type="button" class="cc__btn cc__btn--solid" data-cc-action="save">${actions.save}</button>
                        <button type="button" class="cc__btn cc__btn--ghost" data-cc-action="accept">${actions.accept}</button>
                        <button type="button" class="cc__btn cc__btn--ghost" data-cc-action="reject">${actions.reject}</button>
                    </footer>
                </div>
            </div>
        `

        document.body.appendChild(this.root)

        this.banner = this.root.querySelector('.cc__banner')
        this.overlay = this.root.querySelector('.cc__overlay')
        this.panel = this.root.querySelector('.cc__panel')
        this.switches = Array.from(this.root.querySelectorAll('[data-cc-toggle]'))
    }

    categoryMarkup(category)
    {
        const copy = TEXT.categories[category]
        if (!copy) return ''

        // Necessary is stated, not offered — an always-on toggle that looks
        // switchable is exactly the dark pattern the guidance warns about.
        const control =
            category === 'necessary'
                ? `<span class="cc__always">${copy.status}</span>`
                : `<button type="button" class="cc__switch" role="switch" aria-checked="false" data-cc-toggle="${category}">
                       <span class="cc__switch-track"><span class="cc__switch-thumb"></span></span>
                   </button>`

        return `
            <li class="cc__cat">
                <div class="cc__cat-head">
                    <h3 class="cc__cat-title">${copy.title}</h3>
                    ${control}
                </div>
                <p class="cc__body cc__body--small">${copy.body}</p>
            </li>
        `
    }

    /* --------------------------------------------------------------- events */

    bind()
    {
        this.onClick = (event) =>
        {
            const toggle = event.target.closest('[data-cc-toggle]')
            if (toggle && this.root.contains(toggle))
            {
                this.toggleCategory(toggle.dataset.ccToggle)
                return
            }

            const action = event.target.closest('[data-cc-action]')
            if (action && this.root.contains(action))
            {
                this.run(action.dataset.ccAction)
                return
            }

            // Any element on the site (Webflow footer link, embed, CMS rich
            // text) can reopen the panel — that is the withdrawal route the
            // Cookie Policy points visitors to.
            const reopen = event.target.closest('[data-cookie-settings], a[href="#cookie-settings"]')
            if (reopen)
            {
                event.preventDefault()
                this.openPanel()
            }
        }

        this.onKeydown = (event) =>
        {
            if (!this.panelOpen) return

            if (event.key === 'Escape')
            {
                this.closePanel()
                return
            }

            if (event.key === 'Tab') this.trapFocus(event)
        }

        this.onOpenRequest = () => this.openPanel()

        document.addEventListener('click', this.onClick)
        document.addEventListener('keydown', this.onKeydown)
        document.addEventListener('consent:open', this.onOpenRequest)
    }

    run(action)
    {
        if (action === 'accept')
        {
            consent.acceptAll()
            this.dismiss()
        }
        else if (action === 'reject')
        {
            consent.rejectAll()
            this.dismiss()
        }
        else if (action === 'save')
        {
            consent.update(this.draft)
            this.dismiss()
        }
        else if (action === 'manage')
        {
            this.openPanel()
        }
        else if (action === 'close')
        {
            this.closePanel()
        }
    }

    toggleCategory(category)
    {
        this.draft = { ...this.draft, [category]: !this.draft[category] }
        this.syncSwitches()
    }

    syncSwitches()
    {
        this.switches.forEach((node) =>
        {
            const on = Boolean(this.draft[node.dataset.ccToggle])
            node.setAttribute('aria-checked', on ? 'true' : 'false')
        })
    }

    /* ------------------------------------------------------------- visibility */

    // First appearance only: let the revealed page land before the banner
    // slides in over it. Coming back from the preference panel without a
    // decision calls showBanner() directly, which stays immediate.
    scheduleBanner()
    {
        if (this.destroyed || this.bannerTimer) return

        this.bannerTimer = setTimeout(() =>
        {
            this.bannerTimer = null
            this.showBanner()
        }, BANNER_DELAY)
    }

    showBanner()
    {
        if (this.destroyed || !this.banner) return
        if (consent.hasDecision() || this.panelOpen) return

        this.banner.hidden = false
        // Two frames: the element must be laid out before the class that
        // animates it lands, or the transition has nothing to run from.
        requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.add('cc--banner-visible')))
    }

    hideBanner()
    {
        if (!this.banner) return

        this.root.classList.remove('cc--banner-visible')
        this.banner.hidden = true
    }

    openPanel()
    {
        if (this.destroyed || !this.overlay) return

        // Always open showing what is currently stored, never a stale draft.
        this.draft = consent.categories()
        this.syncSwitches()

        this.lastFocus = document.activeElement
        this.overlay.hidden = false
        this.panelOpen = true

        requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.add('cc--panel-open')))

        this.app?.scroll?.lenis?.stop()
        document.documentElement.classList.add('cc-locked')

        const first = this.panel.querySelector(FOCUSABLE)
        first?.focus()
    }

    closePanel()
    {
        if (!this.overlay || !this.panelOpen) return

        this.root.classList.remove('cc--panel-open')
        this.overlay.hidden = true
        this.panelOpen = false

        this.app?.scroll?.lenis?.start()
        document.documentElement.classList.remove('cc-locked')

        this.lastFocus?.focus?.()

        // Closing the panel is not a decision — an undecided visitor goes back
        // to the banner rather than silently continuing without one.
        if (!consent.hasDecision()) this.showBanner()
    }

    // Everything is answered: panel away, banner away, page back to normal.
    dismiss()
    {
        if (this.panelOpen)
        {
            this.root.classList.remove('cc--panel-open')
            this.overlay.hidden = true
            this.panelOpen = false
            this.app?.scroll?.lenis?.start()
            document.documentElement.classList.remove('cc-locked')
            this.lastFocus?.focus?.()
        }

        this.hideBanner()
    }

    trapFocus(event)
    {
        const focusable = Array.from(this.panel.querySelectorAll(FOCUSABLE)).filter(
            (node) => node.offsetParent !== null
        )
        if (!focusable.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first)
        {
            event.preventDefault()
            last.focus()
        }
        else if (!event.shiftKey && document.activeElement === last)
        {
            event.preventDefault()
            first.focus()
        }
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        clearTimeout(this.bannerTimer)

        document.removeEventListener('click', this.onClick)
        document.removeEventListener('keydown', this.onKeydown)
        document.removeEventListener('consent:open', this.onOpenRequest)

        this.root?.remove()
    }
}
