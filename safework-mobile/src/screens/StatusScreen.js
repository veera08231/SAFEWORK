import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import styles, { COLORS } from '../styles';
import { getComplaintsByUserId } from '../database';
import { formatDate } from '../utils';

const StatusScreen = ({ user, navigation }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [])
  );

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const items = await getComplaintsByUserId(user.userId);
      setComplaints(items);
    } catch (err) {
      console.error('Load complaints error:', err);
    }
    setLoading(false);
  };

  const getStatusStyle = (status) => {
    if (status === 'Resolved') return styles.statusResolved;
    return styles.statusPending;
  };

  const getStatusColor = (status) => {
    if (status === 'Resolved') return COLORS.resolved;
    return COLORS.pending;
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Complaint Status</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyStateText}>No complaints yet</Text>
            <Text style={styles.emptyStateSubtext}>Submit a complaint to track status</Text>
          </View>
        ) : (
          complaints.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={styles.complaintItem}
              onPress={() => navigation.navigate('CaseDetails', { caseId: c.caseId })}
            >
              <View style={styles.complaintInfo}>
                <Text style={styles.caseId}>Case {c.caseId}</Text>
                <Text style={styles.dateText}>{formatDate(c.createdAt)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(c.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadge,
                    { backgroundColor: 'transparent', color: getStatusColor(c.status) },
                  ]}
                >
                  {c.status || 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default StatusScreen;