import React from 'react';
import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from './src/LoginScreen';
import RegisterScreen from './src/RegisterScreen';
import SwipeScreen from './src/SwipeScreen';
import MovieScreen from './src/MovieScreen';
import WatchlistScreen from './src/WatchlistScreen';
import ProfileScreen from './src/ProfileScreen';

const AuthStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const WatchlistStack = createNativeStackNavigator();

function AuthStackScreen({ setLoggedIn }) {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login">
        {props => <LoginScreen {...props} setLoggedIn={setLoggedIn} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabScreen({ setLoggedIn }) {
  return (
    <MainTabs.Navigator
      screenOptions={{
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontSize: 16,
          marginBottom: 4,
        },
      }}
    >
      <MainTabs.Screen
        name="Home"
        options={{ headerShown: false }}
      >
        {() => (
          <HomeStack.Navigator>
            <HomeStack.Screen name="Swipe" component={SwipeScreen} />
            <HomeStack.Screen name="Movie" component={MovieScreen} />
          </HomeStack.Navigator>
        )}
      </MainTabs.Screen>
      <MainTabs.Screen
        name="Watchlist"
        options={{ headerShown: false }}
      >
        {() => (
          <WatchlistStack.Navigator>
            <WatchlistStack.Screen name="WatchlistHome" component={WatchlistScreen} options={{ title: 'Watchlist' }} />
            <WatchlistStack.Screen name="Movie" component={MovieScreen} />
          </WatchlistStack.Navigator>
        )}
      </MainTabs.Screen>
      <MainTabs.Screen name="Profile">
        {props => <ProfileScreen {...props} setLoggedIn={setLoggedIn} />}
      </MainTabs.Screen>
    </MainTabs.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setLoggedIn] = React.useState(false);
  if (isLoggedIn) {
    return (
      <NavigationContainer>
        <MainTabScreen setLoggedIn={setLoggedIn} />
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }
  return (
    <NavigationContainer>
      <AuthStackScreen setLoggedIn={setLoggedIn} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
