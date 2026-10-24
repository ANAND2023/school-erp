import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  formatPhoneForWhatsApp,
  openWhatsApp,
  buildWhatsAppMessage,
} from '../utils/whatsappHelper';

export default function WhatsAppModal({
  visible,
  onClose,
  recipientName = '',
  recipientPhone = '',
  recipientRole = 'Parent / Guardian',
  moduleKey = 'general',
  moduleTitle = '',
  templateData = {},
  initialMessage = '',
}) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhone(recipientPhone || '');
      setCopied(false);
      if (initialMessage) {
        setMessage(initialMessage);
      } else {
        const msg = buildWhatsAppMessage(moduleKey, templateData);
        setMessage(msg);
      }
    }
  }, [visible, recipientPhone, moduleKey, initialMessage, JSON.stringify(templateData)]);

  const handleCopy = async () => {
    if (!message) return;
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter a valid recipient WhatsApp number.');
      return;
    }
    const success = await openWhatsApp(phone, message);
    if (success && onClose) {
      onClose();
    }
  };

  const defaultTitles = {
    enquiry: 'Enquiry Acknowledgement (WhatsApp)',
    admission: 'Student Admission Confirmation',
    feeReceipt: 'Fee Payment Receipt Notification',
    feeDemand: 'Fee Dues Reminder (WhatsApp)',
    attendance: 'Absence Alert Notification',
    birthday: 'Birthday Greetings',
    staff: 'Staff Direct Message',
    general: 'School Notification (WhatsApp)',
  };

  const effectiveTitle = moduleTitle || defaultTitles[moduleKey] || 'WhatsApp Notification';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.card}>
            {/* WhatsApp Emerald Gradient Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.waIconCircle}>
                  <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {effectiveTitle}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    WhatsApp Direct Messaging Service
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {/* Recipient Overview Badge */}
              <View style={styles.recipientCard}>
                <View style={styles.recipientInfoRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {(recipientName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.recipientNameText}>
                      {recipientName || 'Student Guardian'}
                    </Text>
                    <Text style={styles.recipientRoleText}>
                      {recipientRole}
                    </Text>
                  </View>
                  <View style={styles.verifiedWaBadge}>
                    <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                    <Text style={styles.verifiedWaText}>
                      {phone || 'No phone'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Editable Phone Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>RECIPIENT WHATSAPP NUMBER</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="phone" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <Text style={styles.helperText}>
                  Country code (+91) is added automatically for 10-digit numbers.
                </Text>
              </View>

              {/* Message Content Box */}
              <View style={styles.fieldGroup}>
                <View style={styles.messageLabelRow}>
                  <Text style={styles.fieldLabel}>MESSAGE CONTENT (PRE-FILLED TEMPLATE)</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopy}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copied ? '#16a34a' : '#0284c7'}
                    />
                    <Text
                      style={[
                        styles.copyBtnText,
                        copied && { color: '#16a34a', fontWeight: '800' },
                      ]}
                    >
                      {copied ? 'Copied!' : 'Copy Text'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  multiline={true}
                  numberOfLines={5}
                  placeholder="Enter message content..."
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text style={styles.sendBtnText}>Send WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#075e54',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  waIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a7f3d0',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  recipientCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  recipientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '800',
  },
  recipientNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  recipientRoleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  verifiedWaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  verifiedWaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
  },
  helperText: {
    fontSize: 11,
    color: '#64748b',
  },
  messageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  copyBtnText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700',
  },
  messageInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 110,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
