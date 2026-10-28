import React, { useState, useMemo, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { borderRadius, spacing, typography, getShadow } from '../theme';
import { calculateNeededGrades } from '../utils/gradeCalculator';

export const ProfileScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { profile, updateProfile, subjects, schedule, events, currentUser, logoutUser, deleteUser } = useAppData();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [courseInput, setCourseInput] = useState(profile.course);
  const [semesterInput, setSemesterInput] = useState(profile.semester);

  // Estados de confirmação inline (100% confiáveis no Web e Mobile, sem modais frágeis)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleDirectLogout = async () => {
    setActionLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error('Erro ao sair da agenda:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCurrentAgenda = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      await deleteUser(currentUser.id);
    } catch (err) {
      console.error('Erro ao deletar agenda:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Animated rotation for theme toggle
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleToggleTheme = () => {
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0);
      toggleTheme();
    });
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSubjects = subjects.length;
    const passingCount = subjects.filter((s) => calculateNeededGrades(s).isPassing).length;
    const upcomingEvents = events.filter((e) => !e.completed).length;
    const totalSlots = schedule.length;

    return {
      totalSubjects,
      passingCount,
      upcomingEvents,
      totalSlots,
    };
  }, [subjects, events, schedule]);

  // User initials
  const initials = useMemo(() => {
    if (!profile.name) return 'U';
    const parts = profile.name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile.name]);

  const handleOpenEdit = () => {
    setNameInput(profile.name);
    setCourseInput(profile.course);
    setSemesterInput(profile.semester);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Atenção', 'Informe seu nome.');
      return;
    }
    try {
      await updateProfile({
        name: nameInput.trim(),
        course: courseInput.trim() || 'Curso não informado',
        semester: semesterInput.trim() || 'Semestre não informado',
      });
      setEditModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    }
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Hero Header with LinearGradient */}
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#2E1065', '#0D0D1A'] : ['#6C63FF', '#8B5CF6', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerTopActions}>
            <Text style={styles.headerTitle}>Meu Perfil</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.editProfileButton}
                activeOpacity={0.8}
                onPress={handleOpenEdit}
              >
                <Ionicons name="pencil" size={15} color="#FFFFFF" />
                <Text style={styles.editProfileButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerLogoutButton}
                activeOpacity={0.8}
                onPress={handleDirectLogout}
              >
                <Ionicons name="log-out-outline" size={15} color="#FFFFFF" />
                <Text style={styles.headerLogoutButtonText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{profile.name}</Text>
            <Text style={styles.userCourse}>
              {profile.course} • {profile.semester}
            </Text>
          </View>
        </LinearGradient>

        {/* Dashboard Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estatísticas do Semestre</Text>
          <View style={styles.statsGrid}>
            {/* Total Matérias */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="book-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.statNumber}>{stats.totalSubjects}</Text>
              <Text style={styles.statLabel}>Matérias Ativas</Text>
            </View>

            {/* Matérias Aprovadas */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="trophy-outline" size={22} color={colors.success} />
              </View>
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {stats.passingCount}
              </Text>
              <Text style={styles.statLabel}>Aprovadas</Text>
            </View>

            {/* Próximos Eventos */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="calendar-outline" size={22} color={colors.warning} />
              </View>
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {stats.upcomingEvents}
              </Text>
              <Text style={styles.statLabel}>Pendências</Text>
            </View>

            {/* Aulas Semanais */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="time-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.totalSlots}</Text>
              <Text style={styles.statLabel}>Aulas na Semana</Text>
            </View>
          </View>
        </View>

        {/* Settings & Preferences */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferências</Text>

          {/* Theme Toggle Item */}
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleToggleTheme}
          >
            <View style={styles.settingItemLeft}>
              <Animated.View
                style={[
                  styles.settingIconBadge,
                  {
                    backgroundColor: isDark ? '#7B72FF25' : '#F59E0B25',
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#7B72FF' : '#F59E0B'}
                />
              </Animated.View>
              <View>
                <Text style={styles.settingItemTitle}>Tema do Aplicativo</Text>
                <Text style={styles.settingItemSubtitle}>
                  {isDark ? 'Modo Escuro ativado' : 'Modo Claro ativado'}
                </Text>
              </View>
            </View>

            <View style={[styles.themePill, { backgroundColor: colors.card }]}>
              <Text style={[styles.themePillText, { color: colors.primary }]}>
                {isDark ? 'Escuro' : 'Claro'}
              </Text>
              <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Trocar de Agenda / Desconectar */}
          {showLogoutConfirm ? (
            <View style={[styles.inlineBox, { borderColor: `${colors.error}60`, backgroundColor: `${colors.error}0A` }]}>
              <View style={styles.inlineHeader}>
                <View style={[styles.settingIconBadge, { backgroundColor: `${colors.error}20` }]}>
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inlineTitle, { color: colors.text }]}>
                    Desconectar da agenda?
                  </Text>
                  <Text style={[styles.inlineSubtitle, { color: colors.textSecondary }]}>
                    Você sairá de "{currentUser?.name || profile.name}" e voltará para a tela inicial de agendas.
                  </Text>
                </View>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  style={[styles.inlineCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowLogoutConfirm(false)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.inlineCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineConfirmBtn, { backgroundColor: colors.error, opacity: actionLoading ? 0.7 : 1 }]}
                  onPress={handleDirectLogout}
                  disabled={actionLoading}
                >
                  <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.inlineConfirmText}>
                    {actionLoading ? 'Saindo...' : 'Sim, Sair Agora'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.settingItem, { marginTop: spacing.sm }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowDeleteConfirm(false);
                setShowLogoutConfirm(true);
              }}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[
                    styles.settingIconBadge,
                    { backgroundColor: `${colors.error}18` },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                </View>
                <View>
                  <Text style={styles.settingItemTitle}>Trocar de Agenda</Text>
                  <Text style={styles.settingItemSubtitle}>
                    Conectado como: {currentUser?.name || profile.name}
                  </Text>
                </View>
              </View>

              <View style={[styles.logoutPill, { backgroundColor: `${colors.error}15` }]}>
                <Text style={[styles.logoutPillText, { color: colors.error }]}>Desconectar</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.error} />
              </View>
            </TouchableOpacity>
          )}

          {/* Deletar esta Agenda */}
          {showDeleteConfirm ? (
            <View style={[styles.inlineBox, { borderColor: `${colors.error}90`, backgroundColor: `${colors.error}12`, marginTop: spacing.sm }]}>
              <View style={styles.inlineHeader}>
                <View style={[styles.settingIconBadge, { backgroundColor: `${colors.error}25` }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inlineTitle, { color: colors.error }]}>
                    Deletar agenda permanentemente?
                  </Text>
                  <Text style={[styles.inlineSubtitle, { color: colors.textSecondary }]}>
                    Todas as matérias, notas e horários de "{currentUser?.name || profile.name}" serão apagados definitivamente.
                  </Text>
                </View>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  style={[styles.inlineCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.inlineCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineConfirmBtn, { backgroundColor: colors.error, opacity: actionLoading ? 0.7 : 1 }]}
                  onPress={handleDeleteCurrentAgenda}
                  disabled={actionLoading}
                >
                  <Ionicons name="trash" size={16} color="#FFFFFF" />
                  <Text style={styles.inlineConfirmText}>
                    {actionLoading ? 'Apagando...' : 'Sim, Deletar Tudo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.settingItem, { marginTop: spacing.sm }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowLogoutConfirm(false);
                setShowDeleteConfirm(true);
              }}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[
                    styles.settingIconBadge,
                    { backgroundColor: `${colors.error}18` },
                  ]}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </View>
                <View>
                  <Text style={[styles.settingItemTitle, { color: colors.error }]}>Deletar Esta Agenda</Text>
                  <Text style={styles.settingItemSubtitle}>
                    Remove todos os dados permanentemente
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* App Info Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerBadge}>
            <Ionicons name="school" size={16} color={colors.primary} />
            <Text style={styles.footerBadgeText}>HollyWeek • Organização Universitária</Text>
          </View>
          <Text style={styles.footerVersion}>Versão 1.0.0 (Expo SDK 51 + TypeScript)</Text>
        </View>
      </ScrollView>

      {/* Modal: Editar Perfil */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
                value={nameInput}
                onChangeText={setNameInput}
              />

              <Text style={styles.inputLabel}>Curso / Graduação</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Ciência da Computação"
                placeholderTextColor={colors.textMuted}
                value={courseInput}
                onChangeText={setCourseInput}
              />

              <Text style={styles.inputLabel}>Semestre / Período</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 4º Semestre"
                placeholderTextColor={colors.textMuted}
                value={semesterInput}
                onChangeText={setSemesterInput}
              />

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleSaveProfile}
              >
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
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
    scrollContent: {
      paddingBottom: spacing.xxxl,
    },
    gradientHeader: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      ...getShadow(isDark),
    },
    headerTopActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    headerTitle: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: '#FFFFFF',
    },
    editProfileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      gap: 6,
    },
    editProfileButtonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
    },
    avatarContainer: {
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    avatarCircle: {
      width: 86,
      height: 86,
      borderRadius: 43,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: spacing.md,
    },
    avatarInitials: {
      fontSize: 32,
      fontWeight: typography.weights.bold,
      color: colors.primary,
    },
    userName: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: '#FFFFFF',
    },
    userCourse: {
      fontSize: typography.sizes.sm,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 4,
    },
    statsSection: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...getShadow(isDark),
    },
    statIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    statNumber: {
      fontSize: 26,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    statLabel: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    settingsSection: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...getShadow(isDark),
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    settingIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingItemTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      color: colors.text,
    },
    settingItemSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    themePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themePillText: {
      fontSize: 12,
      fontWeight: typography.weights.bold,
    },
    footerContainer: {
      alignItems: 'center',
      marginTop: spacing.xxxl,
      marginBottom: spacing.lg,
    },
    footerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      marginBottom: spacing.xs,
    },
    footerBadgeText: {
      fontSize: 12,
      fontWeight: typography.weights.semibold,
      color: colors.primary,
    },
    footerVersion: {
      fontSize: typography.sizes.xs,
      color: colors.textMuted,
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
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    headerLogoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.35)',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      gap: 4,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.6)',
    },
    headerLogoutButtonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
    },
    logoutPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    logoutPillText: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
    },
    inlineBox: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    inlineHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    inlineTitle: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
      marginBottom: 2,
    },
    inlineSubtitle: {
      fontSize: 11,
      lineHeight: 16,
    },
    inlineActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    inlineCancelBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      borderWidth: 1,
    },
    inlineCancelText: {
      fontSize: 12,
      fontWeight: typography.weights.semibold,
    },
    inlineConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
    },
    inlineConfirmText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: typography.weights.bold,
    },
  });
