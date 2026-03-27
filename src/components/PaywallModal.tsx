import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Platform, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePaywall } from '../context/PaywallContext';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  
  const { mockPurchaseSuccess, resetToFree, isPro } = usePaywall();

  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    setIsCheckoutVisible(true);
  };

  const handleFinalPurchase = () => {
    if (selectedPlan) {
      mockPurchaseSuccess(selectedPlan);
    }
    setIsCheckoutVisible(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
          <SafeAreaView style={styles.safeArea}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={30} color="#aaaaaa" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              <View style={styles.headerContainer}>
                <Text style={styles.mainTitle}>Never Get Stuck Again</Text>
                <Text style={styles.mainSubtitle}>Unlock the best gaming solutions.</Text>
                
                {__DEV__ && (
                  <TouchableOpacity onPress={resetToFree} style={{ marginTop: 10, padding: 5 }}>
                    <Text style={{ color: '#555', fontSize: 12 }}>[Dev: Reset to Free]</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.packsContainer}>
                
                {/* 1. Basic Pack */}
                <PlanCard 
                  title="Basic Pack" 
                  price="$4.90" 
                  subDesc="Limited Fixes"
                  onPress={() => handlePlanSelect('Basic')}
                >
                  <FeatureItem text="20 mission solves / day" />
                  <FeatureItem text="AI help (10 image + text)" />
                  <FeatureItem text="1 guide link per solution" />
                  <FeatureItem text="Ads included" isCross />
                  <FeatureItem text="Slower results" isCross />
                </PlanCard>

                {/* 2. Advanced Pack */}
                <PlanCard 
                  title="Advanced Pack" 
                  price="$9.90" 
                  subDesc="Best Value"
                  badgeText="🔥 MOST POPULAR"
                  onPress={() => handlePlanSelect('Advanced')}
                  isPopular
                >
                  <FeatureItem text="50 mission solves / day" />
                  <FeatureItem text="AI help (image + text input)" />
                  <FeatureItem text="3 guide links per solution" />
                  <FeatureItem text="Priority access" isCross />
                  <FeatureItem text="Ads included" isCross />
                </PlanCard>

                {/* 3. Fixra PRO */}
                <PlanCard 
                  title="Fixra PRO" 
                  price="$19.90" 
                  subDesc="Unlimited Power"
                  badgeText="👑 ULTIMATE EXPERIENCE"
                  onPress={() => handlePlanSelect('PRO')}
                  isPro={true}
                  isAlreadyPro={isPro}
                  footerText="Join 10,000 players already using Fixra"
                >
                  <FeatureItem text="Unlimited mission solves" />
                  <FeatureItem text="AI help (image + text + video)" />
                  <FeatureItem text="All guide links included" />
                  <FeatureItem text="No ads" />
                  <FeatureItem text="Fastest results ⚡" />
                  <FeatureItem text="Zero waiting ⏱️" />
                </PlanCard>

              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <CheckoutModal 
        visible={isCheckoutVisible} 
        planName={selectedPlan || ''}
        onClose={() => setIsCheckoutVisible(false)}
        onConfirm={handleFinalPurchase}
      />
    </Modal>
  );
}

// ==========================================
// קומפוננטת ציר הזמן המעוצבת (Timeline)
// ==========================================
function TimelineStep({ icon, title, desc, isLast = false }: { icon: string, title: string, desc: string, isLast?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.iconColumn}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon as any} size={20} color="#6366f1" />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ==========================================
// קומפוננטת כרטיסיית חבילה מעוצבת ומודרנית (עם אקורדיון)
// ==========================================
interface PlanCardProps {
  title: string;
  price: string;
  subDesc: string;
  badgeText?: string;
  children: React.ReactNode;
  onPress: () => void;
  isPopular?: boolean;
  isPro?: boolean;
  isAlreadyPro?: boolean;
  footerText?: string;
}

function PlanCard({ title, price, subDesc, badgeText, children, onPress, isPopular, isPro: isProCard, isAlreadyPro, footerText }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const cardStyles = [
    styles.packInner, 
    isPopular && styles.packInnerPopular,
    isProCard && styles.packInnerPro
  ];

  const priceTextStyles = [
    styles.packPrice,
    isPopular && {color: '#ff00cc'},
    isProCard && {color: '#00e5ff'}
  ];

  const childrenArray = React.Children.toArray(children);

  return (
    <View style={styles.packWrapper}>
      {badgeText && (
        <View style={[styles.badge, isProCard && styles.badgePro]}>
          <Text style={[styles.badgeText, isProCard && styles.badgeTextPro]}>{badgeText}</Text>
        </View>
      )}
      <LinearGradient colors={['rgba(25, 25, 25, 0.5)', 'rgba(0, 0, 0, 0.8)']} style={cardStyles}>
        
        <TouchableOpacity activeOpacity={0.7} onPress={() => setIsExpanded(!isExpanded)} style={styles.packHeaderClickable}>
          <View style={styles.titleRow}>
            <Text style={styles.packTitle}>{title} <Text style={styles.packSubDescHeader}>— {subDesc}</Text></Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={22} 
              color="#aaaaaa" 
              style={styles.chevronIcon} 
            />
          </View>
          
          <View style={styles.packPriceRow}>
            <Text style={priceTextStyles}>{price}</Text>
            <Text style={styles.packDesc}> / month</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.featuresListContainer}>
          {childrenArray.map((child, index) => {
            if (index < 2 || isExpanded) {
              return child;
            }
            return null;
          })}
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{width: '100%', marginTop: 10}}>
          <LinearGradient colors={isProCard ? ['#ff00cc', '#3333ff'] : ['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              {isProCard && isAlreadyPro ? 'Already PRO ✨' : isProCard ? 'Go PRO 🚀' : 'Buy Now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {footerText && (
          <Text style={styles.packFooterText}>{footerText}</Text>
        )}
        
      </LinearGradient>
    </View>
  );
}

// ==========================================
// קומפוננטת הפיצ'רים המעוצבת (V / X)
// ==========================================
function FeatureItem({ text, isCross = false }: { text: string, isCross?: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons 
        name={isCross ? "close" : "checkmark"} 
        size={20} 
        color={isCross ? '#ff4444' : '#00e676'} 
        style={styles.featureIcon} 
      />
      <Text style={[
        styles.featureText, 
        isCross && { color: '#888888', textDecorationLine: 'line-through' }
      ]}>
        {text}
      </Text>
    </View>
  );
}

// ==========================================
// קומפוננטת האישור והטיימליין (Checkout Modal)
// ==========================================
function CheckoutModal({ visible, planName, onClose, onConfirm }: { visible: boolean, planName: string, onClose: () => void, onConfirm: () => void }) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isRendered, setIsRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
        speed: 12
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true
      }).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  if (!isRendered) return null;

  // הגדרת הטיימליין דינאמית לפי החבילה
  let steps = [];
  if (planName === 'Basic') {
    steps = [
      { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
      { icon: "time-outline", title: "20 Daily Solves", desc: "Get 20 mission solves renewed every 24 hours." },
      { icon: "shield-checkmark-outline", title: "Secure Payment", desc: "Safe and secure monthly billing.", isLast: true }
    ];
  } else if (planName === 'Advanced') {
    steps = [
      { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
      { icon: "time-outline", title: "50 Daily Solves", desc: "Get 50 mission solves renewed every 24 hours." },
      { icon: "shield-checkmark-outline", title: "Secure Payment", desc: "Safe and secure monthly billing.", isLast: true }
    ];
  } else {
    steps = [
      { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
      { icon: "infinite-outline", title: "Unlimited Power", desc: "Never run out of solves. Truly unlimited." },
      { icon: "shield-checkmark-outline", title: "Secure Payment", desc: "Safe and secure monthly billing.", isLast: true }
    ];
  }

  return (
    <View style={styles.checkoutOverlay}>
      <Animated.View style={[styles.checkoutSheet, { transform: [{ translateY: slideAnim }] }]}>
        
        <TouchableOpacity style={styles.checkoutClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#aaaaaa" />
        </TouchableOpacity>

        <Text style={styles.checkoutTitle}>Confirm Your Plan</Text>
        <Text style={styles.checkoutSubtitle}>You are about to activate the {planName} plan.</Text>

        <View style={styles.checkoutTimelineWrapper}>
          {steps.map((step, index) => (
            <TimelineStep 
              key={index}
              icon={step.icon} 
              title={step.title} 
              desc={step.desc}
              isLast={step.isLast}
            />
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onConfirm} style={{width: '100%'}}>
          <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.confirmBtn}>
            <Text style={styles.confirmBtnText}>Confirm & Start</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  background: { flex: 1 },
  safeArea: { flex: 1 },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 10, padding: 10 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 100 : 70, paddingBottom: 30 },
  headerContainer: { alignItems: 'center', marginBottom: 25 },
  mainTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 40, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  mainSubtitle: { color: '#cccccc', fontSize: 16, marginTop: 10, textAlign: 'center' },
  
  timelineWrapper: { width: '100%', marginBottom: 35, paddingHorizontal: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  iconColumn: { alignItems: 'center', width: 40 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  timelineLine: { width: 2, height: 35, backgroundColor: '#333', marginTop: 5 },
  textColumn: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  timelineTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  timelineDesc: { color: '#aaaaaa', fontSize: 13, marginTop: 3 },

  packsContainer: { width: '100%' },
  packWrapper: { marginBottom: 20, position: 'relative' },
  packInner: { borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  packInnerPopular: { borderColor: '#ff00cc', borderWidth: 2 },
  packInnerPro: { borderColor: '#00e5ff', borderWidth: 2 },
  
  packHeaderClickable: { width: '100%', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  packTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  packSubDescHeader: { color: '#aaaaaa', fontWeight: 'normal', fontSize: 14 },
  chevronIcon: { marginLeft: 8 },
  
  packPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 15, justifyContent: 'center' },
  packPrice: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  packDesc: { color: '#aaaaaa', fontSize: 14, fontWeight: 'normal' },

  featuresListContainer: { width: '100%', marginBottom: 20, alignItems: 'flex-start', paddingLeft: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon: { marginRight: 12 },
  featureText: { color: '#ffffff', fontSize: 15 },

  badge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#ffcc00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 5 },
  badgePro: { backgroundColor: '#00e5ff' },
  badgeText: { color: '#000000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  badgeTextPro: { color: '#000000' },

  actionButton: { width: '100%', paddingVertical: 15, borderRadius: 30, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  packFooterText: { color: '#aaaaaa', fontSize: 12, textAlign: 'center', marginTop: 12, fontStyle: 'italic', fontWeight: '500' },

  checkoutOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 100 },
  checkoutSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 30, borderWidth: 1, borderColor: '#333', borderBottomWidth: 0 },
  checkoutClose: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 5 },
  checkoutTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  checkoutSubtitle: { color: '#cccccc', fontSize: 15, marginBottom: 25 },
  checkoutTimelineWrapper: { marginBottom: 25 },
  confirmBtn: { paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});