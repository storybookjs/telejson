import { window, document } from 'global';

import isRegExp from 'is-regex';
import isFunction from 'is-function';
import isSymbol from 'is-symbol';
import isObject from 'isobject';
import get from 'lodash/get';
import memoize from 'memoizerific';

const removeCodeComments = code => {
  let inQuoteChar = null;
  let inBlockComment = false;
  let inLineComment = false;
  let inRegexLiteral = false;
  let newCode = '';

  if (code.indexOf('//') >= 0 || code.indexOf('/*') >= 0) {
    for (let i = 0; i < code.length; i += 1) {
      if (!inQuoteChar && !inBlockComment && !inLineComment && !inRegexLiteral) {
        if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
          inQuoteChar = code[i];
        } else if (code[i] === '/' && code[i + 1] === '*') {
          inBlockComment = true;
        } else if (code[i] === '/' && code[i + 1] === '/') {
          inLineComment = true;
        } else if (code[i] === '/' && code[i + 1] !== '/') {
          inRegexLiteral = true;
        }
      } else {
        if (
          inQuoteChar &&
          ((code[i] === inQuoteChar && code[i - 1] !== '\\') ||
            (code[i] === '\n' && inQuoteChar !== '`'))
        ) {
          inQuoteChar = null;
        }
        if (inRegexLiteral && ((code[i] === '/' && code[i - 1] !== '\\') || code[i] === '\n')) {
          inRegexLiteral = false;
        }
        if (inBlockComment && code[i - 1] === '/' && code[i - 2] === '*') {
          inBlockComment = false;
        }
        if (inLineComment && code[i] === '\n') {
          inLineComment = false;
        }
      }
      if (!inBlockComment && !inLineComment) {
        newCode += code[i];
      }
    }
  } else {
    newCode = code;
  }

  return newCode;
};

const cleanCode = memoize(10000)(code =>
  removeCodeComments(code)
    .replace(/\n\s*/g, '') // remove indents & newlines
    .trim());

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const replacer = function replacer(options) {
  let objects;
  let stack;
  let keys;

  return function replace(key, value) {
    //  very first iteration
    if (key === '') {
      keys = ['root'];
      objects = [{ keys: 'root', value }];
      stack = [];
      return value;
    }

    // From the JSON.stringify's doc:
    // "The object in which the key was found is provided as the replacer's this parameter." thus one can control the depth
    while (stack.length && this !== stack[0]) {
      stack.shift();
      keys.pop();
    }

    if (isRegExp(value)) {
      if (!options.allowRegExp) {
        return undefined;
      }
      return `_regexp_${value.flags}|${value.source}`;
    }

    if (isFunction(value)) {
      if (!options.allowFunction) {
        return undefined;
      }
      const { name } = value;
      const stringified = value.toString();
      
      if (!stringified.match(/(\[native code\]|WEBPACK_IMPORTED_MODULE|__webpack_exports__|__webpack_require__)/)) {
        return `_function_${name}|${cleanCode(stringified)}`;
      }
      return `_function_${name}|${(() => {}).toString()}`;
    }

    if (isSymbol(value)) {
      if (!options.allowSymbol) {
        return undefined;
      }
      return `_symbol_${value.toString().slice(7, -1)}`;
    }

    if (typeof value === 'string' && dateFormat.test(value)) {
      if (!options.allowDate) {
        return undefined;
      }
      return `_date_${value}`;
    }

    if (value === undefined) {
      if (!options.allowUndefined) {
        return undefined;
      }
      return '_undefined_';
    }

    if (typeof value === 'number') {
      if (value === -Infinity) {
        return '_-Infinity_';
      }
      if (value === Infinity) {
        return '_Infinity_';
      }
      if (Number.isNaN(value)) {
        return '_NaN_';
      }

      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (stack.length >= options.maxDepth) {
      if (Array.isArray(value)) {
        return `[Array(${value.length})]`;
      }
      return '[Object]';
    }

    const found = objects.find(o => o.value === value);
    if (!found) {
      if (
        value &&
        isObject(value) &&
        value.constructor &&
        value.constructor.name &&
        value.constructor.name !== 'Object'
      ) {
        if (!options.allowClass) {
          return undefined;
        }

        try {
          Object.assign(value, { '_constructor-name_': value.constructor.name });
        } catch (e) {
          // immutable objects can't be written to and throw
          // we could make a deep copy but if the user values the correct instance name,
          // the user should make the deep copy themselves.
        }
      }

      keys.push(key);
      stack.unshift(value);
      objects.push({ keys: keys.join('.'), value });
      return value;
    }

    //  actually, here's the only place where the keys keeping is useful
    return `_duplicate_${found.keys}`;
  };
};

export const reviver = function reviver() {
  const refs = [];
  let root;

  return function revive(key, value) {
    // last iteration = root
    if (key === '') {
      root = value;

      // restore cyclic refs
      refs.forEach(({ target, container, replacement }) => {
        if (replacement === 'root') {
          // eslint-disable-next-line no-param-reassign
          container[target] = root;
        } else {
          // eslint-disable-next-line no-param-reassign
          container[target] = get(root, replacement.replace('root.', ''));
        }
      });
    }

    if (key === '_constructor-name_') {
      return value;
    }

    // deal with instance names
    if (isObject(value) && value['_constructor-name_']) {
      const name = value['_constructor-name_'];
      if (name !== 'Object') {
        // eslint-disable-next-line no-new-func
        const Fn = new Function(`return function ${name}(){}`)();
        Object.setPrototypeOf(value, new Fn());
      }
      // eslint-disable-next-line no-param-reassign
      delete value['_constructor-name_'];
      return value;
    }

    if (typeof value === 'string' && value.startsWith('_function_')) {
      const [, name, source] = value.match(/_function_([^|]*)\|(.*)/);

      // lazy eval of the function
      const result = (...args) => {
        const f = eval(`(${source})`);
        f(...args);
      };
      Object.defineProperty(result, 'toString', {
        value: () => source,
      });
      Object.defineProperty(result, 'name', {
        value: name,
      });
      return result;
    }

    if (typeof value === 'string' && value.startsWith('_regexp_')) {
      // this split isn't working correctly
      const [, flags, source] = value.match(/_regexp_([^|]*)\|(.*)/);
      return new RegExp(source, flags);
    }

    if (typeof value === 'string' && value.startsWith('_date_')) {
      return new Date(value.replace('_date_', ''));
    }

    if (typeof value === 'string' && value.startsWith('_duplicate_')) {
      refs.push({ target: key, container: this, replacement: value.replace('_duplicate_', '') });
      return null;
    }

    if (typeof value === 'string' && value.startsWith('_symbol_')) {
      return Symbol(value.replace('_symbol_', ''));
    }

    if (typeof value === 'string' && value === '_undefined_') {
      return undefined;
    }

    if (typeof value === 'string' && value === '_-Infinity_') {
      return -Infinity;
    }

    if (typeof value === 'string' && value === '_Infinity_') {
      return Infinity;
    }

    if (typeof value === 'string' && value === '_NaN_') {
      return NaN;
    }

    return value;
  };
};

export const isJSON = input => input.match(/^[\[\{\"\}].*[\]\}\"]$/);

const defaultOptions = {
  maxDepth: 10,
  space: undefined,
  allowFunction: true,
  allowRegExp: true,
  allowDate: true,
  allowClass: true,
  allowUndefined: true,
  allowSymbol: true,
}

export const stringify = (data, options = {}) => {
  const mergedOptions = Object.assign({}, defaultOptions, options);
  return JSON.stringify(data, replacer(mergedOptions), options.space);
};
export const parse = data => JSON.parse(data, reviver());
