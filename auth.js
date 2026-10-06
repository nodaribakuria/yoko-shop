(() => {
  const client = window.yokoSupabase;
  const registrationForm = document.querySelector('#registration-form');
  const loginForm = document.querySelector('#login-form');
  const registrationError = document.querySelector('#auth-error');
  const loginError = document.querySelector('#login-error');
  const backendWarning = document.querySelector('#backend-warning');
  const title = document.querySelector('#auth-title');
  const intro = document.querySelector('#auth-intro');
  const registerTab = document.querySelector('#register-tab');
  const loginTab = document.querySelector('#login-tab');
  const isLoginRoute = new URLSearchParams(location.search).get('view') === 'login';

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

  function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  registerTab.addEventListener('click', () => showView('register'));
  loginTab.addEventListener('click', () => showView('login'));
  showView(isLoginRoute ? 'login' : 'register');

  if (!client) {
    backendWarning.textContent = 'სერვერი ჯერ არ არის დაკავშირებული. რეგისტრაციისა და შესვლის გასააქტიურებლად პროექტის კონფიგურაციაა საჭირო.';
    backendWarning.hidden = false;
    return;
  }

  client.auth.getSession().then(({data}) => {
    if (data.session && !isLoginRoute) location.replace('shop.html');
  });

  registrationForm.addEventListener('submit', async event => {
    event.preventDefault();
    registrationError.hidden = true;
    const values = new FormData(registrationForm);
    const name = String(values.get('name') || '').trim();
    const email = String(values.get('email') || '').trim();
    const phone = String(values.get('phone') || '').trim();
    const password = String(values.get('password') || '');
    const confirmation = String(values.get('passwordConfirm') || '');
    if (password !== confirmation) return showError(registrationError, 'პაროლები ერთმანეთს არ ემთხვევა.');

    try {
      const {data, error} = await client.auth.signUp({
        email,
        password,
        options: {
          data: {full_name: name, phone},
          emailRedirectTo: new URL('shop.html', location.href).href
        }
      });
      if (error) return showError(registrationError, 'რეგისტრაცია ვერ შესრულდა. გადაამოწმე ელფოსტა და პაროლი.');
      if (data.session) {
        location.href = 'shop.html';
        return;
      }
      showView('login');
      document.querySelector('#login-email').value = email;
      showError(loginError, 'ანგარიშის დასადასტურებელი წერილი ელფოსტაზე გამოგიგზავნეთ. დაადასტურე და შემდეგ შედი.');
    } catch {
      showError(registrationError, 'სერვერთან დაკავშირება ვერ მოხერხდა. სცადე მოგვიანებით.');
    }
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.hidden = true;
    const values = new FormData(loginForm);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    try {
      const {error} = await client.auth.signInWithPassword({email, password});
      if (error) return showError(loginError, 'შესვლა ვერ მოხერხდა. გადაამოწმე ელფოსტა და პაროლი.');
      location.href = 'shop.html';
    } catch {
      showError(loginError, 'სერვერთან დაკავშირება ვერ მოხერხდა. სცადე მოგვიანებით.');
    }
  });
})();
