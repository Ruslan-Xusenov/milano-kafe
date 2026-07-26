import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Info, PhoneCall, X, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URL } from '../api';

const DARK_BG = '#1A1A1A';
const DARK_CARD = '#252525';
const DARK_SURFACE = '#2E2E2E';
const ACCENT = '#FF4747';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#AAAAAA';
const BORDER_COLOR = 'rgba(255,255,255,0.07)';

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

        {/* Section: Info */}
        <Text style={styles.sectionLabel}>Ma'lumot</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => openModal('about')} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Info color="#10b981" size={22} />
          </View>
          <Text style={styles.menuText}>{t('about_us', 'Biz haqimizda')}</Text>
          <ChevronRight size={18} color="#555555" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openModal('contact')} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <PhoneCall color="#3b82f6" size={22} />
          </View>
          <Text style={styles.menuText}>{t('contact_admin', "Admin bilan bog'lanish")}</Text>
          <ChevronRight size={18} color="#555555" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer info */}
        <View style={styles.footerCard}>
          <Text style={styles.footerCardTitle}>Milano Kafe</Text>
          <Text style={styles.footerCardSub}>© 2024 Milano Kafe. Barcha huquqlar himoyalangan.</Text>
        </View>

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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X color={TEXT_SECONDARY} size={20} />
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
  container: { flex: 1, backgroundColor: DARK_BG },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#555555', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4, paddingHorizontal: 4
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_CARD,
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  divider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 20 },

  footerCard: {
    backgroundColor: DARK_CARD, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center'
  },
  footerCardTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  footerCardSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: DARK_CARD,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    minHeight: '40%',
    maxHeight: '80%',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  modalCloseBtn: {
    padding: 6, backgroundColor: DARK_SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER_COLOR
  },
  modalBody: { flex: 1 },
  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: TEXT_SECONDARY,
  }
});
