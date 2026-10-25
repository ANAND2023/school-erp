import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import GatePassListScreen from '../screens/GatePassListScreen';
import IssueGatePassScreen from '../screens/IssueGatePassScreen';
import GatePassDetailScreen from '../screens/GatePassDetailScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import StudentsScreen from '../screens/StudentsScreen';
import FeesScreen from '../screens/FeesScreen';
import StaffScreen from '../screens/StaffScreen';
import NoticesScreen from '../screens/NoticesScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import TimetableScreen from '../screens/TimetableScreen';
import TransportScreen from '../screens/TransportScreen';
import InventoryScreen from '../screens/InventoryScreen';
import EnquiriesScreen from '../screens/EnquiriesScreen';
import NewAdmissionScreen from '../screens/NewAdmissionScreen';
import ExamsScreen from '../screens/ExamsScreen';
import LeaveManagementScreen from '../screens/LeaveManagementScreen';
import PromotionTcScreen from '../screens/PromotionTcScreen';
import MastersScreen from '../screens/MastersScreen';
import UsersScreen from '../screens/UsersScreen';
import ModulesHubScreen from '../screens/ModulesHubScreen';
import StudentPortalScreen from '../screens/StudentPortalScreen';
import ReportsScreen from '../screens/ReportsScreen';
import StudentOperationsScreen from '../screens/StudentOperationsScreen';
import FeeOperationsScreen from '../screens/FeeOperationsScreen';
import SuperAdminScreen from '../screens/SuperAdminScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Stack = createNativeStackNavigator();

function HeaderThemeToggle() {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{
        padding: 6,
        borderRadius: 20,
        backgroundColor: isDark ? '#334155' : 'rgba(255, 255, 255, 0.22)',
        marginRight: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={18}
        color={isDark ? '#fbbf24' : '#ffffff'}
      />
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  const { user, token, isLoading } = useContext(AuthContext);
  const { isDark, colors } = useContext(ThemeContext);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAuthenticated = !!token && !!user;
  const isStudentOrParent = user?.userType === 6 || user?.userType === 7;
  const initialRoute = !isAuthenticated ? 'Login' : (isStudentOrParent ? 'StudentPortal' : 'Home');

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.cardBg,
      text: colors.textPrimary,
      border: colors.cardBorder,
      notification: colors.danger,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? colors.cardBg : '#0284c7',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerBackTitleVisible: false,
          headerRight: () => <HeaderThemeToggle />,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StudentPortal"
          component={StudentPortalScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GatePassList"
          component={GatePassListScreen}
          options={{ title: 'Student Gate Passes' }}
        />
        <Stack.Screen
          name="IssueGatePass"
          component={IssueGatePassScreen}
          options={{ title: 'Issue Gate Pass' }}
        />
        <Stack.Screen
          name="GatePassDetail"
          component={GatePassDetailScreen}
          options={{ title: 'Gate Pass Slip' }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ title: 'Daily Attendance' }}
        />
        <Stack.Screen
          name="Students"
          component={StudentsScreen}
          options={{ title: 'Student Directory' }}
        />
        <Stack.Screen
          name="Fees"
          component={FeesScreen}
          options={{ title: 'Fees & Accounts' }}
        />
        <Stack.Screen
          name="Expenses"
          component={ExpenseScreen}
          options={{ title: 'School Expenses' }}
        />
        <Stack.Screen
          name="Expense"
          component={ExpenseScreen}
          options={{ title: 'School Expenses' }}
        />
        <Stack.Screen
          name="Timetable"
          component={TimetableScreen}
          options={{ title: 'Class Timetable' }}
        />
        <Stack.Screen
          name="Transport"
          component={TransportScreen}
          options={{ title: 'Transport & Buses' }}
        />
        <Stack.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ title: 'Store & Inventory' }}
        />
        <Stack.Screen
          name="Staff"
          component={StaffScreen}
          options={{ title: 'Staff & Faculty' }}
        />
        <Stack.Screen
          name="Notices"
          component={NoticesScreen}
          options={{ title: 'School Notices' }}
        />
        <Stack.Screen
          name="ModulesHub"
          component={ModulesHubScreen}
          options={{ title: 'All ERP Modules' }}
        />
        <Stack.Screen
          name="Enquiries"
          component={EnquiriesScreen}
          options={{ title: 'Admission Enquiries' }}
        />
        <Stack.Screen
          name="NewAdmission"
          component={NewAdmissionScreen}
          options={{ title: 'Student Admission Form' }}
        />
        <Stack.Screen
          name="Exams"
          component={ExamsScreen}
          options={{ title: 'Examinations' }}
        />
        <Stack.Screen
          name="LeaveManagement"
          component={LeaveManagementScreen}
          options={{ title: 'Leave & Holidays' }}
        />
        <Stack.Screen
          name="PromotionTc"
          component={PromotionTcScreen}
          options={{ title: 'Promotion & TC' }}
        />
        <Stack.Screen
          name="Masters"
          component={MastersScreen}
          options={{ title: 'School Masters' }}
        />
        <Stack.Screen
          name="Users"
          component={UsersScreen}
          options={{ title: 'User Accounts' }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Reports & Analytics Hub' }}
        />
        <Stack.Screen
          name="StudentOperations"
          component={StudentOperationsScreen}
          options={{ title: 'Student Administrative Suite' }}
        />
        <Stack.Screen
          name="FeeOperations"
          component={FeeOperationsScreen}
          options={{ title: 'Fee Structures & Billing' }}
        />
        <Stack.Screen
          name="SuperAdmin"
          component={SuperAdminScreen}
          options={{ title: 'Super Admin Portal' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
