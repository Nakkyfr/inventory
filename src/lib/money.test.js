import assert from "node:assert/strict";
import { roundToRupee, roundOffAmount } from "./money.js";

assert.equal(roundToRupee(1247.6), 1248);
assert.equal(roundOffAmount(1247.6), 0.4);
assert.equal(roundToRupee(1247.4), 1247);
assert.equal(roundOffAmount(1247.4), -0.4);

assert.equal(roundToRupee(1248), 1248);
assert.equal(roundOffAmount(1248), 0);

assert.equal(roundToRupee(0.5), 1);
assert.equal(roundToRupee(1.5), 2);
assert.equal(roundToRupee(2.5), 3, "must be half-away-from-zero, not banker's rounding");

assert.equal(roundToRupee(-0.5), -1);
assert.equal(roundToRupee(-1247.6), -1248);
assert.notEqual(roundToRupee(-0.5), Math.round(-0.5));

for (const subtotal of [1247.6, 0.01, 99.99, 12345.55, 7.5, 0.5, 3.333]) {
  assert.equal(
    Number((subtotal + roundOffAmount(subtotal)).toFixed(2)),
    roundToRupee(subtotal),
    `subtotal ${subtotal} + round-off must equal the charged total`
  );
}

assert.equal(roundOffAmount(0.1 + 0.2), roundOffAmount(0.3));
assert.ok(String(roundOffAmount(1247.6)).length <= 4);

assert.equal(roundToRupee(""), 0);
assert.equal(roundToRupee(null), 0);
assert.equal(roundOffAmount(undefined), 0);

console.log("money: all assertions passed");
