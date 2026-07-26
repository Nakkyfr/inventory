import assert from "node:assert/strict";
import { buildBaseName, buildProductName, unknownTokens } from "./productNaming.js";

const vocab = { tokens: new Set(["WIRE", "POLYCAB", "FRLS", "HAVELLS", "SWITCH", "MODULAR"]) };

assert.equal(
  buildBaseName({ size: "1.5MM²", type: "WIRE", spec: "FRLS", pack: "90MTR", brand: "POLYCAB", series: "" }),
  "1.5MM² WIRE FRLS 90MTR POLYCAB"
);

assert.equal(
  buildBaseName({ size: "6AMP", type: "SWITCH", spec: "", pack: "", brand: "", series: "" }),
  "6AMP SWITCH"
);

assert.equal(buildBaseName({ size: "  1MM²  ", type: " WIRE ", spec: "", pack: "", brand: "", series: "" }),
  "1MM² WIRE");

assert.equal(buildBaseName({}), "");
assert.equal(buildBaseName({ size: "", type: "", spec: "", pack: "", brand: "", series: "" }), "");

assert.equal(buildProductName("1.5MM² WIRE 90MTR POLYCAB", "RED"), "1.5MM² WIRE 90MTR POLYCAB RED");
assert.equal(buildProductName("PYE CUTTER", null), "PYE CUTTER");

const name = buildProductName("1.5MM² WIRE 90MTR POLYCAB", "RED");
assert.equal(name.slice(0, name.length - 4), "1.5MM² WIRE 90MTR POLYCAB",
  "product_name must be reconstructible as base_name + ' ' + color");

assert.deepEqual(unknownTokens("1.5MM² WIRE FRLS POLYCAB", vocab), []);
assert.deepEqual(unknownTokens("1.5MM² WIRE FRLS POLYCABB", vocab), ["POLYCABB"]);
assert.deepEqual(unknownTokens("90MTR WIRE 6AMP", vocab), [],
  "numeric-leading tokens are sizes, never flagged as unknown words");
assert.deepEqual(unknownTokens("WIRE DP SP", vocab), [],
  "very short tokens are abbreviations, too noisy to flag");

console.log("productNaming: all assertions passed");
