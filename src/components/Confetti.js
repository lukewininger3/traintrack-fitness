import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_PARTICLES = 30;

const CONFETTI_COLORS = [
  '#BFFF00', // lime accent
  '#FF6B35', // coral secondary
  '#00D4FF', // blue tertiary
  '#FFD600', // gold
  '#FF3B3B', // red
  '#00FF88', // green
  '#FF69B4', // pink
];

function ConfettiParticle({ index, trigger }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const config = useMemo(() => ({
    startX: SCREEN_WIDTH * 0.5 + (Math.random() - 0.5) * 60,
    startY: SCREEN_HEIGHT * 0.35,
    endX: (Math.random() - 0.5) * SCREEN_WIDTH * 1.2,
    endY: SCREEN_HEIGHT * 0.4 + Math.random() * SCREEN_HEIGHT * 0.4,
    rotation: (Math.random() - 0.5) * 720,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    isSquare: Math.random() > 0.5,
    delay: Math.random() * 200,
    duration: 800 + Math.random() * 600,
  }), [index]);

  useEffect(() => {
    if (!trigger) {
      opacity.value = 0;
      scale.value = 0;
      return;
    }

    const { endX, endY, rotation, delay, duration } = config;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(duration * 0.6, withTiming(0, { duration: duration * 0.4 }))
      )
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.back(2)) }),
        withDelay(duration * 0.5, withTiming(0.3, { duration: duration * 0.3 }))
      )
    );

    translateX.value = withDelay(
      delay,
      withTiming(endX, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );

    translateY.value = withDelay(
      delay,
      withSequence(
        // Initial burst upward
        withTiming(-80 - Math.random() * 120, {
          duration: duration * 0.3,
          easing: Easing.out(Easing.quad),
        }),
        // Fall with gravity
        withTiming(endY, {
          duration: duration * 0.7,
          easing: Easing.in(Easing.quad),
        })
      )
    );

    rotate.value = withDelay(
      delay,
      withTiming(rotation, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.startX,
          top: config.startY,
          width: config.size,
          height: config.isSquare ? config.size : config.size * 2.5,
          backgroundColor: config.color,
          borderRadius: config.isSquare ? 2 : config.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function Confetti({ trigger }) {
  if (!trigger) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
        <ConfettiParticle key={i} index={i} trigger={trigger} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
  },
});
