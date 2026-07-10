export default class ModuleLoader
{
    constructor(app)
    {
        this.app = app
    }

    async loadModules(main)
    {
        try
        {
            const elements = main.querySelectorAll('[data-module]')

            if (elements.length < 1) return

            const modulePromises = []

            elements.forEach((element) =>
            {
                const moduleName = element.getAttribute('data-module')
                const values = moduleName.split(' ')

                for (const value of values)
                {
                    if (!value || value.trim() === '') continue

                    // Webflow markup uses kebab-case values (data-module="text-reveal"),
                    // module files are PascalCase (TextReveal.js)
                    const fileName = this.toPascalCase(value)

                    const modulePromise = import(`@modules/${fileName}.js`)
                        .then((module) => new module.default(element, this.app, main))
                        .catch((error) => console.warn(`Module "${fileName}" failed: ${error.message}`))
                    modulePromises.push(modulePromise)
                }
            })

            await Promise.all(modulePromises)
        }
        catch (error)
        {
            console.warn(`Error loading modules: ${error.message}`)
        }
    }

    toPascalCase(value)
    {
        return value
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('')
    }
}
