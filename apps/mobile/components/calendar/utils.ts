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

// Returns 42 cells (6 rows × 7 cols) covering the month, padded with adjacent
// month days. Weeks start on Monday — matches Apple Calendar and the rest of
// the world outside the US.
export const getMonthGrid = (d: Date): Date[] => {
  const first = startOfMonth(d);
  // Convert JS getDay (0=Sun..6=Sat) to Monday-start offset (0=Mon..6=Sun)
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  return cells;
};

export const dateLocale = (language: 'en' | 'zh'): string =>
  language === 'zh' ? 'zh-CN' : 'en-US';

export const monthLabel = (d: Date, language: 'en' | 'zh' = 'en'): string =>
  d.toLocaleDateString(dateLocale(language), { month: 'long', year: 'numeric' });

// Two-letter labels for ambiguous days (T = Tue/Thu, S = Sat/Sun) — matches
// the iPhone Calendar app's header style.
export const WEEKDAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
export const WEEKDAY_LABELS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
