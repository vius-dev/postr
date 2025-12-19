
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from '@/components/MediaGrid';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import QuotedPost from '@/components/QuotedPost';
import { Post } from '@/types/post';
import { useEffect } from 'react';

const MAX_CHARACTERS = 280;

const ComposeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { quotePostId, replyToId, authorUsername } = useLocalSearchParams<{ quotePostId: string, replyToId: string, authorUsername: string }>();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (quotePostId) {
      const fetchQuotedPost = async () => {
        try {
          const post = await api.fetchPost(quotePostId);
          if (post) {
            setQuotedPost(post);
          }
        } catch (error) {
          console.error('Failed to fetch quoted post', error);
        }
      };
      fetchQuotedPost();
    }
  }, [quotePostId]);

  const characterCount = text.length;
  const isPostButtonDisabled = (characterCount === 0 && media.length === 0) || characterCount > MAX_CHARACTERS;

  const handleCancel = () => {
    if (text.length > 0 || media.length > 0) {
      Alert.alert(
        'Discard post?',
        'Your post will be lost.',
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

  const handlePost = async () => {
    try {
      if (replyToId) {
        await api.createComment(replyToId, {
          content: text,
          media: media.map(m => ({ type: 'image', url: m.uri }))
        });
      } else {
        await api.createPost({
          content: text,
          quotedPostId: quotePostId || undefined,
          media: media.map(m => ({ type: 'image', url: m.uri }))
        });
      }
      router.back();
    } catch (error) {
      console.error('Failed to create post', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handlePickImage = async () => {
    if (media.length >= 4) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
      quality: 0.7, // Compress images to reduce storage cost
    });

    if (!result.canceled) {
      setMedia([...media, ...result.assets]);
    }
  };

  const handleRemoveMedia = (url: string) => {
    setMedia(media.filter((item) => item.uri !== url));
  };

  const MediaPreview = () => {
    if (media.length === 0) return null;
    return (
      <MediaGrid
        media={media.map(m => ({ type: 'image', url: m.uri }))}
        onRemove={handleRemoveMedia}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleCancel}>
          <Text style={[styles.headerButton, { color: theme.link }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handlePost} disabled={isPostButtonDisabled}>
          <Text style={[styles.postButton, { color: isPostButtonDisabled ? theme.textTertiary : theme.link }]}>
            {replyToId ? 'Reply' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
          {authorUsername && (
            <Text style={[styles.replyingTo, { color: theme.textTertiary }]}>
              Replying to <Text style={{ color: theme.link }}>@{authorUsername}</Text>
            </Text>
          )}
          <MediaPreview />
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary }]}
            multiline
            autoFocus
            placeholder={replyToId ? "Post your reply" : "What's happening?"}
            placeholderTextColor={theme.textTertiary}
            value={text}
            onChangeText={setText}
          />
          {quotedPost && <QuotedPost post={quotedPost} />}
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
  postButton: {
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
  textInput: {
    fontSize: 18,
    minHeight: 100,
  },
  replyingTo: {
    fontSize: 15,
    marginBottom: 10,
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
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
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

export default ComposeScreen;
