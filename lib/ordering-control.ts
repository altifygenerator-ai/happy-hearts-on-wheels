import { randomUUID } from "node:crypto";

const DEFAULT_SQUARE_API_VERSION = "2026-07-15";
const PAUSE_KEY = "hh-website-ordering-pause";
const HEARTBEAT_KEY = "hh-order-screen-heartbeat";
const STRING_SCHEMA = "https://developer-production-s.squarecdn.com/schemas/v1/common.json#squareup.common.String";

export type ManualOrderingPause = {
  paused: boolean;
  until: string | null;
  updatedAt: string | null;
};

export type OrderingControlSnapshot = {
  manualPause: ManualOrderingPause;
  heartbeatAt: string | null;
  heartbeatFresh: boolean;
  heartbeatAgeSeconds: number | null;
  heartbeatTtlSeconds: number;
  controlAvailable: boolean;
  warning?: string;
};

type SquareError = { code?: string; detail?: string };
type CustomAttributeResponse = {
  custom_attribute?: {
    key?: string;
    version?: number;
    updated_at?: string;
    value?: unknown;
  };
  errors?: SquareError[];
};

type DefinitionResponse = {
  custom_attribute_definition?: { key?: string };
  errors?: SquareError[];
};

function squareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function heartbeatTtlSeconds() {
  const configured = Number(process.env.STAFF_ORDER_HEARTBEAT_TTL_SECONDS || "240");
  return Number.isFinite(configured)
    ? Math.min(900, Math.max(120, Math.round(configured)))
    : 240;
}

function squareHeaders() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Square access token is missing.");
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Square-Version": process.env.SQUARE_API_VERSION || DEFAULT_SQUARE_API_VERSION,
  };
}

function errorDetail(errors?: SquareError[]) {
  return errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ") || "";
}

async function fetchJson<T>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
  const response = await fetch(`${squareBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...squareHeaders(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (allowNotFound && response.status === 404) return null;

  const result = (await response.json().catch(() => ({}))) as T & { errors?: SquareError[] };
  if (!response.ok) {
    throw new Error(errorDetail(result.errors) || `Square ordering-control request failed with status ${response.status}.`);
  }
  return result;
}

async function readStringAttribute(key: string): Promise<string | null> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square location ID is missing.");
  const result = await fetchJson<CustomAttributeResponse>(
    `/v2/locations/${encodeURIComponent(locationId)}/custom-attributes/${encodeURIComponent(key)}`,
    {},
    true,
  );
  const value = result?.custom_attribute?.value;
  return typeof value === "string" ? value : null;
}

async function definitionExists(key: string) {
  const result = await fetchJson<DefinitionResponse>(
    `/v2/locations/custom-attribute-definitions/${encodeURIComponent(key)}`,
    {},
    true,
  );
  return Boolean(result?.custom_attribute_definition?.key);
}

async function ensureStringDefinition(key: string, name: string, description: string) {
  if (await definitionExists(key)) return;
  await fetchJson<DefinitionResponse>("/v2/locations/custom-attribute-definitions", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `hh-${key}-${randomUUID()}`.slice(0, 45),
      custom_attribute_definition: {
        key,
        name,
        description,
        visibility: "VISIBILITY_READ_WRITE_VALUES",
        schema: { $ref: STRING_SCHEMA },
      },
    }),
  });
}

async function writeStringAttribute(key: string, value: string) {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square location ID is missing.");
  await fetchJson<CustomAttributeResponse>(
    `/v2/locations/${encodeURIComponent(locationId)}/custom-attributes/${encodeURIComponent(key)}`,
    {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: randomUUID().slice(0, 45),
        custom_attribute: {
          value,
          version: -1,
        },
      }),
    },
  );
}

function parsePause(value: string | null): ManualOrderingPause {
  if (!value) return { paused: false, until: null, updatedAt: null };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const until = typeof parsed.until === "string" ? parsed.until : null;
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
    const paused = parsed.paused === true;
    if (paused && until) {
      const untilTime = new Date(until).getTime();
      if (Number.isFinite(untilTime) && untilTime <= Date.now()) {
        return { paused: false, until, updatedAt };
      }
    }
    return { paused, until, updatedAt };
  } catch {
    return { paused: false, until: null, updatedAt: null };
  }
}

export async function getOrderingControlSnapshot(now = new Date()): Promise<OrderingControlSnapshot> {
  const ttl = heartbeatTtlSeconds();
  try {
    const [pauseValue, heartbeatValue] = await Promise.all([
      readStringAttribute(PAUSE_KEY),
      readStringAttribute(HEARTBEAT_KEY),
    ]);
    const manualPause = parsePause(pauseValue);
    const heartbeatMs = heartbeatValue ? new Date(heartbeatValue).getTime() : NaN;
    const ageSeconds = Number.isFinite(heartbeatMs)
      ? Math.max(0, Math.round((now.getTime() - heartbeatMs) / 1000))
      : null;
    return {
      manualPause,
      heartbeatAt: Number.isFinite(heartbeatMs) ? new Date(heartbeatMs).toISOString() : null,
      heartbeatFresh: ageSeconds !== null && ageSeconds <= ttl,
      heartbeatAgeSeconds: ageSeconds,
      heartbeatTtlSeconds: ttl,
      controlAvailable: true,
    };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Ordering controls could not be checked.";
    console.error("Square ordering control check failed", error);
    return {
      manualPause: { paused: false, until: null, updatedAt: null },
      heartbeatAt: null,
      heartbeatFresh: false,
      heartbeatAgeSeconds: null,
      heartbeatTtlSeconds: ttl,
      controlAvailable: false,
      warning,
    };
  }
}

export async function recordStaffHeartbeat(now = new Date()) {
  await ensureStringDefinition(
    HEARTBEAT_KEY,
    "Website order screen heartbeat",
    "Internal Happy Hearts website marker showing that the staff approval screen is actively online.",
  );
  const value = now.toISOString();
  await writeStringAttribute(HEARTBEAT_KEY, value);
  return value;
}

export async function setManualOrderingPause(minutes: number | null) {
  await ensureStringDefinition(
    PAUSE_KEY,
    "Website online ordering pause",
    "Controls temporary manual pauses for Happy Hearts website pickup ordering.",
  );
  const now = new Date();
  const until = minutes && minutes > 0
    ? new Date(now.getTime() + Math.min(7 * 24 * 60, Math.round(minutes)) * 60_000).toISOString()
    : null;
  const value = JSON.stringify({ paused: true, until, updatedAt: now.toISOString() });
  await writeStringAttribute(PAUSE_KEY, value);
  return parsePause(value);
}

export async function resumeManualOrdering() {
  await ensureStringDefinition(
    PAUSE_KEY,
    "Website online ordering pause",
    "Controls temporary manual pauses for Happy Hearts website pickup ordering.",
  );
  const value = JSON.stringify({ paused: false, until: null, updatedAt: new Date().toISOString() });
  await writeStringAttribute(PAUSE_KEY, value);
  return parsePause(value);
}
