import apiClient from '../../../api/client';

let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export const whatsappService = {
  /**
   * Fetch active WhatsApp configuration for the current tenant / school
   */
  getConfig: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedConfig;
    }

    try {
      const res = await apiClient.get('/whatsapp/config');
      if (res.data?.success && res.data.data) {
        cachedConfig = res.data.data;
        lastFetchTime = now;
        return cachedConfig;
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp config, using defaults:', err);
    }

    // Default fallback
    if (!cachedConfig) {
      cachedConfig = {
        isEnabled: true,
        provider: 'DIRECT_WEB',
        enquiry: {
          enabled: true,
          template:
            'Dear {ParentName}, thank you for your enquiry for {StudentName} (Class: {ClassName}) at {SchoolName}. Enquiry No: {EnquiryNo}. For any queries, call {SchoolPhone}. Best regards!',
        },
        admission: {
          enabled: true,
          template:
            'Congratulations {ParentName}! Admission for {StudentName} is confirmed in Class {ClassName} (Section: {Section}) at {SchoolName}. Admission No: {AdmissionNo}. Welcome to our school family!',
        },
        feeReceipt: {
          enabled: true,
          template:
            'Dear {ParentName}, Fee payment of Rs. {PaidAmount} for {StudentName} (Receipt: #{ReceiptNo}) has been successfully received on {Date}. Remaining balance: Rs. {Balance}. Thank you, {SchoolName}.',
        },
        feeDemand: {
          enabled: true,
          template:
            'Dear Parent, this is a gentle reminder regarding pending school fees of Rs. {PendingAmount} for {StudentName} ({Month}) at {SchoolName}. Due Date: {DueDate}. Please clear the dues at your earliest convenience.',
        },
        attendance: {
          enabled: true,
          template:
            'Dear Parent, please note that your ward {StudentName} (Class: {ClassName}) is marked ABSENT today ({Date}) at {SchoolName}. If on leave, please submit an application.',
        },
        birthday: {
          enabled: true,
          template:
            '🎉 Warmest Birthday Wishes to {StudentName} on turning {Age} today! May your year ahead be filled with success, knowledge, and joy. From all of us at {SchoolName}! 🎂',
        },
        general: {
          enabled: true,
          template: 'Notice from {SchoolName}: Dear Parent, regarding {StudentName} - {Message}. Thank you.',
        },
      };
      lastFetchTime = now;
    }

    return cachedConfig;
  },

  /**
   * Check if a specific module is enabled
   */
  isModuleEnabled: (config, moduleKey) => {
    if (!config || !config.isEnabled) return false;
    const mod = config[moduleKey];
    return mod ? mod.enabled : true;
  },

  /**
   * Standardize mobile number for WhatsApp
   * Strips spaces, non-digits, prepends country code (91 default for 10-digit Indian numbers)
   */
  formatPhoneForWhatsApp: (phone) => {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.substring(1);
    }
    return digits;
  },

  /**
   * Render dynamic placeholder template
   */
  interpolateTemplate: (template, data = {}) => {
    if (!template) return '';
    let result = template;
    for (const [key, val] of Object.entries(data)) {
      const reg = new RegExp(`\\{${key}\\}`, 'gi');
      result = result.replace(reg, val != null ? String(val) : '');
    }
    return result;
  },

  /**
   * Open WhatsApp with recipient and encoded message
   */
  sendDirectMessage: (phone, message) => {
    const cleanPhone = whatsappService.formatPhoneForWhatsApp(phone);
    const encodedText = encodeURIComponent(message || '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
