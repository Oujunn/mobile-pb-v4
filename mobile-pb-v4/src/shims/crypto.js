let Crypto;
try {
  Crypto = require('expo-crypto');
} catch (e) {
  Crypto = null;
}

function getRandomValues(array) {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(array);
  }
  if (Crypto && typeof Crypto.getRandomBytes === 'function') {
    const bytes = Crypto.getRandomBytes(array.length);
    array.set(bytes);
    return array;
  }
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

function randomBytes(size) {
  if (Crypto && typeof Crypto.getRandomBytes === 'function') {
    return Crypto.getRandomBytes(size);
  }
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

const cryptoShim = {
  getRandomValues,
  randomBytes,
};

module.exports = cryptoShim;
module.exports.default = cryptoShim;
module.exports.getRandomValues = getRandomValues;
module.exports.randomBytes = randomBytes;

