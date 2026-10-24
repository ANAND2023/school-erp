import { Linking, Alert } from 'react-native';
import { whatsappApi } from '../api/client';

let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export const DEFAULT_WHATSAPP_TEMPLATES = {
  enquiry:
    'Dear {ParentName}, thank you for your enquiry for {StudentName} (Class: {ClassName}) at {SchoolName}. Enquiry No: {EnquiryNo}. For any queries, call {SchoolPhone}. Best regards!',
  admission:
    'Congratulations {ParentName}! Admission for {StudentName} is confirmed in Class {ClassName} (Section: {Section}) at {SchoolName}. Admission No: {AdmissionNo}. Welcome to our school family!',
  feeReceipt:
    'Dear {ParentName}, Fee payment of Rs. {PaidAmount} for {StudentName} (Receipt: #{ReceiptNo}) has been successfully received on {Date}. Remaining balance: Rs. {Balance}. Thank you, {SchoolName}.',
  feeDemand:
    'Dear Parent, this is a gentle reminder regarding pending school fees of Rs. {PendingAmount} for {StudentName} ({Month}) at {SchoolName}. Due Date: {DueDate}. Please clear the dues at your earliest convenience.',
  attendance:
    'Dear Parent, please note that your ward {StudentName} (Class: {ClassName}) is marked ABSENT today ({Date}) at {SchoolName}. If on leave, please submit an application.',
  birthday:
    '🎉 Warmest Birthday Wishes to {StudentName} on turning {Age} today! May your year ahead be filled with success, knowledge, and joy. From all of us at {SchoolName}! 🎂',
  staff:
    'Hello {StaffName}, greetings from {SchoolName}. {Message}',
  general:
    'Notice from {SchoolName}: Dear Parent, regarding {StudentName} - {Message}. Thank you.',
};

/**
 * Standardize phone number for WhatsApp
 * Strips non-digits, prepends country code 91 for Indian 10-digit numbers
 */
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.substring(1);
  }
  return digits;
};

/**
 * Replace {Placeholders} with data values
 */
export const interpolateTemplate = (template, data = {}) => {
  if (!template) return '';
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    const reg = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(reg, val != null && val !== '' ? String(val) : '');
  }
  return result;
};

/**
 * Fetch WhatsApp templates & configuration from server with caching
 */
export const getWhatsAppConfig = async () => {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    const res = await whatsappApi.getConfig();
    if (res.data?.success && res.data?.data) {
      cachedConfig = res.data.data;
      lastFetchTime = now;
      return cachedConfig;
    }
  } catch (e) {
    // silently fallback to defaults
  }
  return null;
};

/**
 * Build prefilled message text for any module
 */
export const buildWhatsAppMessage = (moduleKey, data = {}) => {
  let template = DEFAULT_WHATSAPP_TEMPLATES[moduleKey] || DEFAULT_WHATSAPP_TEMPLATES.general;
  if (cachedConfig && cachedConfig[moduleKey]?.template) {
    template = cachedConfig[moduleKey].template;
  }
  return interpolateTemplate(template, data);
};

/**
 * Deep-link directly into WhatsApp application or web with prefilled message
 */
export const openWhatsApp = async (phone, message = '') => {
  if (!phone) {
    Alert.alert('Phone Number Required', 'Please provide a valid recipient mobile number.');
    return false;
  }

  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message || '');

  // 1. WhatsApp Native URL Scheme
  const nativeUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  // 2. Official Universal wa.me URL
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    }
  } catch (e) {
    // Continue to https fallback
  }

  try {
    await Linking.openURL(waUrl);
    return true;
  } catch (err) {
    Alert.alert(
      'WhatsApp Unavailable',
      'Could not open WhatsApp on this device. Please verify that WhatsApp is installed.'
    );
    return false;
  }
};
