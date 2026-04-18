import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

export default function LoginScreen({ navigation, setLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isFocused = useIsFocused();
  const hasCheckedBiometrics = useRef(false);

  useEffect(() => {
    hasCheckedBiometrics.current = false; // Reset biometric check when loading login screen

    return onAuthStateChanged(auth, async (user) => {
      try {

        if (hasCheckedBiometrics.current || !user || !isFocused) return; // Only check biometrics once per screen focus and if user is logged in
        hasCheckedBiometrics.current = true; // Set flag to true to prevent multiple biometric checks

        const hasHardware = await LocalAuthentication.hasHardwareAsync(); // Check if there's biometric hardware available
        const isEnrolled = await LocalAuthentication.isEnrolledAsync(); // Check if biometrics have data on the phone

        if (!hasHardware || !isEnrolled) return; // If no biometric hardware or biometric data, default to email and password

        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Log in with Biometrics' }); 
        if (result.success) setLoggedIn(true); // Set logged in state if biometric auth is successful
        if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') return; // Default to email and password if cancelled biometrics
      } catch (error) {
        console.warn(error);
      }
    });
  }, [isFocused]);

  const handleLogin = async () => {
    if (!email || !password) { 
      Alert.alert('Error', 'Please enter both email and password');
      return; // If no email or password, display alert and return to screen
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoggedIn(true); // Set logged in state to true if email and password auth is successful
    } catch (error) {
      Alert.alert('Login failed', error.message); // Display alert if wrong credentials
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Directr</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to find your next watch.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity 
          style={styles.loginButton} 
          activeOpacity={0.85} 
          onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f6f6f6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  appName: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 56,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000',
    marginTop: 12,
  },
  loginButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#000',
    marginTop: 18,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  registerButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 12,
  },
  registerButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
