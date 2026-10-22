/* Liliet Pet — catalog encryption (shared by the site, tools/catalog-lock.html and Node).
 *
 * The digital catalog is published only in encrypted form:
 *   assets/catalog/catalog.json  small header (salt, IVs, a check value)
 *   assets/catalog/catalog.bin   the PDF encrypted with AES-256-GCM
 * The key is derived from the access code with PBKDF2-SHA256, so the code itself
 * is never stored anywhere. A wrong code fails the check value before the large
 * file is downloaded.
 */
(function (root, factory) {
  var api = factory(root.crypto || (typeof globalThis !== "undefined" && globalThis.crypto));
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LilietCatalogCrypto = api;
})(typeof self !== "undefined" ? self : this, function (crypto) {
  "use strict";

  var ITERATIONS = 600000;
  var CHECK_TEXT = "LILIET-CATALOG-OK";
  var subtle = crypto && crypto.subtle;

  function normalizeCode(code) {
    return String(code || "")
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/\s+/g, "");
  }
  function b64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function random(n) { return crypto.getRandomValues(new Uint8Array(n)); }

  function deriveKey(code, salt, iterations) {
    var raw = new TextEncoder().encode(normalizeCode(code));
    return subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }

  /** Encrypt a PDF. Returns { meta: object (save as catalog.json), data: Uint8Array (save as catalog.bin) }. */
  function lock(pdfBytes, code, options) {
    options = options || {};
    var salt = random(16), checkIv = random(12), iv = random(12);
    var iterations = options.iterations || ITERATIONS;
    var key;
    return deriveKey(code, salt, iterations).then(function (k) {
      key = k;
      return subtle.encrypt({ name: "AES-GCM", iv: checkIv }, key, new TextEncoder().encode(CHECK_TEXT));
    }).then(function (check) {
      return subtle.encrypt({ name: "AES-GCM", iv: iv }, key, pdfBytes).then(function (data) {
        return {
          meta: {
            v: 1, kdf: "PBKDF2-SHA256", iterations: iterations,
            salt: b64(salt), checkIv: b64(checkIv), check: b64(new Uint8Array(check)), iv: b64(iv),
            name: options.name || "Liliet-Pet-Catalog.pdf",
            size: pdfBytes.byteLength, updated: options.updated || new Date().toISOString().slice(0, 10)
          },
          data: new Uint8Array(data)
        };
      });
    });
  }

  /** Resolve with the key when the code is right, or null when it is wrong. */
  function verify(code, meta) {
    return deriveKey(code, unb64(meta.salt), meta.iterations).then(function (key) {
      return subtle.decrypt({ name: "AES-GCM", iv: unb64(meta.checkIv) }, key, unb64(meta.check))
        .then(function (plain) { return new TextDecoder().decode(plain) === CHECK_TEXT ? key : null; },
              function () { return null; });
    });
  }

  /** Decrypt catalog.bin with a key returned by verify(). */
  function unlock(key, meta, data) {
    return subtle.decrypt({ name: "AES-GCM", iv: unb64(meta.iv) }, key, data)
      .then(function (plain) { return new Uint8Array(plain); });
  }

  return { lock: lock, verify: verify, unlock: unlock, normalizeCode: normalizeCode, ITERATIONS: ITERATIONS };
});
