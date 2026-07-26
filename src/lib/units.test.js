import assert from "node:assert/strict";
import {
  unitChoices, unitFactor, quantityToBase, priceToBase, defaultUnit, rescalePrice
} from "./units.js";

const wire = { unit: "Mtr", bundle_length: 90 };
const switchProduct = { unit: "Piece", bundle_length: null };

assert.equal(unitChoices(switchProduct).length, 1);
assert.equal(unitFactor(switchProduct, "bundle"), 1, "unknown unit must fall back to 1, never 0");

const [base, bundle] = unitChoices(wire);
assert.equal(base.factor, 1);
assert.equal(bundle.factor, 90);
assert.equal(bundle.label, "Bundle (90 Mtr)");

assert.equal(quantityToBase(2, 90), 180);
assert.equal(priceToBase(2700, 90), 30);

for (const [qty, price, length] of [
  [2, 2500, 90], [1, 999, 90], [3, 1234.56, 180], [5, 87, 15], [1, 4321, 305]
]) {
  const total = qty * price;
  const converted = quantityToBase(qty, length) * priceToBase(price, length);
  assert.ok(Math.abs(converted - total) < 1e-6, `total drifted: ${converted} vs ${total}`);
}

assert.equal(quantityToBase(7, 1), 7);
assert.equal(priceToBase(45.5, 1), 45.5);

assert.equal(quantityToBase("", 90), 0);
assert.equal(priceToBase("", 90), 0);

assert.equal(defaultUnit(wire), "bundle", "purchasing/pricing open on the bundle");
assert.equal(defaultUnit(switchProduct), "base", "a product with no bundle has nothing else");
assert.equal(defaultUnit(null), "base");

assert.equal(rescalePrice("30", 1, 90), "2700");
assert.equal(rescalePrice("2700", 90, 1), "30");

for (const start of ["30", "27.5", "999", "1234.56"]) {
  const there = rescalePrice(start, 1, 90);
  assert.equal(rescalePrice(there, 90, 1), start, `round trip lost value for ${start}`);
}

assert.equal(rescalePrice("", 1, 90), "");
assert.equal(rescalePrice(null, 1, 90), null);

assert.equal(rescalePrice("0.1", 1, 3), "0.3");

console.log("units: all assertions passed");
