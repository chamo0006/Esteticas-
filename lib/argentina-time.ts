// Utilidades de fecha en hora Argentina (UTC-3, sin horario de verano).

export interface ArgentinaRanges {
  todayStart: string;
  todayEnd: string;
  monthStart: string;
  nowIso: string;
}

export function getArgentinaRanges(): ArgentinaRanges {
  const now = new Date();
  const offsetMs = 3 * 60 * 60 * 1000; // UTC-3

  const argNow = new Date(now.getTime() - offsetMs);
  const y = argNow.getUTCFullYear();
  const m = argNow.getUTCMonth();
  const d = argNow.getUTCDate();

  const todayStart = new Date(Date.UTC(y, m, d, 3, 0, 0));     // medianoche ARG = 03:00 UTC
  const todayEnd   = new Date(Date.UTC(y, m, d, 26, 59, 59));  // 23:59 ARG = 02:59 UTC día siguiente
  const monthStart = new Date(Date.UTC(y, m, 1, 3, 0, 0));

  return {
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    monthStart: monthStart.toISOString(),
    nowIso: now.toISOString(),
  };
}
