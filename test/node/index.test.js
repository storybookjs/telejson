import * as src from '../../src';
// eslint-disable-next-line import/extensions
import * as dist from '../../dist/index.js';

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
