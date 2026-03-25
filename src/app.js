import { el } from './utils/dom.js';
import { parseRoute, navigate } from './router.js';
import { ensureSeedData } from './services/api.js';
import { registerServiceWorker } from './services/swRegistration.js';
import { createTopBar } from './components/TopBar.js';
import { createLoadingBar } from './components/LoadingBar.js';
import { createToastManager } from './components/ToastManager.js';
import { createErrorBanner } from './components/ErrorBanner.js';

function setDefaultHash() {
  const raw = window.location.hash || '';
  if (!raw || raw === '#') navigate('#/dashboard');
}

async function renderRoute(route, { content, loading, errorBanner, toast }) {
  loading.start();
  errorBanner.clear();
  const pageHost = content.querySelector('#page-host');
  if (!pageHost) return;
  pageHost.innerHTML = '';

  try {
    let page;
    switch (route.key) {
      case 'dashboard':
        page = await import('./pages/dashboard.js');
        break;
      case 'checkin':
        page = await import('./pages/checkin.js');
        break;
      case 'meals':
        page = await import('./pages/meals.js');
        break;
      case 'groups':
        page = await import('./pages/groups.js');
        break;
      case 'groupDetail':
        page = await import('./pages/groupDetail.js');
        break;
      default:
        page = await import('./pages/dashboard.js');
        break;
    }

    const renderer =
      route.key === 'groupDetail' ? page.renderGroupDetailPage : page.renderPage;

    const elPage = await renderer({ route, toast });
    pageHost.appendChild(elPage);
  } catch (err) {
    errorBanner.setError(err);
    pageHost.appendChild(errorBanner.element);
  } finally {
    loading.stop();
  }
}

export async function initApp() {
  setDefaultHash();

  const root = document.getElementById('app');
  if (!root) return;

  const app = el('div', { class: 'app' });
  const loading = createLoadingBar();
  const toast = createToastManager();
  const errorBanner = createErrorBanner();

  const activeKey = { value: parseRoute().key };
  const topbar = createTopBar({ getActiveKey: () => activeKey.value });

  const content = el('div', { class: 'content', role: 'main' });

  // Status offline (UX simples e acessível)
  const offlineAlert = el('div', {
    class: 'alert',
    style: 'margin-bottom: 12px; display:none;',
    role: 'status',
  });
  offlineAlert.appendChild(el('div', {}, 'Sem conexão. O app funciona offline usando dados locais.'));

  content.appendChild(offlineAlert);
  const pageHost = el('div', { id: 'page-host' });
  content.appendChild(pageHost);

  const updateOffline = () => {
    const show = !navigator.onLine;
    offlineAlert.style.display = show ? 'block' : 'none';
  };
  window.addEventListener('online', updateOffline);
  window.addEventListener('offline', updateOffline);
  updateOffline();

  app.appendChild(topbar);
  app.appendChild(content);

  root.appendChild(loading.element);
  root.appendChild(app);

  // Seed e SW (sem travar a primeira renderização)
  await ensureSeedData().catch(() => {});

  try {
    const { supported } = await registerServiceWorker({
      onOfflineReady: () => {
        // Não spammar: apenas avisa uma vez.
        toast.showToast({
          title: 'Disponível offline',
          message: 'Você pode usar o app mesmo sem internet.',
        });
      },
      onUpdateAvailable: ({ skipWaiting }) => {
        toast.showToast({
          title: 'Atualização disponível',
          message: 'Há uma nova versão pronta. Atualize para recarregar.',
          actions: [
            {
              label: 'Atualizar agora',
              variant: 'primary',
              onClick: () => {
                skipWaiting();
              },
            },
          ],
        });
      },
    });

    if (supported) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Aplica a nova versão com segurança.
        window.location.reload();
      });
    }
  } catch {
    // Sem SW: segue funcionando normalmente.
  }

  // Router
  let lastRouteKey = '';

  const onRoute = async () => {
    const route = parseRoute();
    activeKey.value = route.key === 'groupDetail' ? 'groups' : route.key;

    if (route.key === lastRouteKey && route.key !== 'groupDetail') return;
    lastRouteKey = route.key;

    await renderRoute(route, { content, loading, errorBanner, toast });
  };

  window.addEventListener('hashchange', onRoute, { passive: true });
  await onRoute();
}

