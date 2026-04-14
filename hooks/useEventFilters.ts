import { useState, useMemo } from 'react';
import { AppEvent } from '../types';

export type CategoryFilter = 'all' | AppEvent['category'];

export interface DateOption {
  dateStr: string;   // YYYY-MM-DD
  dayLabel: string;  // "Lun", "Hoy", "Mañana"
  dateLabel: string; // "14 abr"
  isToday: boolean;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useDateOptions(): DateOption[] {
  return useMemo(() => {
    const options: DateOption[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      options.push({
        dateStr: toDateStr(d),
        dayLabel: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAY_NAMES[d.getDay()],
        dateLabel: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
        isToday: i === 0,
      });
    }
    return options;
  }, []);
}

export const CATEGORY_FILTERS: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '🗺️' },
  { key: 'concert', label: 'Recitales', icon: '🎵' },
  { key: 'sports', label: 'Deporte', icon: '⚽' },
  { key: 'festival', label: 'Festivales', icon: '🎉' },
  { key: 'march', label: 'Marchas', icon: '✊' },
  { key: 'other', label: 'Otros', icon: '📍' },
];

export function useEventFilters(events: AppEvent[]) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dateOptions = useDateOptions();

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (selectedDate) {
        const eventDateStr = toDateStr(new Date(e.starts_at));
        if (eventDateStr !== selectedDate) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.venue.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, categoryFilter, selectedDate, search]);

  const hasActiveFilters = categoryFilter !== 'all' || selectedDate !== null || search.trim().length > 0;

  function clearFilters() {
    setCategoryFilter('all');
    setSelectedDate(null);
    setSearch('');
  }

  return {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    selectedDate, setSelectedDate,
    dateOptions,
    filteredEvents,
    hasActiveFilters,
    clearFilters,
  };
}
