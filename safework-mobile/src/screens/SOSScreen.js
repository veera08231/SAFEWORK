import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { CameraView } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import styles, { COLORS } from '../styles';
import { createSOSAlertWithEvidence, addTrackingUpdate } from '../database';
import { speak, vibrate } from '../utils';

const SOSScreen = ({ user, navigation }) => {
  const [status, setStatus] = useState('idle'); // idle | locating | recording | sending | sent
  const [countdown, setCountdown] = useState(8);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const cameraRef = useRef(null);
  const countdownRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for SOS button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Recording dot blink animation
  useEffect(() => {
    if (status === 'recording') {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [trackingInterval]);

  const requestPermissions = async () => {
    const locStatus = await Location.requestForegroundPermissionsAsync();
    if (locStatus.status !== 'granted') {
      alert('Location permission is required for SOS.');
      return false;
    }
    const audioStatus = await Audio.requestPermissionsAsync();
    if (audioStatus.status !== 'granted') {
      alert('Microphone permission is required for audio evidence.');
      return false;
    }
    try {
      const { Camera } = require('expo-camera');
      await Camera.requestCameraPermissionsAsync();
      await Camera.requestMicrophonePermissionsAsync();
    } catch (e) { /* camera optional */ }
    return true;
  };

  const startSOSFlow = async () => {
    const ok = await requestPermissions();
    if (!ok) return;

    vibrate(400);
    speak('Emergency SOS activated', 300);

    // Step 1: Get location
    setStatus('locating');
    let coords;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      coords = pos.coords;
    } catch (e) {
      alert('Unable to get location. Please enable GPS and try again.');
      setStatus('idle');
      return;
    }

    // Step 2: Show camera & start recording
    setStatus('recording');
    setCountdown(8);
    setShowCamera(true);
    speak('Recording evidence', 200);

    // Countdown timer
    let secs = 8;
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) clearInterval(countdownRef.current);
    }, 1000);

    // Give camera 1 second to fully mount before recording
    await new Promise(r => setTimeout(r, 1000));

    let audioUri = null;
    let videoUri = null;
    let audioRecording = null;
    let videoPromise = null;

    // Start audio recording
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      audioRecording = new Audio.Recording();
      await audioRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await audioRecording.startAsync();
    } catch (e) {
      console.warn('Audio recording failed:', e.message);
    }

    // Start video recording (camera is now visible and mounted)
    try {
      if (cameraRef.current) {
        videoPromise = cameraRef.current.recordAsync({ maxDuration: 7 });
        console.log('✅ Video recording started');
      } else {
        console.warn('⚠️ cameraRef is null');
      }
    } catch (e) {
      console.warn('Video recording failed:', e.message);
    }

    // Wait 7 seconds for recording
    await new Promise(r => setTimeout(r, 7000));

    // Stop recordings
    try {
      if (audioRecording) {
        await audioRecording.stopAndUnloadAsync();
        const uri = audioRecording.getURI();
        if (uri) {
          const dest = `${FileSystem.documentDirectory}sos_audio_${Date.now()}.m4a`;
          await FileSystem.moveAsync({ from: uri, to: dest });
          audioUri = dest;
          console.log('✅ Audio saved:', audioUri);
        }
      }
    } catch (e) {
      console.warn('Audio stop failed:', e.message);
    }

    try {
      if (videoPromise && cameraRef.current) {
        cameraRef.current.stopRecording();
        const result = await videoPromise;
        if (result && result.uri) {
          const dest = `${FileSystem.documentDirectory}sos_video_${Date.now()}.mp4`;
          await FileSystem.moveAsync({ from: result.uri, to: dest });
          videoUri = dest;
          console.log('✅ Video saved:', videoUri);
        }
      }
    } catch (e) {
      console.warn('Video stop failed:', e.message);
    }

    // Hide camera overlay
    setShowCamera(false);
    setStatus('sending');
    speak('Sending alert now', 100);

    // Step 3: Send SOS with evidence
    const result = await createSOSAlertWithEvidence(
      user.userId,
      coords.latitude,
      coords.longitude,
      audioUri,
      videoUri
    );

    if (result.success) {
      speak('SOS alert sent. Help is on the way.');
      setStatus('sent');
      startLiveTracking(result.sosId);
    } else {
      alert('Failed to send SOS. Check your internet connection.');
      setStatus('idle');
    }
  };

  const startLiveTracking = (alertSosId) => {
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await addTrackingUpdate(alertSosId, loc.coords.latitude, loc.coords.longitude);
      } catch (_) {}
    }, 120000);
    setTrackingInterval(interval);
  };

  const handleBack = () => {
    if (trackingInterval) clearInterval(trackingInterval);
    if (countdownRef.current) clearInterval(countdownRef.current);
    navigation.goBack();
  };

  return (
    <View style={styles.sosContainer}>
      {/* ── IDLE ── */}
      {status === 'idle' && (
        <>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.btnSosCircle} onPress={startSOSFlow}>
              <Text style={{ color: COLORS.white, fontSize: 36, fontWeight: '800', letterSpacing: 2 }}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.sosText}>Tap for Emergency</Text>
          <TouchableOpacity style={styles.sosCancelBtn} onPress={handleBack}>
            <Text style={styles.sosCancelBtnText}>Cancel / Back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── LOCATING ── */}
      {status === 'locating' && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.sosText}>Getting Location...{'\n'}Please wait</Text>
        </>
      )}

      {/* ── SENDING ── */}
      {status === 'sending' && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.sosText}>Uploading Evidence...{'\n'}Sending Alert</Text>
        </>
      )}

      {/* ── SENT ── */}
      {status === 'sent' && (
        <>
          <View style={styles.sosSuccessContainer}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.sosGreen} style={styles.sosSuccessIcon} />
            <Text style={styles.sosSuccessText}>SOS Alert Sent ✅</Text>
            <Text style={styles.sosSubtext}>Help is on the way. Stay safe.</Text>
          </View>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.sosCancelBtnText}>Go Back Home</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── CAMERA OVERLAY (full screen, shown only during recording) ── */}
      {showCamera && (
        <View style={overlayStyles.fullScreenOverlay}>
          <CameraView
            ref={cameraRef}
            mode="video"
            facing="front"
            style={StyleSheet.absoluteFill}
          />
          {/* Recording indicator on top */}
          <View style={overlayStyles.recordingBanner}>
            <Animated.View style={[overlayStyles.redDot, { opacity: recordingAnim }]} />
            <Text style={overlayStyles.recordingText}>🔴 Recording Evidence — {countdown}s</Text>
          </View>
          <Text style={overlayStyles.infoText}>
            This video will be attached to your emergency alert
          </Text>
        </View>
      )}
    </View>
  );
};

const overlayStyles = StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
    justifyContent: 'space-between',
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 40,
    alignSelf: 'flex-start',
    borderRadius: 8,
    margin: 16,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
});

export default SOSScreen;