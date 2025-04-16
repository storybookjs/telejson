import isRegExp from 'is-regex';
import isFunction from 'is-function';
import isSymbol from 'is-symbol';
import isObjectAny from 'isobject';
import { get } from 'lodash-es';
import { extractEventHiddenProperties } from './dom-event';

const isObject = isObjectAny as <T = object>(val: any) => val is T;

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export interface Options {
  allowRegExp: boolean;
  allowSymbol: boolean;
  allowDate: boolean;
  allowUndefined: boolean;
  allowError: boolean;
  maxDepth: number;
  space: number | undefined;
}

export const isJSON = (input: string) => input.match(/^[\[\{\"\}].*[\]\}\"]$/);

function convertUnconventionalData(data: unknown) {
  if (!isObject(data)) {
    return data;
  }

  let result: any = data;
  let wasMutated = false;

  // `Event` has a weird structure, for details see `extractEventHiddenProperties` doc
  // Plus we need to check if running in a browser to ensure `Event` exist and
  // is really the dom Event class.
  if (typeof Event !== 'undefined' && data instanceof Event) {
    result = extractEventHiddenProperties(result);
    wasMutated = true;
  }

  result = Object.keys(result).reduce((acc, key) => {
    try {
      // Try accessing a property to test if we are allowed to do so
      // We have a if statement, and not a optional chaining, because webpack4 doesn't support it, and react-native uses it
      if (result[key]) {
        result[key].toJSON;
      }

      acc[key] = result[key];
    } catch (_err) {
      wasMutated = true;
    }
    return acc;
  }, {} as any);

  return wasMutated ? result : data;
}

export const replacer = function replacer(options: Options): any {
  let objects: Map<any, string>;
  let map: Map<any, any>;
  let stack: any[];
  let keys: string[];

  return function replace(this: any, key: string, value: any) {
    try {
      //  very first iteration
      if (key === '') {
        keys = [];
        objects = new Map([[value, '[]']]);
        map = new Map();
        stack = [];

        return value;
      }

      // From the JSON.stringify's doc:
      // "The object in which the key was found is provided as the replacer's this parameter." thus one can control the depth
      const origin = map.get(this) || this;
      while (stack.length && origin !== stack[0]) {
        stack.shift();
        keys.pop();
      }

      if (typeof value === 'boolean') {
        return value;
      }

      if (value === undefined) {
        if (!options.allowUndefined) {
          return undefined;
        }
        return '_undefined_';
      }

      if (value === null) {
        return null;
      }

      if (typeof value === 'number') {
        if (value === Number.NEGATIVE_INFINITY) {
          return '_-Infinity_';
        }
        if (value === Number.POSITIVE_INFINITY) {
          return '_Infinity_';
        }
        if (Number.isNaN(value)) {
          return '_NaN_';
        }

        return value;
      }

      if (typeof value === 'bigint') {
        return `_bigint_${value.toString()}`;
      }

      if (typeof value === 'string') {
        if (dateFormat.test(value)) {
          if (!options.allowDate) {
            return undefined;
          }
          return `_date_${value}`;
        }

        return value;
      }

      if (isRegExp(value)) {
        if (!options.allowRegExp) {
          return undefined;
        }
        return `_regexp_${value.flags}|${value.source}`;
      }

      if (isFunction(value)) {
        return undefined;
      }

      if (isSymbol(value)) {
        if (!options.allowSymbol) {
          return undefined;
        }

        const globalRegistryKey = Symbol.keyFor(value);
        if (globalRegistryKey !== undefined) {
          return `_gsymbol_${globalRegistryKey}`;
        }

        return `_symbol_${value.toString().slice(7, -1)}`;
      }

      if (stack.length >= options.maxDepth) {
        if (Array.isArray(value)) {
          return `[Array(${value.length})]`;
        }
        return '[Object]';
      }

      if (value === this) {
        return `_duplicate_${JSON.stringify(keys)}`;
      }

      if (value instanceof Error && options.allowError) {
        return {
          __isConvertedError__: true,
          errorProperties: {
            // @ts-expect-error cause is not defined in the current tsconfig target(es2020)
            ...(value.cause ? { cause: value.cause } : {}),
            ...value,
            name: value.name,
            message: value.message,
            stack: value.stack,
            '_constructor-name_': value.constructor.name,
          },
        };
      }

      // when it's a class, convert to plain object
      if (
        value?.constructor?.name &&
        value.constructor.name !== 'Object' &&
        !Array.isArray(value)
      ) {
        const found = objects.get(value);
        if (!found) {
          const plainObject = {
            __isClassInstance__: true,
            __className__: value.constructor.name,
            ...Object.getOwnPropertyNames(value).reduce(
              (acc, prop) => {
                try {
                  acc[prop] = value[prop];
                } catch (_err) {
                  // Skip properties that throw on access
                }
                return acc;
              },
              {} as Record<string, any>
            ),
          };

          keys.push(key);
          stack.unshift(plainObject);
          objects.set(value, JSON.stringify(keys));

          if (value !== plainObject) {
            map.set(value, plainObject);
          }

          return plainObject;
        }
        return `_duplicate_${found}`;
      }

      const found = objects.get(value);
      if (!found) {
        const converted = Array.isArray(value) ? value : convertUnconventionalData(value);

        keys.push(key);
        stack.unshift(converted);
        objects.set(value, JSON.stringify(keys));

        if (value !== converted) {
          map.set(value, converted);
        }

        return converted;
      }

      //  actually, here's the only place where the keys keeping is useful
      return `_duplicate_${found}`;
    } catch (_e) {
      return undefined;
    }
  };
};

interface ValueContainer {
  '_constructor-name_'?: string;

  [keys: string]: any;
}

export const reviver = function reviver(options: Options): any {
  const refs: { target: string; container: { [keys: string]: any }; replacement: string }[] = [];
  let root: any;

  return function revive(this: any, key: string, value: ValueContainer | string) {
    // last iteration = root
    if (key === '') {
      root = value;

      // restore cyclic refs
      // biome-ignore lint/complexity/noForEach: <explanation>
      refs.forEach(({ target, container, replacement }) => {
        const replacementArr = isJSON(replacement)
          ? JSON.parse(replacement)
          : replacement.split('.');
        if (replacementArr.length === 0) {
          container[target] = root;
        } else {
          container[target] = get(root, replacementArr);
        }
      });
    }

    if (key === '_constructor-name_') {
      return value;
    }

    if (isObject<ValueContainer>(value) && value.__isConvertedError__) {
      // reconstruct the error with its original properties
      const { message, ...properties } = value.errorProperties;
      const error = new Error(message);
      Object.assign(error, properties);

      return error;
    }

    if (typeof value === 'string' && value.startsWith('_regexp_') && options.allowRegExp) {
      // this split isn't working correctly
      const [, flags, source] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
      return new RegExp(source, flags);
    }

    if (typeof value === 'string' && value.startsWith('_date_') && options.allowDate) {
      return new Date(value.replace('_date_', ''));
    }

    if (typeof value === 'string' && value.startsWith('_duplicate_')) {
      refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, '') });
      return null;
    }

    if (typeof value === 'string' && value.startsWith('_symbol_') && options.allowSymbol) {
      return Symbol(value.replace('_symbol_', ''));
    }

    if (typeof value === 'string' && value.startsWith('_gsymbol_') && options.allowSymbol) {
      return Symbol.for(value.replace('_gsymbol_', ''));
    }

    if (typeof value === 'string' && value === '_-Infinity_') {
      return Number.NEGATIVE_INFINITY;
    }

    if (typeof value === 'string' && value === '_Infinity_') {
      return Number.POSITIVE_INFINITY;
    }

    if (typeof value === 'string' && value === '_NaN_') {
      return Number.NaN;
    }

    if (typeof value === 'string' && value.startsWith('_bigint_') && typeof BigInt === 'function') {
      return BigInt(value.replace('_bigint_', ''));
    }

    return value;
  };
};

const defaultOptions: Options = {
  maxDepth: 10,
  space: undefined,
  allowRegExp: true,
  allowDate: true,
  allowError: true,
  allowUndefined: true,
  allowSymbol: true,
};

export const stringify = (data: unknown, options: Partial<Options> = {}) => {
  const mergedOptions: Options = { ...defaultOptions, ...options };
  return JSON.stringify(convertUnconventionalData(data), replacer(mergedOptions), options.space);
};

const mutator = () => {
  const mutated: Map<any, boolean> = new Map();

  return function mutateUndefined(value: any) {
    // JSON.parse will not output keys with value of undefined
    // we map over a deeply nester object, if we find any value with `_undefined_`, we mutate it to be undefined
    if (isObject<{ [keys: string]: any }>(value)) {
      // biome-ignore lint/complexity/noForEach: <explanation>
      Object.entries(value).forEach(([k, v]) => {
        if (v === '_undefined_') {
          value[k] = undefined;
        } else if (!mutated.get(v)) {
          mutated.set(v, true);
          mutateUndefined(v);
        }
      });
    }
    if (Array.isArray(value)) {
      value.forEach((v, index) => {
        if (v === '_undefined_') {
          mutated.set(v, true);

          value[index] = undefined;
        } else if (!mutated.get(v)) {
          mutated.set(v, true);
          mutateUndefined(v);
        }
      });
    }
  };
};

export const parse = (data: string, options: Partial<Options> = {}) => {
  const mergedOptions: Options = { ...defaultOptions, ...options };
  const result = JSON.parse(data, reviver(mergedOptions));

  mutator()(result);

  return result;
};
