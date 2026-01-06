
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/Button';
import { useTheme } from '@/theme/theme';

export type ViewerRelationship =
  | { type: 'SELF'; targetUserId: string }
  | { type: 'NOT_FOLLOWING'; targetUserId: string }
  | { type: 'FOLLOWING'; targetUserId: string }
  | { type: 'MUTED'; targetUserId: string }
  | { type: 'BLOCKED'; targetUserId: string };

interface ProfileActionRowProps {
  relationship: ViewerRelationship;
  onFollow: () => void;
  onUnfollow: () => void;
  onEditProfile: () => void;
  onMoreOptions?: () => void;
  isLoading: boolean;
  style?: any;
}

export default function ProfileActionRow({
  relationship,
  onFollow,
  onUnfollow,
  onEditProfile,
  onMoreOptions,
  isLoading,
  style
}: ProfileActionRowProps) {
  const { theme } = useTheme();

  const renderButton = () => {
    const mainButton = (() => {
      switch (relationship.type) {
        case 'SELF':
          return (
            <View style={styles.row}>
              <Button text="Edit profile" onPress={onEditProfile} />
            </View>
          );
        case 'NOT_FOLLOWING':
          return <Button text="Follow" onPress={onFollow} loading={isLoading} />;
        case 'FOLLOWING':
          return <Button text="Following" onPress={onUnfollow} variant="secondary" loading={isLoading} />;
        case 'MUTED':
          return (
            <View style={styles.row}>
              <Button text="Following" onPress={onUnfollow} variant="secondary" loading={isLoading} />
              <View style={[styles.statusIcon, { borderColor: theme.borderLight }]}>
                <Ionicons name="volume-mute-outline" size={20} color={theme.textTertiary} />
              </View>
            </View>
          );
        case 'BLOCKED':
          return <Button text="Blocked" onPress={() => { }} variant="danger" />;
        default:
          return null;
      }
    })();

    if (relationship.type === 'SELF') return mainButton;

    return (
      <View style={styles.row}>
        {mainButton}
        {onMoreOptions && (
          <TouchableOpacity
            onPress={onMoreOptions}
            style={[styles.iconButton, { borderColor: theme.borderLight, marginLeft: 8 }]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderButton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  }
});
