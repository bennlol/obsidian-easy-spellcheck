import { expect, test } from "bun:test";
import { editDistanceAtMostTwo } from "../src/spelling/edit-distance";

test("calculates bounded Unicode edit distance", () => {
  expect(editDistanceAtMostTwo("cat", "cat")).toBe(0);
  expect(editDistanceAtMostTwo("cat", "coat")).toBe(1);
  expect(editDistanceAtMostTwo("café", "cafe")).toBe(1);
  expect(editDistanceAtMostTwo("cat", "elephant")).toBeUndefined();
});

test("prefers an adjacent letter swap to an insertion, deletion, or substitution", () => {
  expect(editDistanceAtMostTwo("teh", "the")).toBe(0.75);
  expect(editDistanceAtMostTwo("абв", "авб")).toBe(0.75);
  expect(editDistanceAtMostTwo("teh", "ten")).toBe(1);
  expect(editDistanceAtMostTwo("teh", "teach")).toBe(2);
});
