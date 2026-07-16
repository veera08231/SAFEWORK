import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles, { COLORS } from '../styles';

const HomeScreen = ({ user, navigation, onLogout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.homeHeader}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.greeting}>Welcome, {user?.name || 'User'}</Text>
        <Text style={styles.homeSubtitle}>Women Safety & POSH Compliance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.homeContent}>
        <TouchableOpacity
          style={styles.homeBtnSos}
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.homeBtnSosText}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, styles.homeBtn]}
          onPress={() => navigation.navigate('Complaint')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={[styles.btnText, styles.btnTextWhite]}>Raise Complaint</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, styles.homeBtn]}
          onPress={() => navigation.navigate('Status')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={[styles.btnText, styles.btnTextWhite]}>Complaint Status</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, styles.homeBtn]}
          onPress={() => navigation.navigate('SOSHistory')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={[styles.btnText, styles.btnTextWhite]}>SOS History</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;