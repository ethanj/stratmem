/**
 * Deterministic mission metadata extraction for P0 report types.
 *
 * The parser favors bounded, inspectable rules over LLM inference so the demo
 * can prove accurate semantic compression before adding model fallback.
 */
const FIELD_KEYS = {
  report_type: 1,
  speaker: 2,
  unit: 3,
  location: 4,
  status: 5,
  request: 6,
  destination: 7,
  priority: 8,
  timestamp: 9,
  confidence: 10,
  source_transcript_id: 11,
  raw_transcript: 12,
};

const REPORT_CODES = {
  salute: 1,
  ace_lace: 2,
  resupply: 3,
  casevac: 4,
  uas_sensor: 5,
  free_text: 9,
};

const PRIORITY_CODES = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export const samples = {
  resupply: "Alpha Two is at grid 12345678, one casualty, low ammo, requesting resupply at checkpoint Bravo.",
  salute: "Bravo One reports two dismounts moving south near grid 22334455 with light packs, possible scout element.",
  casevac: "Charlie Three at checkpoint Red has one urgent casualty, leg wound, requesting CASEVAC and security.",
};

export function extractMetadata(transcript) {
  const clean = normalizeTranscript(transcript);
  const lower = clean.toLowerCase();
  const reportType = classifyReport(lower);
  const status = extractStatus(lower);
  const request = extractRequest(lower, reportType);
  const location = extractLocation(clean);

  return {
    report_type: reportType,
    speaker: extractSpeaker(clean),
    unit: extractUnit(clean),
    location,
    status,
    request,
    destination: extractDestination(clean),
    priority: inferPriority(lower, reportType, status),
    timestamp: new Date().toISOString(),
    confidence: inferConfidence(clean, reportType),
    source_transcript_id: `tx_${Date.now().toString(36)}`,
    raw_transcript: shouldPreserveRawTranscript(clean, reportType, location, status, request) ? clean : "",
  };
}

export function compactMetadata(metadata) {
  const compact = {};
  for (const [key, value] of Object.entries(metadata)) {
    const field = FIELD_KEYS[key];
    if (!field || value === "" || value === null || value === undefined) {
      continue;
    }
    compact[field] = encodeKnownValue(key, value);
  }
  return compact;
}

export function expandMetadata(compact) {
  const reverseKeys = reverse(FIELD_KEYS);
  const out = {};
  for (const [rawKey, value] of Object.entries(compact)) {
    const key = reverseKeys[rawKey];
    if (key) {
      out[key] = decodeKnownValue(key, value);
    }
  }
  return out;
}

export function reconstructText(metadata) {
  if (metadata.raw_transcript) {
    return metadata.raw_transcript;
  }

  const subject = metadata.speaker || metadata.unit || "Unknown element";
  const location = metadata.location ? ` at ${metadata.location}` : "";
  const status = Array.isArray(metadata.status) && metadata.status.length > 0
    ? `: ${metadata.status.join(", ")}`
    : "";
  const request = metadata.request ? ` Request ${metadata.request}` : "";
  const destination = metadata.destination ? ` to ${metadata.destination}` : "";

  if (metadata.report_type === "casevac") {
    return `${subject}${location}: casualty report${status}.${request}${destination}.`;
  }
  if (metadata.report_type === "resupply") {
    return `${subject}${location}: sustainment issue${status}.${request}${destination}.`;
  }
  if (metadata.report_type === "uas_sensor") {
    return `${subject}${location}: sensor or UAS observation${status}.${request}.`;
  }
  if (metadata.report_type === "salute") {
    return `${subject}${location}: contact report${status}.`;
  }
  return `${subject}${location}${status}.${request}${destination}.`;
}

export function validateMetadata(metadata) {
  const errors = [];
  if (!metadata.report_type) errors.push("missing report_type");
  if (!metadata.speaker && !metadata.unit) errors.push("missing speaker_or_unit");
  if (!metadata.location) errors.push("missing location");
  if (!Array.isArray(metadata.status)) errors.push("status must be an array");
  if (!metadata.timestamp) errors.push("missing timestamp");
  return { ok: errors.length === 0, errors };
}

function normalizeTranscript(transcript) {
  return transcript
    .replace(/\b(uh|um|ah|like|you know)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

function classifyReport(lower) {
  if (/\b(casevac|medevac|urgent casualty|wounded|wound)\b/.test(lower)) return "casevac";
  if (/\b(resupply|ammo|water|fuel|battery|low ammo)\b/.test(lower)) return "resupply";
  if (/\b(uas|rq-11|drone|sensor|op\/lp|triggered|observation)\b/.test(lower)) return "uas_sensor";
  if (/\b(contact|dismount|enemy|moving|movement|scout)\b/.test(lower)) return "salute";
  if (/\b(ace|lace|ammo|equipment|casualt)\b/.test(lower)) return "ace_lace";
  return "free_text";
}

function extractSpeaker(text) {
  const match = text.match(/^([A-Z][A-Za-z]+\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|\d+))/);
  return match?.[1] ?? text.split(/\s+/).slice(0, 2).join(" ");
}

function extractUnit(text) {
  const match = text.match(/\b(Alpha|Bravo|Charlie|Delta|Weapons|UAS|RQ-11|Sensor)\b(?:\s+\w+)?/i);
  return match?.[0] ?? "";
}

function extractLocation(text) {
  const grid = text.match(/\b(?:grid\s*)?(\d{8,10})\b/i);
  if (grid) return `grid ${grid[1]}`;
  const checkpoint = text.match(/\bcheckpoint\s+([A-Za-z0-9-]+)/i);
  if (checkpoint) return `checkpoint ${checkpoint[1]}`;
  const nai = text.match(/\bNAI\s*[- ]?(\d+)\b/i);
  if (nai) return `NAI ${nai[1]}`;
  return "";
}

function extractStatus(lower) {
  const status = [];
  const casualty = lower.match(/\b(one|two|three|\d+)\s+(?:urgent\s+)?casualt(?:y|ies)\b/);
  const dismount = lower.match(/\b(one|two|three|\d+)\s+dismounts?\b/);
  if (casualty) status.push(`${casualty[1]} casualty`);
  if (/\blow ammo\b/.test(lower)) status.push("low ammo");
  if (/\bammo green\b/.test(lower)) status.push("ammo green");
  if (/\bleg wound\b/.test(lower)) status.push("leg wound");
  if (dismount) status.push(`${dismount[1]} dismounts`);
  if (/\bmoving south\b/.test(lower)) status.push("movement south");
  if (/\blight packs?\b/.test(lower)) status.push("light packs");
  return status;
}

function extractRequest(lower, reportType) {
  if (/\brequest(?:ing)?\s+casevac\b/.test(lower) || reportType === "casevac") return "CASEVAC";
  if (/\brequest(?:ing)?\s+resupply\b/.test(lower) || reportType === "resupply") return "resupply";
  if (/\bsecurity\b/.test(lower)) return "security";
  return "";
}

function extractDestination(text) {
  const checkpoint = text.match(/\b(?:at|to)\s+(checkpoint\s+[A-Za-z0-9-]+)/i);
  return checkpoint?.[1] ?? "";
}

function inferPriority(lower, reportType, status) {
  if (reportType === "casevac" || /\burgent\b/.test(lower)) return "urgent";
  if (reportType === "salute" || status.some((item) => item.includes("casualty"))) return "high";
  if (reportType === "resupply") return "medium";
  return "low";
}

function inferConfidence(text, reportType) {
  let score = 50;
  if (reportType !== "free_text") score += 20;
  if (extractLocation(text)) score += 15;
  if (extractStatus(text.toLowerCase()).length > 0) score += 10;
  return Math.min(score, 95);
}

function shouldPreserveRawTranscript(clean, reportType, location, status, request) {
  if (!clean) return false;
  if (reportType === "free_text") return true;
  return !location && status.length === 0 && !request;
}

function encodeKnownValue(key, value) {
  if (key === "report_type") return REPORT_CODES[value] ?? REPORT_CODES.free_text;
  if (key === "priority") return PRIORITY_CODES[value] ?? PRIORITY_CODES.low;
  return value;
}

function decodeKnownValue(key, value) {
  if (key === "report_type") return reverse(REPORT_CODES)[value] ?? "free_text";
  if (key === "priority") return reverse(PRIORITY_CODES)[value] ?? "low";
  return value;
}

function reverse(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [value, key]));
}
