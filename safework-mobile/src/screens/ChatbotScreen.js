import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles, { COLORS } from '../styles';

const ChatbotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    { text: 'Hi, I am SAFEWORK assistant. Ask about SOS, Complaint, Help, or POSH.', sender: 'bot' },
    { text: 'Emergency tips: Stay in safe place. Share location.', sender: 'bot' },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const appendMessage = (text, sender) => {
    setMessages((prev) => [...prev, { text, sender }]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const respondToChat = (input) => {
    const text = input.toLowerCase();

    if (text.includes('sos')) {
      appendMessage('Press SOS button or volume button 3 times for emergency', 'bot');
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

  const handleAction = (action) => {
    if (action === 'sos') {
      appendMessage('Triggering SOS now.', 'bot');
      navigation.navigate('SOS');
    } else if (action === 'complaint') {
      appendMessage('Opening complaint section.', 'bot');
      navigation.navigate('Complaint');
    } else if (action === 'status') {
      appendMessage('Opening complaint status.', 'bot');
      navigation.navigate('Status');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chatbotPanel}>
        <View style={styles.chatbotHeader}>
          <Text style={styles.chatbotHeaderText}>SAFEWORK Assistant</Text>
          <TouchableOpacity
            style={styles.chatbotCloseBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.chatbotCloseText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatbotMessages}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.chatMsg,
                msg.sender === 'user' ? styles.chatMsgUser : styles.chatMsgBot,
              ]}
            >
              <Text
                style={
                  msg.sender === 'user'
                    ? styles.chatMsgUserText
                    : styles.chatMsgBotText
                }
              >
                {msg.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatbotSuggestions}>
          <TouchableOpacity
            style={styles.suggestionBtn}
            onPress={() => handleAction('sos')}
          >
            <Text style={styles.suggestionBtnText}>Trigger SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionBtn}
            onPress={() => handleAction('complaint')}
          >
            <Text style={styles.suggestionBtnText}>File Complaint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionBtn}
            onPress={() => handleAction('status')}
          >
            <Text style={styles.suggestionBtnText}>Track Status</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatbotInputRow}>
          <TextInput
            style={styles.chatbotInput}
            placeholder="Ask for help..."
            placeholderTextColor={COLORS.gray}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.chatbotSendBtn} onPress={handleSend}>
            <Text style={styles.chatbotSendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatbotScreen;