import { isNative } from './platform'

// Tasteful haptic feedback for the native app. Every call is a no-op on web and
// fail-silent on device — haptics must never break a flow. Used sparingly, at
// moments that carry meaning (not on every tap):
//   tick    — navigation/selection (tab switch)
//   light   — neutral confirmation (toast shown, unlock)
//   success — a meaningful completion (passcode set, subscription started)
//   warning — a soft stop (free-tier limit reached)
//   error   — a failure the user must react to (wrong passcode)
async function impact(style) {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style] })
  } catch { /* never let haptics break a flow */ }
}

async function notify(type) {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType[type] })
  } catch { /* never let haptics break a flow */ }
}

export const haptic = {
  tick: async () => {
    if (!isNative()) return
    try {
      const { Haptics } = await import('@capacitor/haptics')
      await Haptics.selectionStart(); await Haptics.selectionChanged(); await Haptics.selectionEnd()
    } catch { /* no-op */ }
  },
  light:   () => impact('Light'),
  medium:  () => impact('Medium'),
  success: () => notify('Success'),
  warning: () => notify('Warning'),
  error:   () => notify('Error'),
}
