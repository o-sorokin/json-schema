type RJSFSchema = any
type TRefs = Map<string, string[]>

const KEYS_TO_CHECK = ['allOf', 'anyOf', 'oneOf', 'not', 'properties']
const DEFENITION_KEY_WORD = 'definitions'
const MAX_REF_RESOLUTION_DEPTH = 10

const pathToString = (path: string[]) => path.join(' -> ')

const collectRefs = (targetSchema: RJSFSchema) => {
    const refs: TRefs = new Map()

    const dfs = (schema: RJSFSchema, path: string[]) => {
        const ref = schema['$ref']
        if (ref) {
            if (ref === '#') {
                throw new Error(`Обнаруженная ссылка на корень схемы: ${pathToString([path.join('.'), ref])}`)
            }

            if (refs.has(ref)) {
                return
            }

            refs.set(ref, path)
        }

        if (!schema || typeof schema !== 'object' || !schema.type || (schema.type && schema.type !== 'object')) {
            return
        }

        for (const key of KEYS_TO_CHECK) {
            const schemaObjectByKey = schema[key]

            if (schemaObjectByKey) {
                if (Array.isArray(schemaObjectByKey)) {
                    for (let i = 0; i < schemaObjectByKey.length; i++) {
                        const property = schemaObjectByKey[i]
                        dfs(property, [...path, key, `${i}`])
                    }
                } else {
                    for (const [propName, property] of Object.entries(schemaObjectByKey)) {
                        dfs(property as any, [...path, key, propName])
                    }
                }
            }
        }
    }

    dfs(targetSchema, [])
    return refs
}

const tryResolveRefs = (ref: string, definitionsRefs: TRefs, path = new Set<string>())  => {
    if (path.has(ref)) {
        throw new Error(`Обнаружена циклическая ссылка: ${pathToString([...path, ref])}`)
    }

    if (path.size > MAX_REF_RESOLUTION_DEPTH) {
        throw new Error(`Превышена максимальная глубина разрешения ссылок: ${pathToString([...path, ref])}`)
    }

    if (definitionsRefs.has(ref)) {
        path.add(ref)

        for (const [$ref, _] of definitionsRefs.get(ref)) {
            tryResolveRefs($ref, definitionsRefs, path)
        }
    }
}

export const findCircularRefs = (schema: RJSFSchema) => {
    const schemaRefs = collectRefs(schema)
    console.log(schemaRefs);

    if (!schema[DEFENITION_KEY_WORD]) {
        // Если в схеме нет ключевого слова definitions, то циклических ссылок не может быть
        return
    }
    
    const definitionsRefs: TRefs = new Map()

    Object.entries(schema[DEFENITION_KEY_WORD]).forEach(([path, definition]) => {
        definitionsRefs.set(`#/${DEFENITION_KEY_WORD}/${path}`, collectRefs(definition))
    })

    console.log(definitionsRefs)

    for (const [ref, path] of schemaRefs) {
        tryResolveRefs(ref, definitionsRefs)
    }
}
