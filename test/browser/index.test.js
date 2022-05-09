import * as src from '../../src';
import * as dist from '../../dist/cjs';

const tests = ({ stringify, parse }) => {
  test('HTML Event', () => {
    const event = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true });

    const stringified = stringify(event);

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      isTrusted: expect.any(Boolean),
      type: 'click',
      bubbles: true,
      composed: true,
      cancelable: true,
      returnValue: expect.any(Boolean),
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

    const stringified = stringify(event, { allowClass: true });

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      isTrusted: expect.any(Boolean),
      type: 'custom:click',
      bubbles: true,
      composed: true,
      cancelable: true,
      returnValue: expect.any(Boolean),
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

    const stringified = stringify({ key: 'value', args: event }, { allowClass: true });

    const parsed = parse(stringified);

    expect(parsed).toMatchObject({
      key: 'value',
      args: {
        isTrusted: expect.any(Boolean),
        type: 'custom:click',
        bubbles: true,
        composed: true,
        cancelable: true,
        returnValue: expect.any(Boolean),
        timeStamp: expect.any(Number),
        detail: { aKey: 'a Value' },
      },
    });
  });
};

describe('Source', () => {
  tests(src);
});

describe('Dist', () => {
  tests(dist);
});
