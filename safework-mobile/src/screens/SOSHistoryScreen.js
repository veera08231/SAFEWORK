import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import styles, { COLORS } from '../styles';
import { getSOSHistoryByUserId, cancelSOSAlert } from '../database';
import { formatDate, formatTime } from '../utils';

const SOSHistoryScreen = ({ user, navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await getSOSHistoryByUserId(user.userId);
      setAlerts(items);
    } catch (err) {
      console.error('Load SOS history error:', err);
    }
    setLoading(false);
  };

  const handleCancelSOS = (sosId) => {
    Alert.alert(
      'Cancel SOS',
      'Are you sure you want to cancel this SOS?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            const result = await cancelSOSAlert(sosId);
            if (result.success) {
              loadHistory();
            }
          },
        },
      ]
    );
  };

  const getStatusStyleAndColor = (status) => {
    if (status === 'cancelled') {
      return { bg: '#E2E8F0', color: '#4A5568', label: 'Cancelled' };
    }
    return { bg: '#FED7D7', color: '#9B2C2C', label: 'Active' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>SOS History</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyStateText}>No SOS history found</Text>
            <Text style={styles.emptyStateSubtext}>Trigger SOS to create entries</Text>
          </View>
        ) : (
          alerts.map((a, idx) => {
            const { bg, color, label } = getStatusStyleAndColor(a.status);
            const lat = a.location?.latitude;
            const lng = a.location?.longitude;
            const mapLink =
              typeof lat === 'number' && typeof lng === 'number'
                ? `https://www.google.com/maps?q=${lat},${lng}`
                : '';

            return (
              <View key={a._id} style={styles.complaintItem}>
                <View style={styles.complaintInfo}>
                  <Text style={styles.caseId}>SOS #{alerts.length - idx}</Text>
                  <Text style={styles.dateText}>Date: {formatDate(a.timestamp)}</Text>
                  <Text style={styles.dateText}>Time: {formatTime(a.timestamp)}</Text>
                  <Text style={styles.dateText}>
                    Location:{' '}
                    {mapLink ? (
                      <Text
                        style={styles.mapLink}
                        onPress={() => Linking.openURL(mapLink)}
                      >
                        Open Map
                      </Text>
                    ) : (
                      '-'
                    )}
                  </Text>
                  {a.status === 'active' && (
                    <TouchableOpacity
                      style={styles.sosSmallCancelBtn}
                      onPress={() => handleCancelSOS(a._id)}
                    >
                      <Text style={styles.sosSmallCancelText}>Cancel SOS</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                  <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default SOSHistoryScreen;