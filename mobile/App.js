import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import DiwaliGreetingModal from './src/components/DiwaliGreetingModal';

export default function App() {
  const [showDiwali, setShowDiwali] = useState(true);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigator />
          <DiwaliGreetingModal
            visible={showDiwali}
            onClose={() => setShowDiwali(false)}
          />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
