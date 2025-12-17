import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';

interface ButtonProps {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export default function Button({ text, onPress, variant = 'primary', loading = false }: ButtonProps) {
  const { theme } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.borderLight, // Or theme.primary if it's an outline button
          },
          text: {
            color: theme.textPrimary,
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: theme.error,
          },
          text: {
            color: theme.textInverse,
          },
        };
      default: // primary
        return {
          container: {
            backgroundColor: theme.primary,
          },
          text: {
            color: theme.textInverse,
          },
        };
    }
  };

  const { container: variantContainer, text: variantText } = getVariantStyle();

  return (
    <TouchableOpacity
      style={[styles.container, variantContainer]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variantText.color} />
      ) : (
        <Text style={[styles.text, variantText]}>{text}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
