(() => {
  document.documentElement.style.visibility = 'hidden';
  const client = window.yokoSupabase;
  if (!client) {
    location.replace('index.html');
    return;
  }
  client.auth.getSession().then(({data, error}) => {
    if (error || !data.session) {
      location.replace('index.html');
      return;
    }
    document.documentElement.style.visibility = '';
  }).catch(() => location.replace('index.html'));
})();
