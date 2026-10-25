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
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi, DEFAULT_PROD_URL, DEFAULT_LOCAL_URL } from '../api/client';

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
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');

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

        // Check saved school from AsyncStorage
        const savedSchoolId = await AsyncStorage.getItem('@school_erp_selected_school_id');
        if (savedSchoolId && schoolList.some((s) => String(s.id) === savedSchoolId)) {
          setSelectedSchoolId(Number(savedSchoolId));
        } else if (schoolList.length === 1) {
          // If single school available, auto select
          setSelectedSchoolId(schoolList[0].id);
          await AsyncStorage.setItem('@school_erp_selected_school_id', String(schoolList[0].id));
        } else if (!savedSchoolId && schoolList.length > 0) {
          // Default to first school (e.g. DPS)
          setSelectedSchoolId(schoolList[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load schools list:', err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleSelectSchool = async (school) => {
    setSelectedSchoolId(school.id);
    setShowSchoolModal(false);
    setSchoolSearch('');
    try {
      await AsyncStorage.setItem('@school_erp_selected_school_id', String(school.id));
    } catch (e) {
      console.warn('Failed to save selected school id', e);
    }
  };

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  const filteredSchools = schools.filter((s) => {
    if (!schoolSearch.trim()) return true;
    const q = schoolSearch.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q))
    );
  });

  const handleLogin = async () => {
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    const result = await login(username, password, selectedSchoolId);
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
                source={require('../../assets/dvs-logo.png')}
                style={styles.brandLogo}
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

            {/* School Dropdown / Selector */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Select School</Text>
                {selectedSchoolId ? (
                  <View style={styles.savedBadge}>
                    <MaterialIcons name="check" size={12} color="#15803d" />
                    <Text style={styles.savedBadgeText}>Saved for next time</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.inputWrapper, styles.schoolSelectorBtn]}
                onPress={() => setShowSchoolModal(true)}
                activeOpacity={0.75}
                disabled={loading || schoolsLoading}
              >
                <MaterialIcons name="apartment" size={20} color="#0284c7" style={styles.inputIcon} />
                {schoolsLoading ? (
                  <View style={styles.schoolLoadingRow}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.placeholderText}>Loading school branches...</Text>
                  </View>
                ) : selectedSchool ? (
                  <View style={styles.selectedSchoolRow}>
                    <Text style={styles.selectedSchoolName} numberOfLines={1}>
                      {selectedSchool.name}
                    </Text>
                    {selectedSchool.code ? (
                      <View style={styles.schoolCodeChip}>
                        <Text style={styles.schoolCodeChipText}>{selectedSchool.code}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.input, styles.placeholderText]}>-- Choose Your School --</Text>
                )}
                <MaterialIcons name="arrow-drop-down" size={24} color="#64748b" />
              </TouchableOpacity>
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
                    style={[styles.serverOption, isProd && styles.serverOptionActive]}
                    onPress={() => handleSelectServer(DEFAULT_PROD_URL)}
                  >
                    <MaterialIcons name="cloud" size={18} color={isProd ? '#0284c7' : '#64748b'} />
                    <View style={styles.serverOptionDetails}>
                      <Text style={[styles.serverOptionName, isProd && styles.serverOptionNameActive]}>
                        Live Production (Render)
                      </Text>
                      <Text style={styles.serverOptionUrl} numberOfLines={1}>
                        {DEFAULT_PROD_URL}
                      </Text>
                    </View>
                    {isProd && <MaterialIcons name="check" size={18} color="#0284c7" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.serverOption, isLocal && styles.serverOptionActive]}
                    onPress={() => handleSelectServer(DEFAULT_LOCAL_URL)}
                  >
                    <MaterialIcons name="computer" size={18} color={isLocal ? '#0284c7' : '#64748b'} />
                    <View style={styles.serverOptionDetails}>
                      <Text style={[styles.serverOptionName, isLocal && styles.serverOptionNameActive]}>
                        Local PC (Wi-Fi LAN)
                      </Text>
                      <Text style={styles.serverOptionUrl} numberOfLines={1}>
                        {DEFAULT_LOCAL_URL}
                      </Text>
                    </View>
                    {isLocal && <MaterialIcons name="check" size={18} color="#0284c7" />}
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

      {/* School Selection Modal */}
      <Modal
        visible={showSchoolModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSchoolModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="school" size={24} color="#0284c7" />
                <Text style={styles.modalTitle}>Select School Branch</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSchoolModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <MaterialIcons name="search" size={20} color="#94a3b8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search school by name, code or city..."
                placeholderTextColor="#94a3b8"
                value={schoolSearch}
                onChangeText={setSchoolSearch}
                autoCorrect={false}
              />
              {schoolSearch ? (
                <TouchableOpacity onPress={() => setSchoolSearch('')}>
                  <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* School List */}
            {schoolsLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.modalLoadingText}>Loading school list...</Text>
              </View>
            ) : filteredSchools.length === 0 ? (
              <View style={styles.modalEmptyBox}>
                <MaterialIcons name="domain-disabled" size={40} color="#cbd5e1" />
                <Text style={styles.modalEmptyText}>No school found matching "{schoolSearch}"</Text>
              </View>
            ) : (
              <FlatList
                data={filteredSchools}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingVertical: 6 }}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedSchoolId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.schoolListItem,
                        isSelected && styles.schoolListItemActive,
                      ]}
                      onPress={() => handleSelectSchool(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.schoolItemLeft}>
                        <View
                          style={[
                            styles.schoolItemIconBox,
                            isSelected && { backgroundColor: '#e0f2fe' },
                          ]}
                        >
                          <MaterialIcons
                            name="apartment"
                            size={22}
                            color={isSelected ? '#0284c7' : '#64748b'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text
                              style={[
                                styles.schoolItemName,
                                isSelected && styles.schoolItemNameActive,
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.code ? (
                              <View
                                style={[
                                  styles.schoolCodeChip,
                                  isSelected && { backgroundColor: '#bae6fd' },
                                ]}
                              >
                                <Text style={styles.schoolCodeChipText}>{item.code}</Text>
                              </View>
                            ) : null}
                          </View>
                          {item.city ? (
                            <Text style={styles.schoolItemCity}>📍 {item.city}</Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected ? (
                        <MaterialIcons name="check-circle" size={22} color="#0284c7" />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={20} color="#cbd5e1" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  schoolSelectorBtn: {
    height: 48,
  },
  schoolLoadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedSchoolRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  selectedSchoolName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  schoolCodeChip: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schoolCodeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#38bdf8' : '#0369a1',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalEmptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  schoolListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  schoolListItemActive: {
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderColor: colors.primary,
  },
  schoolItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  schoolItemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  schoolItemNameActive: {
    color: colors.primary,
  },
  schoolItemCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
