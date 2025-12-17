
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from '@/components/Button';

export type ViewerRelationship =
  | { type: 'SELF' }
  | { type: 'NOT_FOLLOWING' }
  | { type: 'FOLLOWING' }
  | { type: 'BLOCKED' };

interface ProfileActionRowProps {
  relationship: ViewerRelationship;
  onFollow: () => void;
  onUnfollow: () => void;
  onEditProfile: () => void;
  isLoading: boolean;
  style?: any;
}

export default function ProfileActionRow({
  relationship,
  onFollow,
  onUnfollow,
  onEditProfile,
  isLoading,
  style
}: ProfileActionRowProps) {
  const renderButton = () => {
    switch (relationship.type) {
      case 'SELF':
        return <Button text="Edit profile" onPress={onEditProfile} />;
      case 'NOT_FOLLOWING':
        return <Button text="Follow" onPress={onFollow} loading={isLoading} />;
      case 'FOLLOWING':
        return <Button text="Following" onPress={onUnfollow} variant="secondary" loading={isLoading} />;
      case 'BLOCKED':
        return <Button text="Blocked" onPress={() => { }} variant="danger" />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderButton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Default padding removed to fit into header better, or kept small
    flexDirection: 'row',
    alignItems: 'center',
  },
});
