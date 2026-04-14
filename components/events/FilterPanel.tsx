import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CategoryFilter, DateOption, CATEGORY_FILTERS } from '../../hooks/useEventFilters';

interface FilterPanelProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  selectedDate: string | null;
  onDateChange: (v: string | null) => void;
  dateOptions: DateOption[];
  hasActiveFilters: boolean;
  onClear: () => void;
  /** Si true, el panel de filtros colapsable se muestra inline (pantalla eventos).
   *  Si false, el panel es flotante y controlado externamente (mapa). */
  variant?: 'inline' | 'floating';
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function FilterPanel({
  search, onSearchChange,
  categoryFilter, onCategoryChange,
  selectedDate, onDateChange,
  dateOptions,
  hasActiveFilters, onClear,
  variant = 'inline',
  showFilters, onToggleFilters,
}: FilterPanelProps) {
  const isFloating = variant === 'floating';

  return (
    <View className={isFloating ? 'gap-2' : 'gap-3 px-5 pb-3'}>
      {/* Barra de búsqueda */}
      <View className="flex-row items-center gap-2">
        <View className={`flex-1 flex-row items-center border rounded-xl px-4 gap-3 ${
          isFloating ? 'bg-white/95 border-zinc-200' : 'bg-white border-zinc-300'
        }`}>
          <Feather name="search" size={16} color="#a1a1aa" />
          <TextInput
            className="flex-1 text-base text-zinc-900"
            style={{ paddingVertical: 12, includeFontPadding: false } as any}
            placeholder="Buscar eventos..."
            placeholderTextColor="#a1a1aa"
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Feather name="x" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          )}
        </View>
        {isFloating && onToggleFilters && (
          <TouchableOpacity
            onPress={onToggleFilters}
            className={`w-11 h-11 rounded-xl items-center justify-center border ${
              hasActiveFilters && !showFilters
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-white/95 border-zinc-200'
            }`}
          >
            <Feather name="sliders" size={18} color={hasActiveFilters && !showFilters ? '#fff' : '#52525b'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Panel expandible (floating) o siempre visible (inline) */}
      {(isFloating ? showFilters : true) && (
        <View className={isFloating ? 'bg-white/95 border border-zinc-200 rounded-xl p-4 gap-4' : 'gap-4'}>
          {/* Filtro de fecha — próximos 7 días */}
          <View className="gap-2">
            {isFloating && <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Fecha</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => onDateChange(null)}
                  className={`px-3 py-2 rounded-xl border items-center ${
                    selectedDate === null ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                  }`}
                >
                  <Text className={`text-xs font-bold ${selectedDate === null ? 'text-white' : 'text-zinc-500'}`}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {dateOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.dateStr}
                    onPress={() => onDateChange(selectedDate === opt.dateStr ? null : opt.dateStr)}
                    className={`px-3 py-2 rounded-xl border items-center min-w-[56px] ${
                      selectedDate === opt.dateStr ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selectedDate === opt.dateStr ? 'text-white' : 'text-zinc-500'}`}>
                      {opt.dayLabel}
                    </Text>
                    <Text className={`text-[10px] ${selectedDate === opt.dateStr ? 'text-indigo-200' : 'text-zinc-400'}`}>
                      {opt.dateLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Filtro de categoría */}
          <View className="gap-2">
            {isFloating && <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Tipo</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {CATEGORY_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => onCategoryChange(f.key)}
                    className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                      categoryFilter === f.key ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <Text className="text-xs">{f.icon}</Text>
                    <Text className={`text-xs font-semibold ${categoryFilter === f.key ? 'text-white' : 'text-zinc-600'}`}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity onPress={onClear}>
              <Text className="text-indigo-600 text-xs font-semibold text-center">Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
