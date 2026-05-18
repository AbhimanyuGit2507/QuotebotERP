import React, { useMemo, useState } from 'react';

interface Props {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onClose?: () => void;
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar: React.FC<Props> = ({ selectedDate, onSelect, onClose }) => {
  const [viewDate, setViewDate] = useState<Date>(new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = useMemo(() => viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' }), [viewDate]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<Date | null> = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [year, month]);

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="w-64 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year - 1, month, 1))}
            className="p-1 rounded hover:bg-[var(--erp-surface)]"
            aria-label="Previous year"
          >
            <span className="material-symbols-outlined">keyboard_double_arrow_left</span>
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-[var(--erp-surface)]"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>
        <div className="font-semibold">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-[var(--erp-surface)]"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <button
            onClick={() => setViewDate(new Date(year + 1, month, 1))}
            className="p-1 rounded hover:bg-[var(--erp-surface)]"
            aria-label="Next year"
          >
            <span className="material-symbols-outlined">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-[var(--erp-text-muted)] mb-1">
        {weekdayNames.map((w) => (
          <div key={w} className="text-center">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, idx) => {
          if (!cell) return <div key={idx} />;
          const selected = isSameDay(cell, selectedDate);
          return (
            <button
              key={idx}
              onClick={() => {
                onSelect(cell);
                onClose?.();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded ${selected ? 'bg-[var(--erp-accent)] text-white' : 'hover:bg-[var(--erp-surface)]'}`}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
