
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { fetchAnalytics } from './api';

const AnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<{ userCount: number, postCount: number, reportCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await fetchAnalytics();
        setAnalytics(data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!analytics) {
    return <Text style={styles.centered}>No analytics data available.</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Users</Text>
        <Text style={styles.cardValue}>{analytics.userCount}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Posts</Text>
        <Text style={styles.cardValue}>{analytics.postCount}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Reports</Text>
        <Text style={styles.cardValue}>{analytics.reportCount}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007bff',
    marginTop: 10,
  },
});

export default AnalyticsScreen;
