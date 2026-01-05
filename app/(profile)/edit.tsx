
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

const StyledInput = ({
  label,
  value,
  onChangeText,
  maxLength,
  multiline,
  autoCapitalize,
  keyboardType,
  editable,
  theme
}: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: theme.background,
          borderColor: isFocused ? theme.primary : theme.borderLight,
        }
      ]}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: isFocused ? theme.primary : theme.textSecondary }]}>
            {label}
          </Text>
          {maxLength && (
            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
              {value.length} / {maxLength}
            </Text>
          )}
        </View>
        <TextInput
          style={[
            styles.input,
            { color: theme.textPrimary },
            multiline && styles.multilineInput
          ]}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={theme.primary}
        />
      </View>
    </View>
  );
};

const EditProfileScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [header, setHeader] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If auth is still loading, keep spinning
    if (authLoading) return;

    const fetchProfile = async () => {
      // If no user after auth is finished, we can't edit
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const profile = await api.getProfile(user.id);
        setName(profile.name || '');
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setWebsite(profile.website || '');
        setAvatar(profile.avatar || null);
        setHeader(profile.headerImage || null);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user, authLoading]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = avatar;
      let headerUrl = header;

      // Upload Avatar if changed (local file)
      if (avatar && avatar.startsWith('file://')) {
        const { uploadFile } = await import('@/api/files');
        avatarUrl = await uploadFile(avatar, 'avatars');
      }

      // Upload Header if changed (local file)
      if (header && header.startsWith('file://')) {
        const { uploadFile } = await import('@/api/files');
        headerUrl = await uploadFile(header, 'headers');
      }

      await api.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar: avatarUrl || undefined,
        headerImage: headerUrl || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to update profile', error);
      Alert.alert('Error', 'Failed to update profile. ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const pickImage = async (type: 'avatar' | 'header', setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.5, // Ensure <1MB
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={isSaving}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit profile</Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[
              styles.saveButton,
              { backgroundColor: theme.textPrimary, opacity: isSaving ? 0.6 : 1 }
            ]}
          >
            <Text style={[styles.saveButtonText, { color: theme.background }]}>
              {isSaving ? 'Saving' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} bounces={false} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => pickImage('header', setHeader)}
                disabled={isSaving}
              >
                <Image
                  source={{ uri: header || undefined }}
                  style={[styles.headerImage, { backgroundColor: theme.borderLight }]}
                />
                <View style={styles.imageOverlay}>
                  <View style={styles.cameraIconBg}>
                    <Ionicons name="camera-outline" size={26} color="white" />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => pickImage('avatar', setAvatar)}
                  disabled={isSaving}
                  style={[styles.avatarWrapper, { borderColor: theme.background }]}
                >
                  <Image
                    source={{ uri: avatar || undefined }}
                    style={[styles.avatar, { backgroundColor: theme.borderLight }]}
                  />
                  <View style={styles.imageOverlay_avatar}>
                    <View style={styles.cameraIconBg_avatar}>
                      <Ionicons name="camera-outline" size={22} color="white" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <StyledInput
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!isSaving}
                  theme={theme}
                />
                <StyledInput
                  label="Bio"
                  value={bio}
                  onChangeText={setBio}
                  maxLength={160}
                  multiline
                  editable={!isSaving}
                  theme={theme}
                />
                <StyledInput
                  label="Location"
                  value={location}
                  onChangeText={setLocation}
                  maxLength={30}
                  editable={!isSaving}
                  theme={theme}
                />
                <StyledInput
                  label="Website"
                  value={website}
                  onChangeText={setWebsite}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!isSaving}
                  theme={theme}
                />
              </View>
            </>
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    height: 53,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginLeft: 18,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 140,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cameraIconBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarContainer: {
    marginTop: -45,
    paddingLeft: 16,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  imageOverlay_avatar: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cameraIconBg_avatar: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formContainer: {
    padding: 16,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 58,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    fontSize: 17,
    paddingVertical: 4,
    fontFamily: 'System',
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});

export default EditProfileScreen;
