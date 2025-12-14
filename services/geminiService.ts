// Replaced Gemini service with a local parser to handle Python literals directly
// This ensures privacy, speed, and deterministic results without API keys.

export const convertPythonToJson = async (pythonString: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Small delay to prevent UI freezing on large inputs immediately, 
      // though for most inputs it's instant.
      setTimeout(() => {
        try {
          const parsed = parsePython(pythonString);
          resolve(JSON.stringify(parsed, null, 2));
        } catch (e: any) {
          reject(e.message);
        }
      }, 50);
    } catch (e: any) {
      reject(e.message);
    }
  });
};

function parsePython(source: string) {
  let index = 0;
  const length = source.length;

  function peek() {
    return index < length ? source[index] : null;
  }

  function advance() {
    index++;
  }

  function skipWhitespace() {
    while (index < length) {
      const char = source[index];
      if (/\s/.test(char)) {
        advance();
      } else if (char === '#') {
        // Comment: skip until newline
        while (index < length && source[index] !== '\n') {
          advance();
        }
      } else {
        break;
      }
    }
  }

  function parseString() {
    const quote = source[index];
    advance(); // Skip opening quote
    let result = '';
    
    while (index < length) {
      const char = source[index];
      if (char === '\\') {
        advance();
        if (index >= length) break;
        const esc = source[index];
        const escapes: Record<string, string> = {
          'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f',
          '\\': '\\', '"': '"', "'": "'", '/': '/'
        };
        result += escapes[esc] || esc; 
        advance();
      } else if (char === quote) {
        advance(); // Skip closing quote
        return result;
      } else {
        result += char;
        advance();
      }
    }
    throw new Error("Unterminated string");
  }

  function parseNumber() {
    const start = index;
    if (peek() === '-') advance();
    while (index < length && /[0-9]/.test(source[index])) advance();
    if (peek() === '.') {
      advance();
      while (index < length && /[0-9]/.test(source[index])) advance();
    }
    if (peek()?.toLowerCase() === 'e') {
      advance();
      if (peek() === '+' || peek() === '-') advance();
      while (index < length && /[0-9]/.test(source[index])) advance();
    }
    const numStr = source.slice(start, index);
    const num = Number(numStr);
    return isNaN(num) ? numStr : num;
  }

  function parseWord() {
    const start = index;
    while (index < length && /[a-zA-Z0-9_]/.test(source[index])) advance();
    const word = source.slice(start, index);
    if (word === 'None') return null;
    if (word === 'True') return true;
    if (word === 'False') return false;
    return word; 
  }

  function parseList(endChar: string): any[] {
    advance(); // Skip [ or (
    const result: any[] = [];
    skipWhitespace();
    
    if (peek() === endChar) {
      advance();
      return result;
    }

    while (index < length) {
      result.push(parseValue());
      skipWhitespace();
      
      if (peek() === endChar) {
        advance();
        return result;
      }
      
      if (peek() === ',') {
        advance();
        skipWhitespace();
        if (peek() === endChar) {
          advance();
          return result;
        }
      } else {
        throw new Error(`Expected ',' or '${endChar}' at position ${index}`);
      }
    }
    throw new Error(`Unterminated list/tuple`);
  }

  function parseSetOrDict() {
    advance(); // Skip {
    skipWhitespace();
    
    if (peek() === '}') {
      advance();
      return {}; // Empty dict
    }

    // Parse first item
    const firstKey = parseValue();
    skipWhitespace();

    if (peek() === ':') {
      // It's a Dictionary
      const obj: any = {};
      
      // Process first pair
      advance(); // skip :
      skipWhitespace();
      const firstVal = parseValue();
      const keyStr = typeof firstKey === 'object' ? JSON.stringify(firstKey) : String(firstKey);
      obj[keyStr] = firstVal;
      
      skipWhitespace();
      if (peek() === '}') {
        advance();
        return obj;
      }
      if (peek() === ',') advance();

      // Loop remaining
      while (index < length) {
        skipWhitespace();
        if (peek() === '}') {
          advance();
          return obj;
        }
        
        const key = parseValue();
        skipWhitespace();
        if (peek() !== ':') throw new Error(`Expected ':' in dict at position ${index}`);
        advance();
        skipWhitespace();
        const val = parseValue();
        const kStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
        obj[kStr] = val;
        
        skipWhitespace();
        if (peek() === '}') {
          advance();
          return obj;
        }
        if (peek() === ',') {
          advance();
        } else {
           throw new Error(`Expected ',' or '}' at position ${index}`);
        }
      }
    } else {
      // It's a Set (convert to Array)
      const arr = [firstKey];
      skipWhitespace();
      
      if (peek() === '}') {
        advance();
        return arr;
      }
      if (peek() === ',') advance();

      while (index < length) {
        skipWhitespace();
        if (peek() === '}') {
          advance();
          return arr;
        }
        arr.push(parseValue());
        skipWhitespace();
        if (peek() === '}') {
          advance();
          return arr;
        }
        if (peek() === ',') {
          advance();
        } else {
          throw new Error(`Expected ',' or '}' in set at position ${index}`);
        }
      }
    }
    return {};
  }

  function parseValue(): any {
    skipWhitespace();
    const char = peek();
    if (!char) throw new Error("Unexpected end of input");
    
    if (char === '"' || char === "'") return parseString();
    if (char === '[') return parseList(']');
    if (char === '(') return parseList(')');
    if (char === '{') return parseSetOrDict();
    if (char === '-' || /[0-9]/.test(char)) return parseNumber();
    
    // Handle string prefixes u'...' b'...' r'...'
    if ((char === 'u' || char === 'b' || char === 'r') && index + 1 < length) {
      const nextChar = source[index + 1];
      if (nextChar === '"' || nextChar === "'") {
        advance(); // skip prefix
        return parseString();
      }
    }

    if (/[a-zA-Z_]/.test(char)) return parseWord();
    
    throw new Error(`Unexpected character '${char}' at position ${index}`);
  }

  const result = parseValue();
  return result;
}
