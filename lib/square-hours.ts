import { getOrderingControlSnapshot } from "@/lib/ordering-control";

const DEFAULT_SQUARE_API_VERSION = "2026-07-15";
const DEFAULT_TIMEZONE = "America/Chicago";

const FALLBACK_PERIODS: BusinessHoursPeriod[] = [
  { day_of_week: "FRI", start_local_time: "11:00:00", end_local_time: "19:00:00" },
  { day_of_week: "SAT", start_local_time: "11:00:00", end_local_time: "19:00:00" },
  { day_of_week: "SUN", start_local_time: "11:00:00", end_local_time: "19:00:00" },
  { day_of_week: "MON", start_local_time: "11:00:00", end_local_time: "19:00:00" },
  { day_of_week: "TUE", start_local_time: "11:00:00", end_local_time: "19:00:00" },
];

export type OrderingStatus = {
  isOpen: boolean;
  canOrder: boolean;
  reason: "open" | "closed" | "prep-cutoff" | "manual-pause" | "staff-offline" | "unavailable";
  message: string;
  timezone: string;
  prepMinutes: number;
  hoursSource: "square" | "site-fallback";
  manualPaused: boolean;
  manualPauseUntil: string | null;
  staffHeartbeatRequired: boolean;
  staffHeartbeatFresh: boolean;
};

type BusinessHoursPeriod = {
  day_of_week?: string;
  start_local_time?: string;
  end_local_time?: string;
};

type SquareLocationResponse = {
  location?: {
    timezone?: string;
    business_hours?: { periods?: BusinessHoursPeriod[] };
  };
  errors?: Array<{ detail?: string; code?: string }>;
};

function squareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function prepMinutes() {
  const configured = Number(process.env.SQUARE_PICKUP_PREP_TIME_MINUTES || "20");
  return Number.isFinite(configured) ? Math.min(240, Math.max(1, Math.round(configured))) : 20;
}

function approvalModeEnabled() {
  return process.env.SQUARE_PAYMENT_MODE === "approval";
}

function parseLocalTime(value?: string) {
  if (!value) return null;
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 60 + minutes + seconds / 60;
}

function localNowParts(timeZone: string, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return {
    day: String(parts.weekday || "").toUpperCase().slice(0, 3),
    minutes: hour * 60 + minute + second / 60,
  };
}

async function retrieveLocation(): Promise<SquareLocationResponse["location"]> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) throw new Error("Square location is not configured.");

  const response = await fetch(`${squareBaseUrl()}/v2/locations/${encodeURIComponent(locationId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_API_VERSION || DEFAULT_SQUARE_API_VERSION,
    },
    cache: "no-store",
  });
  const result = (await response.json()) as SquareLocationResponse;
  if (!response.ok || !result.location) {
    const detail = result.errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ");
    throw new Error(detail || "Square business hours could not be loaded.");
  }
  return result.location;
}

function statusFromPeriods(
  periods: BusinessHoursPeriod[],
  timezone: string,
  now: Date,
  prep: number,
  source: "square" | "site-fallback",
) {
  const current = localNowParts(timezone, now);
  const todaysPeriods = periods.filter((period) => period.day_of_week === current.day);

  if (!todaysPeriods.length) {
    return {
      isOpen: false,
      canOrder: false,
      reason: "closed" as const,
      message: "Online ordering is closed right now.",
      timezone,
      prepMinutes: prep,
      hoursSource: source,
    };
  }

  for (const period of todaysPeriods) {
    const start = parseLocalTime(period.start_local_time);
    const end = parseLocalTime(period.end_local_time);
    if (start === null || end === null) continue;

    const normalizedEnd = end <= start ? end + 24 * 60 : end;
    let currentMinutes = current.minutes;
    if (normalizedEnd > 24 * 60 && currentMinutes < start) currentMinutes += 24 * 60;

    if (currentMinutes >= start && currentMinutes < normalizedEnd) {
      const cutoff = Math.max(start, normalizedEnd - prep);
      if (currentMinutes >= cutoff) {
        return {
          isOpen: true,
          canOrder: false,
          reason: "prep-cutoff" as const,
          message: `Online ordering has closed for today so the kitchen has ${prep} minutes to finish current orders.`,
          timezone,
          prepMinutes: prep,
          hoursSource: source,
        };
      }
      return {
        isOpen: true,
        canOrder: true,
        reason: "open" as const,
        message: "Online ordering is open for pickup.",
        timezone,
        prepMinutes: prep,
        hoursSource: source,
      };
    }
  }

  return {
    isOpen: false,
    canOrder: false,
    reason: "closed" as const,
    message: "Online ordering is closed right now.",
    timezone,
    prepMinutes: prep,
    hoursSource: source,
  };
}

export async function getOrderingStatus(now = new Date()): Promise<OrderingStatus> {
  const prep = prepMinutes();
  const staffHeartbeatRequired = approvalModeEnabled();
  const control = await getOrderingControlSnapshot(now);

  if (!control.controlAvailable) {
    return {
      isOpen: false,
      canOrder: false,
      reason: "unavailable",
      message: "Online ordering is temporarily unavailable while the kitchen connection is being checked. Please call 501-613-1513.",
      timezone: DEFAULT_TIMEZONE,
      prepMinutes: prep,
      hoursSource: "site-fallback",
      manualPaused: false,
      manualPauseUntil: null,
      staffHeartbeatRequired,
      staffHeartbeatFresh: false,
    };
  }

  if (control.manualPause.paused) {
    return {
      isOpen: false,
      canOrder: false,
      reason: "manual-pause",
      message: control.manualPause.until
        ? "Online ordering is temporarily paused. Please check back a little later or call 501-613-1513."
        : "Online ordering is temporarily paused by Happy Hearts. Please call 501-613-1513 if you need help.",
      timezone: DEFAULT_TIMEZONE,
      prepMinutes: prep,
      hoursSource: "site-fallback",
      manualPaused: true,
      manualPauseUntil: control.manualPause.until,
      staffHeartbeatRequired,
      staffHeartbeatFresh: control.heartbeatFresh,
    };
  }

  if (staffHeartbeatRequired && !control.heartbeatFresh) {
    return {
      isOpen: false,
      canOrder: false,
      reason: "staff-offline",
      message: "Online ordering is temporarily paused while the kitchen order screen is offline. Please call 501-613-1513.",
      timezone: DEFAULT_TIMEZONE,
      prepMinutes: prep,
      hoursSource: "site-fallback",
      manualPaused: false,
      manualPauseUntil: null,
      staffHeartbeatRequired,
      staffHeartbeatFresh: false,
    };
  }

  let timezone = DEFAULT_TIMEZONE;
  let periods = FALLBACK_PERIODS;
  let hoursSource: "square" | "site-fallback" = "site-fallback";

  try {
    const location = await retrieveLocation();
    timezone = location?.timezone || DEFAULT_TIMEZONE;
    const squarePeriods = location?.business_hours?.periods ?? [];
    if (squarePeriods.length) {
      periods = squarePeriods;
      hoursSource = "square";
    }
  } catch (error) {
    console.error("Square business-hours check failed; using site fallback hours", error);
  }

  const schedule = statusFromPeriods(periods, timezone, now, prep, hoursSource);
  return {
    ...schedule,
    manualPaused: false,
    manualPauseUntil: null,
    staffHeartbeatRequired,
    staffHeartbeatFresh: control.heartbeatFresh,
  };
}

export async function assertOrderingOpen() {
  const status = await getOrderingStatus();
  if (!status.canOrder) throw new Error(status.message);
  return status;
}
