import { describe, expect, test } from 'vitest';
import * as dist from '../../dist/index.js';

const tests = ({ stringify, parse }) => {
  test('HTML Event', () => {
    const event = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true });

    const stringified = stringify(event);

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      type: 'click',
      bubbles: true,
      composed: true,
      cancelable: true,
      timeStamp: expect.any(Number),
    });
  });

  test('HTML Custom Event', () => {
    const event = new CustomEvent('custom:click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { aKey: 'a Value' },
    });

    const stringified = stringify(event);

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      type: 'custom:click',
      bubbles: true,
      composed: true,
      cancelable: true,
      timeStamp: expect.any(Number),
      detail: { aKey: 'a Value' },
    });
  });

  test('Nested HTML Custom Event', () => {
    const event = new CustomEvent('custom:click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { aKey: 'a Value' },
    });

    const stringified = stringify({ key: 'value', args: event });

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      key: 'value',
      args: {
        type: 'custom:click',
        bubbles: true,
        composed: true,
        cancelable: true,
        timeStamp: expect.any(Number),
        detail: { aKey: 'a Value' },
      },
    });
  });
};

describe('Dist', () => {
  tests(dist);
});
