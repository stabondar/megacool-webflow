import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    ACESFilmicToneMapping,
    WebGLRenderTarget,
    DepthTexture,
    DepthFormat,
    UnsignedShortType,
    HalfFloatType,
    LinearFilter,
    OrthographicCamera,
    ShaderMaterial,
    PlaneGeometry,
    Mesh,
    MeshStandardMaterial,
    InstancedMesh,
    InstancedBufferAttribute,
    BoxGeometry,
    Object3D,
    Vector2,
    Vector3,
    Color,
    FogExp2,
    AmbientLight,
    DirectionalLight,
} from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { toNumber } from '@utils/Math.js'

import vertexShader from '@gl/footer/vertex.glsl'
import fragmentShader from '@gl/footer/fragment.glsl'

gsap.registerPlugin(ScrollTrigger)

/**
 * WebGL footer background — a dense stack of thin blades seen edge-on from
 * above, so only their glowing top edges read as parallel diagonal lines.
 * A slow "step" kink travels along each edge, offset per blade so the kinks
 * sweep diagonally across the field. Depth of field blurs the foreground and
 * the far end of the stack.
 *
 * Wire it up with `data-module="footer-canvas"` on a Webflow div. The div is
 * the container — the canvas is injected into it and sized to it, so give the
 * div an explicit width/height. Pointer events on the canvas are disabled.
 *
 * Optional data attributes:
 *   data-preset         'base' | 'overlay'  settings preset (default: overlay)
 *   data-edge-color     hex  dim base rim color
 *   data-pool-a-color   hex  bright cyan pool color
 *   data-pool-b-color   hex  soft neutral pool color
 *   data-count          int  number of blades
 *   data-spacing        num  world units between blades
 *   data-start-z        num  z of the nearest blade
 *   data-blade-width    num  blade length
 *   data-blade-height   num  blade height
 *   data-blade-depth    num  blade thickness
 *   data-width-segments int  geometry segments along the blade
 */

// Each preset is the exact JSON shape the /footer.html dev GUI exports via
// "copy settings JSON", so a newly tuned look can be pasted here verbatim.
// `anim.time` is the frozen wave moment; `anim.playing` is dev-only and
// ignored here (the module always renders a still).
const PRESETS = {
    base: {
        camera: {
            px: 3791,
            py: 2348,
            pz: 5794,
            lx: -1373,
            ly: -1665,
            lz: -7930,
            roll: -12.5,
            hfov: 33.6,
            mouseFovEnabled: false,
            mouseFovMin: 20,
            mouseFovMax: 26,
        },
        stack: {
            count: 110,
            spacing: 295,
            startZ: 3500,
            bladeWidth: 6300,
            bladeHeight: 420,
            bladeDepth: 4,
            widthSegments: 160,
        },
        reveal: { enabled: true, fromZ: 5200, duration: 1.6, ease: 'power2.out' },
        wave: { amp: -38, ramp: 290, plateau: 450, speed: 520, slope: -14000, jitter: 120 },
        lines: {
            edgeColor: '#4f6b70',
            edgeWidth: 0.029,
            edgeIntensity: 1.8,
            cornerRadius: 310,
            endBand: 145,
            endGlow: 0,
        },
        poolA: { color: '#35d0bd', x: 660, z: -1270, radius: 1390, intensity: 1.15 },
        poolB: { color: '#a8aeaa', x: 660, z: -4600, radius: 4160, intensity: 1.15 },
        atmosphere: {
            fogColor: '#1a2a28',
            fogDensity: 0.000137,
            ambientColor: '#4a5a54',
            ambientIntensity: 0.87,
            dirColor: '#4c5a62',
            dirIntensity: 0.77,
            faceColor: '#0d1917',
            clearColor: '#020606',
            exposure: 1.31,
        },
        dof: { focus: 0.656, range: 0.001, falloff: 0.242, blur: 3.5, depthBias: 0.077 },
        vignette: { centerX: 0.25, centerY: 0.53, start: 0.43, end: 1, darken: 0.25, tlStart: 0.45, tlDarken: 0.71 },
        anim: { playing: false, time: 31.75 },
    },
    overlay: {
        camera: {
            px: 3791,
            py: 2348,
            pz: 5794,
            lx: -1373,
            ly: -1665,
            lz: -6620,
            roll: -0.4,
            hfov: 23.6,
            mouseFovEnabled: true,
            mouseFovMin: 20,
            mouseFovMax: 22.5,
        },
        stack: {
            count: 110,
            spacing: 225,
            startZ: 3500,
            bladeWidth: 6300,
            bladeHeight: 420,
            bladeDepth: 4,
            widthSegments: 160,
        },
        reveal: { enabled: true, fromZ: 5200, duration: 1.6, ease: 'power2.out' },
        wave: { amp: -121, ramp: 495, plateau: 1730, speed: 525, slope: -15000, jitter: 110 },
        lines: {
            edgeColor: '#4f6b70',
            edgeWidth: 0.029,
            edgeIntensity: 1.8,
            cornerRadius: 310,
            endBand: 145,
            endGlow: 0,
        },
        poolA: { color: '#35d0bd', x: 660, z: -530, radius: 2050, intensity: 0.9 },
        poolB: { color: '#a8aeaa', x: 660, z: -6800, radius: 4400, intensity: 1.15 },
        atmosphere: {
            fogColor: '#1a2a28',
            fogDensity: 0.000137,
            ambientColor: '#000000',
            ambientIntensity: 0.7,
            dirColor: '#4c5a62',
            dirIntensity: 0.89,
            faceColor: '#0d1917',
            clearColor: '#020606',
            exposure: 1.45,
        },
        dof: { focus: 0.656, range: 0.001, falloff: 0.242, blur: 3.5, depthBias: 0.077 },
        vignette: { centerX: 0.55, centerY: 0.5, start: 0.34, end: 0.67, darken: 0.31, tlStart: 0.45, tlDarken: 0.77 },
        anim: { playing: false, time: 31.75 },
    },
}

let instanceCount = 0

export default class FooterCanvas
{
    constructor(instance, app, main)
    {
        this.instance = instance
        this.app = app
        this.main = main

        this.destroyed = false
        this.renderer = null
        this.inView = true
        this.needsRender = true
        this.startTime = 0
        this.transitionFrame = null

        // Per-instance namespace: destroy is deferred until the next page is
        // built, so a shared namespace would wipe the next instance's listeners.
        this.ns = `footercanvas${++instanceCount}`

        this.init()
        this.app.on(`resize.${this.ns}`, () => this.resize())
        this.app.on(`transitionSettled.${this.ns}`, () => this.refreshVisibility())
        this.app.on(`destroy.${this.ns}`, () => this.destroy())
    }

    init()
    {
        // Disable the scene inside the Webflow Designer; run it on the published site.
        if (document.documentElement.classList.contains('w-editor')) return

        // Overlay is the default look; add data-preset="base" for the other one.
        const s = (this.settings = PRESETS[this.instance.dataset.preset] || PRESETS.overlay)

        const size = this.getSize()
        this.width = size.width
        this.height = size.height

        const isMobile = window.matchMedia('(max-width: 991px)').matches
        this.pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)

        // The scene is a still image: uTime is pinned to one hand-picked wave
        // moment and never advances, so it renders once and then only again on
        // resize/visibility changes. The dev harness GUI can flip `continuous`
        // back on to preview the travelling kinks.
        this.continuous = false

        /** -- <canvas> */
        this.canvas = document.createElement('canvas')
        this.canvas.classList.add('webgl-footer')
        Object.assign(this.canvas.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
        })
        if (getComputedStyle(this.instance).position === 'static')
        {
            this.instance.style.position = 'relative'
        }
        this.instance.appendChild(this.canvas)

        /** -- <renderer> */
        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            powerPreference: 'high-performance',
        })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(this.pixelRatio)
        this.renderer.toneMapping = ACESFilmicToneMapping
        this.renderer.toneMappingExposure = s.atmosphere.exposure
        this.renderer.setClearColor(new Color(s.atmosphere.clearColor), 1)

        /** -- <camera> */
        this.cameraParams = {
            hfov: s.camera.hfov,
            position: new Vector3(s.camera.px, s.camera.py, s.camera.pz),
            lookAt: new Vector3(s.camera.lx, s.camera.ly, s.camera.lz),
            roll: s.camera.roll,
        }
        this.camera = new PerspectiveCamera(30, this.width / this.height, 100, 40000)
        this.applyCamera()

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        /** -- <mouse fov> the horizontal mouse position eases the camera's
         * field of view between min and max — a subtle breathing zoom. */
        this.mouseFov = {
            enabled: s.camera.mouseFovEnabled && !reducedMotion,
            min: s.camera.mouseFovMin,
            max: s.camera.mouseFovMax,
            current: this.cameraParams.hfov,
            target: this.cameraParams.hfov,
        }
        this.onMouseMove = (e) =>
        {
            if (this.destroyed || !this.inView || !this.mouseFov.enabled) return

            const mx = Math.min(1, Math.max(0, e.clientX / window.innerWidth))
            this.mouseFov.target = this.mouseFov.min + (this.mouseFov.max - this.mouseFov.min) * mx
            this.needsRender = true
        }
        window.addEventListener('mousemove', this.onMouseMove)

        /** -- <scene> */
        this.scene = new Scene()

        // The fog color is LIGHTER than the clear color on purpose: distant
        // blades wash toward this dim teal-gray, producing the soft haze that
        // fills the field, while the empty sky past the blade ends stays
        // near-black so the far end-column reads as a silhouette against it.
        this.scene.fog = new FogExp2(new Color(s.atmosphere.fogColor), s.atmosphere.fogDensity)

        this.ambient = new AmbientLight(new Color(s.atmosphere.ambientColor), s.atmosphere.ambientIntensity)
        this.scene.add(this.ambient)

        this.directional = new DirectionalLight(new Color(s.atmosphere.dirColor), s.atmosphere.dirIntensity)
        this.directional.position.set(-1500, 1800, 800)
        this.directional.target.position.set(0, 0, -1500)
        this.scene.add(this.directional, this.directional.target)

        /** -- <blades> */
        this.blades = this.createBlades(this.scene, this.instance.dataset, isMobile)

        /** -- <reveal> the stack slides into place (startZ fromZ -> resting),
         * scrubbed by scroll as the container enters the viewport. Implemented
         * as a mesh offset so the instance matrices never need rebuilding. */
        if (s.reveal.enabled && !reducedMotion)
        {
            const fromOffset = s.reveal.fromZ - this.blades.params.startZ
            this.blades.mesh.position.z = fromOffset
            this.revealTween = gsap.fromTo(
                this.blades.mesh.position,
                { z: fromOffset },
                {
                    z: 0,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: this.instance.closest('footer'),
                        start: 'top bottom',
                        end: '+=100%',
                        scrub: true,
                    },
                    onUpdate: () => (this.needsRender = true),
                }
            )
        }

        /** -- <post processing> */
        this.post = this.createPost({
            renderer: this.renderer,
            scene: this.scene,
            camera: this.camera,
            width: this.width,
            height: this.height,
            pixelRatio: this.pixelRatio,
        })

        /** -- <visibility> pause rendering while the container is scrolled out of view. */
        this.visibilityObserver = new IntersectionObserver(
            ([entry]) =>
            {
                this.inView = entry.isIntersecting && entry.intersectionRatio > 0
                if (this.inView) this.needsRender = true
            },
            { threshold: 0 }
        )
        this.visibilityObserver.observe(this.instance)

        /** -- <loop> */
        this.startTime = this.app.tick.elapsed
        this.app.on(`tick.${this.ns}`, () => this.onTick())
    }

    applyCamera()
    {
        const { hfov, position, lookAt, roll } = this.cameraParams
        const DEG = Math.PI / 180

        // "Cover" fitting against the 16:9 aspect the look was tuned at:
        // wider containers keep the horizontal framing and crop top/bottom,
        // taller containers keep the vertical framing and crop the sides —
        // the tuned composition survives any footer size instead of revealing
        // untuned world above/below.
        const REF_ASPECT = 16 / 9
        const aspect = this.width / this.height
        const tanH = Math.tan((hfov / 2) * DEG)
        const vfov = (2 * Math.atan(tanH / Math.max(aspect, REF_ASPECT))) / DEG
        this.camera.fov = Math.min(62, Math.max(10, vfov))
        this.camera.aspect = aspect

        this.camera.position.copy(position)
        this.camera.lookAt(lookAt)
        this.camera.rotateZ(roll * DEG)
        this.camera.updateProjectionMatrix()
        this.needsRender = true
    }

    getSize()
    {
        const w = this.instance.clientWidth || window.innerWidth
        const h = this.instance.clientHeight || window.innerHeight
        return { width: w, height: h }
    }

    onTick()
    {
        if (this.destroyed || !this.renderer) return
        if (document.hidden || !this.inView) return
        if (!this.continuous && !this.needsRender) return

        this.needsRender = false

        // Ease the fov toward the mouse-driven target; applyCamera re-arms
        // needsRender, so rendering continues until the zoom settles.
        if (this.mouseFov.enabled)
        {
            const delta = this.mouseFov.target - this.mouseFov.current
            if (Math.abs(delta) > 0.001)
            {
                this.mouseFov.current += delta * 0.06
                this.cameraParams.hfov = this.mouseFov.current
                this.applyCamera()
            }
        }

        // Only advance the wave clock in (dev-only) playback mode — static
        // re-renders (resize, visibility) must keep the frozen wave moment.
        if (this.continuous)
        {
            this.blades.material.uniforms.uTime.value = (this.app.tick.elapsed - this.startTime) * 0.001
        }
        this.post.render()
    }

    refreshVisibility()
    {
        if (this.destroyed || !this.renderer) return

        if (this.transitionFrame !== null) cancelAnimationFrame(this.transitionFrame)

        // The incoming Barba container is fixed while the pixel transition runs.
        // Re-check on the next frame, after Enter has restored normal document flow.
        this.transitionFrame = requestAnimationFrame(() =>
        {
            this.transitionFrame = null
            if (this.destroyed || !this.renderer) return

            this.visibilityObserver?.disconnect()
            this.visibilityObserver?.observe(this.instance)

            const rect = this.instance.getBoundingClientRect()
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight

            this.inView = rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth
            if (!this.inView) return

            const size = this.getSize()
            if (size.width !== this.width || size.height !== this.height) this.resize()

            this.needsRender = true
            this.onTick()
        })
    }

    resize()
    {
        if (this.destroyed || !this.renderer) return

        const size = this.getSize()
        this.width = size.width
        this.height = size.height

        this.applyCamera()

        this.renderer.setSize(this.width, this.height)
        this.post.resize(this.width, this.height)
        this.needsRender = true
    }

    /* ---------------------------------------------------------------------- */
    /* Blades — the instanced stack of glowing edges                          */
    /* ---------------------------------------------------------------------- */

    createBlades(scene, dataset, isMobile)
    {
        const s = this.settings
        const params = {
            count: toNumber(dataset.count, s.stack.count),
            spacing: toNumber(dataset.spacing, s.stack.spacing),
            startZ: toNumber(dataset.startZ, s.stack.startZ),
            bladeWidth: toNumber(dataset.bladeWidth, s.stack.bladeWidth),
            bladeHeight: toNumber(dataset.bladeHeight, s.stack.bladeHeight),
            bladeDepth: toNumber(dataset.bladeDepth, s.stack.bladeDepth),
            widthSegments: toNumber(
                dataset.widthSegments,
                isMobile ? Math.round(s.stack.widthSegments / 2) : s.stack.widthSegments
            ),
            cornerRadius: s.lines.cornerRadius,
            waveAmp: s.wave.amp,
            waveRamp: s.wave.ramp,
            wavePlateau: s.wave.plateau,
            waveSpeed: s.wave.speed,
            waveTime: s.anim.time,
            waveSlope: s.wave.slope,
            waveJitter: s.wave.jitter,
            edgeColor: dataset.edgeColor || s.lines.edgeColor,
            edgeWidth: s.lines.edgeWidth,
            edgeIntensity: s.lines.edgeIntensity,
            endBand: s.lines.endBand,
            endGlow: s.lines.endGlow,
            poolAColor: dataset.poolAColor || s.poolA.color,
            poolACenter: new Vector2(s.poolA.x, s.poolA.z),
            poolARadius: s.poolA.radius,
            poolAIntensity: s.poolA.intensity,
            poolBColor: dataset.poolBColor || s.poolB.color,
            poolBCenter: new Vector2(s.poolB.x, s.poolB.z),
            poolBRadius: s.poolB.radius,
            poolBIntensity: s.poolB.intensity,
        }

        const material = new CustomShaderMaterial({
            baseMaterial: MeshStandardMaterial,
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: params.waveTime },
                uBladeWidth: { value: params.bladeWidth },
                uBladeHeight: { value: params.bladeHeight },
                uCornerRadius: { value: params.cornerRadius },
                uWaveAmp: { value: params.waveAmp },
                uWaveRamp: { value: params.waveRamp },
                uWavePlateau: { value: params.wavePlateau },
                uWaveSpeed: { value: params.waveSpeed },
                uWaveSlope: { value: params.waveSlope },
                uWaveJitter: { value: params.waveJitter },
                uEdgeColor: { value: new Color(params.edgeColor) },
                uEdgeWidth: { value: params.edgeWidth },
                uEdgeIntensity: { value: params.edgeIntensity },
                uEndBand: { value: params.endBand },
                uEndGlow: { value: params.endGlow },
                uPoolAColor: { value: new Color(params.poolAColor) },
                uPoolACenter: { value: params.poolACenter },
                uPoolARadius: { value: params.poolARadius },
                uPoolAIntensity: { value: params.poolAIntensity },
                uPoolBColor: { value: new Color(params.poolBColor) },
                uPoolBCenter: { value: params.poolBCenter },
                uPoolBRadius: { value: params.poolBRadius },
                uPoolBIntensity: { value: params.poolBIntensity },
            },
            color: new Color(s.atmosphere.faceColor),
            roughness: 0.85,
            metalness: 0.0,
            fog: true,
        })

        const geometry = new BoxGeometry(
            params.bladeWidth,
            params.bladeHeight,
            params.bladeDepth,
            params.widthSegments,
            1,
            1
        )
        geometry.translate(0, params.bladeHeight / 2, 0)

        const indices = new Float32Array(params.count)
        const phases = new Float32Array(params.count)
        for (let i = 0; i < params.count; i++)
        {
            indices[i] = i / Math.max(1, params.count - 1)
            phases[i] = Math.random()
        }
        geometry.setAttribute('aIndex', new InstancedBufferAttribute(indices, 1))
        geometry.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1))

        const mesh = new InstancedMesh(geometry, material, params.count)
        mesh.frustumCulled = false
        scene.add(mesh)

        const dummy = new Object3D()
        for (let i = 0; i < params.count; i++)
        {
            dummy.position.set(0, 0, params.startZ - i * params.spacing)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true

        const destroy = () =>
        {
            scene.remove(mesh)
            geometry.dispose()
            material.dispose()
            mesh.dispose()
        }

        return { params, material, mesh, destroy }
    }

    /* ---------------------------------------------------------------------- */
    /* Post-processing — half-res Gaussian blur + depth-of-field composite    */
    /* ---------------------------------------------------------------------- */

    createPost(opts)
    {
        const { renderer, scene, camera } = opts
        const { dof, vignette } = this.settings

        const physical = (w, h) => ({
            w: Math.max(1, Math.floor(w * opts.pixelRatio)),
            h: Math.max(1, Math.floor(h * opts.pixelRatio)),
        })

        let { w, h } = physical(opts.width, opts.height)

        const renderTarget = new WebGLRenderTarget(w, h, {
            samples: 2,
            type: HalfFloatType,
        })
        renderTarget.stencilBuffer = false
        renderTarget.depthTexture = new DepthTexture(w, h)
        renderTarget.depthTexture.format = DepthFormat
        renderTarget.depthTexture.type = UnsignedShortType

        let bw = Math.max(1, Math.floor(w / 2))
        let bh = Math.max(1, Math.floor(h / 2))

        const blurTargetH = new WebGLRenderTarget(bw, bh, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
            generateMipmaps: false,
            type: HalfFloatType,
        })
        const blurTargetV = new WebGLRenderTarget(bw, bh, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
            generateMipmaps: false,
            type: HalfFloatType,
        })

        const blurVertex = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `
        const blurFragment = /* glsl */ `
      #include <packing>
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 uTexelSize;
      uniform vec2 uDirection;
      uniform float uBlurStrength;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform float uDepthBias;

      float readDepth(vec2 coord) {
        float fragCoordZ = texture2D(tDepth, coord).x;
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
        return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
      }

      // Depth-aware sample: samples much NEARER than the pixel being blurred
      // are foreground and get faded out so they don't bleed halos into the
      // blurred background. Samples at equal-or-greater depth are kept.
      void addSample(vec2 uv, float w, float centerDepth, inout vec4 c, inout float total) {
        float sd = readDepth(uv);
        float weight = w * smoothstep(centerDepth - uDepthBias, centerDepth, sd);
        c += texture2D(tDiffuse, uv) * weight;
        total += weight;
      }

      void main() {
        float w0 = 0.227027;
        float w1 = 0.1945946;
        float w2 = 0.1216216;
        float w3 = 0.054054;
        float w4 = 0.016216;
        vec2 stepSize = uTexelSize * uDirection * uBlurStrength;
        float centerDepth = readDepth(vUv);

        vec4 c = texture2D(tDiffuse, vUv) * w0;
        float total = w0;
        addSample(vUv + stepSize * 1.0, w1, centerDepth, c, total);
        addSample(vUv - stepSize * 1.0, w1, centerDepth, c, total);
        addSample(vUv + stepSize * 2.0, w2, centerDepth, c, total);
        addSample(vUv - stepSize * 2.0, w2, centerDepth, c, total);
        addSample(vUv + stepSize * 3.0, w3, centerDepth, c, total);
        addSample(vUv - stepSize * 3.0, w3, centerDepth, c, total);
        addSample(vUv + stepSize * 4.0, w4, centerDepth, c, total);
        addSample(vUv - stepSize * 4.0, w4, centerDepth, c, total);

        gl_FragColor = c / total;
      }
    `

        const blurScene = new Scene()
        const blurMaterialH = new ShaderMaterial({
            toneMapped: false,
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: renderTarget.depthTexture },
                uTexelSize: { value: new Vector2(1 / bw, 1 / bh) },
                uDirection: { value: new Vector2(1, 0) },
                uBlurStrength: { value: dof.blur },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                uDepthBias: { value: dof.depthBias },
            },
            vertexShader: blurVertex,
            fragmentShader: blurFragment,
        })
        const blurMaterialV = new ShaderMaterial({
            toneMapped: false,
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: renderTarget.depthTexture },
                uTexelSize: { value: new Vector2(1 / bw, 1 / bh) },
                uDirection: { value: new Vector2(0, 1) },
                uBlurStrength: { value: dof.blur },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                uDepthBias: { value: dof.depthBias },
            },
            vertexShader: blurVertex,
            fragmentShader: blurFragment,
        })
        const blurMesh = new Mesh(new PlaneGeometry(2, 2), blurMaterialH)
        blurScene.add(blurMesh)

        const outputScene = new Scene()
        const outputCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const outputMaterial = new ShaderMaterial({
            toneMapped: true,
            uniforms: {
                tScene: { value: renderTarget.texture },
                tDepth: { value: renderTarget.depthTexture },
                tBlur: { value: blurTargetV.texture },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                uFocusDistance: { value: dof.focus },
                uFocusRange: { value: dof.range },
                uFocusFalloff: { value: dof.falloff },
                uVigCenter: { value: new Vector2(vignette.centerX, vignette.centerY) },
                uVigStart: { value: vignette.start },
                uVigEnd: { value: vignette.end },
                uVigDarken: { value: vignette.darken },
                uTLStart: { value: vignette.tlStart },
                uTLDarken: { value: vignette.tlDarken },
            },
            vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
            fragmentShader: /* glsl */ `
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tScene;
        uniform sampler2D tDepth;
        uniform sampler2D tBlur;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float uFocusDistance;
        uniform float uFocusRange;
        uniform float uFocusFalloff;
        uniform vec2 uVigCenter;
        uniform float uVigStart;
        uniform float uVigEnd;
        uniform float uVigDarken;
        uniform float uTLStart;
        uniform float uTLDarken;

        float readDepth(sampler2D depthSampler, vec2 coord) {
          float fragCoordZ = texture2D(depthSampler, coord).x;
          float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
          return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
        }

        // Screen-space triangular-PDF dither. Breaks up the 8-bit banding that
        // smooth gradients (fog, blur, vignette) quantize into visible stripes.
        float dither(vec2 coord) {
          float r = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);
          float g = fract(sin(dot(coord + 1.0, vec2(12.9898, 78.233))) * 43758.5453);
          return (r + g - 1.0) / 255.0;
        }

        void main() {
          float d = readDepth(tDepth, vUv);
          float dist = abs(d - uFocusDistance);
          float blurMix = smoothstep(uFocusRange, uFocusRange + uFocusFalloff, dist);
          vec4 sceneCol = texture2D(tScene, vUv);
          vec4 blurCol = texture2D(tBlur, vUv);
          gl_FragColor = mix(sceneCol, blurCol, blurMix);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>

          // Radial vignette plus an extra top-left fade to black.
          float vd = distance(vUv, uVigCenter);
          float vig = smoothstep(uVigStart, uVigEnd, vd);
          gl_FragColor.rgb *= mix(1.0, uVigDarken, vig);
          float tl = smoothstep(uTLStart, 1.0, (1.0 - vUv.x) * 0.5 + vUv.y * 0.5);
          gl_FragColor.rgb *= 1.0 - tl * uTLDarken;

          gl_FragColor.rgb += dither(gl_FragCoord.xy);
        }
      `,
        })
        const outputMesh = new Mesh(new PlaneGeometry(2, 2), outputMaterial)
        outputScene.add(outputMesh)

        const render = () =>
        {
            renderer.setRenderTarget(renderTarget)
            renderer.render(scene, camera)

            // Two moderate H+V blur passes instead of one wide-stride pass: a
            // 9-tap kernel with a large stride under-samples and combs bright
            // hairlines into ghost ridges; iterating keeps the kernel dense.
            blurMesh.material = blurMaterialH
            blurMaterialH.uniforms.tDiffuse.value = renderTarget.texture
            renderer.setRenderTarget(blurTargetH)
            renderer.render(blurScene, outputCamera)

            blurMesh.material = blurMaterialV
            blurMaterialV.uniforms.tDiffuse.value = blurTargetH.texture
            renderer.setRenderTarget(blurTargetV)
            renderer.render(blurScene, outputCamera)

            blurMesh.material = blurMaterialH
            blurMaterialH.uniforms.tDiffuse.value = blurTargetV.texture
            renderer.setRenderTarget(blurTargetH)
            renderer.render(blurScene, outputCamera)

            blurMesh.material = blurMaterialV
            blurMaterialV.uniforms.tDiffuse.value = blurTargetH.texture
            renderer.setRenderTarget(blurTargetV)
            renderer.render(blurScene, outputCamera)

            renderer.setRenderTarget(null)
            renderer.render(outputScene, outputCamera)
        }

        const resize = (width, height) =>
        {
            const p = physical(width, height)
            w = p.w
            h = p.h
            bw = Math.max(1, Math.floor(w / 2))
            bh = Math.max(1, Math.floor(h / 2))

            renderTarget.setSize(w, h)
            blurTargetH.setSize(bw, bh)
            blurTargetV.setSize(bw, bh)

            blurMaterialH.uniforms.uTexelSize.value.set(1 / bw, 1 / bh)
            blurMaterialV.uniforms.uTexelSize.value.set(1 / bw, 1 / bh)
        }

        const destroy = () =>
        {
            outputMesh.geometry.dispose()
            outputMaterial.dispose()
            blurMesh.geometry.dispose()
            blurMaterialH.dispose()
            blurMaterialV.dispose()
            blurTargetH.dispose()
            blurTargetV.dispose()
            renderTarget.dispose()
        }

        return { render, resize, destroy, outputMaterial, blurMaterialH, blurMaterialV }
    }

    destroy()
    {
        if (this.destroyed) return
        this.destroyed = true

        this.app.off(`tick.${this.ns}`)
        this.app.off(`resize.${this.ns}`)
        this.app.off(`transitionSettled.${this.ns}`)

        if (this.transitionFrame !== null)
        {
            cancelAnimationFrame(this.transitionFrame)
            this.transitionFrame = null
        }

        if (!this.renderer) return

        this.revealTween?.scrollTrigger?.kill()
        this.revealTween?.kill()
        window.removeEventListener('mousemove', this.onMouseMove)
        this.visibilityObserver.disconnect()

        this.blades.destroy()
        this.post.destroy()

        this.ambient.dispose?.()
        this.directional.dispose?.()
        this.scene.fog = null

        this.renderer.dispose()
        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas)
    }
}
