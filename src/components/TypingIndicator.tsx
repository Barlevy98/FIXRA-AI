import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function TypingIndicator() {
  // יוצרים 3 ערכי אנימציה נפרדים, אחד לכל נקודה
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // פונקציה שמייצרת את קפיצת האנימציה (למעלה ולמטה)
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay), // כל נקודה מתחילה קצת אחרי הקודמת כדי ליצור גל
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(400) // הפסקה קטנה בין גל לגל
          ])
        )
      ]);
    };

    // מפעילים את האנימציות עם הפרשי זמנים (0, 200, 400 מילי-שניות)
    animateDot(dot1, 0).start();
    animateDot(dot2, 200).start();
    animateDot(dot3, 400).start();
  }, []);

  // מחשבים את המיקום והשקיפות של הנקודה בכל רגע
  const getDotStyle = (dot: Animated.Value) => ({
    transform: [{
      translateY: dot.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6] // הנקודה קופצת 6 פיקסלים למעלה
      })
    }],
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1] // הנקודה מהבהבת משקוף למלא
    })
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 5, 
    height: 24 
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#00e5ff', // צבע הניאון היפה של FIXRA
    marginHorizontal: 3 
  }
});