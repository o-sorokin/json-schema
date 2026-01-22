type RJSFSchema = any
type TRefs = Map<string, string[]>

const KEYS_TO_CHECK = ['allOf', 'anyOf', 'oneOf', 'not', 'properties']
const DEFENITION_KEY_WORD = '$defs'
const MAX_REF_RESOLUTION_DEPTH = 10

const pathToString = (path: string[]) => path.join(' -> ')

const createFullPath = (path: string[], refs: TRefs) => {
    // console.log(path);
    // console.log(refs);
    
    const fullPath = path.map((p) => {
        // console.log(refs.get(p));
        
        const schemaPath = [...refs.get(p)].join('.')
        return pathToString([p, schemaPath])
    })
    return fullPath
}

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

const tryResolveRefs = (ref: string, definitionsRefs: TRefs, path = new Set())  => {
    if (path.has(ref)) {
        throw new Error(`Обнаружена циклическая ссылка: ${createFullPath([...path, ref], definitionsRefs)}`)
    }

    if (path.size > MAX_REF_RESOLUTION_DEPTH) {
        throw new Error(`Превышена максимальная глубина разрешения ссылок: ${createFullPath([...path, ref], definitionsRefs)}`)
    }

    if (definitionsRefs.has(ref)) {
        path.add(ref)

        for (const [$ref, _] of definitionsRefs.get(ref)) {
            tryResolveRefs($ref, definitionsRefs, path)
        }
    }
}

export const findCircularRefs = (schema: RJSFSchema) => {
    if (!schema[DEFENITION_KEY_WORD]) {
        // Если в схеме нет ключевого слова definitions, то циклических ссылок не может быть
        return
    }

    const schemaRefs = collectRefs(schema)
    
    const definitionsRefs: TRefs = new Map()

    Object.entries(schema[DEFENITION_KEY_WORD]).forEach(([path, definition]) => {
        definitionsRefs.set(`#/${DEFENITION_KEY_WORD}/${path}`, collectRefs(definition))
    })

    console.log(definitionsRefs)

    for (const [ref, path] of schemaRefs) {
        tryResolveRefs(ref, definitionsRefs)
    }
}
