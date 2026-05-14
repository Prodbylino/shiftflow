export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

// Returns 42 cells (6 rows × 7 cols) covering the month, padded with adjacent month days.
// Weeks start on Sunday (US convention; tweak if needed).
export const getMonthGrid = (d: Date): Date[] => {
  const first = startOfMonth(d);
  const startWeekday = first.getDay(); // 0 = Sun
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  return cells;
};

export const monthLabel = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
