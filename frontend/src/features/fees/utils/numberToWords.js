/**
 * Converts a numeric amount to Indian Currency words
 * e.g. 10700 -> "Rupees TEN THOUSAND, SEVEN HUNDRED ONLY"
 */
export function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num) || Number(num) === 0) {
    return 'Rupees ZERO ONLY';
  }

  const a = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ];
  const b = [
    '',
    '',
    'TWENTY',
    'THIRTY',
    'FORTY',
    'FIFTY',
    'SIXTY',
    'SEVENTY',
    'EIGHTY',
    'NINETY',
  ];

  const convertThreeDigits = (n) => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  };

  const parsed = Math.abs(Number(num));
  let intPart = Math.floor(parsed);
  const paise = Math.round((parsed - intPart) * 100);

  const crore = Math.floor(intPart / 10000000);
  intPart %= 10000000;
  const lakh = Math.floor(intPart / 100000);
  intPart %= 100000;
  const thousand = Math.floor(intPart / 1000);
  intPart %= 1000;
  const remainder = intPart;

  const parts = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' CRORE');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' LAKH');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' THOUSAND');
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  let res = parts.join(', ');
  if (!res) res = 'ZERO';

  let words = `Rupees ${res}`;
  if (paise > 0) {
    words += ` AND ${convertThreeDigits(paise)} PAISE`;
  }
  words += ' ONLY';
  return words;
}

/**
 * Smart formatting for fee months to prevent overflow and table overlap
 * e.g. "April 2026, May 2026, June 2026... March 2027" -> "Apr 2026 to Mar 2027 (12 Months)"
 * e.g. "April 2026" -> "April 2026"
 */
export function formatReceiptMonths(monthStr, items = []) {
  let list = [];
  if (Array.isArray(items) && items.length > 0) {
    const raw = items.map((i) => i.installmentName).filter(Boolean);
    list = Array.from(new Set(raw));
  }

  if (list.length === 0 && monthStr) {
    list = monthStr.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (list.length === 0) return 'April';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]}, ${list[1]}`;

  // 3 or more months -> summarize cleanly:
  const first = list[0];
  const last = list[list.length - 1];
  return `${first} to ${last} (${list.length} Months)`;
}

