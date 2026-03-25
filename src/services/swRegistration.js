function canRegisterSW() {
  return 'serviceWorker' in navigator && typeof window !== 'undefined';
}

export async function registerServiceWorker({
  onUpdateAvailable,
  onOfflineReady,
} = {}) {
  if (!canRegisterSW()) return { supported: false };

  const registration = await navigator.serviceWorker.register('/service-worker.js', {
    scope: '/',
  });

  let waitingSW = null;

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state !== 'installed') return;

      // Se já existe controller, significa que é update.
      const isUpdate = Boolean(navigator.serviceWorker.controller);
      waitingSW = newWorker;

      if (isUpdate) {
        onUpdateAvailable?.({
          registration,
          skipWaiting: () => {
            try {
              waitingSW?.postMessage({ type: 'SKIP_WAITING' });
            } catch {
              // ignore
            }
          },
        });
      } else {
        onOfflineReady?.({ registration });
      }
    });
  });

  return {
    supported: true,
    registration,
  };
}

