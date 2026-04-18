import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';

export default function ProfileScreen({ setLoggedIn }) {
  const [profileImage, setProfileImage] = useState(null);
  const [resettingData, setResettingData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const uri = await AsyncStorage.getItem('profileImage');

        if (uri) setProfileImage(uri);
      } catch (error) {
        console.warn('Error loading data',error);
      }
    };
    loadData();
  }, []);

  const saveImage = async (uri) => {
    try {
      await AsyncStorage.setItem('profileImage', uri);
      setProfileImage(uri);
    } catch (error) {
      console.warn('Error saving profile image', error);
    }
  };

  const removeImage = async () => {
    try {
      await AsyncStorage.removeItem('profileImage');
      setProfileImage(null);
    } catch (error) {
      console.warn('Error removing profile image', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      saveImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission to use camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      saveImage(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    try {
      await LocalAuthentication.cancelAuthenticate();
      await signOut(auth);
    } catch (error) {
      console.warn(error);
    }
    setLoggedIn(false);
  };

  const resetUserData = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('No user signed in', 'Sign in again before resetting your data.');
      return;
    }

    try {
      setResettingData(true);

      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', user.uid)
      );
      const swipeSnapshot = await getDocs(swipesQuery);

      await Promise.all(swipeSnapshot.docs.map((swipeDoc) => deleteDoc(swipeDoc.ref)));
      await AsyncStorage.removeItem('profileImage');
      setProfileImage(null);

      Alert.alert('Data reset', 'Your swipe history, watchlist, and profile photo have been cleared.');
    } catch (error) {
      console.warn(error);
      Alert.alert('Reset failed', 'Unable to clear your data right now. Please try again.');
    } finally {
      setResettingData(false);
    }
  };

  const confirmReset = () => {
    Alert.alert('Reset all data', 'This permanently clears your swipe history, watchlist, and profile photo.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetUserData }]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={styles.profileCardContent}>
          {profileImage && (
            <View style={styles.avatar}>
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            </View>
          )}
          {!profileImage && (
            <View style={styles.avatar}>
              <Text style={styles.avatarPlaceholderText}>No Photo</Text>
            </View>
          )}
          <View style={{ width: '100%' }}>
            <TouchableOpacity style={styles.libraryButton} activeOpacity={0.85} onPress={pickImage}>
              <Text style={styles.libraryButtonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} activeOpacity={0.85} onPress={takePhoto}>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity style={styles.removeButton} activeOpacity={0.85} onPress={removeImage}>
                <Text style={styles.removeButtonText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.accountTitle}>Account</Text>
        <TouchableOpacity
          style={[styles.resetButton, resettingData && {opacity: 0.6}]}
          activeOpacity={0.85}
          onPress={confirmReset}
          disabled={resettingData}>
          <Text style={styles.resetButtonText}>
            {resettingData && 'Resetting data...'}
            {!resettingData && 'Reset All Data'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileCardContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholderText: {
    color: '#666',
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  libraryButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  libraryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  photoButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  removeButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resetButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#c62828',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#efc4c4',
  },
  logoutButtonText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: 'bold',
  },
});


