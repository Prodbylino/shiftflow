import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { ShiftWithOrganization } from '@timesheetai/shared';

import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { dateKey, getMonthGrid, isSameDay, isSameMonth, WEEKDAY_LABELS } from './utils';

type Props = {
  month: Date;
  selected: Date;
  shifts: ShiftWithOrganization[];
  onSelectDay: (day: Date) => void;
};

const MAX_DOTS = 3;

export function MonthGrid({ month, selected, shifts, onSelectDay }: Props) {
  const theme = useTheme();
  const cells = useMemo(() => getMonthGrid(month), [month]);
  const today = useMemo(() => new Date(), []);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftWithOrganization[]>();
    for (const s of shifts) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [shifts]);

  // Slice the 42 cells into 6 rows of 7 so each row can render its children
  // with flex: 1. Using flexWrap + percentage widths was off-by-rounding on
  // device — 7 cells of 14.285…% summed to slightly over 100%, wrapping the
  // last cell of each row and visually losing Saturday.
  const rows = useMemo(() => {
    const out: Date[][] = [];
    for (let r = 0; r < 6; r++) {
      out.push(cells.slice(r * 7, r * 7 + 7));
    }
    return out;
  }, [cells]);

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekdayCell}>
            <Type variant="micro" tone="subtle">
              {label}
            </Type>
          </View>
        ))}
      </View>
      <View>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((day) => {
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selected);
              const key = dateKey(day);
              const dayShifts = shiftsByDay.get(key) ?? [];
              const dots = dayShifts.slice(0, MAX_DOTS);
              const overflow = dayShifts.length - MAX_DOTS;

              return (
                <Pressable
                  key={key}
                  onPress={() => onSelectDay(day)}
                  style={({ pressed }) => [
                    styles.cell,
                    isSelected && {
                      backgroundColor: theme.surfaceMuted,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <View style={styles.cellInner}>
                    <View
                      style={[
                        styles.dayNumberWrap,
                        isToday && { backgroundColor: theme.text },
                      ]}>
                      <Type
                        variant="captionMedium"
                        style={{
                          color: isToday
                            ? theme.bg
                            : inMonth
                              ? theme.text
                              : theme.textSubtle,
                        }}>
                        {day.getDate()}
                      </Type>
                    </View>
                    <View style={styles.dotsRow}>
                      {dots.map((s, idx) => (
                        <View
                          key={`${s.id}-${idx}`}
                          style={[
                            styles.dot,
                            { backgroundColor: s.organization?.color ?? theme.brand },
                          ]}
                        />
                      ))}
                      {overflow > 0 ? (
                        <Type variant="micro" tone="subtle" style={{ marginLeft: 2 }}>
                          +{overflow}
                        </Type>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 0.9,
    padding: 2,
  },
  cellInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingTop: 6,
    gap: 4,
  },
  dayNumberWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
