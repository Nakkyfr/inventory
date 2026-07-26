import assert from "node:assert/strict";
import { splitColor, colorSiblings } from "./productVariants.js";

const wireRed = splitColor("1.5MM WIRE 90MTR HAVELLS RED");
assert.equal(wireRed.base, "1.5MM WIRE 90MTR HAVELLS");
assert.equal(wireRed.color, "RED");
assert.equal(splitColor("1.5MM WIRE 90MTR HAVELLS BLUE").base, wireRed.base);

assert.equal(splitColor("32AMP MCB TINY SP PENTA MODULAR BLK").color, "BLK");

assert.equal(splitColor("6AMP 1WAY SWITCH RED CARD MG").color, null,
  "RED CARD is a brand; treating RED as a colour would group unrelated switches");

assert.equal(splitColor("12M PLATE ADIVA BRONZE ROSE GOLD(8X6)").color, "BRONZE");
assert.equal(splitColor("12M PLATE ADIVA GREY ROSEGOLD BEZEL").color, "GREY");
assert.equal(splitColor("2M PLATE GREY ROSEGOLD BEZEL(3X3)").color, "GREY");

assert.equal(splitColor("32AMP TINY MCB BLACK WHITE").color, null);

assert.equal(splitColor("1200MM CF NIDUS (LUST BROWN)").color, null);

assert.equal(splitColor("PYE CUTTER").base, null);
assert.equal(splitColor("FAN BOX").color, null);

const candidates = [
  { id: "a", label: "1.5MM WIRE 90MTR HAVELLS RED" },
  { id: "b", label: "1.5MM WIRE 90MTR HAVELLS BLUE" },
  { id: "c", label: "1.5MM WIRE 90MTR HAVELLS GREEN" },
  { id: "d", label: "1.5MM WIRE 180MTR HAVELLS RED" },
  { id: "e", label: "2.5MM WIRE 90MTR HAVELLS RED" },
  { id: "f", label: "1.5MM WIRE 90MTR FINOLEX RED" }
];
const found = colorSiblings(candidates[0], candidates).map((p) => p.id);
assert.deepEqual(found.sort(), ["a", "b", "c"],
  "only same gauge + coil + brand may group; length/gauge/brand differences are separate products");

console.log("productVariants: all assertions passed");
