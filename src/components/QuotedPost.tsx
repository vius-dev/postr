
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/theme';

interface QuotedPostProps {
  post: {
    author: {
      name: string;
    };
    content: string;
    createdAt: string;
  };
}

const QuotedPost = ({ post }: QuotedPostProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Text style={[styles.author, { color: theme.textPrimary }]}>{post.author.name}</Text>
        <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{new Date(post.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={{ color: theme.textPrimary }}>{post.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  author: {
    fontWeight: 'bold',
  },
  timestamp: {
  },
});

export default QuotedPost;
