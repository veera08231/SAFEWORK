import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles, { COLORS } from '../styles';
import { submitComplaint } from '../database';

const ComplaintScreen = ({ user, navigation }) => {
  const [incident, setIncident] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState('');

  const handleSubmit = async () => {
    if (!incident || !email) {
      alert('Please provide incident and your email.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitComplaint(
        user.userId,
        incident,
        description,
        '',
        email
      );
      if (result.success) {
        setCaseId(result.caseId);
        setSubmitted(true);
      } else {
        alert(result.msg || 'Submission failed');
      }
    } catch (err) {
      alert('Server error. Is backend running?');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Complaint Submitted</Text>
        </View>
        <View style={[styles.center, { padding: 20 }]}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.black, marginTop: 16 }}>
            Complaint Submitted Successfully
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>
            Your Case ID: {caseId}
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, { marginTop: 24, minWidth: 200 }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.btnText, styles.btnTextWhite]}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Raise Complaint</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Main Incident</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Briefly describe the incident"
              placeholderTextColor={COLORS.gray}
              value={incident}
              onChangeText={setIncident}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Detailed Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add detailed explanation (optional)"
              placeholderTextColor={COLORS.gray}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Your Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email to receive updates"
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={[styles.btnText, styles.btnTextWhite]}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ComplaintScreen;