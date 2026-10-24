import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { authApi, academicYearApi, DEFAULT_PROD_URL, setSessionExpiredHandler } from '../api/client';

export const AuthContext = createContext({
  user: null,
  token: null,
  apiUrl: DEFAULT_PROD_URL,
  isLoading: true,
  activeAcademicYearId: null,
  activeAcademicYearName: '',
  academicYears: [],
  login: async () => {},
  logout: async () => {},
  updateApiUrl: async () => {},
  switchAcademicYear: async () => {},
  fetchAcademicYears: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_PROD_URL);
  const [isLoading, setIsLoading] = useState(true);

  // Academic Year / Session state
  const [activeAcademicYearId, setActiveAcademicYearId] = useState(null);
  const [activeAcademicYearName, setActiveAcademicYearName] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    loadStoredSession();
    setSessionExpiredHandler(() => {
      logout();
    });
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem('@school_erp_api_url');
      if (storedUrl) {
        setApiUrl(storedUrl);
        apiClient.defaults.baseURL = storedUrl;
      }

      const storedToken = await AsyncStorage.getItem('@school_erp_token');
      const storedUser = await AsyncStorage.getItem('@school_erp_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Load active academic year
        const storedYearId = await AsyncStorage.getItem('@school_erp_active_academic_year_id');
        const storedYearName = await AsyncStorage.getItem('@school_erp_active_academic_year_name');

        if (storedYearId) {
          setActiveAcademicYearId(Number(storedYearId));
          setActiveAcademicYearName(storedYearName || '');
        } else if (parsedUser.academicYearId) {
          setActiveAcademicYearId(parsedUser.academicYearId);
          setActiveAcademicYearName(parsedUser.academicYearName || '2026-27');
        }
      }
    } catch (e) {
      console.error('Failed to load session from storage', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await academicYearApi.getAcademicYears();
      if (res.data?.success && res.data.data) {
        const list = res.data.data;
        setAcademicYears(list);

        // If no active session is set yet, pick current or first
        if (!activeAcademicYearId && list.length > 0) {
          const current = list.find((y) => y.isCurrent) || list[0];
          await switchAcademicYear(current.id, current.name);
        }
        return list;
      }
    } catch (err) {
      console.warn('Failed to fetch academic years:', err);
    }
    return [];
  };

  const switchAcademicYear = async (yearId, yearName) => {
    try {
      const numId = Number(yearId);
      setActiveAcademicYearId(numId);
      setActiveAcademicYearName(yearName || '');

      await AsyncStorage.setItem('@school_erp_active_academic_year_id', String(numId));
      if (yearName) {
        await AsyncStorage.setItem('@school_erp_active_academic_year_name', yearName);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to switch academic session', e);
      return { success: false, message: 'Could not switch session.' };
    }
  };

  const login = async (username, password, schoolId = null) => {
    try {
      const payload = {
        username: username.trim(),
        password,
        schoolId: schoolId ? Number(schoolId) : null,
      };

      const res = await authApi.login(payload);
      if (res.data?.success && res.data?.data) {
        const { user: userData, accessToken, refreshToken } = res.data.data;
        await AsyncStorage.setItem('@school_erp_token', accessToken);
        if (refreshToken) {
          await AsyncStorage.setItem('@school_erp_refresh_token', refreshToken);
        }
        await AsyncStorage.setItem('@school_erp_user', JSON.stringify(userData));
        setToken(accessToken);
        setUser(userData);

        if (userData.academicYearId) {
          setActiveAcademicYearId(userData.academicYearId);
          setActiveAcademicYearName(userData.academicYearName || '2026-27');
          await AsyncStorage.setItem('@school_erp_active_academic_year_id', String(userData.academicYearId));
          if (userData.academicYearName) {
            await AsyncStorage.setItem('@school_erp_active_academic_year_name', userData.academicYearName);
          }
        }

        return { success: true, user: userData };
      } else {
        return {
          success: false,
          message: res.data?.message || 'Login failed. Invalid credentials.',
        };
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Network error. Please check your server connection.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@school_erp_token');
      await AsyncStorage.removeItem('@school_erp_refresh_token');
      await AsyncStorage.removeItem('@school_erp_user');
      await AsyncStorage.removeItem('@school_erp_active_academic_year_id');
      await AsyncStorage.removeItem('@school_erp_active_academic_year_name');
      setToken(null);
      setUser(null);
      setActiveAcademicYearId(null);
      setActiveAcademicYearName('');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const updateApiUrl = async (newUrl) => {
    const trimmed = (newUrl || '').trim();
    if (!trimmed) return;
    await AsyncStorage.setItem('@school_erp_api_url', trimmed);
    setApiUrl(trimmed);
    apiClient.defaults.baseURL = trimmed;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        apiUrl,
        isLoading,
        activeAcademicYearId,
        activeAcademicYearName,
        academicYears,
        login,
        logout,
        updateApiUrl,
        switchAcademicYear,
        fetchAcademicYears,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
