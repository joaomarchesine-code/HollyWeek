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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import {
  Subject,
  GradeComponent,
  GradingFormula,
  GradingMethod,
} from '../types';
import {
  borderRadius,
  spacing,
  typography,
  getShadow,
  SUBJECT_COLORS,
} from '../theme';
import { calculateNeededGrades } from '../utils/gradeCalculator';

export const SubjectsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    subjects,
    addSubject,
    deleteSubject,
    setGrade,
    incrementAbsence,
    decrementAbsence,
  } = useAppData();

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Grade edit modal
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [activeComponent, setActiveComponent] = useState<GradeComponent | null>(null);
  const [gradeInputText, setGradeInputText] = useState('');

  // Form states for creating a new subject (default passing score is 5.0)
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(SUBJECT_COLORS[0]);
  const [formula, setFormula] = useState<GradingFormula>('average');
  const [passingScoreText, setPassingScoreText] = useState('5.0');
  const [totalClassesText, setTotalClassesText] = useState('60');
  const [componentsList, setComponentsList] = useState<
    { id: string; name: string; weight: number }[]
  >([
    { id: 'c-1', name: 'Prova 1 (P1)', weight: 1 },
    { id: 'c-2', name: 'Prova 2 (P2)', weight: 1 },
    { id: 'c-3', name: 'Trabalho Prático', weight: 1 },
  ]);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentWeight, setNewComponentWeight] = useState('1');

  // Keep selectedSubject in sync with subjects state
  const activeSubject = useMemo(() => {
    if (!selectedSubject) return null;
    return subjects.find((s) => s.id === selectedSubject.id) || selectedSubject;
  }, [selectedSubject, subjects]);

  const activeCalculation = useMemo(() => {
    if (!activeSubject) return null;
    return calculateNeededGrades(activeSubject);
  }, [activeSubject]);

  // Attendance metrics calculation
  const attendanceMetrics = useMemo(() => {
    if (!activeSubject) return null;
    const att = activeSubject.attendance || { totalClasses: 60, absences: 0 };
    const total = att.totalClasses > 0 ? att.totalClasses : 60;
    const absences = att.absences || 0;
    const attended = Math.max(0, total - absences);
    const rate = Number(((attended / total) * 100).toFixed(1));
    const maxAllowedAbsences = Math.floor(total * 0.3); // 30% faltas permitidas (70% presença)
    const remainingAbsences = maxAllowedAbsences - absences;

    const isDanger = rate <= 75 && rate > 70;
    const isFailedByAbsence = rate <= 70;

    return {
      total,
      absences,
      attended,
      rate,
      maxAllowedAbsences,
      remainingAbsences,
      isDanger,
      isFailedByAbsence,
    };
  }, [activeSubject]);

  const handleOpenCreateModal = () => {
    setName('');
    setTeacher('');
    setSelectedColor(SUBJECT_COLORS[0]);
    setFormula('average');
    setPassingScoreText('5.0');
    setTotalClassesText('60');
    setComponentsList([
      { id: 'c-1', name: 'Prova 1 (P1)', weight: 1 },
      { id: 'c-2', name: 'Prova 2 (P2)', weight: 1 },
      { id: 'c-3', name: 'Trabalho Prático', weight: 1 },
    ]);
    setNewComponentName('');
    setNewComponentWeight('1');
    setCreateModalVisible(true);
  };

  const handleAddComponentToForm = () => {
    if (!newComponentName.trim()) {
      Alert.alert('Atenção', 'Informe o nome da avaliação.');
      return;
    }
    const weightNum = parseFloat(newComponentWeight) || 1;
    setComponentsList((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: newComponentName.trim(),
        weight: weightNum > 0 ? weightNum : 1,
      },
    ]);
    setNewComponentName('');
    setNewComponentWeight('1');
  };

  const handleRemoveComponentFromForm = (id: string) => {
    if (componentsList.length <= 1) {
      Alert.alert('Atenção', 'A matéria deve ter ao menos uma avaliação.');
      return;
    }
    setComponentsList((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveNewSubject = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da matéria.');
      return;
    }
    if (componentsList.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma avaliação.');
      return;
    }
    const passingScore = parseFloat(passingScoreText.replace(',', '.')) || 5.0;
    const totalClasses = parseInt(totalClassesText, 10) || 60;

    let formulaDesc = 'Média Simples';
    if (formula === 'weighted_average') {
      formulaDesc = 'Média Ponderada';
    } else if (formula === 'sum') {
      formulaDesc = 'Soma das Notas';
    }

    const gradingMethod: GradingMethod = {
      id: `gm-${Date.now()}`,
      description: formulaDesc,
      components: componentsList,
      passingScore,
      formula,
    };

    try {
      await addSubject({
        name: name.trim(),
        teacher: teacher.trim() || 'Não informado',
        color: selectedColor,
        gradingMethod,
        grades: [],
        attendance: {
          totalClasses,
          absences: 0,
        },
      });
      setCreateModalVisible(false);
    } catch (err: any) {
      console.error('Erro ao adicionar matéria:', err);
      Alert.alert('Erro ao Salvar', err?.message || 'Não foi possível salvar a matéria no banco de dados.');
    }
  };

  const handleOpenGradeModal = (comp: GradeComponent) => {
    if (!activeSubject) return;
    setActiveComponent(comp);
    const existing = activeSubject.grades.find((g) => g.componentId === comp.id);
    setGradeInputText(existing && existing.value !== null ? String(existing.value) : '');
    setGradeModalVisible(true);
  };

  const handleSaveGrade = async () => {
    if (!activeSubject || !activeComponent) return;

    if (gradeInputText.trim() === '') {
      await setGrade(activeSubject.id, activeComponent.id, null);
      setGradeModalVisible(false);
      return;
    }

    const parsed = parseFloat(gradeInputText.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      Alert.alert('Nota Inválida', 'A nota deve ser um número entre 0 e 10.');
      return;
    }

    try {
      await setGrade(activeSubject.id, activeComponent.id, Number(parsed.toFixed(2)));
      setGradeModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a nota.');
    }
  };

  const handleDeleteSubject = (sub: Subject) => {
    Alert.alert(
      'Excluir Matéria',
      `Tem certeza que deseja excluir "${sub.name}"? Todas as notas e vínculos de cronograma serão removidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubject(sub.id);
              if (selectedSubject?.id === sub.id) {
                setSelectedSubject(null);
              }
            } catch {
              Alert.alert('Erro', 'Falha ao excluir matéria.');
            }
          },
        },
      ]
    );
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Matérias & Notas</Text>
          <Text style={styles.headerSubtitle}>Sistema Inteligente de Aprovação</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.7}
          onPress={handleOpenCreateModal}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Lista de Matérias */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {subjects.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="book-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>Nenhuma matéria cadastrada</Text>
            <Text style={styles.emptyStateSubtitle}>
              Toque no botão + para adicionar matérias e configurar fórmulas de notas.
            </Text>
          </View>
        ) : (
          subjects.map((sub) => {
            const calc = calculateNeededGrades(sub);
            const isPassing = calc.isPassing;
            const isImpossible = calc.isImpossible;

            // Attendance check for badge
            const att = sub.attendance || { totalClasses: 60, absences: 0 };
            const rate = att.totalClasses > 0 ? ((att.totalClasses - att.absences) / att.totalClasses) * 100 : 100;
            const isAttDanger = rate <= 75;

            return (
              <TouchableOpacity
                key={sub.id}
                style={styles.subjectCard}
                activeOpacity={0.8}
                onPress={() => setSelectedSubject(sub)}
              >
                {/* Left Color Stripe */}
                <View style={[styles.subjectCardStripe, { backgroundColor: sub.color }]} />

                <View style={styles.subjectCardContent}>
                  <View style={styles.subjectCardHeader}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <Text style={styles.subjectCardName} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={styles.subjectCardTeacher} numberOfLines={1}>
                        {sub.teacher}
                      </Text>
                    </View>

                    <View style={styles.headerBadgesRow}>
                      {/* Attendance badge */}
                      <View
                        style={[
                          styles.attPill,
                          isAttDanger
                            ? { backgroundColor: `${colors.error}20` }
                            : { backgroundColor: `${colors.success}18` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.attPillText,
                            { color: isAttDanger ? colors.error : colors.success },
                          ]}
                        >
                          {rate.toFixed(0)}% pres.
                        </Text>
                      </View>

                      {/* Passing score badge */}
                      <View style={[styles.colorPill, { backgroundColor: `${sub.color}20` }]}>
                        <View style={[styles.colorPillDot, { backgroundColor: sub.color }]} />
                        <Text style={[styles.colorPillText, { color: sub.color }]}>
                          Mín. {sub.gradingMethod.passingScore.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Smart Status Bar */}
                  <View
                    style={[
                      styles.statusBanner,
                      isPassing && { backgroundColor: `${colors.success}15`, borderColor: colors.success },
                      isImpossible && { backgroundColor: `${colors.error}15`, borderColor: colors.error },
                      !isPassing && !isImpossible && { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name={
                        isPassing
                          ? 'checkmark-circle'
                          : isImpossible
                          ? 'close-circle'
                          : 'calculator-outline'
                      }
                      size={16}
                      color={
                        isPassing ? colors.success : isImpossible ? colors.error : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.statusBannerText,
                        isPassing && { color: colors.success, fontWeight: '700' },
                        isImpossible && { color: colors.error, fontWeight: '700' },
                        !isPassing && !isImpossible && { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {calc.completedComponents > 0
                        ? `Média Atual: ${calc.currentAverage.toFixed(1)} • ${calc.statusText}`
                        : `Sem notas inseridas • ${calc.statusText}`}
                    </Text>
                  </View>

                  {/* Quick Grades Indicator */}
                  <View style={styles.quickGradesRow}>
                    <Text style={styles.quickGradesLabel}>Avaliações:</Text>
                    <View style={styles.quickGradesTags}>
                      {sub.gradingMethod.components.map((comp) => {
                        const gradeObj = sub.grades.find((g) => g.componentId === comp.id);
                        const hasGrade = gradeObj && gradeObj.value !== null;
                        return (
                          <View
                            key={comp.id}
                            style={[
                              styles.gradeMiniTag,
                              hasGrade
                                ? { backgroundColor: `${sub.color}20`, borderColor: sub.color }
                                : { backgroundColor: colors.background, borderColor: colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.gradeMiniTagText,
                                hasGrade && { color: sub.color, fontWeight: 'bold' },
                              ]}
                            >
                              {comp.name}: {hasGrade ? gradeObj.value?.toFixed(1) : '-'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Detalhes da Matéria, Frequência e Calculadora Inteligente */}
      <Modal
        visible={!!activeSubject}
        animationType="slide"
        onRequestClose={() => setSelectedSubject(null)}
      >
        {activeSubject && activeCalculation && attendanceMetrics ? (
          <SafeAreaView style={styles.detailContainer}>
            {/* Header com cor da Matéria */}
            <View style={[styles.detailHeader, { backgroundColor: activeSubject.color }]}>
              <View style={styles.detailHeaderTop}>
                <TouchableOpacity
                  style={styles.detailBackButton}
                  onPress={() => setSelectedSubject(null)}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailDeleteButton}
                  onPress={() => handleDeleteSubject(activeSubject)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailSubjectName}>{activeSubject.name}</Text>
              <Text style={styles.detailTeacherName}>
                <Ionicons name="person" size={14} color="#FFFFFF" /> {activeSubject.teacher}
              </Text>
              <View style={styles.detailFormulaBadge}>
                <Text style={styles.detailFormulaText}>
                  {activeSubject.gradingMethod.description} • Média Mínima:{' '}
                  {activeSubject.gradingMethod.passingScore.toFixed(1)}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              {/* SEÇÃO: 📋 FREQUÊNCIA (Obrigatório >= 70%) */}
              <View style={styles.attendanceCard}>
                <View style={styles.attendanceHeader}>
                  <View style={styles.attTitleRow}>
                    <Ionicons name="clipboard-outline" size={22} color={colors.primary} />
                    <Text style={styles.attCardTitle}>Frequência de Aulas</Text>
                  </View>

                  <View
                    style={[
                      styles.attPercentBadge,
                      attendanceMetrics.isFailedByAbsence
                        ? { backgroundColor: `${colors.error}20` }
                        : attendanceMetrics.isDanger
                        ? { backgroundColor: `${colors.warning}20` }
                        : { backgroundColor: `${colors.success}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.attPercentText,
                        attendanceMetrics.isFailedByAbsence
                          ? { color: colors.error }
                          : attendanceMetrics.isDanger
                          ? { color: colors.warning }
                          : { color: colors.success },
                      ]}
                    >
                      {attendanceMetrics.rate}% Presença
                    </Text>
                  </View>
                </View>

                {/* Progress bar visual */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, attendanceMetrics.rate))}%`,
                        backgroundColor: attendanceMetrics.isFailedByAbsence
                          ? colors.error
                          : attendanceMetrics.isDanger
                          ? colors.warning
                          : colors.success,
                      },
                    ]}
                  />
                  {/* Mark at 70% */}
                  <View style={styles.thresholdMarker} />
                </View>

                {/* Alertas visuais de perigo / reprovação */}
                {attendanceMetrics.isFailedByAbsence ? (
                  <View style={[styles.attAlertBanner, { backgroundColor: `${colors.error}20`, borderColor: colors.error }]}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <Text style={[styles.attAlertText, { color: colors.error }]}>
                      Reprovado por Falta! Frequência inferior ao mínimo obrigatório de 70%.
                    </Text>
                  </View>
                ) : attendanceMetrics.isDanger ? (
                  <View style={[styles.attAlertBanner, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}>
                    <Ionicons name="warning" size={18} color={colors.warning} />
                    <Text style={[styles.attAlertText, { color: colors.warning }]}>
                      Atenção: Zona de Perigo! Frequência próxima do limite de 70%.
                    </Text>
                  </View>
                ) : null}

                {/* Grid com métricas de faltas */}
                <View style={styles.attMetricsGrid}>
                  <View style={styles.attMetricItem}>
                    <Text style={styles.attMetricNumber}>
                      {attendanceMetrics.absences} / {attendanceMetrics.total}
                    </Text>
                    <Text style={styles.attMetricLabel}>Faltas Registradas</Text>
                  </View>

                  <View style={styles.attMetricItem}>
                    <Text
                      style={[
                        styles.attMetricNumber,
                        attendanceMetrics.remainingAbsences <= 2
                          ? { color: colors.error }
                          : { color: colors.primary },
                      ]}
                    >
                      {Math.max(0, attendanceMetrics.remainingAbsences)}
                    </Text>
                    <Text style={styles.attMetricLabel}>Faltas Permitidas Restantes</Text>
                  </View>
                </View>

                {/* Botões para registrar / remover falta */}
                <View style={styles.absenceActionsRow}>
                  <TouchableOpacity
                    style={[styles.absenceBtn, { borderColor: colors.border }]}
                    onPress={() => decrementAbsence(activeSubject.id)}
                    disabled={attendanceMetrics.absences <= 0}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={attendanceMetrics.absences > 0 ? colors.text : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.absenceBtnText,
                        { color: attendanceMetrics.absences > 0 ? colors.text : colors.textMuted },
                      ]}
                    >
                      Remover Falta
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.absenceBtn,
                      { backgroundColor: `${colors.error}15`, borderColor: colors.error },
                    ]}
                    onPress={() => incrementAbsence(activeSubject.id)}
                  >
                    <Ionicons name="add" size={20} color={colors.error} />
                    <Text style={[styles.absenceBtnText, { color: colors.error }]}>
                      + Adicionar Falta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SEÇÃO: 🧮 CALCULADORA INTELIGENTE */}
              <View style={styles.calcCard}>
                <View style={styles.calcCardHeader}>
                  <View style={styles.calcTitleRow}>
                    <Ionicons name="calculator" size={22} color={colors.primary} />
                    <Text style={styles.calcTitle}>Calculadora Inteligente</Text>
                  </View>

                  <View
                    style={[
                      styles.calcAverageBadge,
                      activeCalculation.isPassing
                        ? { backgroundColor: `${colors.success}20` }
                        : activeCalculation.isImpossible
                        ? { backgroundColor: `${colors.error}20` }
                        : { backgroundColor: `${colors.primary}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calcAverageText,
                        activeCalculation.isPassing
                          ? { color: colors.success }
                          : activeCalculation.isImpossible
                          ? { color: colors.error }
                          : { color: colors.primary },
                      ]}
                    >
                      Média: {activeCalculation.currentAverage.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Banner de Status Principal */}
                <View
                  style={[
                    styles.smartMessageBanner,
                    activeCalculation.isPassing && {
                      backgroundColor: `${colors.success}15`,
                      borderColor: colors.success,
                    },
                    activeCalculation.isImpossible && {
                      backgroundColor: `${colors.error}15`,
                      borderColor: colors.error,
                    },
                    !activeCalculation.isPassing &&
                      !activeCalculation.isImpossible && {
                        backgroundColor: `${colors.primary}15`,
                        borderColor: colors.primary,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.smartMessageText,
                      activeCalculation.isPassing && { color: colors.success },
                      activeCalculation.isImpossible && { color: colors.error },
                      !activeCalculation.isPassing &&
                        !activeCalculation.isImpossible && { color: colors.primary },
                    ]}
                  >
                    {activeCalculation.isPassing
                      ? '🎉 Parabéns! Você já atingiu a nota para aprovação nesta matéria!'
                      : activeCalculation.isImpossible
                      ? '😢 Matematicamente impossível atingir a média mínima com as notas restantes.'
                      : activeCalculation.statusText}
                  </Text>
                </View>

                {/* Requisitos por componente faltante */}
                {!activeCalculation.isPassing &&
                !activeCalculation.isImpossible &&
                activeCalculation.neededGrades.length > 0 ? (
                  <View style={styles.neededGradesContainer}>
                    <Text style={styles.neededSectionTitle}>Para passar, você precisa de:</Text>
                    {activeCalculation.neededGrades.map((ng) => (
                      <View key={ng.componentId} style={styles.neededGradeItem}>
                        <View style={styles.neededGradeBullet}>
                          <Ionicons name="arrow-forward-circle" size={16} color={colors.warning} />
                          <Text style={styles.neededGradeCompName}>{ng.componentName}:</Text>
                        </View>
                        <View style={styles.neededGradeScoreBadge}>
                          <Text style={styles.neededGradeScoreText}>
                            mínimo {ng.neededGrade.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* SEÇÃO: MINHAS NOTAS */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Minhas Avaliações</Text>
                <Text style={styles.sectionSubtitle}>
                  Toque em uma avaliação para lançar ou alterar a nota
                </Text>
              </View>

              {activeSubject.gradingMethod.components.map((comp) => {
                const gradeObj = activeSubject.grades.find((g) => g.componentId === comp.id);
                const hasGrade = gradeObj && gradeObj.value !== null;
                const gradeVal = gradeObj?.value ?? null;

                const isGoodGrade =
                  gradeVal !== null && gradeVal >= activeSubject.gradingMethod.passingScore;

                return (
                  <TouchableOpacity
                    key={comp.id}
                    style={styles.gradeCard}
                    activeOpacity={0.7}
                    onPress={() => handleOpenGradeModal(comp)}
                  >
                    <View style={styles.gradeCardLeft}>
                      <Text style={styles.gradeComponentName}>{comp.name}</Text>
                      {activeSubject.gradingMethod.formula === 'weighted_average' ? (
                        <Text style={styles.gradeWeightText}>Peso: {comp.weight}</Text>
                      ) : null}
                    </View>

                    <View style={styles.gradeCardRight}>
                      {hasGrade ? (
                        <View
                          style={[
                            styles.gradeValueBadge,
                            isGoodGrade
                              ? { backgroundColor: `${colors.success}20`, borderColor: colors.success }
                              : { backgroundColor: `${colors.error}20`, borderColor: colors.error },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeValueText,
                              isGoodGrade ? { color: colors.success } : { color: colors.error },
                            ]}
                          >
                            {gradeVal?.toFixed(1)}
                          </Text>
                          <Ionicons
                            name={isGoodGrade ? 'checkmark' : 'alert-circle'}
                            size={14}
                            color={isGoodGrade ? colors.success : colors.error}
                            style={{ marginLeft: 4 }}
                          />
                        </View>
                      ) : (
                        <View style={styles.gradeEmptyBadge}>
                          <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.gradeEmptyText}>Inserir Nota</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>

      {/* Modal: Inserir / Editar Nota */}
      <Modal
        visible={gradeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeComponent?.name || 'Lançar Nota'}
              </Text>
              <TouchableOpacity onPress={() => setGradeModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nota obtida (0 a 10)</Text>
            <TextInput
              style={[styles.textInput, styles.gradeLargeInput]}
              placeholder="Ex: 7.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={gradeInputText}
              onChangeText={setGradeInputText}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.clearGradeButton}
                onPress={() => {
                  setGradeInputText('');
                }}
              >
                <Text style={styles.clearGradeText}>Limpar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { flex: 1, marginTop: 0 }]}
                onPress={handleSaveGrade}
              >
                <Text style={styles.submitButtonText}>Salvar Nota</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Criar Nova Matéria */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Matéria</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nome */}
              <Text style={styles.inputLabel}>Nome da Matéria</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Pesquisa Operacional"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Professor */}
              <Text style={styles.inputLabel}>Professor(a)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Prof. Carlos Eduardo"
                placeholderTextColor={colors.textMuted}
                value={teacher}
                onChangeText={setTeacher}
              />

              {/* Cor */}
              <Text style={styles.inputLabel}>Cor de Identificação</Text>
              <View style={styles.colorPaletteRow}>
                {SUBJECT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorCircleSelected,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  >
                    {selectedColor === c ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fórmula */}
              <Text style={styles.inputLabel}>Fórmula de Cálculo</Text>
              <View style={styles.formulaButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.formulaButton,
                    formula === 'average' && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormula('average')}
                >
                  <Text
                    style={[
                      styles.formulaButtonText,
                      formula === 'average' && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    Média Simples
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formulaButton,
                    formula === 'weighted_average' && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormula('weighted_average')}
                >
                  <Text
                    style={[
                      styles.formulaButtonText,
                      formula === 'weighted_average' && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    Média Ponderada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formulaButton,
                    formula === 'sum' && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormula('sum')}
                >
                  <Text
                    style={[
                      styles.formulaButtonText,
                      formula === 'sum' && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    Soma
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Nota mínima (Default: 5.0) */}
              <Text style={styles.inputLabel}>Nota Mínima para Aprovação</Text>
              <TextInput
                style={styles.textInput}
                placeholder="5.0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={passingScoreText}
                onChangeText={setPassingScoreText}
              />

              {/* Total de Aulas Previstas */}
              <Text style={styles.inputLabel}>Total de Aulas Previstas (Semestre)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={totalClassesText}
                onChangeText={setTotalClassesText}
              />

              {/* Componentes de Avaliação */}
              <View style={styles.componentsHeaderRow}>
                <Text style={styles.inputLabel}>Avaliações ({componentsList.length})</Text>
              </View>

              {componentsList.map((comp) => (
                <View key={comp.id} style={styles.compRowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compItemName}>{comp.name}</Text>
                    {formula === 'weighted_average' ? (
                      <Text style={styles.compItemWeight}>Peso: {comp.weight}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveComponentFromForm(comp.id)}
                    style={styles.removeCompButton}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Adicionar novo componente */}
              <View style={styles.addCompBox}>
                <TextInput
                  style={[styles.textInput, { flex: 2, marginRight: spacing.xs }]}
                  placeholder="Nome (ex: Prova 3)"
                  placeholderTextColor={colors.textMuted}
                  value={newComponentName}
                  onChangeText={setNewComponentName}
                />
                {formula === 'weighted_average' ? (
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginRight: spacing.xs }]}
                    placeholder="Peso"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newComponentWeight}
                    onChangeText={setNewComponentWeight}
                  />
                ) : null}
                <TouchableOpacity
                  style={styles.addCompAction}
                  onPress={handleAddComponentToForm}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleSaveNewSubject}
              >
                <Text style={styles.submitButtonText}>Cadastrar Matéria</Text>
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
      padding: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    emptyStateCard: {
      marginTop: spacing.xl,
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
    subjectCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...getShadow(isDark),
    },
    subjectCardStripe: {
      height: 4,
      width: '100%',
    },
    subjectCardContent: {
      padding: spacing.md,
    },
    subjectCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    subjectCardName: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    subjectCardTeacher: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    attPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    attPillText: {
      fontSize: 10,
      fontWeight: typography.weights.bold,
    },
    colorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    colorPillDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },
    colorPillText: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    statusBannerText: {
      fontSize: typography.sizes.xs,
      flex: 1,
    },
    quickGradesRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    quickGradesLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: typography.weights.medium,
    },
    quickGradesTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    gradeMiniTag: {
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
    },
    gradeMiniTagText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    // Detail screen styles
    detailContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    detailHeader: {
      padding: spacing.lg,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    detailHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    detailBackButton: {
      backgroundColor: 'rgba(0,0,0,0.2)',
      padding: spacing.xs,
      borderRadius: borderRadius.full,
    },
    detailDeleteButton: {
      backgroundColor: 'rgba(0,0,0,0.2)',
      padding: spacing.xs,
      borderRadius: borderRadius.full,
    },
    detailSubjectName: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: '#FFFFFF',
    },
    detailTeacherName: {
      fontSize: typography.sizes.sm,
      color: 'rgba(255,255,255,0.85)',
      marginTop: spacing.xs,
    },
    detailFormulaBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginTop: spacing.sm,
    },
    detailFormulaText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: typography.weights.semibold,
    },
    detailScroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    // Attendance Section Styles
    attendanceCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      ...getShadow(isDark),
    },
    attendanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    attTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    attCardTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    attPercentBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    attPercentText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
    },
    progressBarTrack: {
      height: 10,
      backgroundColor: colors.card,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: spacing.sm,
      position: 'relative',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    thresholdMarker: {
      position: 'absolute',
      left: '70%',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: colors.border,
    },
    attAlertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      marginBottom: spacing.sm,
      gap: 6,
    },
    attAlertText: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
      flex: 1,
    },
    attMetricsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.md,
    },
    attMetricItem: {
      alignItems: 'center',
    },
    attMetricNumber: {
      fontSize: 20,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    attMetricLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    absenceActionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    absenceBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      gap: 4,
    },
    absenceBtnText: {
      fontSize: typography.sizes.xs + 1,
      fontWeight: typography.weights.bold,
    },
    // Calc Card Styles
    calcCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      ...getShadow(isDark),
    },
    calcCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    calcTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    calcTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    calcAverageBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    calcAverageText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
    },
    smartMessageBanner: {
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    smartMessageText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      lineHeight: 20,
    },
    neededGradesContainer: {
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
    },
    neededSectionTitle: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      fontWeight: typography.weights.bold,
      marginBottom: spacing.xs,
    },
    neededGradeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    neededGradeBullet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    neededGradeCompName: {
      fontSize: typography.sizes.sm,
      color: colors.text,
      fontWeight: typography.weights.medium,
    },
    neededGradeScoreBadge: {
      backgroundColor: `${colors.warning}20`,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
    },
    neededGradeScoreText: {
      fontSize: 11,
      fontWeight: typography.weights.bold,
      color: colors.warning,
    },
    sectionHeader: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    gradeCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...getShadow(isDark),
    },
    gradeCardLeft: {
      flex: 1,
    },
    gradeComponentName: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      color: colors.text,
    },
    gradeWeightText: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    gradeCardRight: {
      alignItems: 'flex-end',
    },
    gradeValueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
    },
    gradeValueText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    gradeEmptyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    gradeEmptyText: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
    },
    // Modals
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
    gradeLargeInput: {
      fontSize: typography.sizes.title,
      textAlign: 'center',
      fontWeight: typography.weights.bold,
      paddingVertical: spacing.md,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    clearGradeButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    clearGradeText: {
      color: colors.textSecondary,
      fontWeight: typography.weights.semibold,
    },
    colorPaletteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    colorCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorCircleSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    formulaButtonsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginVertical: spacing.xs,
    },
    formulaButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    formulaButtonText: {
      fontSize: typography.sizes.xs,
      color: colors.text,
    },
    componentsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    compRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    compItemName: {
      fontSize: typography.sizes.sm,
      color: colors.text,
      fontWeight: typography.weights.medium,
    },
    compItemWeight: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    removeCompButton: {
      padding: spacing.xs,
    },
    addCompBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    addCompAction: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
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

