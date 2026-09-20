import test from "node:test";
import assert from "node:assert/strict";
import { FUN_FACTS, funFactPresentation } from "../js/fun-facts.js";

test("a fun-fact presentation keeps its text and image on the same fact", () => {
  const index = 41;
  const presentation = funFactPresentation(index);

  assert.equal(presentation.text, FUN_FACTS[index]);
  assert.equal(presentation.image, "img/fun/042.webp");
});
