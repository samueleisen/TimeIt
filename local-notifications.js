/**
 * TimeIt - Native Android & Web Local Notifications Helper
 * Uses @capacitor/local-notifications on Android (wakes sleeping/locked phone)
 * and falls back gracefully to Web Notification API in standard browser.
 */

(() => {
  // Convert string timer ID (e.g. 'c_1725548400_abc') to a positive 32-bit integer for Android AlarmManager
  function stringToNumericId(str) {
    if (typeof str === 'number') return Math.abs(str) % 2147483647;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2147483647 || 1;
  }

  // Check if running inside native Capacitor Android wrapper
  function isCapacitorNative() {
    return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
  }

  // Get LocalNotifications plugin reference
  function getLocalNotificationsPlugin() {
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      return window.Capacitor.Plugins.LocalNotifications;
    }
    return null;
  }

  // Request notification permissions
  async function requestPermission() {
    const plugin = getLocalNotificationsPlugin();
    if (plugin) {
      try {
        const status = await plugin.requestPermissions();
        console.log('📱 [Capacitor] Notification permission status:', status);
        return status.display === 'granted';
      } catch (err) {
        console.warn('📱 [Capacitor] Permission request error:', err);
      }
    }

    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Schedule hardware alarm on Android (or register in web)
  async function scheduleAlarm(timerId, title, targetTimestamp) {
    if (!timerId || !targetTimestamp) return;
    const numericId = stringToNumericId(timerId);
    const targetDate = new Date(targetTimestamp);
    const alarmTitle = `${title || 'Timer'} Ready!`;

    const plugin = getLocalNotificationsPlugin();
    if (plugin) {
      try {
        // Cancel any existing alarm with this ID first
        await plugin.cancel({ notifications: [{ id: numericId }] });

        // Schedule native Android hardware alarm
        await plugin.schedule({
          notifications: [
            {
              id: numericId,
              title: alarmTitle,
              body: 'Countdown has completed.',
              schedule: { at: targetDate },
              sound: 'default',
              smallIcon: 'ic_stat_name', // Standard Android status bar icon
              actionTypeId: '',
              extra: { timerId }
            }
          ]
        });
        console.log(`📱 [Capacitor] Scheduled native alarm "${alarmTitle}" (ID: ${numericId}) for ${targetDate.toLocaleTimeString()}`);
        return;
      } catch (err) {
        console.warn('📱 [Capacitor] Failed to schedule local notification:', err);
      }
    }

    console.log(`🌐 [Web] Timer "${alarmTitle}" active until ${targetDate.toLocaleTimeString()}`);
  }

  // Cancel native alarm if timer is deleted or reset
  async function cancelAlarm(timerId) {
    if (!timerId) return;
    const numericId = stringToNumericId(timerId);

    const plugin = getLocalNotificationsPlugin();
    if (plugin) {
      try {
        await plugin.cancel({ notifications: [{ id: numericId }] });
        console.log(`📱 [Capacitor] Cancelled native alarm (ID: ${numericId})`);
      } catch (err) {
        console.warn('📱 [Capacitor] Failed to cancel local notification:', err);
      }
    }
  }

  // Expose globally
  window.TimeItNotifications = {
    isNative: isCapacitorNative,
    requestPermission,
    scheduleAlarm,
    cancelAlarm
  };
})();
