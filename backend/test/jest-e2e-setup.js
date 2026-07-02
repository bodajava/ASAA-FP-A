const { config } = require('dotenv');
const { resolve } = require('path');
config({ path: resolve(__dirname, '../.env') });

// Globally configure BigInt serialization (matching src/main.ts)
Object.defineProperty(BigInt.prototype, 'toJSON', {
  value: function () { return this.toString(); },
});
