const LOCALES = {
    en: { tag: 'en', prefix: '' },
    'zh-cn': { tag: 'zh-CN', prefix: '/zh-cn' },
    'zh-tw': { tag: 'zh-TW', prefix: '/zh-tw' },
}

const OPENING = /^[([{（［｛〔【〈《「『“‘]$/u
const HAN = /\p{Script=Han}/u

export const localeOf = (pathname) =>
{
    const segment = pathname.split('/')[1]?.toLowerCase()
    return LOCALES[segment] ? segment : 'en'
}

export const locale = localeOf(window.location.pathname)
export const isCJK = locale !== 'en'

export const pick = (copy) => copy[locale] ?? copy.en

export const localize = (path, key = locale) =>
{
    const { prefix } = LOCALES[key]
    return prefix && path === '/' ? prefix : `${prefix}${path}`
}

export const isCrossLocale = (href) =>
{
    const url = new URL(href, window.location.href)
    return url.origin === window.location.origin && localeOf(url.pathname) !== locale
}

export const ensureLang = () =>
{
    document.documentElement.lang ||= LOCALES[locale].tag
}

// The nav outlives Barba swaps, so its language links follow the hreflang alternates of the page now showing
export const syncLocaleLinks = (doc = document) =>
{
    const paths = new Map([[locale, window.location.pathname]])

    doc.querySelectorAll('link[rel="alternate"][hreflang]').forEach((alternate) =>
    {
        const key = alternate.hreflang.toLowerCase()
        if (LOCALES[key] && key !== locale) paths.set(key, new URL(alternate.href, window.location.href).pathname)
    })

    document.querySelectorAll('[data-locale-switch]').forEach((group) =>
    {
        group.style.display = paths.size > 1 ? '' : 'none'

        group.querySelectorAll('[data-locale-link]').forEach((link) =>
        {
            const key = link.dataset.localeLink
            const path = paths.get(key)

            link.style.display = path ? '' : 'none'
            if (path) link.href = path

            if (key === locale) link.setAttribute('aria-current', 'true')
            else link.removeAttribute('aria-current')
        })
    })
}

const segmenter = isCJK && Intl.Segmenter ? new Intl.Segmenter(LOCALES[locale].tag, { granularity: 'word' }) : null

const tokens = (text) =>
{
    const out = []
    let open = ''

    for (const { segment, isWordLike } of segmenter.segment(text))
    {
        for (const piece of isWordLike && HAN.test(segment) ? [...segment] : [segment])
        {
            const glue = !isWordLike && !/\s/.test(piece)

            if (glue && OPENING.test(piece)) open += piece
            else if (glue && out.length && !open) out[out.length - 1] += piece
            else
            {
                out.push(open + piece)
                open = ''
            }
        }
    }

    if (open) out.push(open)
    return out
}

// SplitText only breaks words on spaces; per-glyph tokens with punctuation glued on wrap like the plain CJK text
export const splitVars = segmenter
    ? { wordDelimiter: { delimiter: '​', replaceWith: '' }, prepareText: (text) => tokens(text).join('​') }
    : {}
