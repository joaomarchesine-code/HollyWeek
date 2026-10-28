import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { CalendarEvent, EventType } from '../types';
import {
  borderRadius,
  spacing,
  typography,
  getShadow,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
} from '../theme';

// Configure Portuguese locale for react-native-calendars
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ],
  dayNames: [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

const EVENT_TYPES: { key: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'exam', label: 'Prova', icon: 'document-text-outline' },
  { key: 'assignment', label: 'Entrega', icon: 'clipboard-outline' },
  { key: 'activity', label: 'Atividade', icon: 'checkbox-outline' },
  { key: 'reminder', label: 'Lembrete', icon: 'notifications-outline' },
];

export const CalendarScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    events,
    subjects,
    addCalendarEvent,
    deleteCalendarEvent,
    toggleCalendarEventCompleted,
  } = useAppData();

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('exam');
  const [eventSubjectId, setEventSubjectId] = useState<string>('');
  const [eventDescription, setEventDescription] = useState('');

  const subjectsMap = useMemo(() => {
    const map = new Map<string, (typeof subjects)[0]>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  // Marked dates map for react-native-calendars
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // Group events by date
    events.forEach((ev) => {
      const dotColor = EVENT_TYPE_COLORS[ev.type] || colors.primary;
      if (!marks[ev.date]) {
        marks[ev.date] = {
          dots: [{ key: ev.id, color: dotColor }],
        };
      } else {
        if (marks[ev.date].dots.length < 3) {
          marks[ev.date].dots.push({ key: ev.id, color: dotColor });
        }
      }
    });

    // Mark selected date
    if (marks[selectedDate]) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    } else {
      marks[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
        dots: [],
      };
    }

    return marks;
  }, [events, selectedDate, colors.primary]);

  // Filter events for the selected day
  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  const selectedDateFormatted = useMemo(() => {
    try {
      const parsed = parseISO(selectedDate);
      return format(parsed, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleOpenAddModal = () => {
    setEventTitle('');
    setEventType('exam');
    setEventSubjectId(subjects[0]?.id || '');
    setEventDescription('');
    setIsModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Atenção', 'Informe o título do evento.');
      return;
    }

    try {
      await addCalendarEvent({
        title: eventTitle.trim(),
        date: selectedDate,
        type: eventType,
        subjectId: eventSubjectId || undefined,
        description: eventDescription.trim() || undefined,
        completed: false,
      });
      setIsModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o evento.');
    }
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert('Excluir Evento', 'Tem certeza que deseja excluir este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCalendarEvent(id);
          } catch {
            Alert.alert('Erro', 'Falha ao excluir o evento.');
          }
        },
      },
    ]);
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Calendário</Text>
          <Text style={styles.headerSubtitle}>Provas, entregas e compromissos</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.7}
          onPress={handleOpenAddModal}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Calendar View */}
        <View style={styles.calendarCard}>
          <Calendar
            markingType={'multi-dot'}
            markedDates={markedDates}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textMuted,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: typography.sizes.sm,
              textMonthFontSize: typography.sizes.md,
              textDayHeaderFontSize: typography.sizes.xs,
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {EVENT_TYPES.map((t) => (
            <View key={t.key} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: EVENT_TYPE_COLORS[t.key] }]}
              />
              <Text style={styles.legendText}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* Day Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compromissos do Dia</Text>
          <Text style={styles.sectionDate}>{selectedDateFormatted}</Text>
        </View>

        {dayEvents.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>Nenhum evento neste dia</Text>
            <Text style={styles.emptyStateSubtitle}>
              Toque no botão + para adicionar uma prova, entrega ou lembrete.
            </Text>
          </View>
        ) : (
          dayEvents.map((ev) => {
            const subject = ev.subjectId ? subjectsMap.get(ev.subjectId) : null;
            const typeColor = EVENT_TYPE_COLORS[ev.type] || colors.primary;

            return (
              <View
                key={ev.id}
                style={[
                  styles.eventCard,
                  ev.completed && styles.eventCardCompleted,
                ]}
              >
                {/* Type bar */}
                <View style={[styles.eventTypeBar, { backgroundColor: typeColor }]} />

                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => toggleCalendarEventCompleted(ev.id)}
                >
                  <Ionicons
                    name={ev.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={ev.completed ? colors.success : colors.textSecondary}
                  />
                </TouchableOpacity>

                <View style={styles.eventInfoContainer}>
                  <View style={styles.eventBadgeRow}>
                    <View
                      style={[
                        styles.eventTypeBadge,
                        { backgroundColor: `${typeColor}15` },
                      ]}
                    >
                      <Text style={[styles.eventTypeText, { color: typeColor }]}>
                        {EVENT_TYPE_LABELS[ev.type] || ev.type}
                      </Text>
                    </View>

                    {subject ? (
                      <View
                        style={[
                          styles.subjectBadge,
                          { backgroundColor: `${subject.color}15` },
                        ]}
                      >
                        <View
                          style={[
                            styles.subjectDot,
                            { backgroundColor: subject.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.subjectBadgeText,
                            { color: subject.color },
                          ]}
                          numberOfLines={1}
                        >
                          {subject.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.eventTitle,
                      ev.completed && styles.eventTitleCompleted,
                    ]}
                    numberOfLines={2}
                  >
                    {ev.title}
                  </Text>

                  {ev.description ? (
                    <Text
                      style={[
                        styles.eventDescription,
                        ev.completed && styles.eventDescriptionCompleted,
                      ]}
                      numberOfLines={2}
                    >
                      {ev.description}
                    </Text>
                  ) : null}
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEvent(ev.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Adicionar Evento */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Evento</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Data selecionada */}
              <View style={styles.dateInfoBanner}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
                <Text style={styles.dateInfoText}>{selectedDateFormatted}</Text>
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>Título</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Prova 1, Entrega Trabalho..."
                placeholderTextColor={colors.textMuted}
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              {/* Type selector */}
              <Text style={styles.inputLabel}>Tipo de Evento</Text>
              <View style={styles.typeSelectorGrid}>
                {EVENT_TYPES.map((t) => {
                  const isSelected = eventType === t.key;
                  const itemColor = EVENT_TYPE_COLORS[t.key];
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeButton,
                        isSelected && {
                          borderColor: itemColor,
                          backgroundColor: `${itemColor}15`,
                        },
                      ]}
                      onPress={() => setEventType(t.key)}
                    >
                      <Ionicons
                        name={t.icon}
                        size={18}
                        color={isSelected ? itemColor : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          isSelected && { color: itemColor, fontWeight: '700' },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject selector (optional) */}
              <Text style={styles.inputLabel}>Matéria Relacionada (Opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <TouchableOpacity
                  style={[
                    styles.subjectChip,
                    !eventSubjectId && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setEventSubjectId('')}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      !eventSubjectId && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    Nenhuma
                  </Text>
                </TouchableOpacity>

                {subjects.map((sub) => {
                  const isSelected = eventSubjectId === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subjectChip,
                        isSelected && {
                          backgroundColor: `${sub.color}20`,
                          borderColor: sub.color,
                        },
                      ]}
                      onPress={() => setEventSubjectId(sub.id)}
                    >
                      <View
                        style={[styles.subjectChipDot, { backgroundColor: sub.color }]}
                      />
                      <Text
                        style={[
                          styles.subjectChipText,
                          isSelected && { color: sub.color, fontWeight: 'bold' },
                        ]}
                      >
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Description */}
              <Text style={styles.inputLabel}>Descrição / Conteúdo (Opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Ex: Capítulos 1 a 4, levar calculadora..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={eventDescription}
                onChangeText={setEventDescription}
              />

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleSaveEvent}
              >
                <Text style={styles.submitButtonText}>Salvar Evento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addButton: {
      backgroundColor: colors.primary,
      width: 42,
      height: 42,
      borderRadius: borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      ...getShadow(isDark),
    },
    scrollContent: {
      paddingBottom: spacing.xxxl,
    },
    calendarCard: {
      backgroundColor: colors.surface,
      margin: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...getShadow(isDark),
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    legendText: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      fontWeight: typography.weights.medium,
    },
    sectionHeader: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    sectionDate: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      textTransform: 'capitalize',
      marginTop: 2,
    },
    emptyStateCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyStateTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginTop: spacing.sm,
    },
    emptyStateSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...getShadow(isDark),
    },
    eventCardCompleted: {
      opacity: 0.6,
    },
    eventTypeBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    checkboxTouch: {
      marginRight: spacing.sm,
      padding: spacing.xs,
    },
    eventInfoContainer: {
      flex: 1,
    },
    eventBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    eventTypeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
    },
    eventTypeText: {
      fontSize: 10,
      fontWeight: typography.weights.bold,
    },
    subjectBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      maxWidth: 160,
    },
    subjectDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 4,
    },
    subjectBadgeText: {
      fontSize: 10,
      fontWeight: typography.weights.medium,
    },
    eventTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    eventTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    eventDescription: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    eventDescriptionCompleted: {
      textDecorationLine: 'line-through',
    },
    deleteButton: {
      padding: spacing.sm,
      marginLeft: spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.xl,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    dateInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.md,
    },
    dateInfoText: {
      marginLeft: spacing.sm,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.primary,
      textTransform: 'capitalize',
    },
    inputLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    textInput: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: typography.sizes.md,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    typeSelectorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    typeButton: {
      flex: 1,
      minWidth: '45%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: spacing.xs,
    },
    typeButtonText: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
    },
    chipsScroll: {
      flexDirection: 'row',
      marginVertical: spacing.xs,
    },
    subjectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: spacing.sm,
    },
    subjectChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    subjectChipText: {
      fontSize: typography.sizes.sm,
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
  });
