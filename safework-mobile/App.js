import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  LogBox,
  ScrollView,
  TextInput,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import SOSScreen from './src/screens/SOSScreen';
import ComplaintScreen from './src/screens/ComplaintScreen';
import StatusScreen from './src/screens/StatusScreen';
import CaseDetailsScreen from './src/screens/CaseDetailsScreen';
import SOSHistoryScreen from './src/screens/SOSHistoryScreen';
import Toast from './src/components/Toast';

import { initDatabase } from './src/database';
import { COLORS } from './src/styles';

LogBox.ignoreLogs(['Setting a timer']);

const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        await SplashScreen.hideAsync();
      } catch (err) {
        console.error('Database init error:', err);
        setDbReady(true);
        await SplashScreen.hideAsync();
      }
    };
    init();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => false);
    return () => backHandler.remove();
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DC143C' }}>
        <StatusBar barStyle="light-content" backgroundColor="#DC143C" />
        <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, letterSpacing: 2 }}>
          SAFEWORK
        </Text>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <NavigationContainer>
        {user ? (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="SOS">
              {(props) => <SOSScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="Complaint">
              {(props) => <ComplaintScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="Status">
              {(props) => <StatusScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
            <Stack.Screen name="SOSHistory">
              {(props) => <SOSHistoryScreen {...props} user={user} />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>

      {/* Chatbot FAB - Only when logged in */}
      {user && !showChat && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            backgroundColor: COLORS.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            zIndex: 999,
          }}
          onPress={() => setShowChat(true)}
        >
          <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Chatbot Panel Overlay */}
      {user && showChat && (
        <ChatbotOverlay onClose={() => setShowChat(false)} />
      )}

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ visible: false, message: '', type: 'success' })}
      />
    </View>
  );
}

// Chatbot overlay component
const ChatbotOverlay = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { text: 'Hi, I am SAFEWORK assistant. Ask about SOS, Complaint, Help, or POSH.', sender: 'bot' },
    { text: 'Emergency tips: Stay in safe place. Share location.', sender: 'bot' },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const appendMessage = (text, sender) => {
    setMessages((prev) => [...prev, { text, sender }]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
  };

  const respondToChat = (input) => {
    const text = input.toLowerCase();
    if (text.includes('sos')) {
      appendMessage('Press SOS button for emergency', 'bot');
    } else if (text.includes('complaint')) {
      appendMessage('Go to complaint section and submit incident', 'bot');
    } else if (text.includes('help')) {
      appendMessage('You can trigger SOS or contact admin', 'bot');
    } else if (text.includes('posh')) {
      appendMessage('POSH handles workplace harassment complaints', 'bot');
    } else {
      appendMessage('I can help with SOS, Complaint, Help, and POSH.', 'bot');
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    appendMessage(text, 'user');
    setInputText('');
    respondToChat(text);
  };

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
      backgroundColor: COLORS.white, zIndex: 1000,
    }}>
      <View style={{
        backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 14,
        paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '600' }}>SAFEWORK Assistant</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
          <Text style={{ color: COLORS.white, fontSize: 24 }}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1, padding: 16, backgroundColor: '#F7FAFC' }} contentContainerStyle={{ flexGrow: 1 }}>
        {messages.map((msg, idx) => (
          <View key={idx} style={{
            maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 10,
            backgroundColor: msg.sender === 'user' ? COLORS.primary : '#E2E8F0',
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            borderBottomLeftRadius: msg.sender === 'user' ? 12 : 4,
            borderBottomRightRadius: msg.sender === 'user' ? 4 : 12,
          }}>
            <Text style={{ color: msg.sender === 'user' ? COLORS.white : COLORS.black, fontSize: 15 }}>
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{
        flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
        backgroundColor: COLORS.white, alignItems: 'center',
      }}>
        <TextInput
          style={{
            flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, backgroundColor: '#F7FAFC', marginRight: 10,
          }}
          placeholder="Ask for help..."
          placeholderTextColor={COLORS.gray}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 }}
          onPress={handleSend}
        >
          <Text style={{ color: COLORS.white, fontWeight: '600' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};