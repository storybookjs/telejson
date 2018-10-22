import { stringify, parse, replacer, reviver } from '../src/index';

const regex1 = /foo/;
const regex2 = /foo/g;
const regex3 = new RegExp('foo', 'i');

const fn1 = x => x + x;
const fn2 = function x(x) { return x - x };
function fn3(){
  return x / x;
}

class Foo {}

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
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const data = {
  regex1,
  regex2,
  regex3,
  fn1,
  fn2,
  fn3,
  date,
  foo: new Foo,
  data,
  nested,
};

data.cyclic = data;

test('sanity', () => {
  expect(true).toBe(true);
})

test('stringify', () => {
  let stringified;

  expect(() => stringified = stringify(data)).not.toThrow();
  expect(stringified).toMatchSnapshot();
});

test('parse', () => {
  const stringified = stringify(data);
  let parsed
  expect(() => parsed = parse(stringified)).not.toThrow();
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
  expect(parsed.foo.constructor.name).toBe('Foo')
  expect(parsed.foo instanceof Foo).toBe(false);
});

test('maxDepth', () => {
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

test('space', () => {
  const stringifiedSpaced = stringify(data, { space: 2 });

  expect(stringifiedSpaced).toMatchSnapshot();
});

test('stringify the global object', () => {
  expect(() => stringify(global, { maxDepth: 10000 })).not.toThrow();
});
