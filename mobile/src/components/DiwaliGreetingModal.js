import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 12 Radial Firework Sparkle Particles
const FIREWORK_COUNT = 12;

export default function DiwaliGreetingModal({ visible, onClose }) {
  const { user } = useContext(AuthContext);
  const [isDiyaLit, setIsDiyaLit] = useState(true);
  const [burstCount, setBurstCount] = useState(0);

  // Entrance Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Flame Flickering & Wobble Loop
  const flamePulse = useRef(new Animated.Value(1)).current;
  const flameWobble = useRef(new Animated.Value(0)).current;

  // Mandala Slow Rotation Loop
  const mandalaRotate = useRef(new Animated.Value(0)).current;

  // Floating Sparkles
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  // Firework Particles Animation
  const fireworkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset & Trigger Entrance
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.82);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Flame Flicker & Wobble Loop
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(flamePulse, {
              toValue: 1.22,
              duration: 350,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(flameWobble, {
              toValue: 1,
              duration: 350,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(flamePulse, {
              toValue: 0.92,
              duration: 400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(flameWobble, {
              toValue: -1,
              duration: 400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(flamePulse, {
              toValue: 1.1,
              duration: 300,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(flameWobble, {
              toValue: 0,
              duration: 300,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      // Rotating Mandala
      Animated.loop(
        Animated.timing(mandalaRotate, {
          toValue: 1,
          duration: 25000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Floating Sparkles Staggered
      const createSparkleLoop = (val, duration) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 1,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
      };
      createSparkleLoop(sparkle1, 1800).start();
      createSparkleLoop(sparkle2, 2400).start();
      createSparkleLoop(sparkle3, 2100).start();

      // Initial Firework Burst
      triggerFireworkBurst();
    }
  }, [visible]);

  const triggerFireworkBurst = () => {
    fireworkAnim.setValue(0);
    Animated.timing(fireworkAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setBurstCount((c) => c + 1);
  };

  const handleTapDiya = () => {
    triggerFireworkBurst();
  };

  const handleShareDiwaliWish = async () => {
    const schoolName = user?.schoolName || 'Our School';
    const msg = `🪔✨ Happy Diwali! ✨🪔\n\nMay the supreme light of Deepavali illuminate your pathway to wisdom, prosperity, success, and boundless happiness.\n\nWishing you and your beloved family a sparkling and blessed Diwali!\n\n— Warmest Greetings from ${schoolName} 🌟`;
    try {
      await Share.share({
        message: msg,
        title: 'Happy Diwali Wishes',
      });
    } catch (e) {
      // Fallback to whatsapp if needed
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() => {});
    }
  };

  const mandalaSpin = mandalaRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const flameTilt = flameWobble.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '6deg'],
  });

  const sparkleY1 = sparkle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const sparkleY2 = sparkle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });
  const sparkleY3 = sparkle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });

  const schoolName = user?.schoolName || 'School Campus & Community';
  const userName = user?.fullName || user?.username || 'Valued Member';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Deep Festive Blurred Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Modal Container */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Outer Glowing Border Ring */}
          <View style={styles.cardGlowBorder}>
            <View style={styles.cardInner}>
              {/* Close Button Top Right */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#fef08a" />
              </TouchableOpacity>

              {/* Decorative Auspicious Header */}
              <View style={styles.auspiciousHeaderRow}>
                <Text style={styles.shubhText}>॥ शुभ ॥</Text>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>FESTIVAL OF LIGHTS 🪔</Text>
                </View>
                <Text style={styles.shubhText}>॥ लाभ ॥</Text>
              </View>

              {/* Sparkle Emojis Floating Background */}
              <Animated.Text
                style={[
                  styles.sparkleItem,
                  { top: 55, left: 24, transform: [{ translateY: sparkleY1 }] },
                ]}
              >
                ✨
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.sparkleItem,
                  { top: 75, right: 30, transform: [{ translateY: sparkleY2 }] },
                ]}
              >
                ⭐
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.sparkleItem,
                  { bottom: 130, left: 20, transform: [{ translateY: sparkleY3 }] },
                ]}
              >
                🌟
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.sparkleItem,
                  { bottom: 140, right: 26, transform: [{ translateY: sparkleY1 }] },
                ]}
              >
                ✨
              </Animated.Text>

              {/* Central Glowing Diya & Mandala Stage */}
              <View style={styles.diyaStage}>
                {/* Slow Rotating Golden Rangoli / Mandala */}
                <Animated.View
                  style={[
                    styles.mandalaRing,
                    { transform: [{ rotate: mandalaSpin }] },
                  ]}
                >
                  <View style={styles.mandalaDot1} />
                  <View style={styles.mandalaDot2} />
                  <View style={styles.mandalaDot3} />
                  <View style={styles.mandalaDot4} />
                  <View style={styles.mandalaInnerCircle} />
                </Animated.View>

                {/* Animated Firework Particles Shooting Outwards */}
                {Array.from({ length: FIREWORK_COUNT }).map((_, i) => {
                  const angle = (i * (360 / FIREWORK_COUNT) * Math.PI) / 180;
                  const radius = 95;
                  const targetX = Math.cos(angle) * radius;
                  const targetY = Math.sin(angle) * radius;

                  const particleTranslateX = fireworkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetX],
                  });
                  const particleTranslateY = fireworkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetY],
                  });
                  const particleScale = fireworkAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 0],
                  });
                  const particleOpacity = fireworkAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [1, 0.9, 0],
                  });

                  const colors = ['#fde047', '#fb923c', '#f43f5e', '#a855f7', '#38bdf8', '#4ade80'];
                  const particleColor = colors[i % colors.length];

                  return (
                    <Animated.View
                      key={`firework-${i}`}
                      style={[
                        styles.fireworkParticle,
                        {
                          backgroundColor: particleColor,
                          transform: [
                            { translateX: particleTranslateX },
                            { translateY: particleTranslateY },
                            { scale: particleScale },
                          ],
                          opacity: particleOpacity,
                        },
                      ]}
                    />
                  );
                })}

                {/* Tappable Glowing Sacred Diya */}
                <TouchableOpacity
                  style={styles.diyaTouchable}
                  onPress={handleTapDiya}
                  activeOpacity={0.88}
                >
                  {/* Outer Flame Glow Halo */}
                  <Animated.View
                    style={[
                      styles.flameOuterHalo,
                      {
                        transform: [{ scale: flamePulse }],
                      },
                    ]}
                  />

                  {/* Middle Warm Flame Glow */}
                  <Animated.View
                    style={[
                      styles.flameMiddleGlow,
                      {
                        transform: [{ scale: flamePulse }, { rotate: flameTilt }],
                      },
                    ]}
                  />

                  {/* Core Teardrop Flame */}
                  <Animated.View
                    style={[
                      styles.flameTeardrop,
                      {
                        transform: [{ scale: flamePulse }, { rotate: flameTilt }],
                      },
                    ]}
                  >
                    <View style={styles.flameInnerWhite} />
                  </Animated.View>

                  {/* Diya Clay & Gold Pot / Base */}
                  <View style={styles.diyaBase}>
                    {/* Golden Ornamental Rim */}
                    <View style={styles.diyaRim}>
                      <View style={styles.diyaRimBead} />
                      <View style={styles.diyaRimBead} />
                      <View style={styles.diyaRimBead} />
                      <View style={styles.diyaRimBead} />
                      <View style={styles.diyaRimBead} />
                    </View>
                    {/* Diya Bowl Curve */}
                    <View style={styles.diyaBowl}>
                      <MaterialCommunityIcons
                        name="star-four-points"
                        size={14}
                        color="#fef08a"
                      />
                    </View>
                    {/* Diya Stand */}
                    <View style={styles.diyaFoot} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Tap Diya Hint */}
              <TouchableOpacity onPress={handleTapDiya} activeOpacity={0.7}>
                <Text style={styles.tapDiyaHint}>
                  ✨ Tap Diya for Sparkles! ✨
                </Text>
              </TouchableOpacity>

              {/* Grand Main Hindi Title */}
              <Text style={styles.hindiTitle}>शुभ दीपावली</Text>

              {/* English Big Banner Title */}
              <Text style={styles.englishTitle}>HAPPY DIWALI</Text>

              {/* Personalized Warm Festive Greeting */}
              <View style={styles.greetingBox}>
                <Text style={styles.recipientName}>
                  Namaste {userName} &amp; Family,
                </Text>
                <Text style={styles.greetingMessage}>
                  May the divine radiance of Diwali illuminate your life with peace,
                  prosperity, wisdom, and eternal happiness.
                </Text>
              </View>

              {/* School Signature Badge */}
              <View style={styles.schoolSignatureRow}>
                <Ionicons name="school" size={14} color="#fde047" />
                <Text style={styles.schoolSignatureText} numberOfLines={1}>
                  {schoolName}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {/* WhatsApp Share Wishes Button */}
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShareDiwaliWish}
                  activeOpacity={0.82}
                >
                  <Ionicons name="share-social" size={16} color="#ffffff" />
                  <Text style={styles.shareBtnText}>Share Wishes</Text>
                </TouchableOpacity>

                {/* Primary Enter / Continue Button */}
                <TouchableOpacity
                  style={styles.primaryEnterBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <View style={styles.goldShineStrip} />
                  <Text style={styles.primaryEnterBtnText}>शुभ दीपावली • Enter App</Text>
                  <Ionicons name="arrow-forward" size={17} color="#451a03" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(5, 1, 15, 0.88)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0217',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 25,
  },
  cardGlowBorder: {
    padding: 2.5,
    borderRadius: 28,
    backgroundColor: '#d97706',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  cardInner: {
    backgroundColor: '#17062b',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  auspiciousHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  shubhText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  badgePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fef08a',
    letterSpacing: 1.2,
  },
  sparkleItem: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.85,
  },

  // Central Diya & Mandala Stage
  diyaStage: {
    width: 170,
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  mandalaRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251, 191, 36, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mandalaInnerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  mandalaDot1: {
    position: 'absolute',
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  mandalaDot2: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  mandalaDot3: {
    position: 'absolute',
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  mandalaDot4: {
    position: 'absolute',
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  fireworkParticle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // Diya Touchable & Layers
  diyaTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingTop: 10,
  },
  flameOuterHalo: {
    position: 'absolute',
    top: 10,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  flameMiddleGlow: {
    position: 'absolute',
    top: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251, 146, 60, 0.5)',
  },
  flameTeardrop: {
    width: 24,
    height: 38,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#f59e0b',
    borderWidth: 1.5,
    borderColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  flameInnerWhite: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },

  // Diya Pot / Bowl
  diyaBase: {
    alignItems: 'center',
    marginTop: -2,
  },
  diyaRim: {
    flexDirection: 'row',
    gap: 7,
    backgroundColor: '#b45309',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  diyaRimBead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fef08a',
  },
  diyaBowl: {
    width: 78,
    height: 32,
    backgroundColor: '#78350f',
    borderBottomLeftRadius: 39,
    borderBottomRightRadius: 39,
    borderWidth: 2,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  diyaFoot: {
    width: 28,
    height: 7,
    backgroundColor: '#92400e',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: '#b45309',
  },

  tapDiyaHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fef08a',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Titles
  hindiTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fbbf24',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 2,
    textShadowColor: 'rgba(245, 158, 11, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  englishTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 10,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  greetingBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    width: '100%',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fde047',
    textAlign: 'center',
    marginBottom: 4,
  },
  greetingMessage: {
    fontSize: 12,
    lineHeight: 17,
    color: '#f1f5f9',
    textAlign: 'center',
    fontWeight: '500',
  },

  schoolSignatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 119, 6, 0.16)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 16,
  },
  schoolSignatureText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#fef08a',
    maxWidth: 240,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34d399',
  },
  shareBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  primaryEnterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fef08a',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  goldShineStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  primaryEnterBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#451a03',
    letterSpacing: 0.3,
  },
});
