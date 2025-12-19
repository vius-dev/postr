import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { fetchAnalytics, fetchAuditLogs, AuditLog } from './api';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';

const MetricCard = ({ title, value, icon, trend, color, theme }: { title: string, value: number, icon: any, trend?: string, color: string, theme: any }) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: trend ? theme.success + '40' : theme.borderLight }]}>
    <View style={styles.cardTop}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: theme.success + '15' }]}>
          <Ionicons name="trending-up" size={12} color={theme.success} />
          <Text style={[styles.trendText, { color: theme.success }]}>{trend}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.cardValue, { color: theme.textPrimary }]}>{value.toLocaleString()}</Text>
    <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
  </View>
);

const ActivityItem = ({ log, theme }: { log: AuditLog, theme: any }) => (
  <View style={[styles.activityItem, { borderLeftColor: theme.primary }]}>
    <View style={styles.activityHeader}>
      <Text style={[styles.actionTag, { color: theme.primary, backgroundColor: theme.primary + '10' }]}>{log.action}</Text>
      <Text style={[styles.activityDate, { color: theme.textTertiary }]}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
    <Text style={[styles.activityText, { color: theme.textPrimary }]}>
      {log.entityType} <Text style={{ fontWeight: '600' }}>#{log.entityId}</Text> was modified.
    </Text>
    {log.details && <Text style={[styles.activityDetails, { color: theme.textSecondary }]}>{log.details}</Text>}
  </View>
);

const AnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<{ userCount: number, postCount: number, reportCount: number } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [stats, logs] = await Promise.all([
          fetchAnalytics(),
          fetchAuditLogs()
        ]);
        setAnalytics(stats);
        setAuditLogs(logs);
      } catch (error) {
        Alert.alert('Error', 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>No analytics data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Live Dashboard</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Real-time platform overview</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.column}>
          <MetricCard title="Total Users" value={analytics.userCount} icon="people" trend="+12%" color="#4C6EF5" theme={theme} />
          <MetricCard title="Active Reports" value={analytics.reportCount} icon="flag" color="#FA5252" theme={theme} />
        </View>
        <View style={styles.column}>
          <MetricCard title="Total Posts" value={analytics.postCount} icon="document-text" trend="+5.2%" color="#15AABF" theme={theme} />
          <MetricCard title="Muted Users" value={0} icon="volume-mute" color="#FAB005" theme={theme} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Admin Actions</Text>
        <TouchableOpacity onPress={() => {/* View all logs */ }}>
          <Text style={[styles.viewAll, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityContainer}>
        {auditLogs.length > 0 ? (
          auditLogs.slice(0, 5).map(log => (
            <ActivityItem key={log.id} log={log} theme={theme} />
          ))
        ) : (
          <View style={styles.emptyActivity}>
            <Ionicons name="calendar-outline" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No recent actions recorded.</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  column: {
    flex: 0.48,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderBottomWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityContainer: {
    paddingHorizontal: 20,
  },
  activityItem: {
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTag: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityDate: {
    fontSize: 11,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityDetails: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 40,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
  }
});

export default AnalyticsScreen;
