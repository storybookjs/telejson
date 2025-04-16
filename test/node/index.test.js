import { describe, expect, test } from 'vitest';

import * as dist from '../../dist/index';

const tests = ({ stringify }) => {
  test('stringify the global object', () => {
    expect(() => stringify(global, { maxDepth: 10000 })).not.toThrow();
  });
};

describe('Dist', () => {
  tests(dist);
});
