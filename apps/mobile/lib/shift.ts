import type { ShiftWithOrganization } from '@timesheetai/shared';

const DAY_MS = 86400000;

const toDateTime = (dateIso: string, timeHms: string): Date =>
  new Date(`${dateIso}T${timeHms}`);

export const shiftDurationHours = (shift: ShiftWithOrganization): number => {
  const start = toDateTime(shift.date, shift.start_time);
  const endIso = shift.end_date ?? shift.date;
  let end = toDateTime(endIso, shift.end_time);
  // Legacy or implicit overnight (no end_date but end_time wraps past midnight)
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + DAY_MS);
  }
  return (end.getTime() - start.getTime()) / 3600000;
};

export const shiftEarnings = (shift: ShiftWithOrganization): number =>
  shiftDurationHours(shift) * (shift.organization?.hourly_rate ?? 0);
