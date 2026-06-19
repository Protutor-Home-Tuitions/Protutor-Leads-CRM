import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 60 * 1000; // check every 60 seconds
const ADVANCE_MINUTES = 15; // notify 15 mins before

function getNotifKey(id) {
  return `notified_${id}_${new Date().toDateString()}`;
}

function alreadyNotified(id) {
  try { return sessionStorage.getItem(getNotifKey(id)) === '1'; } catch { return false; }
}

function markNotified(id) {
  try { sessionStorage.setItem(getNotifKey(id), '1'); } catch {}
}

export function useFollowupNotifications(leads, callData) {
  const timerRef = useRef(null);

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    function check() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = new Date();
      const items = [
        ...(leads || []).map(l => ({ ...l, _type: 'lead', _name: l.parentName || l.mobile, _phone: l.mobile })),
        ...(callData || []).map(c => ({ ...c, _type: 'number', _name: c.name || c.phone, _phone: c.phone })),
      ];

      items.forEach(item => {
        if (!item.followupDate || item.status === 'closed') return;
        if (alreadyNotified(item.id)) return;

        const followup = new Date(item.followupDate);
        if (isNaN(followup.getTime())) return;

        const diffMs = followup.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Notify if within 15 minutes (but not more than 24 hours past)
        if (diffMins <= ADVANCE_MINUTES && diffMins > -1440) {
          markNotified(item.id);

          const lastLog = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
          const lastNotes = lastLog?.notes || 'No notes';
          const lastStatus = lastLog?.status || '—';
          const timeStr = followup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

          const title = `Time to Call ${item._name} - ${item._phone}`;
          const body = `Call at ${timeStr}\nLast status: ${lastStatus}\nNotes: ${lastNotes}`;

          try {
            const notif = new Notification(title, {
              body,
              icon: '/favicon.ico',
              tag: `followup-${item.id}`,
              requireInteraction: true,
            });

            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (e) {
            console.warn('Notification failed:', e);
          }
        }
      });
    }

    // Run immediately + every 60 seconds
    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [leads, callData]);
}
