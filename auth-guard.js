(() => {
  try {
    if (!localStorage.getItem('yoko-profile')) window.location.replace('index.html');
  } catch {
    window.location.replace('index.html');
  }
})();
