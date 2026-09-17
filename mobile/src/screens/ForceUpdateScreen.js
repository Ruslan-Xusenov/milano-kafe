import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';

export default function ForceUpdateScreen({ storeUrl }) {
  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch((err) => console.error("Couldn't load page", err));
    } else {
      Linking.openURL('market://details?id=milanofoods.ruslandev.uz').catch(() => {
        Linking.openURL('https://play.google.com/store/apps/details?id=milanofoods.ruslandev.uz');
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <RefreshCw size={100} color="#ff3333" />
        
        <Text style={styles.title}>
          Ilovani yangilash zarur!
        </Text>
        
        <Text style={styles.description}>
          Siz eski versiyadan foydalanmoqdasiz. Iltimos, davom etish uchun ilovani eng so'nggi versiyaga yangilang. Bu sizga yangi imkoniyatlar va xavfsizlikni kafolatlaydi.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Hozir yangilash</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#ff3333',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
