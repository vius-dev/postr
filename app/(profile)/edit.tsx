
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

const EditProfileScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [header, setHeader] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
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
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar: avatar || undefined,
        headerImage: header || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to update profile', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickImage = async (type: 'avatar' | 'header', setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [3, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} disabled={isSaving}>
          <Text style={[styles.headerButton, { color: theme.link, opacity: isSaving ? 0.5 : 1 }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.headerButton, { color: theme.link, fontWeight: 'bold', opacity: isSaving ? 0.5 : 1 }]}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => pickImage('header', setHeader)} disabled={isSaving}>
              <Image source={{ uri: header || undefined }} style={[styles.headerImage, { backgroundColor: theme.border }]} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={32} color="white" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={() => pickImage('avatar', setAvatar)} disabled={isSaving}>
                <Image source={{ uri: avatar || undefined }} style={[styles.avatar, { backgroundColor: theme.border, borderColor: theme.background }]} />
                <View style={styles.imageOverlay_avatar}>
                  <Ionicons name="camera" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                placeholder="Name"
                placeholderTextColor={theme.textTertiary}
                value={name}
                onChangeText={setName}
                editable={!isSaving}
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                placeholder="Bio"
                placeholderTextColor={theme.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
                editable={!isSaving}
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                placeholder="Location"
                placeholderTextColor={theme.textTertiary}
                value={location}
                onChangeText={setLocation}
                editable={!isSaving}
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                placeholder="Website"
                placeholderTextColor={theme.textTertiary}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                editable={!isSaving}
              />
            </View>
          </>
        )}
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 150,
  },
  avatarContainer: {
    marginTop: -75,
    paddingLeft: 15,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  imageOverlay_avatar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 75,
  },
  formContainer: {
    padding: 15,
  },
  input: {
    fontSize: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});

export default EditProfileScreen;
