
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
import { showError } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from '@/components/MediaGrid';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import QuotedPost from '@/components/QuotedPost';
import { Post } from '@/types/post';
import { useEffect } from 'react';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { DraftsService, Draft } from '@/lib/drafts';
import { useAuth } from '@/providers/AuthProvider';
import DraftsListModal from '@/components/composer/DraftsListModal';

const MAX_CHARACTERS = 280;

const ComposeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { quotePostId, replyToId, authorUsername, postId, mode } = useLocalSearchParams<{
    quotePostId: string,
    replyToId: string,
    authorUsername: string,
    postId?: string,
    mode?: string
  }>();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ uri: string, type: 'image' | 'video' }[]>([]);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const { user } = useAuth();

  // Load post for editing
  useEffect(() => {
    if (isEditing && postId) {
      const loadPostForEdit = async () => {
        try {
          const post = await api.getPost(postId);
          if (post) {
            setOriginalPost(post);
            setText(post.content);
            // Note: Editing media is not supported in this MVP iteration
            // We focus on text edits as per typical platform rules
          }
        } catch (error) {
          showError('We couldn\'t load that post. It may have been deleted.');
          router.back();
        }
      };
      loadPostForEdit();
    }
  }, [isEditing, postId]);

  useEffect(() => {
    if (quotePostId) {
      const fetchQuotedPost = async () => {
        try {
          const post = await api.getPost(quotePostId);
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

  useEffect(() => {
    if (user?.id) {
      DraftsService.getDrafts(user.id).then(d => setDraftCount(d.length));
    }
  }, [user?.id, showDrafts]);

  const characterCount = text.length;
  // Allow empty media if it's an edit
  const isPostButtonDisabled = isSubmitting || (characterCount === 0 && media.length === 0) || characterCount > MAX_CHARACTERS;

  const handleCancel = () => {
    if (text.length > 0 || media.length > 0) {
      Alert.alert(
        isEditing ? 'Discard changes?' : 'Discard post?',
        'You can save this as a draft and come back to it later.',
        [
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          {
            text: 'Save Draft',
            onPress: async () => {
              if (user?.id) {
                await DraftsService.saveDraft(user.id, {
                  content: text,
                  media: media.map(m => ({ uri: m.uri, type: 'image' })),
                  quotedPostId: quotePostId || undefined,
                  type: replyToId ? 'reply' : (quotePostId ? 'quote' : 'original'),
                  parentId: replyToId || undefined
                });
                router.back();
              }
            }
          },
          { text: 'Keep editing', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } else {
      router.back();
    }
  };

  const handleSelectDraft = (draft: Draft) => {
    setText(draft.content);
    setMedia(draft.media.map(m => ({ uri: m.url || m.uri, type: 'image' })));
    setShowDrafts(false);
  };

  const handlePost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEditing && postId) {
        // EDIT EXISTING POST
        await api.updatePost(postId, text);
      } else if (replyToId) {
        // REPLY (OFFLINE FIRST)
        const mediaItems = media.map(m => ({ type: 'image' as const, url: m.uri }));
        await SyncEngine.enqueuePost(text, mediaItems, undefined, replyToId);
      } else {
        // CREATE NEW POST (OFFLINE FIRST)
        const mediaItems = media.map(m => ({ type: 'image' as const, url: m.uri }));
        await SyncEngine.enqueuePost(text, mediaItems, quotePostId || undefined);
      }
      router.back();
    } catch (error: any) {
      console.error('Failed to create/update post', error);
      Alert.alert('Error', error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickImage = async () => {
    if (media.length >= 4) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
      quality: 0.5, // Aggressive compression to ensure <1MB
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(a => ({
        uri: a.uri,
        type: a.type === 'video' ? 'video' as const : 'image' as const
      }));
      setMedia([...media, ...newMedia]);
    }
  };

  const handleRemoveMedia = (url: string) => {
    setMedia(media.filter((item) => item.uri !== url));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleCancel}>
          <Text style={[styles.headerButton, { color: theme.link }]}>Cancel</Text>
        </Pressable>
        {draftCount > 0 && !isEditing && (
          <TouchableOpacity onPress={() => setShowDrafts(true)}>
            <Text style={[styles.draftsButton, { color: theme.primary, fontWeight: 'bold' }]}>Drafts ({draftCount})</Text>
          </TouchableOpacity>
        )}
        <Pressable onPress={handlePost} disabled={isPostButtonDisabled}>
          <Text style={[styles.postButton, { color: isPostButtonDisabled ? theme.textTertiary : theme.link }]}>
            {isSubmitting ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save' : (replyToId ? 'Reply' : 'Post'))}
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

          {media.length > 0 && (
            <MediaGrid
              media={media.map(m => ({ type: 'image', url: m.uri }))}
              onRemove={handleRemoveMedia}
            />
          )}

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
            <TouchableOpacity onPress={() => router.push('/(modals)/poll')} style={styles.iconButton}>
              <Ionicons name="stats-chart-outline" size={24} color={theme.link} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.charCount, { color: characterCount > MAX_CHARACTERS ? theme.error : theme.textTertiary }]}>
            {characterCount > 0 ? `${characterCount}/${MAX_CHARACTERS}` : ''}
          </Text>
        </View>

        <DraftsListModal
          visible={showDrafts}
          onClose={() => setShowDrafts(false)}
          onSelect={handleSelectDraft}
          userId={user?.id || ''}
        />
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
  draftsButton: {
    fontSize: 15,
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
