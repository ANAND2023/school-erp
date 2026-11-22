import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi, DEFAULT_PROD_URL, DEFAULT_RENDER_URL, DEFAULT_LOCAL_URL } from '../api/client';

export default function LoginScreen({ navigation }) {
  const { login, apiUrl, updateApiUrl } = useContext(AuthContext);
  const { isDark, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Role / Portal Type: 'staff' | 'student' | 'parent' (100% matching webapp LoginPage.jsx)
  const [portalType, setPortalType] = useState('staff');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Multi-School state
  const [schools, setSchools] = useState([]);
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Server switch modal / state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(apiUrl);

  // Fetch active schools on mount or when API URL changes
  useEffect(() => {
    fetchSchools();
  }, [apiUrl]);

  const fetchSchools = async () => {
    try {
      setSchoolsLoading(true);
      const res = await authApi.getSchools();
      if (res.data?.success && res.data.data) {
        const schoolList = res.data.data;
        setSchools(schoolList);

        // Check saved school code from AsyncStorage
        const savedCode = await AsyncStorage.getItem('@school_erp_school_code');
        if (savedCode) {
          setSchoolCode(savedCode.toUpperCase());
        } else {
          // Check legacy saved school id
          const savedSchoolId = await AsyncStorage.getItem('@school_erp_selected_school_id');
          if (savedSchoolId) {
            const found = schoolList.find((s) => String(s.id) === savedSchoolId);
            if (found?.code) {
              setSchoolCode(found.code.toUpperCase());
              await AsyncStorage.setItem('@school_erp_school_code', found.code.toUpperCase());
            }
          } else if (schoolList.length === 1 && schoolList[0].code) {
            // If single school available, auto fill
            setSchoolCode(schoolList[0].code.toUpperCase());
            await AsyncStorage.setItem('@school_erp_school_code', schoolList[0].code.toUpperCase());
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load schools list:', err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleSchoolCodeChange = async (code) => {
    const upper = code.toUpperCase();
    setSchoolCode(upper);
    setErrorMessage('');
    try {
      if (upper.trim()) {
        await AsyncStorage.setItem('@school_erp_school_code', upper.trim());
      } else {
        await AsyncStorage.removeItem('@school_erp_school_code');
        await AsyncStorage.removeItem('@school_erp_selected_school_id');
      }
    } catch (e) {
      console.warn('Failed to save school code', e);
    }
  };

  // Matched school from code
  const matchedSchool = useMemo(() => {
    if (!schoolCode.trim() || schools.length === 0) return null;
    const q = schoolCode.trim().toLowerCase();
    return schools.find(
      (s) =>
        (s.code && s.code.toLowerCase() === q) ||
        (s.slug && s.slug.toLowerCase() === q) ||
        (s.name && s.name.toLowerCase() === q)
    );
  }, [schoolCode, schools]);

  const handleLogin = async () => {
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if ((portalType === 'student' || portalType === 'parent') && !schoolCode.trim()) {
      setErrorMessage('Please enter your School Code (e.g. KPS, DPS) to continue.');
      return;
    }

    setLoading(true);
    const targetSchoolId = matchedSchool ? matchedSchool.id : null;
    const targetSchoolCode = schoolCode.trim().toUpperCase() || null;
    const result = await login(username, password, targetSchoolId, targetSchoolCode);
    setLoading(false);

    if (result.success) {
      const u = result.user;
      if (u?.userType === 6 || u?.userType === 7) {
        navigation.replace('StudentPortal');
      } else {
        navigation.replace('Home');
      }
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSelectServer = async (url) => {
    setCustomUrl(url);
    await updateApiUrl(url);
  };

  const isProd = apiUrl === DEFAULT_PROD_URL;
  const isLocal = apiUrl === DEFAULT_LOCAL_URL;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={isDark ? colors.cardBg : '#0284c7'}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Banner */}
          <View style={styles.header}>
            {/* Dark / Light Mode Switcher Pill */}
            <View style={styles.topUtilityRow}>
              <TouchableOpacity
                style={styles.themeTogglePill}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isDark ? 'sunny' : 'moon'}
                  size={15}
                  color={isDark ? '#fbbf24' : '#ffffff'}
                />
                <Text style={styles.themeTogglePillText}>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.iconCircle}>
              <Image
                source={require('../../assets/dvslogo1.jpeg')}
                style={[styles.brandLogo, { borderRadius: 29 }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>DVS ERP</Text>
            <Text style={styles.brandSubtitle}>
              {portalType === 'student'
                ? 'Student Learning & Academics Portal'
                : portalType === 'parent'
                ? 'Parent Engagement & Fee Portal'
                : 'Digital Vidya Sarthi • Staff Portal'}
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Role Switcher Pill Tabs (Staff / Admin, Student, Parent) */}
            <View style={styles.roleTabsContainer}>
              {[
                { id: 'staff', label: 'Staff / Admin' },
                { id: 'student', label: '🎓 Student' },
                { id: 'parent', label: '👨‍👩‍👧 Parent' },
              ].map((tab) => {
                const active = portalType === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.roleTabBtn, active && styles.roleTabBtnActive]}
                    onPress={() => {
                      setPortalType(tab.id);
                      setErrorMessage('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleTabBtnText, active && styles.roleTabBtnTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.cardTitle}>
              {portalType === 'student'
                ? 'Student Portal'
                : portalType === 'parent'
                ? 'Parent Portal'
                : 'Sign In'}
            </Text>
            <Text style={styles.cardDesc}>
              {portalType === 'student'
                ? 'Enter your Admission Number to access your classes & fees'
                : portalType === 'parent'
                ? 'Enter your registered mobile number to check ward details'
                : 'Enter your credentials to access your ERP dashboard'}
            </Text>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={20} color="#b91c1c" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* School Code Input */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>School Code</Text>
                {schoolCode.trim() ? (
                  <View style={styles.savedBadge}>
                    <MaterialIcons name="check" size={12} color={isDark ? '#4ade80' : '#15803d'} />
                    <Text style={styles.savedBadgeText}>Saved for next time</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.inputWrapper}>
                <MaterialIcons name="apartment" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.schoolCodeInput]}
                  placeholder="e.g. KPS, DPS"
                  placeholderTextColor="#94a3b8"
                  value={schoolCode}
                  onChangeText={handleSchoolCodeChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={15}
                />
                {schoolCode ? (
                  <TouchableOpacity
                    onPress={() => handleSchoolCodeChange('')}
                    style={styles.clearBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Matched School Confirmation Badge */}
              {matchedSchool ? (
                <View style={styles.matchedSchoolBadge}>
                  <MaterialIcons name="verified" size={14} color={isDark ? '#38bdf8' : '#0284c7'} />
                  <Text style={styles.matchedSchoolText} numberOfLines={1}>
                    {matchedSchool.name} {matchedSchool.city ? `• ${matchedSchool.city}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Username / Admission No / Mobile Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {portalType === 'student'
                  ? 'Student Admission Number'
                  : portalType === 'parent'
                  ? 'Parent Mobile Number'
                  : 'Email or Username'}
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name={
                    portalType === 'student'
                      ? 'school'
                      : portalType === 'parent'
                      ? 'phone-android'
                      : 'person-outline'
                  }
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    portalType === 'student'
                      ? 'e.g. ADM/202627/0001 or Admission No'
                      : portalType === 'parent'
                      ? '10-digit registered mobile'
                      : 'Enter username or email'
                  }
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                  keyboardType={portalType === 'parent' ? 'phone-pad' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.loginBtnText}>
                    {portalType === 'student'
                      ? 'Login to Student Portal'
                      : portalType === 'parent'
                      ? 'Login to Parent Portal'
                      : 'Log In'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Server Environment Switcher */}
            <View style={styles.serverSection}>
              <TouchableOpacity
                style={styles.serverHeaderRow}
                onPress={() => setShowServerConfig(!showServerConfig)}
              >
                <View style={styles.serverRowLeft}>
                  <View style={[styles.serverStatusDot, { backgroundColor: isProd ? '#10b981' : '#f59e0b' }]} />
                  <Text style={styles.serverLabelText}>
                    Server: {isProd ? 'Live Cloud' : isLocal ? 'Local Wi-Fi PC' : 'Custom'}
                  </Text>
                </View>
                <MaterialIcons
                  name={showServerConfig ? 'expand-less' : 'settings'}
                  size={18}
                  color="#64748b"
                />
              </TouchableOpacity>

              {showServerConfig && (
                <View style={styles.serverConfigBox}>
                  <Text style={styles.serverBoxTitle}>Choose API Backend Server:</Text>

                  <TouchableOpacity
                    style={[styles.serverOption, apiUrl === DEFAULT_PROD_URL && styles.serverOptionActive]}
                    onPress={() => handleSelectServer(DEFAULT_PROD_URL)}
                  >
                    <MaterialIcons name="cloud" size={18} color={apiUrl === DEFAULT_PROD_URL ? '#0284c7' : '#64748b'} />
                    <View style={styles.serverOptionDetails}>
                      <Text style={[styles.serverOptionName, apiUrl === DEFAULT_PROD_URL && styles.serverOptionNameActive]}>
                        Live Cloud (Fast CDN)
                      </Text>
                      <Text style={styles.serverOptionUrl} numberOfLines={1}>
                        {DEFAULT_PROD_URL}
                      </Text>
                    </View>
                    {apiUrl === DEFAULT_PROD_URL && <MaterialIcons name="check" size={18} color="#0284c7" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.serverOption, apiUrl === DEFAULT_RENDER_URL && styles.serverOptionActive]}
                    onPress={() => handleSelectServer(DEFAULT_RENDER_URL)}
                  >
                    <MaterialIcons name="dns" size={18} color={apiUrl === DEFAULT_RENDER_URL ? '#0284c7' : '#64748b'} />
                    <View style={styles.serverOptionDetails}>
                      <Text style={[styles.serverOptionName, apiUrl === DEFAULT_RENDER_URL && styles.serverOptionNameActive]}>
                        Live Production (Render)
                      </Text>
                      <Text style={styles.serverOptionUrl} numberOfLines={1}>
                        {DEFAULT_RENDER_URL}
                      </Text>
                    </View>
                    {apiUrl === DEFAULT_RENDER_URL && <MaterialIcons name="check" size={18} color="#0284c7" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.serverOption, apiUrl === DEFAULT_LOCAL_URL && styles.serverOptionActive]}
                    onPress={() => handleSelectServer(DEFAULT_LOCAL_URL)}
                  >
                    <MaterialIcons name="computer" size={18} color={apiUrl === DEFAULT_LOCAL_URL ? '#0284c7' : '#64748b'} />
                    <View style={styles.serverOptionDetails}>
                      <Text style={[styles.serverOptionName, apiUrl === DEFAULT_LOCAL_URL && styles.serverOptionNameActive]}>
                        Local PC (Wi-Fi LAN)
                      </Text>
                      <Text style={styles.serverOptionUrl} numberOfLines={1}>
                        {DEFAULT_LOCAL_URL}
                      </Text>
                    </View>
                    {apiUrl === DEFAULT_LOCAL_URL && <MaterialIcons name="check" size={18} color="#0284c7" />}
                  </TouchableOpacity>

                  <View style={styles.customUrlInputRow}>
                    <TextInput
                      style={styles.customUrlInput}
                      placeholder="Custom API URL (e.g. http://192.168.1.X:5171/api)"
                      placeholderTextColor="#94a3b8"
                      value={customUrl}
                      onChangeText={setCustomUrl}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.saveUrlBtn}
                      onPress={() => handleSelectServer(customUrl)}
                    >
                      <Text style={styles.saveUrlBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? colors.cardBg : '#0284c7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: isDark ? colors.cardBg : '#0284c7',
    paddingTop: 16,
    paddingBottom: 44,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topUtilityRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  themeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#334155' : 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  themeTogglePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: isDark ? '#f8fafc' : '#ffffff',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    padding: 8,
  },
  brandLogo: {
    width: 58,
    height: 58,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: isDark ? '#38bdf8' : '#bae6fd',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  roleTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  roleTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  portalHelpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  portalHelpText: {
    flex: 1,
    fontSize: 11.5,
    color: isDark ? '#7dd3fc' : '#0369a1',
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? '#991b1b' : '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#052e16' : '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  savedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#4ade80' : '#15803d',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  schoolCodeInput: {
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  clearBtn: {
    padding: 6,
  },
  matchedSchoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
  },
  matchedSchoolText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#38bdf8' : '#0284c7',
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  serverSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  serverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  serverRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  serverConfigBox: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  serverBoxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  serverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    gap: 10,
  },
  serverOptionActive: {
    borderColor: colors.primary,
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
  },
  serverOptionDetails: {
    flex: 1,
  },
  serverOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  serverOptionNameActive: {
    color: colors.primary,
  },
  serverOptionUrl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  customUrlInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  customUrlInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: colors.textPrimary,
  },
  saveUrlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveUrlBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
