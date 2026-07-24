export default class ModuleLoader
{
    constructor(app)
    {
        this.app = app

        // element -> { ModuleName: instance }, so other systems (page loaders)
        // can find and retire an instance that claimed an element they animate
        this.instances = new WeakMap()
    }

    getInstance(element, name)
    {
        return this.instances.get(element)?.[name]
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
                        .then((module) =>
                        {
                            const instance = new module.default(element, this.app, main)

                            const entry = this.instances.get(element) ?? {}
                            entry[fileName] = instance
                            this.instances.set(element, entry)

                            return instance
                        })
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
