import { Alert, Vibration } from 'react-native';
import * as Speech from 'expo-speech';

export function speak(text, delay = 0) {
  setTimeout(() => {
    Speech.speak(text, { rate: 1.0, pitch: 1.0 });
  }, delay);
}

export function vibrate(duration = 400) {
  try {
    Vibration.vibrate(duration);
  } catch (e) {
    // vibration not supported
  }
}

export function showConfirmAlert(title, message) {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}

export function formatDate(dateValue) {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-CA');
}

export function formatTime(dateValue) {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString();
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}