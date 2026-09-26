import { expect, test } from "bun:test";
import { editDistanceAtMostTwo } from "../src/spelling/edit-distance";

test("calculates bounded Unicode edit distance", () => {
  expect(editDistanceAtMostTwo("cat", "cat")).toBe(0);
  expect(editDistanceAtMostTwo("cat", "coat")).toBe(1);
  expect(editDistanceAtMostTwo("café", "cafe")).toBe(1);
  expect(editDistanceAtMostTwo("cat", "elephant")).toBeUndefined();
});
