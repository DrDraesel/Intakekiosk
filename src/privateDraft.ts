// Encrypted, patient-controlled resume file. No browser storage or plaintext export.
const iterations = 310000;
async function key(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
function b64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}
function bytes(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export async function sealDraft(value: unknown, passphrase: string) {
  if (passphrase.length < 12) throw Error("passphrase");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(passphrase, salt),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({
    format: "imw-private-intake",
    version: 1,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(encrypted)),
  });
}
export async function openDraft(text: string, passphrase: string) {
  if (text.length > 2000000) throw Error("size");
  const envelope = JSON.parse(text);
  if (envelope.format !== "imw-private-intake" || envelope.version !== 1)
    throw Error("format");
  const salt = bytes(envelope.salt),
    iv = bytes(envelope.iv),
    ciphertext = bytes(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length > 1000000)
    throw Error("format");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await key(passphrase, salt),
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}
