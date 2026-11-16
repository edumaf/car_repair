import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={styles.center} accessible accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={t.brand} size="large" />
      <AppText tone="muted" align="center">
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={t.muted} />
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.retry}>
          <Button label="Try again" kind="secondary" icon="refresh" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  retry: { alignSelf: 'stretch', marginTop: space.sm },
});
