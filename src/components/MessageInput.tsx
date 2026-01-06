
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PresenceChannel } from '@/realtime/PresenceChannel';
import MediaGrid from '@/components/MediaGrid';
import { useTheme } from '@/theme/theme';
import { Conversation } from '@/types/message';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

interface MessageInputProps {
  conversation: Conversation | null;
  onSend: (message: string, media?: any[]) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ conversation, onSend }) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const handleSend = () => {
    if (message.trim().length > 0 || media.length > 0) {
      onSend(message.trim(), media);
      setMessage('');
      setMedia([]);
      if (conversation && currentUserId) {
        PresenceChannel.sendTypingStatus(conversation.id, currentUserId, false);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setMedia(result.assets.map(a => ({ uri: a.uri, type: 'image' })));
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (conversation && currentUserId) {
      PresenceChannel.sendTypingStatus(conversation.id, currentUserId, text.length > 0);
    }
  };

  if (!conversation) {
    return null;
  }

  const canSendMessage = conversation.type !== 'CHANNEL' || conversation.adminIds?.includes(currentUserId || '') || conversation.ownerId === currentUserId;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {canSendMessage ? (
        <View style={[styles.composerOuterContainer, { borderTopColor: theme.surface, backgroundColor: theme.background }]}>
          {media.length > 0 && (
            <View style={styles.mediaPreview}>
              <MediaGrid media={media} onRemove={() => setMedia([])} />
            </View>
          )}
          <View style={styles.composerContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton}>
              <Ionicons name="image-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textTertiary}
              value={message}
              onChangeText={handleTextChange}
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.readOnlyContainer, { borderTopColor: theme.surface, backgroundColor: theme.background }]}>
          <Text style={[styles.readOnlyText, { color: theme.textTertiary }]}>
            Only admins can post in this channel
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  composerContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  composerOuterContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mediaPreview: {
    padding: 10,
    maxHeight: 150,
  },
  readOnlyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readOnlyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default MessageInput;
