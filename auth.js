(() => {
  const profileKey = 'yoko-profile';
  const accountsKey = 'yoko-accounts';
  const registrationForm = document.querySelector('#registration-form');
  const loginForm = document.querySelector('#login-form');
  const registrationError = document.querySelector('#auth-error');
  const loginError = document.querySelector('#login-error');
  const title = document.querySelector('#auth-title');
  const intro = document.querySelector('#auth-intro');
  const registerTab = document.querySelector('#register-tab');
  const loginTab = document.querySelector('#login-tab');
  const isLoginRoute = new URLSearchParams(location.search).get('view') === 'login';

  function readAccounts() {
    try {
      const value = JSON.parse(localStorage.getItem(accountsKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function showView(view) {
    const login = view === 'login';
    registrationForm.hidden = login;
    loginForm.hidden = !login;
    registrationError.hidden = true;
    loginError.hidden = true;
    registerTab.classList.toggle('active', !login);
    loginTab.classList.toggle('active', login);
    registerTab.setAttribute('aria-selected', String(!login));
    loginTab.setAttribute('aria-selected', String(login));
    title.innerHTML = login ? 'კეთილი იყოს<br /><em>შენი დაბრუნება</em>' : 'შექმენი შენი<br /><em>Yoko პროფილი</em>';
    intro.textContent = login ? 'შეიყვანე შენი ელფოსტა და პაროლი.' : 'შეავსე ფორმა და გადადი მაღაზიაში.';
    document.querySelector('.form-eyebrow').textContent = login ? 'ანგარიშში შესვლა' : 'დაიწყე აქ';
  }

  function bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function hashPassword(password, salt) {
    if (!crypto.subtle) throw new Error('secure-context');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256'}, key, 256);
    return bytesToBase64(bits);
  }

  function saveProfile(account) {
    localStorage.setItem(profileKey, JSON.stringify({name: account.name, email: account.email, phone: account.phone || ''}));
    location.href = 'shop.html';
  }

  if (localStorage.getItem(profileKey) && !isLoginRoute) {
    location.replace('shop.html');
    return;
  }

  registerTab.addEventListener('click', () => showView('register'));
  loginTab.addEventListener('click', () => showView('login'));
  showView(isLoginRoute ? 'login' : 'register');

  registrationForm.addEventListener('submit', async event => {
    event.preventDefault();
    registrationError.hidden = true;
    const values = new FormData(registrationForm);
    const name = String(values.get('name') || '').trim();
    const email = String(values.get('email') || '').trim().toLocaleLowerCase('ka');
    const phone = String(values.get('phone') || '').trim();
    const password = String(values.get('password') || '');
    const confirmation = String(values.get('passwordConfirm') || '');

    if (password.length < 8) return showError(registrationError, 'პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს.');
    if (password !== confirmation) return showError(registrationError, 'პაროლები ერთმანეთს არ ემთხვევა.');

    const accounts = readAccounts();
    if (accounts.some(account => account.email === email)) {
      showView('login');
      document.querySelector('#login-email').value = email;
      return showError(loginError, 'ამ ელფოსტით ანგარიში უკვე არსებობს. შეიყვანე პაროლი.');
    }

    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const account = {name, email, phone, salt: bytesToBase64(salt), passwordHash: await hashPassword(password, salt)};
      localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]));
      saveProfile(account);
    } catch (error) {
      showError(registrationError, error.message === 'secure-context'
        ? 'შესვლა უსაფრთხო HTTPS კავშირს საჭიროებს.'
        : 'ანგარიშის შენახვა ვერ მოხერხდა. შეამოწმე ბრაუზერის მეხსიერება.');
    }
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.hidden = true;
    const values = new FormData(loginForm);
    const email = String(values.get('email') || '').trim().toLocaleLowerCase('ka');
    const password = String(values.get('password') || '');
    const account = readAccounts().find(item => item.email === email);

    if (!account) return showError(loginError, 'ამ ბრაუზერში ასეთი ანგარიში ვერ მოიძებნა.');
    try {
      const enteredHash = await hashPassword(password, base64ToBytes(account.salt));
      if (enteredHash !== account.passwordHash) return showError(loginError, 'პაროლი არასწორია. სცადე თავიდან.');
      saveProfile(account);
    } catch (error) {
      showError(loginError, error.message === 'secure-context'
        ? 'შესვლა უსაფრთხო HTTPS კავშირს საჭიროებს.'
        : 'შესვლა ვერ მოხერხდა. სცადე თავიდან.');
    }
  });
})();
