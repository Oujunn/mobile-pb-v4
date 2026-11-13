import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, text, shadows } from '../theme';
import {
  INDONESIAN_MONTHS,
  formatIndonesianDate,
  toYYYYMMDD,
  parseDateSafe,
} from '../utils/dateHelper';

// Safe require for Android DateTimePickerAndroid
let DateTimePickerAndroid = null;
if (Platform.OS === 'android') {
  try {
    const dtModule = require('@react-native-community/datetimepicker');
    DateTimePickerAndroid = dtModule.DateTimePickerAndroid;
  } catch (err) {
    DateTimePickerAndroid = null;
  }
}

/**
 * Komponen Date Picker Cross-Platform (Android Native Dialog + Web/iOS Calendar Modal)
 * - Menyimpan format YYYY-MM-DD
 * - Menampilkan format Indonesia: "3 November 2004"
 * - Tanggal maksimal: hari ini
 * - Tanpa memunculkan keyboard
 */
export default function DatePickerField({
  value,
  onChange,
  label = 'Tanggal Lahir',
  placeholder = 'Pilih tanggal lahir',
  maximumDate = new Date(),
  minimumYear = 1920,
}) {
  const [showWebModal, setShowWebModal] = useState(false);

  // Calendar State for Web Modal
  const currentDate = parseDateSafe(value);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0 - 11
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const currentYear = maximumDate.getFullYear();
  const years = [];
  for (let y = currentYear; y >= minimumYear; y--) {
    years.push(y);
  }

  // Update calendar state when value prop changes
  useEffect(() => {
    if (value) {
      const d = parseDateSafe(value);
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  }, [value]);

  function handleOpenPicker() {
    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      const initDate = parseDateSafe(value);
      DateTimePickerAndroid.open({
        value: initDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(toYYYYMMDD(date));
          }
        },
        mode: 'date',
        maximumDate,
        minimumDate: new Date(minimumYear, 0, 1),
      });
    } else {
      // Web & iOS: Buka Modal Kalender Interaktif
      setShowWebModal(true);
    }
  }

  // Calculate days in selected month/year
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    // Check if day is beyond today in current year/month
    const isFuture =
      selectedYear === currentYear &&
      selectedMonth === maximumDate.getMonth() &&
      d > maximumDate.getDate();

    days.push({ day: d, isFuture });
  }

  function handleConfirmCalendar() {
    const finalDay = Math.min(selectedDay, daysInMonth);
    const d = new Date(selectedYear, selectedMonth, finalDay);
    onChange(toYYYYMMDD(d));
    setShowWebModal(false);
  }

  const displayFormatted = formatIndonesianDate(value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.pickerButton}
        onPress={handleOpenPicker}
        activeOpacity={0.75}
      >
        <View style={styles.pickerLeft}>
          <Ionicons name="calendar-outline" size={18} color={colors.brandNavy} />
          <Text
            style={[
              styles.pickerText,
              !displayFormatted && styles.pickerPlaceholder,
            ]}
          >
            {displayFormatted || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* ── MODAL KALENDER INTERAKTIF (WEB & FALLBACK) ── */}
      <Modal
        visible={showWebModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWebModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="calendar" size={18} color={colors.brandNavy} />
                <Text style={styles.modalTitle}>Pilih Tanggal Lahir</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWebModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Display Header */}
            <View style={styles.selectedDateBanner}>
              <Text style={styles.bannerDayText}>{selectedDay}</Text>
              <Text style={styles.bannerDateText}>
                {INDONESIAN_MONTHS[selectedMonth]} {selectedYear}
              </Text>
            </View>

            {/* Selector: Tahun & Bulan */}
            <View style={styles.selectorRow}>
              {/* Dropdown Bulan */}
              <View style={styles.selectorCol}>
                <Text style={styles.selectorLabel}>Bulan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                  {INDONESIAN_MONTHS.map((m, idx) => {
                    const isSelected = selectedMonth === idx;
                    const isFutureMonth = selectedYear === currentYear && idx > maximumDate.getMonth();
                    return (
                      <TouchableOpacity
                        key={m}
                        disabled={isFutureMonth}
                        style={[
                          styles.chipItem,
                          isSelected && styles.chipItemSelected,
                          isFutureMonth && styles.chipItemDisabled,
                        ]}
                        onPress={() => setSelectedMonth(idx)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                            isFutureMonth && styles.chipTextDisabled,
                          ]}
                        >
                          {m.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Selector: Tahun */}
            <View style={styles.yearRow}>
              <Text style={styles.selectorLabel}>Tahun (Gulir untuk memilih)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                {years.map((y) => {
                  const isSelected = selectedYear === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearChip, isSelected && styles.yearChipSelected]}
                      onPress={() => setSelectedYear(y)}
                    >
                      <Text style={[styles.yearChipText, isSelected && styles.yearChipTextSelected]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Grid Tanggal (1 - 31) */}
            <View style={styles.daySection}>
              <Text style={styles.selectorLabel}>Tanggal</Text>
              <View style={styles.dayGrid}>
                {days.map(({ day, isFuture }) => {
                  const isSelected = selectedDay === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      disabled={isFuture}
                      style={[
                        styles.dayBox,
                        isSelected && styles.dayBoxSelected,
                        isFuture && styles.dayBoxDisabled,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayBoxText,
                          isSelected && styles.dayBoxTextSelected,
                          isFuture && styles.dayBoxTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tombol Aksi */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowWebModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCalendar}
              >
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.modalConfirmText}>Pilih Tanggal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: text.xs,
    fontWeight: text.semibold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    ...shadows.sm,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerText: {
    fontSize: text.sm,
    color: colors.textPrimary,
    fontWeight: text.medium,
  },
  pickerPlaceholder: {
    color: '#94A3B8',
    fontWeight: text.normal,
  },

  // Modal Kalender Interaktif
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: colors.brandNavy,
  },
  closeBtn: {
    padding: 4,
  },
  selectedDateBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bannerDayText: {
    fontSize: 28,
    fontWeight: text.black,
    color: '#1E40AF',
  },
  bannerDateText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: '#2563EB',
  },
  selectorRow: {
    marginBottom: spacing.xs,
  },
  selectorCol: {
    width: '100%',
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: text.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  monthScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chipItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemSelected: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  chipItemDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: text.medium,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: text.bold,
  },
  chipTextDisabled: {
    color: colors.textMuted,
  },
  yearRow: {
    marginBottom: spacing.xs,
  },
  yearScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  yearChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: text.medium,
    color: colors.textPrimary,
  },
  yearChipTextSelected: {
    color: colors.white,
    fontWeight: text.bold,
  },
  daySection: {
    marginBottom: spacing.sm,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    maxHeight: 140,
  },
  dayBox: {
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayBoxSelected: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  dayBoxDisabled: {
    opacity: 0.3,
  },
  dayBoxText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: text.medium,
  },
  dayBoxTextSelected: {
    color: colors.white,
    fontWeight: text.bold,
  },
  dayBoxTextDisabled: {
    color: colors.textMuted,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: text.xs,
    fontWeight: text.semibold,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.navy,
  },
  modalConfirmText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: colors.white,
  },
});

