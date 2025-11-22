/**
 * Utility functions for finding line numbers in JSON strings
 */

/**
 * Find the line number in the JSON string that corresponds to the first element of the given path
 * @param jsonString - The JSON string to search in
 * @param path - The path string to find (e.g., "properties.user.properties.profile.$ref:#/definitions/User")
 * @returns number | null - The line number or null if not found
 */
export const findLineNumberForPath = (jsonString: string, path: string): number | null => {
  try {
    // Split the JSON string into lines
    const lines = jsonString.split('\n');
    
    // Parse the path to get all path parts
    const pathParts = path.split(' -> ');
    if (pathParts.length === 0) return null;
    
    // For $ref paths, we need to find the context-aware location
    // Check if this is a $ref path (starts with $ref:)
    if (pathParts[0].startsWith('$ref:')) {
      // For recursive $ref paths, we want to find the LAST occurrence in the path
      // This is because the recursion happens when we return to a previously visited $ref
      const targetRef = pathParts[pathParts.length - 1].substring(5); // Extract value after "$ref:"
      const searchString = `"$ref": "${targetRef}"`;
      
      // Search from the end to find the last occurrence
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.includes(searchString)) {
          return i + 1; // Line numbers are 1-based
        }
      }
      
      // If not found searching from end, try from beginning
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(searchString)) {
          return i + 1; // Line numbers are 1-based
        }
      }
    } else {
      // Handle non-$ref paths as before
      // Get the FIRST part of the path which should contain the key we're looking for
      const firstPart = pathParts[0];
      
      // Handle different path formats to extract the search key
      let searchKey = '';
      let searchValue = '';
      if (firstPart.startsWith('$ref:')) {
        // For $ref paths, we look for the $ref key and its specific value
        searchKey = '$ref';
        searchValue = firstPart.substring(5); // Extract value after "$ref:"
      } else if (firstPart.includes('.')) {
        // For property paths like "properties.user", get the last part
        const propertyParts = firstPart.split('.');
        searchKey = propertyParts[propertyParts.length - 1];
      } else if (firstPart.includes('[')) {
        // For array paths like "allOf[0]", we look for the key before the bracket
        const arrayParts = firstPart.split('[');
        searchKey = arrayParts[0];
      } else {
        // For simple keys, use as is
        searchKey = firstPart;
      }
      
      // If we have a specific value to search for (like in $ref cases), create a more precise pattern
      if (searchValue) {
        // For $ref values, use direct string search to avoid regex escaping issues
        // Create the exact string we're looking for
        const searchString = `"${searchKey}": "${searchValue}"`;
        
        // Search for the key-value pair in the JSON lines
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(searchString)) {
            return i + 1; // Line numbers are 1-based
          }
        }
      } else {
        // Create the search pattern - look for the key as a property name
        const searchPattern = `"${searchKey}"\\s*:\\s*`;
        const regex = new RegExp(searchPattern);
        
        // Search for the key in the JSON lines
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (regex.test(line)) {
            return i + 1; // Line numbers are 1-based
          }
        }
        
        // If not found, try a simpler search for just the key
        const simplePattern = `"${searchKey}"\\s*:`;
        const simpleRegex = new RegExp(simplePattern);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (simpleRegex.test(line)) {
            return i + 1; // Line numbers are 1-based
          }
        }
      }
      
      // Special handling for $ref - look for the actual $ref value
      if (searchKey === '$ref' && !searchValue) {
        const refValuePattern = `"\\$ref"\\s*:\\s*`;
        const refRegex = new RegExp(refValuePattern);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (refRegex.test(line)) {
            return i + 1; // Line numbers are 1-based
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding line number for path:', error);
    return null;
  }
};

/**
 * Find all line numbers in the JSON string that correspond to the given path
 * @param jsonString - The JSON string to search in
 * @param path - The path string to find
 * @returns number[] - Array of line numbers
 */
export const findAllLineNumbersForPath = (jsonString: string, path: string): number[] => {
  try {
    const lineNumbers: number[] = [];
    const lines = jsonString.split('\n');
    
    // Parse the path to get all keys we need to look for
    const pathParts = path.split(' -> ');
    if (pathParts.length === 0) return [];
    
    // For each part of the path, find corresponding line numbers
    for (const part of pathParts) {
      let searchKey = '';
      if (part.startsWith('$ref:')) {
        searchKey = '$ref';
      } else if (part.includes('.')) {
        const propertyParts = part.split('.');
        searchKey = propertyParts[propertyParts.length - 1];
      } else if (part.includes('[')) {
        const arrayParts = part.split('[');
        searchKey = arrayParts[0];
      } else {
        searchKey = part;
      }
      
      // Create search pattern
      const searchPattern = `"${searchKey}"\\s*:\\s*`;
      const regex = new RegExp(searchPattern);
      
      // Search for the key in the JSON lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regex.test(line)) {
          lineNumbers.push(i + 1); // Line numbers are 1-based
        }
      }
    }
    
    return lineNumbers;
  } catch (error) {
    console.error('Error finding all line numbers for path:', error);
    return [];
  }
};