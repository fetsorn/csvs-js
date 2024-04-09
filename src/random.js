/**
 * This generates a UUID.
 * @name randomUUIDPolyfill
 * @function
 * @returns {string} - UUID compliant with RFC 4122.
 */
export async function randomUUID() {
  if (typeof window === "undefined") {
    const crypto = await import("crypto");

    return crypto.randomUUID();
  }
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

/**
 * This generates a SHA-256 hashsum.
 * @name digestMessage
 * @function
 * @param {string} message - A string.
 * @returns {string} - SHA-256 hashsum.
 */
export async function digestMessage(message) {
  // hash as buffer
  // const hashBuffer = await digest(message);

  let hashBuffer;

  if (typeof window === "undefined") {
    const crypto = await import("crypto");

    // hashBuffer = crypto.createHash('sha256').update(message, 'utf8').digest();
    hashBuffer = await crypto.webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(message),
    );
  } else {
    hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(message),
    );
  }

  // convert buffer to byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
