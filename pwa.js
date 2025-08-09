// PWA bootstrap: service worker registration + install prompt
(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .catch(console.error);
    });
  }

  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');
  const installStatus = document.getElementById('installStatus');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
    installStatus.textContent = 'Install available';
  });

  installBtn?.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    installBtn.hidden = true;
    installStatus.textContent = outcome === 'accepted' ? 'Installed' : 'Install dismissed';
    deferredPrompt = null;
  });
})();
