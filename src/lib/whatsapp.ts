import { Customer, Driver } from '../types';

/**
 * Standard WhatsApp message format specified for drivers
 */
export function formatWhatsAppMessage(customer: Customer, driverName?: string): string {
  const greeting = driverName
    ? `Salam, ${driverName}. Bu müştəriyə gedilməlidir.`
    : 'Salam. Bu müştəriyə gedilməlidir.';

  let locationBlock = '';
  if (customer.location) {
    const lat = customer.location.lat;
    const lng = customer.location.lng;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    locationBlock = `\nLatitude: ${lat}\nLongitude: ${lng}\n\nWaze ilə get:\n${wazeUrl}`;
  } else {
    locationBlock = '\n\nKonum: Qeyd edilməyib';
  }

  const notePart = customer.note ? `\n\nQeyd: ${customer.note}` : '';

  return `${greeting}

Müştəri: ${customer.name}
Telefon: ${customer.phone}
Ünvan: ${customer.address || 'Ünvan daxil edilməyib'}${locationBlock}${notePart}

Xahiş edirəm bu ünvana gedəsən.`;
}

/**
 * Clean phone number to digits only (Azərbaycan format: 994501234567)
 */
export function cleanPhoneNumber(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '');
  // If starts with 0 (e.g., 0501234567), change to 994501234567
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '994' + digits.substring(1);
  } else if (!digits.startsWith('994') && digits.length === 9) {
    digits = '994' + digits;
  }
  return digits;
}

/**
 * Opens WhatsApp on phone (native app) or web browser
 */
export function openWhatsApp(phone: string | undefined, message: string): void {
  const encodedText = encodeURIComponent(message);
  const cleanPhone = phone ? cleanPhoneNumber(phone) : '';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  let targetUrl = '';

  if (cleanPhone) {
    if (isMobile) {
      // Direct deep link to WhatsApp app on Android / iOS
      targetUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    } else {
      // Desktop WhatsApp Web or wa.me
      targetUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
  } else {
    // Generic share without predefined recipient
    targetUrl = `https://wa.me/?text=${encodedText}`;
  }

  // Open in new tab/window
  const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  if (!win && isMobile) {
    // If popup blocked, navigate directly
    window.location.href = targetUrl;
  }
}
