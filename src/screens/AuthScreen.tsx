import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { AppUser } from '../types';
import { borderRadius, spacing, typography, getShadow } from '../theme';

// Paleta de cores para os avatares das agendas
const AVATAR_COLORS = [
  '#6C63FF', '#FF6B6B', '#10B981', '#F59E0B',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6',
];

export const AuthScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { usersList, switchUser, registerUser, deleteUser, renameUser, isLoading } = useAppData();

  // Estado do modal de criação de agenda
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado do modal de edição/exclusão
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handleCreateAgenda = async () => {
    if (!newAgendaName.trim()) {
      Alert.alert('Atenção', 'Digite um nome para sua agenda.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await registerUser(newAgendaName.trim());
      if (!res.success) {
        Alert.alert('Ops!', res.message || 'Não foi possível criar a agenda.');
      } else {
        setCreateModalVisible(false);
        setNewAgendaName('');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro ao criar agenda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAgenda = async (user: AppUser) => {
    try {
      await switchUser(user.id);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível abrir esta agenda.');
    }
  };

  const handleOpenManageModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditNameInput(user.name);
    setEditMode(false);
    setManageModalVisible(true);
  };

  const handleRename = async () => {
    if (!selectedUser) return;
    if (!editNameInput.trim()) {
      Alert.alert('Atenção', 'O nome não pode ser vazio.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await renameUser(selectedUser.id, editNameInput.trim());
      if (!res.success) {
        Alert.alert('Ops!', res.message || 'Não foi possível renomear.');
      } else {
        setManageModalVisible(false);
        setSelectedUser(null);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro ao renomear agenda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgenda = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Deletar Agenda',
      `Tem certeza que deseja deletar permanentemente a agenda "${selectedUser.name}"? Todos os dados serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await deleteUser(selectedUser.id);
              setManageModalVisible(false);
              setSelectedUser(null);
            } catch {
              Alert.alert('Erro', 'Não foi possível deletar a agenda.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const getAvatarColor = (userId: string) => {
    const index = userId.charCodeAt(userId.length - 1) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando agendas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Hero */}
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#312E81'] : ['#6C63FF', '#4F46E5']}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconBox}>
            <Ionicons name="calendar" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>HollyWeek</Text>
          <Text style={styles.heroSubtitle}>
            Organização Universitária • Notas &amp; Prazos
          </Text>
        </LinearGradient>

        <View style={styles.contentArea}>

          {/* Seção: Suas Agendas */}
          {usersList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SUAS AGENDAS</Text>

              {usersList.map((user) => {
                const avatarColor = getAvatarColor(user.id);
                const initial = user.name.charAt(0).toUpperCase();
                return (
                  <View key={user.id} style={[styles.agendaCard, { borderColor: colors.border }]}>
                    {/* Botão principal: abre a agenda */}
                    <TouchableOpacity
                      style={styles.agendaCardMain}
                      activeOpacity={0.7}
                      onPress={() => handleOpenAgenda(user)}
                    >
                      <View style={[styles.avatar, { backgroundColor: `${avatarColor}25` }]}>
                        <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
                      </View>
                      <View style={styles.agendaInfo}>
                        <Text style={[styles.agendaName, { color: colors.text }]}>{user.name}</Text>
                        <Text style={[styles.agendaCreated, { color: colors.textMuted }]}>
                          Criada em {user.createdAt || '—'}
                        </Text>
                      </View>
                      <View style={[styles.openBadge, { backgroundColor: `${colors.primary}15` }]}>
                        <Text style={[styles.openBadgeText, { color: colors.primary }]}>Abrir</Text>
                        <Ionicons name="chevron-forward" size={15} color={colors.primary} />
                      </View>
                    </TouchableOpacity>

                    {/* Botão de gerenciar (editar/excluir) */}
                    <TouchableOpacity
                      style={[styles.manageBtn, { borderLeftColor: colors.border }]}
                      onPress={() => handleOpenManageModal(user)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Seção: Criar Nova Agenda */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {usersList.length === 0 ? 'BEM-VINDO AO HOLLYWEEK' : 'NOVA AGENDA'}
            </Text>

            {usersList.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Crie sua primeira agenda para começar a organizar matérias, horários e prazos.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                setNewAgendaName('');
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Criar Nova Agenda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Modal: Criar Agenda ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Agenda</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Nome da Agenda
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ex: João, Maria, ..."
                placeholderTextColor={colors.textMuted}
                value={newAgendaName}
                onChangeText={setNewAgendaName}
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateAgenda}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
              activeOpacity={0.85}
              onPress={handleCreateAgenda}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.modalSubmitText}>Criar e Entrar</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              ✨ Uma agenda limpa será criada na nuvem para você.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Gerenciar Agenda (Editar / Deletar) ── */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editMode ? 'Renomear Agenda' : `Agenda: ${selectedUser?.name}`}
              </Text>
              <TouchableOpacity onPress={() => { setManageModalVisible(false); setEditMode(false); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editMode ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Novo nome</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={editNameInput}
                    onChangeText={setEditNameInput}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleRename}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                  onPress={handleRename}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.modalSubmitText}>Salvar Nome</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Botão: Abrir Agenda */}
                <TouchableOpacity
                  style={[styles.manageOption, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setManageModalVisible(false);
                    if (selectedUser) handleOpenAgenda(selectedUser);
                  }}
                >
                  <Ionicons name="book-outline" size={20} color={colors.primary} />
                  <Text style={[styles.manageOptionText, { color: colors.text }]}>Abrir Agenda</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Botão: Renomear */}
                <TouchableOpacity
                  style={[styles.manageOption, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => setEditMode(true)}
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                  <Text style={[styles.manageOptionText, { color: colors.text }]}>Renomear Agenda</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Botão: Deletar */}
                <TouchableOpacity
                  style={[styles.manageOption, styles.deleteOption, { borderColor: `${colors.error}40` }]}
                  activeOpacity={0.7}
                  onPress={handleDeleteAgenda}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.manageOptionText, { color: colors.error }]}>Deletar Agenda</Text>
                </TouchableOpacity>

                <Text style={[styles.modalHint, { color: colors.textMuted, marginTop: spacing.sm }]}>
                  ⚠️ Deletar remove permanentemente todos os dados desta agenda.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: typography.sizes.sm,
    },
    scrollContent: {
      paddingBottom: spacing.xxxl,
    },
    heroBanner: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxxl + spacing.lg,
      paddingBottom: spacing.xxxl,
      alignItems: 'center',
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    heroIconBox: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    heroSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      marginTop: 4,
      maxWidth: 260,
    },
    contentArea: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 1,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    emptyHint: {
      fontSize: typography.sizes.sm,
      lineHeight: 20,
      marginBottom: spacing.lg,
    },

    // Card de agenda
    agendaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
      overflow: 'hidden',
      ...getShadow(isDark),
    },
    agendaCardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    agendaInfo: {
      flex: 1,
    },
    agendaName: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    agendaCreated: {
      fontSize: 11,
      marginTop: 2,
    },
    openBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      gap: 3,
    },
    openBadgeText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    manageBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      borderLeftWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Botão criar
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 54,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
      ...getShadow(isDark),
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.md,
      fontWeight: 'bold',
    },

    // Modais
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: 'bold',
    },
    modalLabel: {
      fontSize: typography.sizes.xs,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      height: 50,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    input: {
      flex: 1,
      fontSize: typography.sizes.md,
    },
    modalSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      borderRadius: borderRadius.md,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    modalSubmitText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.md,
      fontWeight: 'bold',
    },
    modalHint: {
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 16,
    },
    secondaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    secondaryBtnText: {
      fontSize: typography.sizes.sm,
      fontWeight: 'bold',
    },

    // Opções do modal de gerenciar
    manageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
      backgroundColor: `${colors.primary}08`,
    },
    deleteOption: {
      backgroundColor: `${colors.error}08`,
    },
    manageOptionText: {
      flex: 1,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
    },
  });
