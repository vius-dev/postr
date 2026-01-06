import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon} size={48} color={theme.primary} />
        </View>
      )}

      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {title}
      </Text>

      {description && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button
            text={actionLabel}
            onPress={onAction}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 200,
  }
});
