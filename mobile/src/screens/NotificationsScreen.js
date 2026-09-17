import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ArrowLeft, BellOff, X, Gift } from 'lucide-react-native';
import { api } from '../api';
import { useTranslation } from 'react-i18next';

const DARK_BG = '#1A1A1A';
const DARK_CARD = '#252525';
const ACCENT = '#FF4747';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#AAAAAA';
const BORDER_COLOR = 'rgba(255,255,255,0.07)';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { t } = useTranslation();

  const getTranslatedTitle = (title) => {
    if (!title) return title;
    if (title.includes('Yangi buyurtma')) return t('notif_new_order', title);
    if (title.includes('Tayyorlanmoqda')) return t('notif_preparing', title);
    if (title.includes("Yo'lga chiqdi")) return t('notif_delivering', title);
    if (title.includes('Yetkazib berildi')) return t('notif_completed', title);
    if (title.includes("sovg'a")) return t('notif_gift', title);
    return title;
  };

  const getTranslatedBody = (body) => {
    if (!body) return body;
    if (body.includes('Buyurtmangiz qabul qilindi')) return t('notif_body_new', body);
    if (body.includes('tayyorlanmoqda')) return t('notif_body_prep', body);
    if (body.includes("yo'lga chiqdi")) return t('notif_body_del', body);
    if (body.includes('yetkazib berildi')) return t('notif_body_comp', body);
    if (body.includes("sovg'a keldi")) return t('notif_body_gift', body);
    return body;
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.log('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (item) => {
    setSelectedNotification(item);
    if (item.is_read) return;
    try {
      await api.put(`/notifications/${item.id}/read`);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.log('Mark read error:', error);
    }
  };

  const renderItem = ({ item }) => {
    const isRead = item.is_read;
    return (
      <TouchableOpacity 
        style={[styles.card, !isRead && styles.unreadCard]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <ExpoImage 
            source={require('../../assets/bell_loader.gif')} 
            style={{ width: 26, height: 26, opacity: isRead ? 0.5 : 1 }} 
            contentFit="contain" 
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !isRead && styles.unreadTitle]}>{getTranslatedTitle(item.title)}</Text>
          <Text style={styles.body}>{getTranslatedBody(item.body)}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        {!isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications', 'Bildirishnomalar')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <BellOff size={64} color={TEXT_SECONDARY} />
          <Text style={styles.emptyText}>{t('no_notifications', "Hozircha xabarlar yo'q")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedNotification(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBg}>
                    {selectedNotification?.title?.toLowerCase().includes('sovg\'a') ? (
                      <Gift size={28} color={ACCENT} />
                    ) : (
                      <ExpoImage 
                        source={require('../../assets/bell_loader.gif')} 
                        style={{ width: 34, height: 34 }} 
                        contentFit="contain" 
                      />
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedNotification(null)} style={styles.closeBtn}>
                    <X size={24} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>{selectedNotification ? getTranslatedTitle(selectedNotification.title) : ''}</Text>
                <Text style={styles.modalBody}>{selectedNotification ? getTranslatedBody(selectedNotification.body) : ''}</Text>
                <Text style={styles.modalTime}>
                  {selectedNotification ? new Date(selectedNotification.created_at).toLocaleString() : ''}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedNotification(null)}
                >
                  <Text style={styles.modalCloseBtnText}>{t('close', 'Yopish')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingTop: 56, 
    paddingBottom: 16,
    backgroundColor: DARK_CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#2A1F1F',
    borderColor: 'rgba(255,71,71,0.2)',
  },
  iconContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
    color: ACCENT,
  },
  body: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: DARK_CARD,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,71,71,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  modalTime: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});
