import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { RecurringForm, type RecurringFormValues } from '@/components/RecurringForm';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useRecurringStore } from '@/store/useRecurringStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { theme } from '@/theme';
import type { Expense } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { recurringStatus } from '@/utils/recurring';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function RecurringScreen() {
  const account = useSettingsStore((state) => state.account);
  const categories = useCategoryStore((state) => state.categories);
  const expenses = useExpenseStore((state) => state.expenses);
  const templates = useRecurringStore((state) => state.templates);
  const loadTemplates = useRecurringStore((state) => state.load);
  const createTemplate = useRecurringStore((state) => state.create);
  const updateTemplate = useRecurringStore((state) => state.update);
  const removeTemplate = useRecurringStore((state) => state.remove);
  const colorScheme = useColorScheme();

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      loadTemplates(account.id);
    }
  }, [account, loadTemplates]);

  async function handleCreate(values: RecurringFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await createTemplate({ userId: account.id, ...values });
  }

  async function handleEdit(values: RecurringFormValues) {
    if (!editingId) {
      return;
    }
    await updateTemplate(editingId, {
      amount: values.amount,
      categoryId: values.categoryId,
      description: values.description,
      frequency: values.frequency,
    });
    setEditingId(null);
  }

  function togglePause(template: Expense) {
    updateTemplate(template.id, { isActive: !template.isRecurring }).catch((err) => {
      Alert.alert('Failed to update', err instanceof Error ? err.message : 'Unknown error');
    });
  }

  function confirmDelete(template: Expense) {
    Alert.alert(
      'Delete recurring expense?',
      'This stops future occurrences. Expenses already created from it are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeTemplate(template.id).catch((err) => {
              Alert.alert('Failed to delete', err instanceof Error ? err.message : 'Unknown error');
            });
            if (editingId === template.id) {
              setEditingId(null);
            }
          },
        },
      ]
    );
  }

  const editingTemplate = templates.find((t) => t.id === editingId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Recurring Expenses' }} />

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Active &amp; Paused</Text>
        {templates.length === 0 && <Text style={styles.emptyText}>No recurring expenses yet.</Text>}
        {templates.map((template) => {
          const category = categories.find((c) => c.id === template.categoryId);
          const status = recurringStatus(template, expenses);
          return (
            <View key={template.id} style={styles.row}>
              <View
                style={[styles.iconCircle, { backgroundColor: category?.color ?? theme.categoryFallback }]}
              >
                <Ionicons
                  name={(category?.icon as IoniconName) ?? 'help-circle'}
                  size={16}
                  color="#fff"
                />
              </View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>
                  {category?.name ?? 'Uncategorized'} ·{' '}
                  {formatCurrency(template.amount, account?.currency ?? 'PHP')}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {template.recurringFrequency} · {template.isRecurring ? 'Active' : 'Paused'}
                </Text>
                <Text style={styles.rowCaption}>
                  Last:{' '}
                  {status.lastMaterializedDate ? formatDate(status.lastMaterializedDate) : '—'} ·
                  Next due: {formatDate(status.nextDueDate)}
                </Text>
              </View>
              <Pressable onPress={() => togglePause(template)} hitSlop={8}>
                <Ionicons
                  name={template.isRecurring ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={22}
                  color={Colors[colorScheme].text}
                />
              </Pressable>
              <Pressable onPress={() => setEditingId(template.id)} hitSlop={8}>
                <Ionicons name="create-outline" size={20} color={Colors[colorScheme].text} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(template)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={Colors[colorScheme].error} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>
          {editingTemplate ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
        </Text>
        <RecurringForm
          key={editingTemplate?.id ?? 'new'}
          initialTemplate={editingTemplate}
          submitLabel={editingTemplate ? 'Save Changes' : 'Add Recurring Expense'}
          onSubmit={editingTemplate ? handleEdit : handleCreate}
        />
        {editingTemplate && (
          <Pressable onPress={() => setEditingId(null)} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'capitalize',
  },
  rowCaption: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    opacity: 0.7,
  },
});
