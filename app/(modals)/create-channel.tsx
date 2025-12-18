
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreateChannelScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateChannel = async () => {
    if (channelName.trim() === '') {
      Alert.alert('Error', 'Channel name is required.');
      return;
    }
    // Placeholder for API call
    // const newChannel = await api.createChannelConversation(channelName, description);
    // router.replace(`/conversation/${newChannel.id}`);
    console.log("Creating channel with name:", channelName, "and description:", description)
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>New Channel</Text>
        <TouchableOpacity onPress={handleCreateChannel} style={[styles.createButton, {backgroundColor: theme.primary}]}>
            <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary }]}
          placeholder="Channel Name"
          placeholderTextColor={theme.textTertiary}
          value={channelName}
          onChangeText={setChannelName}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.descriptionInput, { backgroundColor: theme.surface, color: theme.textPrimary }]}
          placeholder="Description (optional)"
          placeholderTextColor={theme.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    createButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    inputContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    input: {
        height: 40,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    descriptionInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingVertical: 10
    }
});
