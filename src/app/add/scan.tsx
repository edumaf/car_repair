// Scan the VIN barcode on the door-jamb sticker or windshield (CLAUDE.md §6.2), with a scanner sweep line (§12).
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { vinFromBarcode } from '@/core/vin/vin';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { radius, space, useTheme } from '@/design/tokens';

const FRAME_H = 150;

function SweepLine({ color }: { color: string }) {
  const y = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!reduceMotion) y.value = withRepeat(withTiming(FRAME_H - 4, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[styles.sweep, { backgroundColor: color, shadowColor: color }, reduceMotion ? { top: FRAME_H / 2 } : style]} />
  );
}

export default function ScanVin() {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [lastNonVin, setLastNonVin] = useState(false);
  const handled = useRef(false);

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    const vin = vinFromBarcode(data);
    if (!vin) {
      setLastNonVin(true);
      return;
    }
    handled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({ pathname: '/add/confirm', params: { vin, method: 'vin_scan' } });
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.priming, { backgroundColor: t.bg }]}>
        <Ionicons name="barcode-outline" size={56} color={t.brand} />
        <AppText variant="title" align="center">
          Scan the VIN barcode
        </AppText>
        <AppText tone="muted" align="center">
          We use the camera to read the barcode on the driver’s door-jamb sticker. Nothing is recorded or uploaded.
        </AppText>
        <View style={styles.primingButtons}>
          {permission.canAskAgain ? (
            <Button label="Allow camera" icon="camera" onPress={requestPermission} />
          ) : (
            <AppText variant="label" tone="muted" align="center">
              Camera access is off. Turn it on in the iPhone Settings app → Used Car Check (or Expo Go) → Camera.
            </AppText>
          )}
          <Button label="Type the VIN instead" kind="ghost" onPress={() => router.replace('/add/vin')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['code39', 'code128', 'datamatrix', 'qr', 'pdf417'] }}
        onBarcodeScanned={onScanned}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
            onPress={() => setTorch((x) => !x)}
            style={styles.iconButton}>
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.middle} pointerEvents="none">
          <AppText variant="heading" style={styles.white} align="center">
            Point at the VIN barcode
          </AppText>
          <View style={[styles.frame, { borderColor: 'rgba(255,255,255,0.9)' }]}>
            <SweepLine color={t.brand} />
          </View>
          <AppText variant="label" style={styles.white} align="center">
            Driver’s door jamb sticker, or the base of the windshield. Hold steady; it scans by itself.
          </AppText>
          {lastNonVin ? (
            <AppText variant="caption" style={styles.white} align="center">
              That barcode isn’t a VIN. Look for the one next to “VIN” on the sticker.
            </AppText>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <Button label="Type the VIN instead" kind="secondary" icon="keypad-outline" onPress={() => router.replace('/add/vin')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: space.lg },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { paddingHorizontal: space.xl, gap: space.lg },
  frame: { height: FRAME_H, borderWidth: 2, borderRadius: radius.md, overflow: 'hidden' },
  sweep: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  white: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  bottom: { padding: space.xl },
  priming: { flex: 1, padding: space.xxl, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  primingButtons: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
});
