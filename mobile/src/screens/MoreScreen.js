import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Info, PhoneCall, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URL } from '../api';

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings`);
      setSettings(res.data || {});
    } catch (err) {
      console.log('Error fetching settings', err);
    }
  };

  const openModal = (type) => {
    const lang = i18n.language || 'uz';
    if (type === 'about') {
      setModalTitle(t('about_us', 'Biz haqimizda'));
      setModalContent(settings[`about_us_${lang}`] || '');
    } else if (type === 'contact') {
      setModalTitle(t('contact_admin', "Admin bilan bog'lanish"));
      setModalContent(settings[`contact_admin_${lang}`] || '');
    }
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('more', 'Yana')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.menuItem} onPress={() => openModal('about')}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Info color="#10b981" size={24} />
          </View>
          <Text style={styles.menuText}>{t('about_us', 'Biz haqimizda')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openModal('contact')}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <PhoneCall color="#3b82f6" size={24} />
          </View>
          <Text style={styles.menuText}>{t('contact_admin', "Admin bilan bog'lanish")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#A79277" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                {modalContent || t('not_entered', 'Kiritilmagan')}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF2E1' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#A79277', letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,146,119,0.1)',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A79277',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '40%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167,146,119,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#A79277',
  },
  modalBody: {
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  }
});
