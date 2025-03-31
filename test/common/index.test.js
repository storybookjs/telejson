/* eslint-disable no-undef */
/* eslint-disable no-shadow */
import { describe, it, expect } from 'vitest';
import * as dist from '../../dist/index.js';

const regex1 = /foo/;
const regex2 = /foo/g;
const regex3 = new RegExp('foo', 'i');

const fn1 = (x) => x + x;
const fn2 = function x(x) {
  return x - x;
};
function fn3() {
  return x / x;
}

class Foo {}

class SomeError extends Error {
  aCustomProperty = true;
  stack = 'mocked stack to avoid inconsistent snapshots';

  constructor() {
    super('Custom error message', { cause: { code: '001' } });
  }

  get name() {
    return 'SomeError';
  }

  fn4(x) {
    return x * x;
  }
}

const date = new Date('2018');

const nested = {
  a: {
    b: {
      c: {
        d: {
          e: {
            f: {
              g: {
                h: {
                  i: {
                    j: {
                      k: {
                        l: 'l',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const undef = undefined;

const data = {
  regex1,
  regex2,
  regex3,
  fn1,
  fn2,
  fn3,
  fn4(x) {
    return x * x;
  },
  date,
  foo: new Foo(),
  error: new SomeError(),
  nested,
  undef,
};

data.cyclic = data;

const tests = ({ stringify, parse }) => {
  it('sanity', () => {
    expect(true).toBe(true);
  });

  describe('stringify', () => {
    let stringified;

    it('should not throw', () => {
      expect(() => {
        stringified = stringify(data);
      }).not.toThrow();
    });

    it('should match snapshot', () => {
      expect(stringified).toMatchSnapshot();
    });
  });

  it('parse', () => {
    const stringified = stringify(data);
    let parsed;
    expect(() => {
      parsed = parse(stringified);
    }).not.toThrow();
    expect(parsed).toMatchSnapshot();

    // test the regex
    expect(parsed.regex1.exec).toBeDefined();
    expect('aaa-foo-foo-bbb'.replace(parsed.regex1, 'BAR')).toBe('aaa-BAR-foo-bbb');
    expect('aaa-foo-foo-bbb'.replace(parsed.regex2, 'BAR')).toBe('aaa-BAR-BAR-bbb');
    expect('aaa-Foo-foo-bbb'.replace(parsed.regex3, 'BAR')).toBe('aaa-BAR-foo-bbb');

    // test the date
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.date.getFullYear()).toBe(2018);

    // test cyclic
    expect(parsed.cyclic.cyclic.cyclic.cyclic).toBeDefined();
    expect(parsed.cyclic.cyclic.cyclic.cyclic).toBe(parsed);

    // test Foo instance
    expect(parsed.foo).toBeDefined();
    expect(parsed.foo.constructor.name).toBe('Foo');
    expect(parsed.foo instanceof Foo).toBe(false);

    // test Error instance
    expect(parsed.error).toBeDefined();
    expect(parsed.error.message).toEqual('Custom error message');
    expect(parsed.error.name).toEqual('SomeError');
    expect(parsed.error.stack).toEqual(data.error.stack);
    expect(parsed.error.cause).toEqual(data.error.cause);
    expect(parsed.error.aCustomProperty).toEqual(data.error.aCustomProperty);
    expect(parsed.error instanceof Error).toBe(true);

    expect(parsed.undef).toBeUndefined();
  });

  it('maxDepth', () => {
    const stringifiedDefault = stringify(data);
    const stringifiedMax5 = stringify(data, { maxDepth: 5 });
    const parsedDefault = parse(stringifiedDefault);
    const parsedMax5 = parse(stringifiedMax5);

    expect(parsedDefault.nested.a.b.c.d.e.f.g.h.i).toBeDefined();
    expect(parsedDefault.nested.a.b.c.d.e.f.g.h.i.j).toBeDefined();
    expect(parsedDefault.nested.a.b.c.d.e.f.g.h.i.j.k).not.toBeDefined();

    expect(parsedMax5.nested.a.b.c.d).toBeDefined();
    expect(parsedMax5.nested.a.b.c.d.e).toBeDefined();
    expect(parsedMax5.nested.a.b.c.d.e.f).not.toBeDefined();
  });

  it('space', () => {
    const stringifiedSpaced = stringify(data, { space: 2 });

    expect(stringifiedSpaced).toMatchSnapshot();
  });

  it('check duplicate value', () => {
    const Fruit = {
      apple: true,
      parent: {},
    };
    Fruit.cyclic = Fruit;
    const stringified = stringify(Fruit);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"apple":true,"parent":{},"cyclic":"_duplicate_[]"}');
    expect(parsed.cyclic.cyclic.cyclic.cyclic).toBeDefined();
    expect(parsed.cyclic).toBe(parsed);
    expect(parsed.cyclic.cyclic.cyclic.cyclic).toBe(parsed);
  });

  it('check constructor value', () => {
    const data = { ConstructorFruit: new Foo() };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"ConstructorFruit":{"_constructor-name_":"Foo"}}');
    expect(parsed.ConstructorFruit).toBeDefined();
    expect(parsed.ConstructorFruit.constructor.name).toBe('Foo');
    expect(parsed.foo instanceof Foo).toBe(false);
  });

  it('NOT check constructor value when disabled via options in parse', () => {
    const data = { ConstructorFruit: new Foo() };

    const stringified = stringify(data);
    const parsed = parse(stringified, { allowFunction: false });

    expect(stringified).toEqual('{"ConstructorFruit":{"_constructor-name_":"Foo"}}');
    expect(parsed.ConstructorFruit).toBeDefined();
    expect(parsed.ConstructorFruit.constructor.name).toBe('Object');
    expect(parsed.ConstructorFruit).toEqual({ '_constructor-name_': 'Foo' });
  });

  it('check function value', () => {
    const Fruit = function Fruit(value) {
      return [value, 'apple'];
    };
    const data = { FunctionFruit: Fruit };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual(
      '{"FunctionFruit":"_function_Fruit|function Fruit(value) {return [value, \'apple\'];}"}'
    );
    expect(parsed.FunctionFruit('orange')).toEqual(['orange', 'apple']);
    expect(parsed.FunctionFruit.toString()).toEqual(
      "function Fruit(value) {return [value, 'apple'];}"
    );
  });

  it('NOT check function value when disabled via options in parse', () => {
    const Fruit = function Fruit(value) {
      return [value, 'apple'];
    };
    const data = { FunctionFruit: Fruit };

    const stringified = stringify(data);
    const parsed = parse(stringified, { allowFunction: false });

    expect(stringified).toEqual(
      '{"FunctionFruit":"_function_Fruit|function Fruit(value) {return [value, \'apple\'];}"}'
    );
    expect(parsed.FunctionFruit).toEqual(
      "_function_Fruit|function Fruit(value) {return [value, 'apple'];}"
    );
  });

  it('NOT check function value when disabled via options in stringify', () => {
    const Fruit = function Fruit(value) {
      return [value, 'apple'];
    };
    const data = { FunctionFruit: Fruit };

    const stringified = stringify(data, { allowFunction: false });
    const parsed = parse(stringified);

    expect(stringified).toEqual('{}');
    expect(parsed.FunctionFruit).not.toBeDefined();
  });

  it('check regExp value', () => {
    const data = { RegExpFruit: /test/g };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"RegExpFruit":"_regexp_g|test"}');
    expect(parsed).toMatchObject(data);
  });

  it('check date value', () => {
    const data = { DateFruit: new Date('01.01.2019') };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"DateFruit":"_date_2019-01-01T00:00:00.000Z"}');
    expect(parsed).toMatchObject(data);
    expect(parsed.DateFruit.getFullYear()).toBe(2019);
  });

  it('check symbol value', () => {
    const data = { SymbleFruit: Symbol('apple') };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"SymbleFruit":"_symbol_apple"}');
    expect(parsed.SymbleFruit.toString()).toEqual('Symbol(apple)');
  });

  it('check global symbol value', () => {
    const data = { GlobalSymbolFruit: Symbol.for('grapes') };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"GlobalSymbolFruit":"_gsymbol_grapes"}');
    expect(parsed.GlobalSymbolFruit.toString()).toEqual('Symbol(grapes)');
    expect(parsed.GlobalSymbolFruit).toEqual(Symbol.for('grapes'));
  });

  it('check minus Infinity value', () => {
    const data = { InfinityFruit: -Infinity };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"InfinityFruit":"_-Infinity_"}');
    expect(parsed).toMatchObject(data);
  });

  it('check Infinity value', () => {
    const data = { InfinityFruit: Infinity };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"InfinityFruit":"_Infinity_"}');
    expect(parsed).toMatchObject(data);
  });

  it('check NaN value', () => {
    const data = { NaNFruit: NaN };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"NaNFruit":"_NaN_"}');
    expect(parsed).toMatchObject(data);
  });

  it('check BigInt value', () => {
    const data = { LotOfFruits: BigInt('123456789123456789123456789123456789') };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"LotOfFruits":"_bigint_123456789123456789123456789123456789"}');
    expect(parsed).toMatchObject(data);
  });

  it('check undefined value', () => {
    const data = { undefinedFruit: undefined };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual('{"undefinedFruit":"_undefined_"}');
    expect(parsed.undefinedFruit).toEqual(undefined);
    expect(Object.keys(parsed)).toEqual(['undefinedFruit']);
  });

  it('primitives should not be deduplicated', () => {
    const data = {
      bool: true,
      a: 1,
      b: '1',
      c: {
        bool: true,
        c: 1,
        d: 3,
        e: '3',
        f: {
          bool: true,
          c: '1',
          d: 3,
          e: '3',
        },
      },
    };

    const stringified = stringify(data);
    const parsed = parse(stringified);

    expect(stringified).toEqual(
      '{"bool":true,"a":1,"b":"1","c":{"bool":true,"c":1,"d":3,"e":"3","f":{"bool":true,"c":"1","d":3,"e":"3"}}}'
    );
    expect(parsed).toMatchObject(data);
  });

  it('bug', () => {
    const data = {
      a: 1,
      b: '2',
      c: NaN,
      d: true,
      f: [1, 2, 3, 4, 5],
      g: undefined,
      h: null,
      i: () => {},
      j() {},
    };

    data.e = {
      1: data,
    };

    const stringified = stringify(data);
    expect(stringified).toMatchInlineSnapshot(
      `"{"a":1,"b":"2","c":"_NaN_","d":true,"f":[1,2,3,4,5],"g":"_undefined_","h":null,"i":"_function_i|() => {}","j":"_function_j|function() {}","e":{"1":"_duplicate_[]"}}"`
    );

    const parsed = parse(stringified);

    Object.entries(parsed).forEach((k, v) => {
      expect(data[k]).toEqual(parsed[k]);
    });
  });

  it('nested arrays', () => {
    const stringified = stringify({
      key: 'storybook-channel',
      event: {
        type: 'resetStoryArgs',
        args: [
          {
            storyId: 'addons-controls--basic',
            argNames: undefined,
            options: { target: 'storybook-preview-iframe' },
          },
        ],
        from: 'ca341e9487ddc',
      },
      refId: undefined,
    });
    expect(parse(stringified)).toMatchSnapshot();
  });

  it('dots in keys', () => {
    class Foo {}
    class Bar {}
    const foo = new Foo();
    const bar = new Bar();
    const data = { 'foo.a': bar, foo: { a: foo }, 'foo.b': foo };

    const stringified = stringify(data);

    const parsed = parse(stringified);

    expect(parsed['foo.b'].constructor.name).toEqual('Foo');
  });

  it('filter out properties that throw on access', () => {
    const thrower = {
      a: 'foo',
      get b() {
        throw new Error('b is not allowed!');
      },
    };
    const stringified = stringify(thrower);
    const parsed = parse(stringified);

    expect(parsed).toEqual({ a: 'foo' });
  });

  it('filter out properties that throw on stringification', () => {
    const thrower = {
      a: 'foo',
      b: {
        get toJSON() {
          throw new Error('b.toJSON is not allowed!');
        },
      },
    };
    const stringified = stringify(thrower);
    const parsed = parse(stringified);

    expect(parsed).toEqual({ a: 'foo' });
  });

  it('filter for forbidden objects', () => {
    const thrower = {
      a: 'foo',
      b: new Proxy(
        {},
        {
          get() {
            throw new Error('properties on b are not allowed!');
          },
        }
      ),
    };
    const stringified = stringify(thrower);
    const parsed = parse(stringified);

    expect(parsed).toEqual({ a: 'foo' });
  });

  it('parcel example', () => {
    class $123Class {}

    const example = new $123Class();

    const stringified = stringify({ example });
    const parsed = parse(stringified);

    expect(parsed).toEqual({ example: {} });
  });
};

describe('Dist', () => {
  tests(dist);
});
