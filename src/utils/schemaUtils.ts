const keysToCheck = ['allOf', 'anyOf', 'oneOf', 'not', 'properties'];

const resolveRefs = (inputSchema: any, rootSchema: any) => {
    const { $ref } = inputSchema
    if ($ref) {
        const refPath = $ref.replace('#', '').split('/')
        let currentSchema = rootSchema
        for (const pathPart of refPath) {
            if (pathPart !== '') {
                currentSchema = currentSchema[pathPart]
            }
        }
        return currentSchema
    }
    return inputSchema
}

/**
 * Utility functions for JSON schema validation and analysis
 */

/**
 * Check for recursion in JSON schema by expanding $ref references
 * @param schema - The JSON schema to check
 * @param rootSchema - The root schema for reference resolution
 * @param visited - Set of visited schema objects
 * @param path - Current path in the schema traversal
 * @returns object - { hasRecursion: boolean, recursionPath: string | null }
 */
export const checkForRecursionWithPath = (
  schema: any, 
  rootSchema: any = schema, 
  visited: Set<any> = new Set(),
  path: string[] = []
): { hasRecursion: boolean; recursionPath: string | null } => {
  const initialSchema = schema['$ref'] ? resolveRefs(schema, rootSchema) : schema;

  // Check if we've visited this schema before
  if (visited.has(initialSchema)) {
    return { hasRecursion: true, recursionPath: path.join(' -> ') };
  }
  
  // Add current schema to visited set
  visited.add(initialSchema);

  // Check for $ref recursion
  if (schema['$ref']) {
    const refPath = path.concat(`$ref:${schema['$ref']}`);
    const result = checkForRecursionWithPath(initialSchema, rootSchema, visited, refPath);
    if (result.hasRecursion) {
      return result;
    }
  }

  // Skip non-object schemas or non-object type schemas
  if (!initialSchema || typeof initialSchema !== 'object' || !initialSchema.type || (initialSchema.type && initialSchema.type !== 'object')) {
    return { hasRecursion: false, recursionPath: null };
  }

  // Check all properties and schema composition keywords
  for (const key of keysToCheck) {
    const schemaObjectByKey = initialSchema[key];
    if (schemaObjectByKey) {
      // Handle array of schemas (for allOf, anyOf, oneOf)
      if (Array.isArray(schemaObjectByKey)) {
        for (let i = 0; i < schemaObjectByKey.length; i++) {
          const property = schemaObjectByKey[i];
          const propertyPath = path.concat(`${key}[${i}]`);
          const result = checkForRecursionWithPath(property, rootSchema, visited, propertyPath);
          if (result.hasRecursion) {
            return result;
          }
        }
      } 
      // Handle object of properties
      else {
        for (const [propName, property] of Object.entries(schemaObjectByKey)) {
          const propertyPath = path.concat(`${key}.${propName}`);
          const result = checkForRecursionWithPath(property as any, rootSchema, visited, propertyPath);
          if (result.hasRecursion) {
            return result;
          }
        }
      }
    }
  }
  
  return { hasRecursion: false, recursionPath: null };
};

/**
 * Check for recursion in JSON schema (backward compatibility)
 * @param schema - The JSON schema to check
 * @returns boolean - true if recursion is detected, false otherwise
 */
export const checkForRecursion = (schema: any, rootSchema: any = schema, visited: Set<any> = new Set()): boolean => {
  const result = checkForRecursionWithPath(schema, rootSchema, visited);
  return result.hasRecursion;
};