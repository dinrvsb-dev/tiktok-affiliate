import test from "node:test";
import assert from "node:assert/strict";
import {
  missingMetadataFields,
  parseMetadataText
} from "../src/services/metadata-parser.js";

test("parseMetadataText extracts supported keys", () => {
  const metadata = parseMetadataText(`staff: Aisyah
host: Nana
live: Live Morning
date: 2026-04-20 10:30`);

  assert.deepEqual(metadata, {
    staffName: "Aisyah",
    hostName: "Nana",
    liveSessionIdOrLabel: "Live Morning",
    reportDate: "2026-04-20 10:30"
  });
});

test("missingMetadataFields returns empty when complete", () => {
  const missing = missingMetadataFields({
    staffName: "Aisyah",
    hostName: "Nana",
    liveSessionIdOrLabel: "Live Morning",
    reportDate: "2026-04-20 10:30"
  });

  assert.deepEqual(missing, []);
});

test("missingMetadataFields tracks missing keys", () => {
  const missing = missingMetadataFields({
    staffName: "",
    hostName: "Nana",
    liveSessionIdOrLabel: "",
    reportDate: ""
  });

  assert.deepEqual(missing, ["staff", "live", "date"]);
});
