import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles, { COLORS } from '../styles';
import { getComplaintByCaseId } from '../database';
import { formatDate } from '../utils';

const CaseDetailsScreen = ({ route, navigation }) => {
  const { caseId } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [caseId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await getComplaintByCaseId(caseId);
      setItem(data);
    } catch (err) {
      console.error('Load case details error:', err);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    if (status === 'Resolved') return COLORS.resolved;
    return COLORS.pending;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Case Details</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Case Details</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyStateText}>Case not found</Text>
        </View>
      </View>
    );
  }

  const isImage = item.file && /\.(png|jpg|jpeg|gif|webp)$/i.test(item.file);

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Case Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.caseDetailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.caseId}>Case {item.caseId}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: 'transparent', color: getStatusColor(item.status) },
                ]}
              >
                {item.status || 'Pending'}
              </Text>
            </View>
          </View>

          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

          <Text style={styles.detailLabel}>Incident</Text>
          <Text style={styles.detailValue}>{item.incident || '-'}</Text>

          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailValue}>{item.description || '-'}</Text>

          <Text style={styles.detailLabel}>Attachment</Text>
          {!item.file ? (
            <Text style={[styles.detailValue, { color: COLORS.textSecondary }]}>No attachment</Text>
          ) : isImage ? (
            <Image
              source={{ uri: item.file }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          ) : (
            <TouchableOpacity onPress={() => Linking.openURL(item.file)}>
              <Text style={styles.mapLink}>View Attachment</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default CaseDetailsScreen;