export const BOOKING_RULES = {
  openHour: 6,          // 06:00 Sri Lanka time
  closeHour: 22,        // 22:00 Sri Lanka time
  maxDurationHours: 8,
} as const;

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const OPEN_TIME = hh(BOOKING_RULES.openHour);
export const CLOSE_TIME = hh(BOOKING_RULES.closeHour);