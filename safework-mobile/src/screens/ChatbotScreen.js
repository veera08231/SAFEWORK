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
    
    // Simulate thinking delay for realism
    setTimeout(() => {
      let reply = '';
      
      // Greetings
      if (text.match(/\\b(hi|hello|hey|namaste)\\b/)) {
        reply = 'Hello! I am your SAFEWORK assistant. How can I help you stay safe today?';
      } 
      // Emergency / SOS
      else if (text.match(/\\b(sos|emergency|help|danger|save me)\\b/)) {
        reply = 'If you are in immediate danger, PLEASE PRESS THE RED SOS BUTTON immediately! It will record evidence and alert your emergency contacts.';
      } 
      // Harassment / POSH
      else if (text.match(/\\b(posh|harassment|teasing|abuse|badly|misbehave)\\b/)) {
        reply = 'I am so sorry you are facing this. Please go to the "Raise Complaint" section immediately. Your identity will be protected and action will be taken under POSH guidelines.';
      }
      // Status
      else if (text.match(/\\b(status|track|where is my complaint)\\b/)) {
        reply = 'You can track your existing complaints by clicking "Track Status" below or going to the Status screen from the home page.';
      }
      // Gratitude
      else if (text.match(/\\b(thanks|thank you|ok|okay|good)\\b/)) {
        reply = 'You are welcome! Stay safe. I am always here if you need assistance.';
      }
      // Generic conversational fallback
      else {
        const responses = [
          "I understand. Your safety is our priority. Do you need to report an incident?",
          "Okay, please let me know if you need to trigger an SOS or file a POSH complaint.",
          "I have noted that. Is there anything specific you need help with regarding workplace safety?",
          "Got it. Please remember you can use the SOS button anytime for immediate emergencies."
        ];
        reply = responses[Math.floor(Math.random() * responses.length)];
      }

      appendMessage(reply, 'bot');
    }, 600); // 600ms delay to feel natural
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