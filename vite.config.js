import path from 'path'
import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

const productionUrl = 'https://megacool-webflow.vercel.app/'

// Preview builds (e.g. the staging branch) must serve assets from their stable
// branch URL so the Webflow embed's branchLink can load that branch's bundle.
// VERCEL_ENV / VERCEL_BRANCH_URL are Vercel system env vars, exposed at build time.
const branchUrl =
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL
        ? `https://${process.env.VERCEL_BRANCH_URL}/`
        : null

// vite.config.js
export default defineConfig(
{
    base: branchUrl ?? productionUrl,
    resolve: {
        alias: {
            '@src': path.resolve(__dirname, 'src'),
            '@comp': path.resolve(__dirname, 'src/components'),
            '@modules': path.resolve(__dirname, 'src/modules'),
            '@gl': path.resolve(__dirname, 'src/gl'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@styles': path.resolve(__dirname, 'src/css'),
            '@transitions': path.resolve(__dirname, 'src/transitions'),
        },
    },
    build: {
        minify: true,
        manifest: true,
        rollupOptions: {
            input: 'index.html', // defining the entry point explicitly
            output: {
                dir: path.resolve(__dirname, 'dist'), // specify the output directory
                format: 'es', // output format (ES modules)
                chunkFileNames: '[name]-[hash].js',
                entryFileNames: 'app.js',
                assetFileNames: '[name].[ext]',
                esModule: true,
                compact: true,
                dynamicImportVars: true,
                makeAbsoluteExternalsRelative: true,
            },
        },
    },
    plugins: [
        glsl(),
        // mkcert(
        // {

        // })
    ],
    server: {
        port: 4321, // server port
        // open: true, // open in browser automatically
        hot: true, // enable hot module replacement
        cors: {
            origin: '*', // Allow all origins
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        },
        allowedHosts: ['stabondar.ngrok.app', '.trycloudflare.com'],
    },
    preview: {
        port: 8080, // specify the port to run the preview server on
        strictPort: true, // if true, the server will fail if the port is already in use
        host: 'localhost', // define the host, use '0.0.0.0' to expose server to network
        https: false, // set to true if you need to test with HTTPS
        open: true,
    },
})
