const eventProperties: Array<keyof Event> = [
  'bubbles',
  'cancelBubble',
  'cancelable',
  'composed',
  'currentTarget',
  'defaultPrevented',
  'eventPhase',
  'isTrusted',
  'returnValue',
  'srcElement',
  'target',
  'timeStamp',
  'type',
];

const customEventSpecificProperties: Array<Exclude<keyof CustomEvent, keyof Event>> = ['detail'];

/**
 * Dom Event (and all its subclasses) is built in a way its internal properties
 * are accessible when querying them directly but "hidden" when iterating its
 * keys.
 *
 * With a code example it means: `Object.keys(new Event('click')) = ["isTrusted"]`
 *
 * So to be able to stringify/parse more than just `isTrusted` info we need to
 * create a new object and set the properties by hand. As there is no way to
 * iterate the properties we rely on a list of hardcoded properties.
 *
 * @param event The event we want to extract properties
 */
export function extractEventHiddenProperties(event: Event) {
  const rebuildEvent = eventProperties
    .filter((value) => event[value] !== undefined)
    .reduce<Partial<Record<keyof Event | keyof CustomEvent, unknown>>>((acc, value) => {
      acc[value] = event[value];
      return acc;
    }, {});

  if (event instanceof CustomEvent) {
    for (const value of customEventSpecificProperties.filter((value) => event[value] !== undefined)) {
      rebuildEvent[value] = event[value];
    }
  }

  return rebuildEvent;
}
