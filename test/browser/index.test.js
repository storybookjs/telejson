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
      ...(parsed.isTrusted !== undefined && { isTrusted: expect.any(Boolean) }),
      ...(parsed.returnValue !== undefined && { returnValue: expect.any(Boolean) }),
    });
  });

  test('HTML Custom Event', () => {
    const event = new CustomEvent('custom:click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { aKey: 'a Value' },
    });

    const stringified = stringify(event, { allowClass: true });

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      type: 'custom:click',
      bubbles: true,
      composed: true,
      cancelable: true,
      timeStamp: expect.any(Number),
      detail: { aKey: 'a Value' },
      ...(parsed.isTrusted !== undefined && { isTrusted: expect.any(Boolean) }),
      ...(parsed.returnValue !== undefined && { returnValue: expect.any(Boolean) }),
    });
  });

  test('Nested HTML Custom Event', () => {
    const event = new CustomEvent('custom:click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { aKey: 'a Value' },
    });

    const stringified = stringify({ key: 'value', args: event }, { allowClass: true });

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
        ...(parsed.args.isTrusted !== undefined && { isTrusted: expect.any(Boolean) }),
        ...(parsed.args.returnValue !== undefined && { returnValue: expect.any(Boolean) }),
      },
    });
  });
};

describe('Dist', () => {
  tests(dist);
});
