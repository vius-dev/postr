
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, TextInput } from 'react-native';
import { Report } from '../../types/reports';
import { fetchAllReports, dismissReport, deletePost } from './api';
import { Post } from '../../types/post';
import { getPostById } from './api';

const ReportedPost = ({ postId }: { postId: string }) => {
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    getPostById(postId).then(setPost);
  }, [postId]);

  if (!post) return <Text style={styles.postContent}>Loading post...</Text>;

  return (
    <View style={styles.postContainer}>
        <Text style={styles.postContent}>Reported Post: "{post.content}"</Text>
    </View>
  )
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadReports = async () => {
    try {
      const fetchedReports = await fetchAllReports();
      setReports(fetchedReports);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch reports.');
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDismiss = async (reportId: string) => {
    try {
      await dismissReport(reportId);
      loadReports(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Could not dismiss the report.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      loadReports(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Could not delete the post.');
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    return reports.filter(report => 
        report.reporterId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.reason && report.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [reports, searchTerm]);

  const renderItem = ({ item }: { item: Report }) => (
    <View style={styles.reportContainer}>
      <Text style={styles.reportText}>Report ID: {item.id}</Text>
      <Text style={styles.reportText}>Entity Type: {item.entityType}</Text>
      <Text style={styles.reportText}>Entity ID: {item.entityId}</Text>
      <Text style={styles.reportText}>Report Type: {item.reportType}</Text>
      <Text style={styles.reportText}>Reporter ID: {item.reporterId}</Text>
      {item.reason && <Text style={styles.reportText}>Reason: {item.reason}</Text>}

      {/* Show post content for context */}
      {item.entityType === 'POST' && <ReportedPost postId={item.entityId} />}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.button} onPress={() => handleDismiss(item.id)}>
          <Text style={styles.buttonText}>Dismiss</Text>
        </TouchableOpacity>
        {item.entityType === 'POST' && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDeletePost(item.entityId)}
          >
            <Text style={styles.buttonText}>Delete Post</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
        <TextInput 
            style={styles.searchBar}
            placeholder="Search by reporter ID or reason..."
            value={searchTerm}
            onChangeText={setSearchTerm}
        />
      <FlatList
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 10,
  },
  searchBar: {
      backgroundColor: 'white',
      padding: 15,
      margin: 10,
      borderRadius: 10,
      fontSize: 16,
  },
  reportContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reportText: {
    fontSize: 16,
    marginBottom: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  postContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5
  },
  postContent: {
    fontSize: 14,
    color: '#333'
  }
});
