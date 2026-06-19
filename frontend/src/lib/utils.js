import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// className merge helper used by the ui primitives
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "27 Mar 26" — used in card subtitles & tables
export function formatDate(e) {
  if (!e) return '';
  const t = new Date(e);
  return `${String(t.getDate()).padStart(2, '0')} ${MONTHS[t.getMonth()]} ${String(t.getFullYear()).slice(2)}`;
}

// "27 Mar 26 14:30" — used in call history
export function formatDateTime(e) {
  if (!e) return '';
  const t = new Date(e);
  return `${String(t.getDate()).padStart(2, '0')} ${MONTHS[t.getMonth()]} ${String(t.getFullYear()).slice(2)} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

// "9 Apr, 14:30" — used in the follow-up alert dropdown
export function formatFollowupTime(e) {
  if (!e) return '';
  const t = new Date(e);
  return `${t.getDate()} ${MONTHS[t.getMonth()]}, ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

// Today's date as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split('T')[0];
}

// True if the date-string starts with today's YYYY-MM-DD
export function isToday(e) {
  return e ? e.startsWith(today()) : false;
}

// Strip non-digits + prefix country code → "919876543210"
export function normalizePhoneWithCode(phone, code) {
  const n = (phone || '').replace(/\D/g, '');
  return (code || '91').replace(/\D/g, '') + n;
}

// Strip non-digits → "9876543210"
export function digitsOnly(e) {
  return (e || '').replace(/\D/g, '');
}

// tel: link
export function telLink(phone, code) {
  return `tel:+${normalizePhoneWithCode(phone, code)}`;
}

// Time-of-day greeting used in the topbar
export function greetingFor(name) {
  const h = new Date().getHours();
  const quotes = [
    'Every call is a new opportunity.',
    'Follow up is where deals are made.',
    "Your effort today shapes tomorrow's results.",
    'Consistency beats perfection every time.',
    'One more call can change everything.',
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  if (h < 12) return { time: `Good morning, ${name}! ☀️`, quote };
  if (h < 17) return { time: `Good afternoon, ${name}! 👋`, quote };
  return { time: `Good evening, ${name}! 🌙`, quote };
}

// Opens a WhatsApp message for a Lead (parent template)
export function sendWhatsAppLead(phone, parentName, fromName, countryCode) {
  const num = normalizePhoneWithCode(phone, countryCode);
  const text =
    `Hi *${parentName || 'there'},*\n\n` +
    `Thank you for showing interest in *ProTutor's Home tutoring service.*\n\n` +
    `We tried reaching you to understand your child's learning needs and match you with a qualified tutor.\n` +
    `Please feel free to call us back to proceed.\n\n` +
    `🏠 One-on-one, in-person tutors | *Experienced & Verified Teachers*\n` +
    `We'd love to help you find the right academic support!\n\n` +
    `${fromName || 'Team'}\n-Team ProTutor`;
  window.open(
    `https://api.whatsapp.com/send/?phone=${num}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`,
    '_blank'
  );
}

// Opens a WhatsApp message for a missed-call number (call-data template)
export function sendWhatsAppMissedCall(phone, fromName, countryCode) {
  const num = normalizePhoneWithCode(phone, countryCode);
  const text =
    `Hi,\n\n` +
    `This is ${fromName || 'Team'} from *ProTutor*. We noticed a missed call from you recently.\n\n` +
    `Could you let us know how we can help.\n\n` +
    `*Are you looking for a tutor ?*`;
  window.open(
    `https://api.whatsapp.com/send/?phone=${num}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`,
    '_blank'
  );
}

export function formatTime12hr(e) {
  if (!e) return '';
  const t = new Date(e);
  if (isNaN(t.getTime())) return '';
  let h = t.getHours();
  const m = String(t.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
