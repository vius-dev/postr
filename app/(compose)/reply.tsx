
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MediaGrid from '@/components/MediaGrid';

const MAX_CHARACTERS = 280;

const ReplyComposerScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { authorUsername } = useLocalSearchParams();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const characterCount = text.length;
  const isReplyButtonDisabled = characterCount === 0 || characterCount > MAX_CHARACTERS;

  const handleCancel = () => {
    if (text.length > 0 || media.length > 0) {
      Alert.alert(
        'Discard reply?',
        'Your reply will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ],
        { cancelable: true }
      );
    } else {
      router.back();
    }
  };

  const handleReply = () => {
    router.back();
  };

  const handlePickImage = async () => {
    if (media.length >= 4) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia([...media, ...result.assets]);
    }
  };

  const removeMedia = (uri: string) => {
    setMedia(media.filter((item) => item.uri !== uri));
  };

  const MediaPreview = () => {
    if (media.length === 0) return null;
    return (
      <MediaGrid
        media={media.map((m) => ({ type: 'image', url: m.uri }))}
        onRemove={removeMedia}
      />
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleCancel}>
          <Text style={[styles.headerButton, { color: theme.link }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleReply} disabled={isReplyButtonDisabled}>
          <Text style={[styles.replyButton, { color: isReplyButtonDisabled ? theme.textTertiary : theme.link }]}>Reply</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 + 46 : 0} // Adjust as needed
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.contextRow}>
            <Text style={{ color: theme.textTertiary }}>
              Replying to <Text style={{ color: theme.link }}>@{authorUsername}</Text>
            </Text>
          </View>
          <MediaPreview />
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary }]}
            multiline
            autoFocus
            placeholder="Post your reply"
            placeholderTextColor={theme.textTertiary}
            value={text}
            onChangeText={setText}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton} disabled={media.length >= 4}>
              <Ionicons name="image-outline" size={24} color={media.length >= 4 ? theme.textTertiary : theme.link} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={[styles.gifText, { color: theme.link }]}>GIF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="happy-outline" size={24} color={theme.link} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.charCount, { color: characterCount > MAX_CHARACTERS ? theme.error : theme.textTertiary }]}>
            {characterCount > 0 ? `${characterCount}/${MAX_CHARACTERS}` : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 44,
    borderBottomWidth: 1,
  },
  headerButton: {
    fontSize: 16,
  },
  replyButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scrollContentContainer: {
    paddingTop: 10,
  },
  contextRow: {
    marginBottom: 10,
  },
  textInput: {
    fontSize: 18,
    minHeight: 100,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 5,
    marginRight: 15,
  },
  gifText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  charCount: {
    fontSize: 14,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


export default ReplyComposerScreen;
