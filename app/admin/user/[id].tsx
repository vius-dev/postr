
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { User } from '../../../types/user';
import { Post, Comment } from '../../../types/post';
import { Report } from '../../../types/reports';
import { getUserById, getPostsByAuthorId, getCommentsByAuthorId, getReportsByReporterId } from '../api';

const UserDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id === 'string') {
      const loadUserData = async () => {
        try {
          setLoading(true);
          const [userData, postsData, commentsData, reportsData] = await Promise.all([
            getUserById(id),
            getPostsByAuthorId(id),
            getCommentsByAuthorId(id),
            getReportsByReporterId(id),
          ]);
          setUser(userData);
          setPosts(postsData);
          setComments(commentsData);
          setReports(reportsData);
        } catch (error) {
          Alert.alert('Error', 'Failed to load user data.');
        } finally {
          setLoading(false);
        }
      };
      loadUserData();
    }
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!user) {
    return <Text style={styles.centered}>User not found.</Text>;
  }

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={() => (
        <View style={styles.headerContainer}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userHandle}>@{user.username}</Text>
          {/* Add more user details here if needed */}
        </View>
      )}
      data={[
        { title: 'Posts', data: posts },
        { title: 'Comments', data: comments },
        { title: 'Reports', data: reports },
      ]}
      renderItem={({ item }) => (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <FlatList
            data={item.data as (Post | Comment | Report)[]}
            renderItem={({ item: contentItem }) => (
              <View style={styles.itemContainer}>
                <Text>{JSON.stringify(contentItem)}</Text>
              </View>
            )}
            keyExtractor={(contentItem) => (contentItem as any).id}
            ListEmptyComponent={<Text style={styles.emptyText}>No {item.title.toLowerCase()} found.</Text>}
          />
        </View>
      )}
      keyExtractor={(item, index) => `section-${index}`}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 18,
    color: '#666',
  },
  sectionContainer: {
    marginTop: 10,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#eee',
  },
  itemContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyText: {
    padding: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#777',
  },
});

export default UserDetailScreen;
