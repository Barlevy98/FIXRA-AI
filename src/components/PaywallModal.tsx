import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Animated, Easing, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePaywall } from '../context/PaywallContext';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  
  // 🌟 משתמשים בפונקציית הרכישה האמיתית מה-Context
  const { purchasePackage, resetToFree, isPro, currentPlan } = usePaywall();

  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false); // 🌟 מונע לחיצות כפולות בזמן טעינה

  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    setIsCheckoutVisible(true);
  };

  // 🌟 הלוגיקה החדשה שמתחברת ל-RevenueCat
  const handleFinalPurchase = async (paymentMode: 'one-time' | 'monthly') => {
    if (!selectedPlan) return;

    setIsPurchasing(true); // מתחיל טעינה

    try {
      let packageToBuy: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM';

      if (selectedPlan === 'PRO') {
        packageToBuy = paymentMode === 'monthly' ? 'PRO_monthly' : 'PRO_onetime';
      } else {
        packageToBuy = 'PREMIUM';
      }

      // קורא לפונקציה מול חנות האפליקציות ומחכה לתשובה
      await purchasePackage(packageToBuy);
      
    } catch (error) {
      console.log("User cancelled or error occurred");
    } finally {
      setIsPurchasing(false); // מסיים טעינה
      setIsCheckoutVisible(false);
      onClose(); // סוגר את המודל בסיום
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
          <SafeAreaView style={styles.safeArea}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isPurchasing}>
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
                
                {/* 1. PRO Pack */}
                <PlanCard 
                  title="PRO" 
                  monthlyPrice="$9.99" 
                  subDesc="Best Value"
                  badgeText="🔥 MOST POPULAR"
                  btnText="Get PRO ⚡"
                  onPress={() => handlePlanSelect('PRO')}
                  isPopular
                  isAlreadyPro={currentPlan === 'PRO_monthly' || currentPlan === 'PRO_onetime'}
                >
                  <FeatureItem text="50 mission solves / month" />
                  <FeatureItem text="AI help (image + text input)" />
                  <FeatureItem text="3 guide links per solution" />
                  <FeatureItem text="Priority access" isCross />
                  <FeatureItem text="Ads included" isCross />
                </PlanCard>

                {/* 2. PREMIUM Pack */}
                <PlanCard 
                  title="PREMIUM" 
                  monthlyPrice="$15.99" 
                  subDesc="Unlimited Power"
                  badgeText="👑 ULTIMATE EXPERIENCE"
                  btnText="Go PREMIUM 👑"
                  onPress={() => handlePlanSelect('PREMIUM')}
                  isPro={true}
                  isAlreadyPro={currentPlan === 'PREMIUM'}
                >
                  <FeatureItem text="Unlimited mission solves" />
                  <FeatureItem text="AI help (image + text + video)" />
                  <FeatureItem text="All guide links included" />
                  <FeatureItem text="No ads" />
                  <FeatureItem text="Fastest results ⚡" />
                  <FeatureItem text="Zero waiting ⏱️" />
                </PlanCard>

              </View>

              <Text style={styles.bottomFooterText}>Join 10,000 players already using Fixra</Text>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <CheckoutModal 
        visible={isCheckoutVisible} 
        planName={selectedPlan || ''}
        onClose={() => setIsCheckoutVisible(false)}
        onConfirm={(mode) => handleFinalPurchase(mode)}
        isPurchasing={isPurchasing}
      />
    </Modal>
  );
}

// ==========================================
// קומפוננטת ציר הזמן (Checkout Modal)
// ==========================================
function TimelineStep({ icon, title, desc, isLast = false }: { icon: string, title: string, desc: string, isLast?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.iconColumn}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon as any} size={18} color="#6366f1" />
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
// קומפוננטת כרטיסיית החבילה
// ==========================================
interface PlanCardProps {
  title: string;
  monthlyPrice: string;
  subDesc: string;
  badgeText?: string;
  btnText: string;
  children: React.ReactNode;
  onPress: () => void;
  isPopular?: boolean;
  isPro?: boolean;
  isAlreadyPro?: boolean;
}

function PlanCard({ title, monthlyPrice, subDesc, badgeText, btnText, children, onPress, isPopular, isPro: isProCard, isAlreadyPro }: PlanCardProps) {
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

  return (
    <View style={styles.packWrapper}>
      {badgeText && (
        <View style={[styles.badge, isProCard && styles.badgePro]}>
          <Text style={[styles.badgeText, isProCard && styles.badgeTextPro]}>{badgeText}</Text>
        </View>
      )}
      <LinearGradient colors={['rgba(25, 25, 25, 0.4)', 'rgba(0, 0, 0, 0.8)']} style={cardStyles}>
        
        <View style={styles.packHeaderClickable}>
          <Text style={styles.packTitle}>{title}</Text>
          <Text style={styles.packSubDescHeader}>{subDesc}</Text>
          
          <View style={styles.priceContainer}>
            <View style={styles.packPriceRow}>
              <Text style={priceTextStyles}>{monthlyPrice}</Text>
              <Text style={styles.packDesc}> / mo</Text>
            </View>
            <Text style={styles.onlyText}>ONLY</Text>
          </View>
        </View>

        <View style={styles.featuresListContainer}>
          {children}
        </View>
        
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.btnWrapper} disabled={isAlreadyPro}>
          <LinearGradient colors={isProCard ? ['#007acc', '#00e5ff'] : ['#8a2be2', '#ff00cc']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              {isAlreadyPro ? 'Active ✨' : btnText}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

      </LinearGradient>
    </View>
  );
}

function FeatureItem({ text, isCross = false }: { text: string, isCross?: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons 
        name={isCross ? "close" : "checkmark"} 
        size={14} 
        color={isCross ? '#ff4444' : '#00e5ff'} 
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
// קומפוננטת האישור (Checkout Modal)
// ==========================================
function CheckoutModal({ visible, planName, onClose, onConfirm, isPurchasing }: { visible: boolean, planName: string, onClose: () => void, onConfirm: (mode: 'one-time'|'monthly') => void, isPurchasing: boolean }) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isRendered, setIsRendered] = useState(visible);
  
  const [paymentMode, setPaymentMode] = useState<'one-time' | 'monthly'>('monthly');

  useEffect(() => {
    if (visible) {
      setPaymentMode('monthly');
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
  }, [visible, planName]);

  if (!isRendered) return null;

  let steps = [];
  let checkoutPrice = '';

  if (planName === 'PRO') {
    if (paymentMode === 'one-time') {
      checkoutPrice = '$15.99';
      steps = [
        { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
        { icon: "battery-half-outline", title: "50 Total Solves", desc: "You get exactly 50 solves. Does not renew." },
        { icon: "wallet-outline", title: "One-Time Payment", desc: "Pay once, no recurring charges.", isLast: true }
      ];
    } else {
      checkoutPrice = '$9.99';
      steps = [
        { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
        { icon: "time-outline", title: "50 Monthly Solves", desc: "Get 50 mission solves renewed every month." },
        { icon: "shield-checkmark-outline", title: "Secure Payment", desc: "Safe and secure monthly billing.", isLast: true }
      ];
    }
  } else {
    checkoutPrice = '$15.99';
    steps = [
      { icon: "flash-outline", title: "Instant Activation", desc: "Your account is upgraded immediately." },
      { icon: "infinite-outline", title: "Unlimited Power", desc: "Never run out of solves. Truly unlimited." },
      { icon: "shield-checkmark-outline", title: "Secure Payment", desc: "Safe and secure monthly billing.", isLast: true }
    ];
  }

  return (
    <View style={styles.checkoutOverlay}>
      <Animated.View style={[styles.checkoutSheet, { transform: [{ translateY: slideAnim }] }]}>
        
        <TouchableOpacity style={styles.checkoutClose} onPress={onClose} disabled={isPurchasing}>
          <Ionicons name="close" size={28} color="#aaaaaa" />
        </TouchableOpacity>

        <Text style={styles.checkoutTitle}>Checkout: {planName}</Text>
        
        {planName === 'PRO' && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, paymentMode === 'monthly' && styles.toggleBtnActive]} 
              onPress={() => setPaymentMode('monthly')}
              disabled={isPurchasing}
            >
              <Text style={[styles.toggleBtnText, paymentMode === 'monthly' && styles.toggleBtnTextActive]}>Monthly ($9.99)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toggleBtn, paymentMode === 'one-time' && styles.toggleBtnActive]} 
              onPress={() => setPaymentMode('one-time')}
              disabled={isPurchasing}
            >
              <Text style={[styles.toggleBtnText, paymentMode === 'one-time' && styles.toggleBtnTextActive]}>One-Time ($15.99)</Text>
            </TouchableOpacity>
          </View>
        )}

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

        <TouchableOpacity activeOpacity={0.8} onPress={() => onConfirm(paymentMode)} style={{width: '100%'}} disabled={isPurchasing}>
          <LinearGradient colors={isPurchasing ? ['#555', '#333'] : ['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.confirmBtn}>
            {isPurchasing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Buy Now {checkoutPrice}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {planName !== 'PRO' && (
          <Text style={styles.checkoutFooterText}>Join thousands of players solving missions instantly</Text>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  background: { flex: 1 },
  safeArea: { flex: 1 },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 10, padding: 10 },
  scrollContent: { paddingHorizontal: 10, paddingTop: Platform.OS === 'ios' ? 100 : 70, paddingBottom: 30 },
  headerContainer: { alignItems: 'center', marginBottom: 35 },
  mainTitle: { color: '#ffffff', fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
  mainSubtitle: { color: '#cccccc', fontSize: 15, marginTop: 5, textAlign: 'center' },
  
  packsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  packWrapper: { width: '48.5%', position: 'relative' },
  packInner: { borderRadius: 20, padding: 12, paddingBottom: 15, borderWidth: 1, borderColor: '#333', alignItems: 'center', flex: 1 },
  
  packInnerPopular: { borderColor: '#ff00cc', borderWidth: 2, shadowColor: '#ff00cc', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  packInnerPro: { borderColor: '#00e5ff', borderWidth: 2, shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  
  packHeaderClickable: { width: '100%', alignItems: 'center', marginBottom: 15 },
  packTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  packSubDescHeader: { color: '#aaaaaa', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  
  priceContainer: { alignItems: 'center', marginBottom: 5 },
  packPriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  packPrice: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  packDesc: { color: '#aaaaaa', fontSize: 13, fontWeight: 'bold', marginLeft: 2 },
  onlyText: { color: '#aaaaaa', fontSize: 9, fontWeight: 'bold', marginTop: 2, letterSpacing: 1 },
  
  featuresListContainer: { flex: 1, width: '100%', alignItems: 'flex-start', paddingLeft: 2, marginBottom: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '100%' },
  featureIcon: { marginRight: 6 },
  featureText: { color: '#ffffff', fontSize: 11.5, flexShrink: 1 },

  badge: { position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#ffcc00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 5 },
  badgePro: { backgroundColor: '#00e5ff' },
  badgeText: { color: '#000000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  badgeTextPro: { color: '#000000' },

  btnWrapper: { width: '100%', marginTop: 'auto' },
  actionButton: { width: '100%', paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },

  bottomFooterText: { color: '#aaaaaa', fontSize: 13, textAlign: 'center', marginTop: 30, fontWeight: '500' },

  checkoutOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 100 },
  checkoutSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 30, borderWidth: 1, borderColor: '#333', borderBottomWidth: 0 },
  checkoutClose: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 5 },
  checkoutTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 5, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#6366f1' },
  toggleBtnText: { color: '#aaaaaa', fontSize: 14, fontWeight: 'bold' },
  toggleBtnTextActive: { color: '#ffffff' },

  timelineWrapper: { width: '100%', marginBottom: 35, paddingHorizontal: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  iconColumn: { alignItems: 'center', width: 30 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  timelineLine: { width: 2, height: 25, backgroundColor: '#333', marginTop: 5 },
  textColumn: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  timelineTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  timelineDesc: { color: '#aaaaaa', fontSize: 12, marginTop: 3 },

  checkoutTimelineWrapper: { marginBottom: 25 },
  confirmBtn: { paddingVertical: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  
  checkoutFooterText: { color: '#aaaaaa', fontSize: 12, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontWeight: '500' }
});