import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import styles, { COLORS } from '../styles';
import {
  createSOSAlertWithAudio,
  addTrackingUpdate,
  saveEvidenceAudio,
} from '../database';
import { speak, vibrate } from '../utils';

const SOSScreen = ({ user, navigation }) => {
  const [status, setStatus] = useState('idle'); // idle, locating, recording, sent, cancelled
  const [loading, setLoading] = useState(false);
  const [sosId, setSosId] = useState(null);
  const [location, setLocation] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for SOS button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [trackingInterval]);

  const requestPermissions = async () => {
    const locStatus = await Location.requestForegroundPermissionsAsync();
    if (locStatus.status !== 'granted') {
      alert('Location permission is required for SOS');
      return false;
    }

    const audioStatus = await Audio.requestPermissionsAsync();
    if (audioStatus.status !== 'granted') {
      alert('Microphone permission is required for audio evidence');
      return false;
    }

    const camStatus = await Camera.Camera.requestCameraPermissionsAsync();
    if (camStatus.status !== 'granted') {
      // Camera is optional, continue without it
    }

    return true;
  };

  const startSOSFlow = async () => {
    if (loading) return;
    setLoading(true);

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setLoading(false);
      return;
    }

    setStatus('locating');
    speak('Fetching Location', 500);
    vibrate(400);

    try {
      // Step 1: Get location and start recording SIMULTANEOUSLY
      const locPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Step 2: Start audio recording immediately
      let recording = null;
      let audioUri = null;
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        setStatus('recording');
        speak('Recording evidence', 500);
      } catch (recErr) {
        console.warn('Audio recording not available:', recErr);
      }

      // Step 3: Wait for location
      const loc = await locPromise;
      setLocation(loc.coords);

      // Step 4: Wait 8 seconds for audio evidence
      if (recording) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          if (uri) {
            const dest = `${FileSystem.documentDirectory}sos_audio_${Date.now()}.m4a`;
            await FileSystem.moveAsync({ from: uri, to: dest });
            audioUri = dest;
          }
        } catch (stopErr) {
          console.warn('Could not stop recording:', stopErr);
        }
      }

      // Step 5: Send SOS + audio together in ONE request (so email has audio attached)
      const result = await createSOSAlertWithAudio(
        user.userId,
        loc.coords.latitude,
        loc.coords.longitude,
        audioUri
      );

      if (result.success) {
        setSosId(result.sosId);
        speak('SOS activated. Help is on the way.');
        setStatus('sent');
        setLoading(false);
        startLiveTracking(result.sosId);
      } else {
        alert('Failed to send SOS. Please try again.');
        setStatus('idle');
        setLoading(false);
      }
    } catch (err) {
      console.error('SOS flow error:', err);
      alert('Unable to retrieve your location');
      setStatus('idle');
      setLoading(false);
    }
  };


  const startLiveTracking = (alertSosId) => {
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await addTrackingUpdate(
          alertSosId,
          loc.coords.latitude,
          loc.coords.longitude
        );
      } catch (err) {
        // Silently fail on tracking
      }
    }, 120000); // every 2 minutes
    setTrackingInterval(interval);
  };

  const captureImageEvidence = async (alertSosId) => {
    // Placeholder — no-op for now
  };

  const handleCancel = () => {
    setStatus('idle');
    setSosId(null);
    setLocation(null);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    navigation.goBack();
  };

  const handleCancelHome = () => {
    if (status === 'sent') {
      handleCancel();
    }
  };

  return (
    <View style={styles.sosContainer}>
      {status === 'idle' && (
        <>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.btnSosCircle, loading && styles.btnDisabled]}
              onPress={startSOSFlow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.white} />
              ) : (
                <Text style={{ color: COLORS.white, fontSize: 36, fontWeight: '800', letterSpacing: 2 }}>
                  SOS
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.sosText}>Tap for Emergency</Text>
          <TouchableOpacity style={styles.sosCancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.sosCancelBtnText}>Cancel / Back</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'locating' && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.sosText}>Getting Location...</Text>
        </>
      )}

      {status === 'recording' && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.sosText}>Recording Evidence...{"\n"}(8 seconds)</Text>
        </>
      )}

      {status === 'sent' && (
        <>
          <View style={styles.sosSuccessContainer}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.sosGreen} style={styles.sosSuccessIcon} />
            <Text style={styles.sosSuccessText}>SOS Alert Sent</Text>
            <Text style={styles.sosSubtext}>Help is on the way. You will get help soon.</Text>
          </View>
          <TouchableOpacity onPress={handleCancelHome}>
            <Text style={styles.sosCancelBtnText}>Cancel / Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default SOSScreen;