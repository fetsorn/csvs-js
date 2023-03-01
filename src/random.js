/**
 * This generates a UUID.
 * @name randomUUIDPolyfill
 * @function
 * @returns {string} - UUID compliant with RFC 4122.
 */
export async function randomUUID() {
  if (typeof window === 'undefined') {
    const crypto = await import('crypto');

    return crypto.randomUUID();
  }
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    [1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16),
  );
}
