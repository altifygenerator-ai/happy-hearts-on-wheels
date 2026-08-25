const DEFAULT_SQUARE_API_VERSION = "2026-07-15";
const DEFAULT_TIMEZONE = "America/Chicago";

export type OrderingStatus = {
  isOpen: boolean;
  canOrder: boolean;
  reason: "open" | "closed" | "prep-cutoff" | "unavailable";
  message: string;
  timezone: string;
  prepMinutes: number;
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

function parseLocalTime(value?: string) {
  if (!value) return null;
  const [hours, minutes, seconds] = value.split(":").map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 60 + minutes + (seconds || 0) / 60;
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

export async function getOrderingStatus(now = new Date()): Promise<OrderingStatus> {
  const prep = prepMinutes();
  try {
    const location = await retrieveLocation();
    const timezone = location?.timezone || DEFAULT_TIMEZONE;
    const periods = location?.business_hours?.periods ?? [];
    if (!periods.length) {
      return {
        isOpen: false,
        canOrder: false,
        reason: "unavailable",
        message: "Online ordering is unavailable until business hours are confirmed in Square.",
        timezone,
        prepMinutes: prep,
      };
    }

    const current = localNowParts(timezone, now);
    const todaysPeriods = periods.filter((period) => period.day_of_week === current.day);
    if (!todaysPeriods.length) {
      return {
        isOpen: false,
        canOrder: false,
        reason: "closed",
        message: "Online ordering is closed right now.",
        timezone,
        prepMinutes: prep,
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
            reason: "prep-cutoff",
            message: `Online ordering has closed for today so the kitchen has ${prep} minutes to finish current orders.`,
            timezone,
            prepMinutes: prep,
          };
        }
        return {
          isOpen: true,
          canOrder: true,
          reason: "open",
          message: "Online ordering is open for pickup.",
          timezone,
          prepMinutes: prep,
        };
      }
    }

    return {
      isOpen: false,
      canOrder: false,
      reason: "closed",
      message: "Online ordering is closed right now.",
      timezone,
      prepMinutes: prep,
    };
  } catch (error) {
    console.error("Square ordering-hours check failed", error);
    return {
      isOpen: false,
      canOrder: false,
      reason: "unavailable",
      message: "Online ordering is temporarily unavailable while business hours are being checked.",
      timezone: DEFAULT_TIMEZONE,
      prepMinutes: prep,
    };
  }
}

export async function assertOrderingOpen() {
  const status = await getOrderingStatus();
  if (!status.canOrder) throw new Error(status.message);
  return status;
}
