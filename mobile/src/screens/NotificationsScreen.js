import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { Bell, ArrowLeft, BellOff, X, Gift } from 'lucide-react-native';
import { api } from '../api';

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
          <Bell size={24} color={isRead ? TEXT_SECONDARY : ACCENT} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !isRead && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
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
        <Text style={styles.headerTitle}>Bildirishnomalar</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <BellOff size={64} color={TEXT_SECONDARY} />
          <Text style={styles.emptyText}>Hozircha xabarlar yo'q</Text>
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
                      <Bell size={28} color={ACCENT} />
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedNotification(null)} style={styles.closeBtn}>
                    <X size={24} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>{selectedNotification?.title}</Text>
                <Text style={styles.modalTime}>
                  {selectedNotification ? new Date(selectedNotification.created_at).toLocaleString() : ''}
                </Text>
                <Text style={styles.modalBody}>{selectedNotification?.body}</Text>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setSelectedNotification(null)}
                >
                  <Text style={styles.modalButtonText}>Tushunarli</Text>
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
