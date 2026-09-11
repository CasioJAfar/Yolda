// Search normalization & Azerbaijani character tolerance helper

export function normalizeAzText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhoneDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

/**
 * Robust matching against multiple fields with Azerbaijani character tolerance
 * and phone number variations (+994 50, 050, 50...).
 */
export function matchQuery(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true;

  const rawQ = query.trim().toLowerCase();
  const normQ = normalizeAzText(query);
  const cleanDigitsQ = normalizePhoneDigits(query);

  for (const field of fields) {
    if (!field) continue;
    const rawF = field.toLowerCase();
    const normF = normalizeAzText(field);

    // Direct case-insensitive substring
    if (rawF.includes(rawQ)) return true;

    // Azerbaijani-normalized substring
    if (normF.includes(normQ)) return true;

    // Phone matching (if query has digits)
    if (cleanDigitsQ.length >= 2) {
      const cleanDigitsF = normalizePhoneDigits(field);
      if (cleanDigitsF.includes(cleanDigitsQ)) return true;

      // Handle Azerbaijan prefix: 050 vs +99450 vs 50
      const localQ = cleanDigitsQ.startsWith('994') ? cleanDigitsQ.slice(3) : cleanDigitsQ.startsWith('0') ? cleanDigitsQ.slice(1) : cleanDigitsQ;
      const localF = cleanDigitsF.startsWith('994') ? cleanDigitsF.slice(3) : cleanDigitsF.startsWith('0') ? cleanDigitsF.slice(1) : cleanDigitsF;

      if (localF.includes(localQ) || localQ.includes(localF)) {
        return true;
      }
    }
  }

  // Multi-word composite check (e.g. "Elvin Məmmədov" or "elvin baki")
  const tokens = normQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const combinedNorm = fields.map((f) => normalizeAzText(f || '')).join(' ');
    const allMatch = tokens.every((token) => combinedNorm.includes(token));
    if (allMatch) return true;
  }

  return false;
}
