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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import styles, { COLORS } from '../styles';
import {
  createSOSAlertWithEvidence,
  addTrackingUpdate,
} from '../database';
import { speak, vibrate } from '../utils';

const SOSScreen = ({ user, navigation }) => {
  const [status, setStatus] = useState('idle'); // idle, locating, recording, sent, cancelled
  const [loading, setLoading] = useState(false);
  const [sosId, setSosId] = useState(null);
  const [location, setLocation] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);
  
  const cameraRef = useRef(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

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

  // Request camera/mic permissions on mount so CameraView is ready
  useEffect(() => {
    (async () => {
      try {
        const { Camera } = require('expo-camera');
        const camStatus = await Camera.requestCameraPermissionsAsync();
        const micStatus = await Camera.requestMicrophonePermissionsAsync();
        if (camStatus.status === 'granted' && micStatus.status === 'granted') {
          setHasCameraPermission(true);
        }
      } catch (e) {
        console.warn('Camera permission check failed:', e);
      }
    })();
  }, []);

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

      // Step 2: Start audio & video recording immediately
      let recording = null;
      let audioUri = null;
      let videoUri = null;
      let videoPromise = null;
      
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        
        // Start video recording if permitted and mounted
        if (hasCameraPermission && cameraRef.current) {
           console.log("Starting video recording...");
           videoPromise = cameraRef.current.recordAsync({ maxDuration: 8 });
        } else {
           console.warn("CameraRef is null or no permission. Camera mounted:", !!cameraRef.current);
        }
        
        setStatus('recording');
        speak('Recording evidence', 500);
      } catch (recErr) {
        console.warn('Media recording not available:', recErr);
      }

      // Step 3: Wait for location
      const loc = await locPromise;
      setLocation(loc.coords);

      // Step 4: Wait 8 seconds for audio/video evidence
      if (recording || videoPromise) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        try {
          if (recording) {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri) {
              const dest = `${FileSystem.documentDirectory}sos_audio_${Date.now()}.m4a`;
              await FileSystem.moveAsync({ from: uri, to: dest });
              audioUri = dest;
            }
          }
          if (videoPromise && cameraRef.current) {
            cameraRef.current.stopRecording();
            const videoResult = await videoPromise;
            if (videoResult && videoResult.uri) {
              console.log("Video recording success:", videoResult.uri);
              const dest = `${FileSystem.documentDirectory}sos_video_${Date.now()}.mp4`;
              await FileSystem.moveAsync({ from: videoResult.uri, to: dest });
              videoUri = dest;
            }
          }
        } catch (stopErr) {
          console.warn('Could not stop recording:', stopErr);
        }
      }

      // Step 5: Send SOS + audio + video together in ONE request
      const result = await createSOSAlertWithEvidence(
        user.userId,
        loc.coords.latitude,
        loc.coords.longitude,
        audioUri,
        videoUri
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

      {/* Hidden CameraView to record video evidence during SOS */}
      {hasCameraPermission && (
        <View style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
          <CameraView 
            ref={cameraRef}
            mode="video"
            facing="front"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
};

export default SOSScreen;