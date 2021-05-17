import * as src from '../../src';
import * as dist from '../../dist/cjs';

const tests = ({ stringify }) => {
  test('stringify the global object', () => {
    expect(() => stringify(global, { maxDepth: 10000 })).not.toThrow();
  });
};

describe('Source', () => {
  tests(src);
});

describe('Dist', () => {
  tests(dist);
});
