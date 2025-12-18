
import React, { createContext, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';

interface CardContextProps {
  // Define any props you want to share across card components
}

const CardContext = createContext<CardContextProps | undefined>(undefined);

const useCard = () => {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCard must be used within a Card');
  }
  return context;
};

interface CardProps {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<React.PropsWithChildren<{}>>;
  Content: React.FC<React.PropsWithChildren<{}>>;
  Actions: React.FC<React.PropsWithChildren<{}>>;
  Footer: React.FC<React.PropsWithChildren<{}>>;
} = ({ children }) => {
  const { theme } = useTheme();
  return (
    <CardContext.Provider value={{}}>
      <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
        {children}
      </View>
    </CardContext.Provider>
  );
};

const Header: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <View style={styles.header}>{children}</View>
);

const Content: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <View style={styles.content}>{children}</View>
);

const Actions: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <View style={styles.actions}>{children}</View>
);

const Footer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <View style={styles.footer}>{children}</View>
);

Card.Header = Header;
Card.Content = Content;
Card.Actions = Actions;
Card.Footer = Footer;

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    marginBottom: 10,
  },
  content: {
    marginBottom: 10,
  },
  actions: {
    marginTop: 10,
  },
  footer: {
    marginTop: 10,
  },
});

export default Card;
