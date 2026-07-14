/**
 * data-module="lines-background" on a full-bleed container placed behind your
 * content. Fills the box with an evenly spaced grid of lines, recomputing the
 * line count on resize so the spacing stays consistent. Unlike the Valkai
 * spotlight (a mouse-tracked radial *reveal*), the optional spotlight here is a
 * static, CSS-only radial mask that instead *clears* the grid out of the
 * centre so content sits on a calm area — see `data-spotlight` and lines-bg.scss.
 *
 * Markup — one container per axis; this script fills each with `.line_bg`
 * children that the CSS styles into lines:
 *
 *   <div data-module="lines-background" data-gap="80" data-spotlight class="lines_bg">
 *     <div class="lines_bg-vertical"></div>
 *     <div class="lines_bg-horizontal"></div>
 *   </div>
 *
 *   data-gap         target px cell size (required)
 *   data-gap-mobile  target px cell size at <=767px (optional; falls back to data-gap)
 *   data-spotlight   opt in to the static centre-clearing radial mask (CSS only,
 *                    no pointer tracking); tune with the --lines-bg-spot-* vars
 *
 * Cells are kept square: data-gap sets the *target* size, and the actual line
 * counts are chosen so the cells come out as close to square as the container
 * allows (see layout). For that to render, the two line containers must spread
 * their lines edge to edge — `justify-content: space-between` in the CSS.
 */
export default class LinesBackground
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false

        this.horizontalContainers = Array.from(this.instance.querySelectorAll('.lines_bg-horizontal'))
        this.verticalContainers = Array.from(this.instance.querySelectorAll('.lines_bg-vertical'))

        this.init()
        this.app.on('resize', () => this.resize())
        this.app.on('destroy', () => this.destroy())
    }

    init()
    {
        this.layout()
    }

    layout()
    {
        const gapPx = this.getGapPx()
        if (!gapPx) return

        const width = this.instance.offsetWidth
        const height = this.instance.offsetHeight
        if (!width || !height) return

        // Size the columns to the target gap, then derive the row count from
        // the *actual* column width — so rows follow the box aspect ratio and
        // the cells come out square. (Rounding each axis to the gap on its own
        // is what produced mismatched column widths vs row heights, i.e.
        // rectangles.) cols/rows are cell counts; lines = cells + 1.
        const cols = Math.max(1, Math.round(width / gapPx))
        const cellSize = width / cols
        const rows = Math.max(1, Math.round(height / cellSize))

        this.horizontalContainers.forEach((c) => this.populate(c, rows + 1, 'is-horizontal'))
        this.verticalContainers.forEach((c) => this.populate(c, cols + 1, 'is-vertical'))
    }

    getGapPx()
    {
        const isMobile = window.matchMedia('(max-width: 767px)').matches

        let gap = 0
        if (isMobile) gap = parseFloat(this.instance.dataset.gapMobile)
        if (!gap) gap = parseFloat(this.instance.dataset.gap)

        return gap > 0 ? gap : 0
    }

    populate(container, count, cls)
    {
        // Line count only changes on resize; skip the DOM churn when it hasn't.
        if (container.children.length === count) return

        container.innerHTML = ''
        for (let i = 0; i < count; i++)
        {
            const line = document.createElement('div')
            line.className = `line_bg ${cls}`
            container.appendChild(line)
        }
    }

    resize()
    {
        if (this.destroyed) return
        this.layout()
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true
    }
}
