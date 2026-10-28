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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek, parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { DayOfWeek, ScheduleSlot, Subject, CalendarEvent, EventType } from '../types';
import { borderRadius, spacing, typography, getShadow, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../theme';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'Mon', label: 'Segunda-feira', short: 'SEG' },
  { key: 'Tue', label: 'Terça-feira', short: 'TER' },
  { key: 'Wed', label: 'Quarta-feira', short: 'QUA' },
  { key: 'Thu', label: 'Quinta-feira', short: 'QUI' },
  { key: 'Fri', label: 'Sexta-feira', short: 'SEX' },
  { key: 'Sat', label: 'Sábado', short: 'SÁB' },
];

export interface FixedTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

// 6 blocos fixos de 2 horas especificados pelo usuário
const FIXED_SLOTS: FixedTimeSlot[] = [
  { id: '1', startTime: '08:00', endTime: '10:00', label: '08:00 – 10:00' },
  { id: '2', startTime: '10:00', endTime: '12:00', label: '10:00 – 12:00' },
  { id: '3', startTime: '14:00', endTime: '16:00', label: '14:00 – 16:00' },
  { id: '4', startTime: '16:00', endTime: '18:00', label: '16:00 – 18:00' },
  { id: '5', startTime: '19:00', endTime: '21:00', label: '19:00 – 21:00' },
  { id: '6', startTime: '21:00', endTime: '23:00', label: '21:00 – 23:00' },
];

export const ScheduleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const {
    currentUser,
    subjects,
    schedule,
    events,
    addScheduleSlot,
    deleteScheduleSlot,
    toggleCalendarEventCompleted,
  } = useAppData();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Dimensões responsivas calculadas dinamicamente com base no formato e resolução da tela
  const isDesktop = windowWidth >= 860;
  const isTablet = windowWidth >= 620 && windowWidth < 860;
  const timeColWidth = isDesktop ? 104 : isTablet ? 90 : 80;

  // Em desktop, os 6 dias preenchem 100% da largura útil sem necessidade de rolagem horizontal
  const cellWidth = useMemo(() => {
    if (isDesktop) {
      const available = windowWidth - timeColWidth - 36;
      return Math.max(120, Math.floor(available / 6));
    }
    if (isTablet) {
      const available = windowWidth - timeColWidth - 30;
      return Math.max(115, Math.floor(available / 4.2));
    }
    // Mobile / telas menores (mostra ~2.7 colunas confortavelmente com rolagem suave)
    return Math.max(105, Math.floor((windowWidth - timeColWidth - 24) / 2.7));
  }, [windowWidth, isDesktop, isTablet, timeColWidth]);

  const cellHeight = windowHeight >= 900 ? 94 : windowHeight >= 700 ? 84 : 76;

  // Estado da Janela de Prazos (integrada diretamente na aba principal)
  const [prazosWindowOpen, setPrazosWindowOpen] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Form states for adding slot
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Mon');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [room, setRoom] = useState<string>('');

  // Selected slot for viewing detail / deleting
  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  // Upcoming activities sorted by urgency (due date) and importance (exam > assignment > activity > reminder)
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());

    return events
      .filter((e) => !e.completed)
      .map((e) => {
        let diffDays = 0;
        let isOverdue = false;
        try {
          const evDate = startOfDay(parseISO(e.date));
          diffDays = differenceInDays(evDate, today);
          isOverdue = isBefore(evDate, today);
        } catch {
          diffDays = 999;
        }

        // Priority weighting: exam (1) > assignment (2) > activity (3) > reminder (4)
        const priorityScore: Record<EventType, number> = {
          exam: 1,
          assignment: 2,
          activity: 3,
          reminder: 4,
        };

        return {
          ...e,
          diffDays,
          isOverdue,
          priority: priorityScore[e.type] || 5,
        };
      })
      .sort((a, b) => {
        // 1. Overdue / Due soonest first
        if (a.diffDays !== b.diffDays) {
          return a.diffDays - b.diffDays;
        }
        // 2. High priority (exam > assignment > activity > reminder)
        return a.priority - b.priority;
      });
  }, [events]);

  const hasUrgentEvents = useMemo(() => {
    return upcomingEvents.some((e) => e.isOverdue || e.diffDays <= 2);
  }, [upcomingEvents]);

  const mostUrgentEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const weekSubtitle = useMemo(() => {
    try {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const startStr = format(start, "d 'de' MMMM", { locale: ptBR });
      const endStr = format(end, "d 'de' MMMM", { locale: ptBR });
      return `${startStr} - ${endStr}`;
    } catch {
      return 'Semana Atual';
    }
  }, []);

  const getSlotAt = (day: DayOfWeek, startTime: string): ScheduleSlot | undefined => {
    return schedule.find((slot) => slot.day === day && slot.startTime === startTime);
  };

  const handleCellPress = (day: DayOfWeek, timeSlot: FixedTimeSlot, slotIndex: number) => {
    const existingSlot = getSlotAt(day, timeSlot.startTime);
    if (existingSlot) {
      setActiveSlot(existingSlot);
      setDetailModalVisible(true);
    } else {
      if (subjects.length === 0) {
        Alert.alert(
          'Nenhuma matéria cadastrada',
          'Cadastre uma matéria antes de adicionar horários ao cronograma.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir para Matérias', onPress: () => navigation.navigate('Matérias') },
          ]
        );
        return;
      }
      setSelectedDay(day);
      setSelectedSlotIndex(slotIndex);
      setSelectedSubjectId(subjects[0]?.id || '');
      setRoom('');
      setAddModalVisible(true);
    }
  };

  const handleSaveSlot = async () => {
    if (!selectedSubjectId) {
      Alert.alert('Atenção', 'Selecione uma matéria para este horário.');
      return;
    }

    const timeBlock = FIXED_SLOTS[selectedSlotIndex];

    try {
      await addScheduleSlot({
        day: selectedDay,
        startTime: timeBlock.startTime,
        endTime: timeBlock.endTime,
        subjectId: selectedSubjectId,
        room: room.trim() || '',
      });
      setAddModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o horário.');
    }
  };

  const handleDeleteActiveSlot = async () => {
    if (!activeSlot) return;
    try {
      await deleteScheduleSlot(activeSlot.id);
      setDetailModalVisible(false);
      setActiveSlot(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível remover o horário.');
    }
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Principal */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Minha Semana</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser ? `${currentUser.name} • ` : ''}{weekSubtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
          onPress={() => {
            if (subjects.length === 0) {
              Alert.alert(
                'Cadastre uma matéria',
                'Adicione matérias na aba de Matérias para organizar sua grade horária.',
                [
                  { text: 'Ok' },
                  { text: 'Ir para Matérias', onPress: () => navigation.navigate('Matérias') },
                ]
              );
            } else {
              setSelectedDay('Mon');
              setSelectedSlotIndex(0);
              setSelectedSubjectId(subjects[0].id);
              setRoom('');
              setAddModalVisible(true);
            }
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* JANELA DE PRAZOS & ENTREGAS (Integrada diretamente na aba principal) */}
      <View style={styles.prazosWindowCard}>
        {/* Barra superior de controle da Janela */}
        <TouchableOpacity
          style={styles.prazosWindowHeader}
          activeOpacity={0.8}
          onPress={() => setPrazosWindowOpen((prev) => !prev)}
        >
          <View style={styles.prazosHeaderLeft}>
            <View
              style={[
                styles.prazosIconBadge,
                hasUrgentEvents
                  ? { backgroundColor: `${colors.error}20` }
                  : { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <Ionicons
                name={hasUrgentEvents ? 'alarm' : 'hourglass-outline'}
                size={18}
                color={hasUrgentEvents ? colors.error : colors.primary}
              />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.prazosWindowTitle}>Próximos Prazos</Text>
                {upcomingEvents.length > 0 ? (
                  <View
                    style={[
                      styles.prazosCountBadge,
                      { backgroundColor: hasUrgentEvents ? colors.error : colors.primary },
                    ]}
                  >
                    <Text style={styles.prazosCountBadgeText}>{upcomingEvents.length}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.prazosWindowSummary} numberOfLines={1}>
                {mostUrgentEvent
                  ? mostUrgentEvent.isOverdue
                    ? `⚠️ Atrasado: ${mostUrgentEvent.title}`
                    : mostUrgentEvent.diffDays === 0
                    ? `🔥 Vence HOJE: ${mostUrgentEvent.title}`
                    : `⏳ Mais urgente: ${mostUrgentEvent.title} (${mostUrgentEvent.diffDays}d)`
                  : 'Nenhum prazo pendente. Tudo em dia!'}
              </Text>
            </View>
          </View>

          <View style={styles.prazosHeaderRight}>
            <View style={styles.toggleBtnPill}>
              <Text style={[styles.toggleBtnPillText, { color: colors.primary }]}>
                {prazosWindowOpen ? 'Recolher' : 'Abrir Janela'}
              </Text>
              <Ionicons
                name={prazosWindowOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Corpo da Janela de Prazos (Expandida) */}
        {prazosWindowOpen && (
          <View style={styles.prazosWindowBody}>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyPrazosBox}>
                <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
                <Text style={styles.emptyPrazosText}>Nenhum prazo pendente!</Text>
                <TouchableOpacity
                  style={styles.addPrazoBtn}
                  onPress={() => navigation.navigate('Calendário')}
                >
                  <Text style={styles.addPrazoBtnText}>+ Adicionar no Calendário</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal={isDesktop}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                style={isDesktop ? styles.prazosScrollHorizontal : styles.prazosScrollVertical}
                contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
              >
                {upcomingEvents.map((item, index) => {
                  const sub = item.subjectId ? subjectsMap.get(item.subjectId) : null;
                  const typeColor = EVENT_TYPE_COLORS[item.type] || colors.primary;
                  const typeLabel = EVENT_TYPE_LABELS[item.type] || 'Atividade';

                  let dueStatusLabel = '';
                  let dueBadgeColor = colors.primary;

                  if (item.isOverdue) {
                    dueStatusLabel = `Atrasado há ${Math.abs(item.diffDays)}d`;
                    dueBadgeColor = colors.error;
                  } else if (item.diffDays === 0) {
                    dueStatusLabel = 'HOJE!';
                    dueBadgeColor = colors.error;
                  } else if (item.diffDays === 1) {
                    dueStatusLabel = 'Amanhã';
                    dueBadgeColor = colors.warning;
                  } else {
                    dueStatusLabel = `Em ${item.diffDays} dias`;
                    dueBadgeColor = item.diffDays <= 3 ? colors.warning : colors.textSecondary;
                  }

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.prazoItemCard,
                        isDesktop && { width: 280 },
                        item.isOverdue && { borderColor: colors.error },
                      ]}
                    >
                      <View style={styles.prazoCardTop}>
                        <View style={[styles.typeTag, { backgroundColor: `${typeColor}20` }]}>
                          <Text style={[styles.typeTagText, { color: typeColor }]}>
                            #{index + 1} {typeLabel.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.dueBadge, { backgroundColor: `${dueBadgeColor}15` }]}>
                          <Ionicons
                            name={item.isOverdue || item.diffDays === 0 ? 'alarm' : 'time-outline'}
                            size={11}
                            color={dueBadgeColor}
                          />
                          <Text style={[styles.dueBadgeText, { color: dueBadgeColor }]}>
                            {dueStatusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.prazoTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      {sub ? (
                        <View style={styles.prazoSubjectRow}>
                          <View style={[styles.subjectDot, { backgroundColor: sub.color }]} />
                          <Text
                            style={[styles.prazoSubjectText, { color: sub.color }]}
                            numberOfLines={1}
                          >
                            {sub.name}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.prazoCardBottom}>
                        <Text style={styles.prazoDateText}>
                          {item.date.split('-').reverse().slice(0, 2).join('/')}
                        </Text>
                        <TouchableOpacity
                          style={styles.prazoDoneBtn}
                          onPress={() => toggleCalendarEventCompleted(item.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                          <Text style={[styles.prazoDoneText, { color: colors.success }]}>
                            Concluir
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Grade Horária Semanal Responsiva: Adapta-se ao formato e resolução */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          <View>
            {/* Header row com os dias da semana */}
            <View style={styles.daysHeaderRow}>
              {/* Célula do canto esquerdo (coluna de Horários) */}
              <View style={[styles.cornerCell, { width: timeColWidth }]}>
                <Ionicons name="time-outline" size={15} color={colors.primary} />
                <Text style={styles.cornerLabel}>Horários</Text>
              </View>

              {DAYS.map((day) => (
                <View key={day.key} style={[styles.dayHeaderCell, { width: cellWidth }]}>
                  <Text style={styles.dayShortText}>{day.short}</Text>
                  <Text style={styles.dayLabelText} numberOfLines={1}>
                    {day.label.split('-')[0]}
                  </Text>
                </View>
              ))}
            </View>

            {/* 6 Blocos Fixos de 2 Horas */}
            {FIXED_SLOTS.map((timeSlot, slotIdx) => (
              <View key={timeSlot.id} style={styles.hourRow}>
                {/* Coluna com rótulo de horário à esquerda */}
                <View style={[styles.timeLabelCell, { width: timeColWidth }]}>
                  <Text style={styles.timeTextStart}>{timeSlot.startTime}</Text>
                  <Text style={styles.timeTextSeparator}>às</Text>
                  <Text style={styles.timeTextEnd}>{timeSlot.endTime}</Text>
                </View>

                {/* Células de cada dia para este bloco de 2h */}
                {DAYS.map((day) => {
                  const slot = getSlotAt(day.key, timeSlot.startTime);
                  const subject = slot?.subjectId ? subjectsMap.get(slot.subjectId) : null;

                  return (
                    <TouchableOpacity
                      key={`${day.key}-${timeSlot.id}`}
                      activeOpacity={0.75}
                      style={[
                        styles.cell,
                        { width: cellWidth, height: cellHeight },
                        slot ? styles.cellFilled : styles.cellEmpty,
                        slot && subject
                          ? { backgroundColor: `${subject.color}18`, borderColor: subject.color }
                          : {},
                      ]}
                      onPress={() => handleCellPress(day.key, timeSlot, slotIdx)}
                    >
                      {slot && subject ? (
                        <View style={styles.filledSlotContent}>
                          <View style={[styles.slotColorStripe, { backgroundColor: subject.color }]} />
                          <View style={styles.slotTextContainer}>
                            <Text
                              style={[
                                styles.slotSubjectName,
                                { color: isDark ? '#FFFFFF' : colors.text },
                              ]}
                              numberOfLines={2}
                            >
                              {subject.name}
                            </Text>
                            {slot.room ? (
                              <View style={styles.slotRoomBadge}>
                                <Ionicons name="location-outline" size={11} color={subject.color} />
                                <Text
                                  style={[styles.slotRoomText, { color: subject.color }]}
                                  numberOfLines={1}
                                >
                                  {slot.room}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <View style={styles.emptyCellContent}>
                          <Ionicons name="add" size={16} color={colors.border} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal: Adicionar Horário */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Aula</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Day selection */}
              <Text style={styles.inputLabel}>Dia da Semana</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.chip,
                      selectedDay === d.key && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedDay(d.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedDay === d.key && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}
                    >
                      {d.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Fixed 2-hour Slot Selection */}
              <Text style={styles.inputLabel}>Bloco de Horário (2 Horas)</Text>
              <View style={styles.fixedSlotsGrid}>
                {FIXED_SLOTS.map((slot, idx) => {
                  const isSelected = selectedSlotIndex === idx;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.fixedSlotButton,
                        isSelected && {
                          backgroundColor: `${colors.primary}18`,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setSelectedSlotIndex(idx)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.fixedSlotButtonText,
                          isSelected && { color: colors.primary, fontWeight: 'bold' },
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject Selection */}
              <Text style={styles.inputLabel}>Matéria</Text>
              <View style={styles.subjectsListContainer}>
                {subjects.map((sub) => {
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subjectPickCard,
                        isSelected && {
                          borderColor: sub.color,
                          backgroundColor: `${sub.color}15`,
                        },
                      ]}
                      onPress={() => setSelectedSubjectId(sub.id)}
                    >
                      <View style={[styles.subjectColorDot, { backgroundColor: sub.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectPickName} numberOfLines={1}>
                          {sub.name}
                        </Text>
                        <Text style={styles.subjectPickTeacher} numberOfLines={1}>
                          {sub.teacher}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={sub.color} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Room input */}
              <Text style={styles.inputLabel}>Sala / Local (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Lab PO 01, Sala 204, Auditório"
                placeholderTextColor={colors.textMuted}
                value={room}
                onChangeText={setRoom}
              />

              {/* Submit button */}
              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleSaveSlot}
              >
                <Text style={styles.submitButtonText}>Confirmar e Salvar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Detalhes do Horário */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {activeSlot ? (
              <>
                {(() => {
                  const sub = activeSlot.subjectId ? subjectsMap.get(activeSlot.subjectId) : null;
                  const dayObj = DAYS.find((d) => d.key === activeSlot.day);
                  return (
                    <>
                      <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={[
                              styles.subjectColorBadge,
                              { backgroundColor: sub?.color || colors.primary },
                            ]}
                          />
                          <Text style={styles.modalTitle} numberOfLines={1}>
                            {sub?.name || 'Aula'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.slotDetailRow}>
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <Text style={styles.slotDetailText}>{dayObj?.label || activeSlot.day}</Text>
                      </View>

                      <View style={styles.slotDetailRow}>
                        <Ionicons name="time-outline" size={18} color={colors.primary} />
                        <Text style={styles.slotDetailText}>
                          {activeSlot.startTime} às {activeSlot.endTime} (Bloco de 2h)
                        </Text>
                      </View>

                      {sub?.teacher ? (
                        <View style={styles.slotDetailRow}>
                          <Ionicons name="person-outline" size={18} color={colors.primary} />
                          <Text style={styles.slotDetailText}>{sub.teacher}</Text>
                        </View>
                      ) : null}

                      {activeSlot.room ? (
                        <View style={styles.slotDetailRow}>
                          <Ionicons name="location-outline" size={18} color={colors.primary} />
                          <Text style={styles.slotDetailText}>{activeSlot.room}</Text>
                        </View>
                      ) : null}

                      <View style={styles.detailActionsRow}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={handleDeleteActiveSlot}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                          <Text style={styles.deleteButtonText}>Remover do Cronograma</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </>
            ) : null}
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
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerButton: {
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      ...getShadow(isDark),
    },

    // Janela Integrada de Prazos
    prazosWindowCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...getShadow(isDark),
    },
    prazosWindowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    prazosHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      marginRight: spacing.sm,
    },
    prazosIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    prazosWindowTitle: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    prazosCountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: borderRadius.full,
    },
    prazosCountBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
    prazosWindowSummary: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    prazosHeaderRight: {
      justifyContent: 'center',
    },
    toggleBtnPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      backgroundColor: `${colors.primary}12`,
    },
    toggleBtnPillText: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
    },
    prazosWindowBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    prazosScrollVertical: {
      maxHeight: 220,
    },
    prazosScrollHorizontal: {
      maxHeight: 140,
    },
    emptyPrazosBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      gap: 6,
    },
    emptyPrazosText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.textSecondary,
    },
    addPrazoBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: `${colors.primary}18`,
    },
    addPrazoBtnText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: typography.weights.bold,
    },
    prazoItemCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    prazoCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    typeTag: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: borderRadius.xs,
    },
    typeTagText: {
      fontSize: 9,
      fontWeight: typography.weights.bold,
    },
    dueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      gap: 3,
    },
    dueBadgeText: {
      fontSize: 10,
      fontWeight: typography.weights.bold,
    },
    prazoTitle: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    prazoSubjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    subjectDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    prazoSubjectText: {
      fontSize: 10,
      fontWeight: typography.weights.semibold,
    },
    prazoCardBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
      paddingTop: 4,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
    },
    prazoDateText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    prazoDoneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    prazoDoneText: {
      fontSize: 10,
      fontWeight: typography.weights.bold,
    },

    // Grade Horária
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: spacing.xxxl,
    },
    horizontalScrollContent: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    daysHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.md,
      borderTopRightRadius: borderRadius.md,
      overflow: 'hidden',
    },
    cornerCell: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm,
    },
    cornerLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: typography.weights.bold,
      marginTop: 2,
    },
    dayHeaderCell: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    dayShortText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
      color: colors.primary,
    },
    dayLabelText: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 1,
    },
    hourRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timeLabelCell: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
    },
    timeTextStart: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    timeTextSeparator: {
      fontSize: 8,
      color: colors.textMuted,
      marginVertical: 1,
    },
    timeTextEnd: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
      color: colors.textSecondary,
    },
    cell: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
      padding: spacing.xs,
      justifyContent: 'center',
    },
    cellEmpty: {
      backgroundColor: 'transparent',
    },
    cellFilled: {
      borderRadius: borderRadius.sm,
      borderLeftWidth: 3.5,
      margin: 2,
      overflow: 'hidden',
    },
    emptyCellContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filledSlotContent: {
      flex: 1,
      justifyContent: 'center',
    },
    slotColorStripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3.5,
    },
    slotTextContainer: {
      paddingLeft: 6,
    },
    slotSubjectName: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
      lineHeight: 14,
    },
    slotRoomBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    slotRoomText: {
      fontSize: 10,
      fontWeight: typography.weights.semibold,
      marginLeft: 2,
    },

    // Modais
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
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    inputLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    chipsScroll: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
      backgroundColor: colors.card,
    },
    chipText: {
      fontSize: typography.sizes.sm,
      color: colors.text,
    },
    fixedSlotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    fixedSlotButton: {
      flex: 1,
      minWidth: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 6,
    },
    fixedSlotButtonText: {
      fontSize: typography.sizes.xs,
      color: colors.text,
    },
    subjectsListContainer: {
      gap: spacing.xs,
    },
    subjectPickCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: spacing.xs,
    },
    subjectColorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: spacing.md,
    },
    subjectPickName: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      color: colors.text,
    },
    subjectPickTeacher: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
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
    subjectColorBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: spacing.sm,
    },
    slotDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    slotDetailText: {
      marginLeft: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.text,
    },
    detailActionsRow: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: `${colors.error}10`,
    },
    deleteButtonText: {
      color: colors.error,
      fontWeight: typography.weights.bold,
      fontSize: typography.sizes.md,
      marginLeft: spacing.xs,
    },
  });
