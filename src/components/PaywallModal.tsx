import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Animated, Easing, Dimensions, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePaywall } from '../context/PaywallContext';
import Purchases from 'react-native-purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  
  const { purchasePackage, currentPlan, resetToFree } = usePaywall();

  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [initialMode, setInitialMode] = useState<'monthly' | 'one-time'>('monthly');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const planLower = (currentPlan || '').toLowerCase();
  const isPremium = planLower.includes('premium');
  const isProMonthly = planLower.includes('pro') && !planLower.includes('one') && !planLower.includes('time');
  const isProOneTime = planLower.includes('pro') && (planLower.includes('one') || planLower.includes('time'));

  const handlePlanSelect = (plan: string, mode: 'monthly' | 'one-time' = 'monthly') => {
    setSelectedPlan(plan);
    setInitialMode(mode);
    setIsCheckoutVisible(true);
  };

  const handleFinalPurchase = async (paymentMode: 'one-time' | 'monthly') => {
    if (!selectedPlan) return;

    setIsPurchasing(true);

    try {
      let packageToBuy: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM';

      if (selectedPlan === 'PRO') {
        packageToBuy = paymentMode === 'monthly' ? 'PRO_monthly' : 'PRO_onetime';
      } else {
        packageToBuy = 'PREMIUM';
      }

      await purchasePackage(packageToBuy);
      
    } catch (error) {
      console.log("User cancelled or error occurred");
    } finally {
      setIsPurchasing(false);
      setIsCheckoutVisible(false);
      onClose();
    }
  };

  // פונקציית שחזור הרכישות החדשה
  const handleRestorePurchases = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['Fixra AI Pro'] !== "undefined") {
        Alert.alert("Success", "Your purchases have been restored! Please restart the app to see the changes.");
        onClose();
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any active purchases for your Apple ID.");
      }
    } catch (error: any) {
      Alert.alert("Error", "Restore failed: " + error.message);
    } finally {
      setIsPurchasing(false);
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
                <TouchableOpacity onLongPress={resetToFree} delayLongPress={2000}>
                  <Text style={styles.mainSubtitle}>Unlock instant gaming solutions.</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.topBanner}>
                <Ionicons name="flash" size={16} color="#ffcc00" style={{ marginRight: 6 }} />
                <Text style={styles.topBannerText}>Save 10–15 minutes every time you get stuck.</Text>
              </View>

              <View style={styles.packsContainer}>
                
                {/* 💖 PRO Pack */}
                <View style={styles.packWrapper}>
                  <View style={[styles.badge, { backgroundColor: '#ffcc00' }]}>
                    <Text style={styles.badgeText}>🔥 MOST POPULAR</Text>
                  </View>
                  <LinearGradient colors={['rgba(25, 25, 25, 0.4)', 'rgba(0, 0, 0, 0.8)']} style={[styles.packInner, { borderColor: '#ff00cc' }]}>
                    
                    <View style={styles.packHeaderClickable}>
                      <Text style={styles.packTitle}>PRO</Text>
                      <Text style={styles.packSubDescHeader}>Solve missions <Text style={{ color: '#ff00cc' }}>in seconds</Text></Text>
                      <Text style={[styles.packSubDescHeader, { color: '#ff00cc', marginTop: 2 }]}>not minutes.</Text>
                      <Text style={styles.packSubDescSmall}>Perfect for casual players who want fast solutions</Text>
                      
                      <View style={styles.priceContainer}>
                        <View style={styles.packPriceRow}>
                          <Text style={[styles.packPrice, { color: '#ff00cc' }]}>$9.99</Text>
                          <Text style={styles.packDesc}> / mo</Text>
                        </View>
                        <Text style={styles.onlyText}>ONLY</Text>
                      </View>
                    </View>

                    <View style={styles.featuresListContainer}>
                      <FeatureItem text="Up to 50 instant fixes" subText="(save hours every month)" subColor="#ff00cc" color="#ff00cc" />
                      <FeatureItem text="AI help (image + text input)" color="#ff00cc" />
                      <FeatureItem text="Up to 3 guide links per solution" color="#ff00cc" />
                      <FeatureItem text="Fast results" color="#ff00cc" />
                      <FeatureItem text="Cancel anytime" color="#ff00cc" />
                    </View>
                    
                    <TouchableOpacity onPress={() => handlePlanSelect('PRO', 'monthly')} activeOpacity={0.8} style={styles.btnWrapper} disabled={isProMonthly || isPremium}>
                      <LinearGradient colors={(isProMonthly || isPremium) ? ['#444', '#222'] : ['#b300ff', '#ff00cc']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionButton}>
                        <Text style={[styles.actionButtonText, (isProMonthly || isPremium) && {color: '#aaaaaa'}]}>
                          {isPremium ? 'Included in Premium' : isProMonthly ? 'Active ✨' : 'Get PRO ⚡'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.oneTimeContainer}>
                      <View style={styles.oneTimeBadge}>
                        <Text style={styles.oneTimeBadgeText}>PRO ONE-TIME ⏱️</Text>
                      </View>
                      <TouchableOpacity style={styles.oneTimeBtn} onPress={() => handlePlanSelect('PRO', 'one-time')} disabled={isProOneTime || isPremium}>
                         <Text style={[styles.oneTimeBtnPrice, (isProOneTime || isPremium) && {color: '#888888'}]}>
                           {isPremium ? 'Included' : isProOneTime ? 'Owned 🪙' : '$14.99 ONLY'}
                         </Text>
                      </TouchableOpacity>
                    </View>

                  </LinearGradient>
                </View>

                {/* 💎 PREMIUM Pack */}
                <View style={styles.packWrapper}>
                  <View style={[styles.badge, { backgroundColor: '#00e5ff' }]}>
                    <Text style={[styles.badgeText, { color: '#000' }]}>👑 BEST VALUE</Text>
                  </View>
                  <LinearGradient colors={['rgba(25, 25, 25, 0.4)', 'rgba(0, 0, 0, 0.8)']} style={[styles.packInner, { borderColor: '#00e5ff' }]}>
                    
                    <View style={styles.packHeaderClickable}>
                      <Text style={styles.packTitle}>PREMIUM</Text>
                      <Text style={styles.packSubDescHeader}>Never get stuck again</Text>
                      <Text style={[styles.packSubDescHeader, { color: '#00e5ff', marginTop: 2 }]}>unlimited power.</Text>
                      <Text style={styles.packSubDescSmall}>Instant solutions with maximum speed and accuracy</Text>
                      
                      <View style={styles.priceContainer}>
                        <View style={styles.packPriceRow}>
                          <Text style={[styles.packPrice, { color: '#00e5ff' }]}>$14.99</Text>
                          <Text style={styles.packDesc}> / mo</Text>
                        </View>
                        <Text style={styles.onlyText}>ONLY</Text>
                      </View>
                    </View>

                    <View style={styles.featuresListContainer}>
                      <FeatureItem text="Unlimited instant solutions" subText="(zero interruptions)" subColor="#00e5ff" color="#00e5ff" />
                      <FeatureItem text="Personal AI Assistant 🤖" color="#00e5ff" />
                      <FeatureItem text="AI help (image + text + video)" color="#00e5ff" />
                      <FeatureItem text="All guide links included" color="#00e5ff" />
                      <FeatureItem text="Priority AI (fastest results) ⚡" color="#00e5ff" />
                      <FeatureItem text="Zero waiting time ⏱️" color="#00e5ff" />
                      <FeatureItem text="No ads" color="#00e5ff" />
                      <FeatureItem text="Cancel anytime" color="#00e5ff" />
                    </View>
                    
                    <TouchableOpacity onPress={() => handlePlanSelect('PREMIUM')} activeOpacity={0.8} style={styles.btnWrapper} disabled={isPremium}>
                      <LinearGradient colors={isPremium ? ['#444', '#222'] : ['#007acc', '#00e5ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionButton}>
                        <Text style={[styles.actionButtonText, isPremium && {color: '#aaaaaa'}]}>
                          {isPremium ? 'Active 👑' : 'Activate 👑'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={[styles.oneTimeContainer, { borderColor: '#00e5ff', opacity: isPremium ? 0.5 : 1 }]}>
                      <TouchableOpacity style={styles.oneTimeBtn} onPress={() => handlePlanSelect('PREMIUM')} disabled={isPremium}>
                         <Text style={[styles.oneTimeBtnPrice, { color: isPremium ? '#888' : '#00e5ff' }]}>
                           {isPremium ? 'Owned' : '$14.99 ONLY'}
                         </Text>
                      </TouchableOpacity>
                    </View>

                  </LinearGradient>
                </View>

              </View>

              <View style={styles.footerRow}>
                <Ionicons name="people" size={16} color="#aaaaaa" style={{ marginRight: 6 }} />
                <Text style={styles.bottomFooterText}>Join 10,000 players already using Fixra</Text>
              </View>

              {/* כפתור ה-Restore החדש */}
              <TouchableOpacity onPress={handleRestorePurchases} disabled={isPurchasing} style={{ marginTop: 25, marginBottom: 15 }}>
                <Text style={{ color: '#ffffff', fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}>
                  {isPurchasing ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => Linking.openURL('https://quirky-match-61c.notion.site/FIXRA-Terms-of-Service-Privacy-Policy-34745f65405f80d2b137c2f4ddd7ae2e')}>
                <Text style={{ color: '#aaaaaa', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' }}>
                  Terms of Service & Privacy Policy
                </Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <CheckoutModal 
        visible={isCheckoutVisible} 
        planName={selectedPlan || ''}
        initialMode={initialMode}
        isProMonthly={isProMonthly}
        isProOneTime={isProOneTime}
        onClose={() => setIsCheckoutVisible(false)}
        onConfirm={(mode) => handleFinalPurchase(mode)}
        isPurchasing={isPurchasing}
      />
    </Modal>
  );
}

// ==========================================
function FeatureItem({ text, subText, subColor, color }: { text: string, subText?: string, subColor?: string, color: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark" size={14} color={color} style={styles.featureIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.featureText}>{text}</Text>
        {subText && <Text style={[styles.featureSubText, { color: subColor }]}>{subText}</Text>}
      </View>
    </View>
  );
}

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

function CheckoutModal({ visible, planName, initialMode, isProMonthly, isProOneTime, onClose, onConfirm, isPurchasing }: { visible: boolean, planName: string, initialMode: 'monthly'|'one-time', isProMonthly: boolean, isProOneTime: boolean, onClose: () => void, onConfirm: (mode: 'one-time'|'monthly') => void, isPurchasing: boolean }) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isRendered, setIsRendered] = useState(visible);
  
  const [paymentMode, setPaymentMode] = useState<'one-time' | 'monthly'>('monthly');

  useEffect(() => {
    if (visible) {
      setPaymentMode(initialMode);
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
  }, [visible, planName, initialMode]);

  if (!isRendered) return null;

  let steps = [];
  let checkoutPrice = '';

  if (planName === 'PRO') {
    if (paymentMode === 'one-time') {
      checkoutPrice = '$14.99';
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
    checkoutPrice = '$14.99';
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
              style={[styles.toggleBtn, paymentMode === 'monthly' && styles.toggleBtnActive, isProMonthly && {opacity: 0.4}]} 
              onPress={() => !isProMonthly && setPaymentMode('monthly')}
              disabled={isPurchasing || isProMonthly}
            >
              <Text style={[styles.toggleBtnText, paymentMode === 'monthly' && styles.toggleBtnTextActive]}>
                {isProMonthly ? 'Monthly (Active)' : 'Monthly ($9.99)'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toggleBtn, paymentMode === 'one-time' && styles.toggleBtnActive, isProOneTime && {opacity: 0.4}]} 
              onPress={() => !isProOneTime && setPaymentMode('one-time')}
              disabled={isPurchasing || isProOneTime}
            >
              <Text style={[styles.toggleBtnText, paymentMode === 'one-time' && styles.toggleBtnTextActive]}>
                {isProOneTime ? 'One-Time (Owned)' : 'One-Time ($14.99)'}
              </Text>
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
  scrollContent: { paddingHorizontal: 5, paddingTop: Platform.OS === 'ios' ? 70 : 40, paddingBottom: 30 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  mainTitle: { color: '#ffffff', fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 38 },
  mainSubtitle: { color: '#cccccc', fontSize: 15, marginTop: 8, textAlign: 'center' },
  
  topBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 0, 204, 0.3)', 
    borderRadius: 20, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    alignSelf: 'center', 
    marginBottom: 25 
  },
  topBannerText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  packsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 2 },
  packWrapper: { width: '48.5%', position: 'relative' },
  
  packInner: { 
    borderRadius: 20, 
    padding: 10, 
    paddingBottom: 20, 
    borderWidth: 2, 
    alignItems: 'center', 
    flex: 1
  },
  
  packHeaderClickable: { width: '100%', alignItems: 'center', marginBottom: 15 },
  packTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  packSubDescHeader: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  packSubDescSmall: { color: '#aaaaaa', fontSize: 11, textAlign: 'center', marginBottom: 15, marginTop: 10, paddingHorizontal: 2, lineHeight: 14 },
  
  priceContainer: { alignItems: 'center', marginBottom: 5 },
  packPriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  packPrice: { fontSize: 28, fontWeight: '900' },
  packDesc: { color: '#aaaaaa', fontSize: 12, fontWeight: 'bold', marginLeft: 2 },
  onlyText: { color: '#aaaaaa', fontSize: 10, fontWeight: 'bold', marginTop: 2, letterSpacing: 2 },
  
  featuresListContainer: { flex: 1, width: '100%', alignItems: 'flex-start', paddingLeft: 2, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, width: '100%' },
  featureIcon: { marginRight: 6, marginTop: 1 },
  featureText: { color: '#ffffff', fontSize: 11, flexShrink: 1, lineHeight: 16 },
  featureSubText: { fontSize: 10, marginTop: 2 },

  badge: { position: 'absolute', top: -12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 5 },
  badgeText: { color: '#000000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  btnWrapper: { width: '100%', marginTop: 'auto', marginBottom: 5 },
  actionButton: { width: '100%', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },

  oneTimeContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 15,
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
    marginTop: 15
  },
  oneTimeBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#ffcc00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  oneTimeBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  oneTimeBtn: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 5
  },
  oneTimeBtnPrice: {
    color: '#ffcc00',
    fontSize: 15,
    fontWeight: 'bold'
  },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 35 },
  bottomFooterText: { color: '#aaaaaa', fontSize: 13, fontWeight: '500' },

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