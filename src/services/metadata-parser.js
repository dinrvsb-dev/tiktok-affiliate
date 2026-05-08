export function parseMetadataText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const metadata = {};

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || !rest.length) {
      continue;
    }

    const value = rest.join(":").trim();
    const key = rawKey.trim().toLowerCase();

    if (["staff", "staff_name", "agent"].includes(key)) {
      metadata.staffName = value;
    } else if (["host", "host_name"].includes(key)) {
      metadata.hostName = value;
    } else if (["live", "session", "live_session", "live_id"].includes(key)) {
      metadata.liveSessionIdOrLabel = value;
    } else if (["date", "report_date", "datetime", "time"].includes(key)) {
      metadata.reportDate = value;
    }
  }

  return metadata;
}

export function missingMetadataFields(metadata) {
  const missing = [];
  if (!metadata.staffName) missing.push("staff");
  if (!metadata.hostName) missing.push("host");
  if (!metadata.liveSessionIdOrLabel) missing.push("live");
  if (!metadata.reportDate) missing.push("date");
  return missing;
}

export function buildMetadataPrompt(missingFields = ["staff", "host", "live", "date"]) {
  return [
    "Terima kasih. Sila balas metadata screenshot dalam format ini:",
    "staff: Nama staff",
    "host: Nama host",
    "live: ID atau label live session",
    "date: 2026-04-20 10:30",
    "",
    `Masih belum cukup: ${missingFields.join(", ")}`
  ].join("\n");
}
