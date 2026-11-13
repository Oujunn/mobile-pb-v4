import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

/**
 * PressableScale
 * Micro-interaction wrapper providing 60 FPS spring scale feedback.
 * Uses React Native's native driver for buttery smooth hardware-accelerated feel.
 * Correctly propagates flexbox layout properties (flex, width, margins) to the outer Pressable
 * so parent layout containers (grids, rows, flexboxes) work seamlessly without layout collapse.
 */
export default function PressableScale({
  children,
  onPress,
  disabled = false,
  style,
  containerStyle,
  scaleTo = 0.975,
  activeOpacity = 0.85,
  hitSlop,
  ...props
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        speed: 40,
        bounciness: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: activeOpacity,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 30,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Flatten incoming style to extract layout properties required by parent flex container
  const flattened = StyleSheet.flatten(style) || {};

  const outerLayoutStyle = {};
  if (flattened.flex !== undefined) outerLayoutStyle.flex = flattened.flex;
  if (flattened.flexGrow !== undefined) outerLayoutStyle.flexGrow = flattened.flexGrow;
  if (flattened.flexShrink !== undefined) outerLayoutStyle.flexShrink = flattened.flexShrink;
  if (flattened.flexBasis !== undefined) outerLayoutStyle.flexBasis = flattened.flexBasis;
  if (flattened.width !== undefined) outerLayoutStyle.width = flattened.width;
  if (flattened.height !== undefined) outerLayoutStyle.height = flattened.height;
  if (flattened.minWidth !== undefined) outerLayoutStyle.minWidth = flattened.minWidth;
  if (flattened.maxWidth !== undefined) outerLayoutStyle.maxWidth = flattened.maxWidth;
  if (flattened.minHeight !== undefined) outerLayoutStyle.minHeight = flattened.minHeight;
  if (flattened.maxHeight !== undefined) outerLayoutStyle.maxHeight = flattened.maxHeight;
  if (flattened.margin !== undefined) outerLayoutStyle.margin = flattened.margin;
  if (flattened.marginTop !== undefined) outerLayoutStyle.marginTop = flattened.marginTop;
  if (flattened.marginBottom !== undefined) outerLayoutStyle.marginBottom = flattened.marginBottom;
  if (flattened.marginLeft !== undefined) outerLayoutStyle.marginLeft = flattened.marginLeft;
  if (flattened.marginRight !== undefined) outerLayoutStyle.marginRight = flattened.marginRight;
  if (flattened.marginHorizontal !== undefined) outerLayoutStyle.marginHorizontal = flattened.marginHorizontal;
  if (flattened.marginVertical !== undefined) outerLayoutStyle.marginVertical = flattened.marginVertical;
  if (flattened.alignSelf !== undefined) outerLayoutStyle.alignSelf = flattened.alignSelf;
  if (flattened.position !== undefined) outerLayoutStyle.position = flattened.position;
  if (flattened.top !== undefined) outerLayoutStyle.top = flattened.top;
  if (flattened.bottom !== undefined) outerLayoutStyle.bottom = flattened.bottom;
  if (flattened.left !== undefined) outerLayoutStyle.left = flattened.left;
  if (flattened.right !== undefined) outerLayoutStyle.right = flattened.right;
  if (flattened.zIndex !== undefined) outerLayoutStyle.zIndex = flattened.zIndex;

  const hasOuterLayout = Object.keys(outerLayoutStyle).length > 0;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[
        hasOuterLayout && outerLayoutStyle,
        containerStyle,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          style,
          (outerLayoutStyle.flex !== undefined || outerLayoutStyle.width !== undefined) && { width: '100%' },
          outerLayoutStyle.height !== undefined && { height: '100%' },
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
