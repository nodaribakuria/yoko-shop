(() => {
  const profileKey = 'yoko-profile';
  const form = document.querySelector('#registration-form');
  const error = document.querySelector('#auth-error');

  try {
    if (localStorage.getItem(profileKey)) {
      window.location.replace('shop.html');
      return;
    }
  } catch {
    // The form can still be shown when browser storage is disabled.
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const email = String(values.get('email') || '').trim().toLocaleLowerCase('ka');
    const phone = String(values.get('phone') || '').trim();
    const password = String(values.get('password') || '');
    const confirmation = String(values.get('passwordConfirm') || '');

    error.hidden = true;
    if (password.length < 8) {
      error.textContent = 'პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს.';
      error.hidden = false;
      return;
    }
    if (password !== confirmation) {
      error.textContent = 'პაროლები ერთმანეთს არ ემთხვევა.';
      error.hidden = false;
      return;
    }

    try {
      localStorage.setItem(profileKey, JSON.stringify({name, email, phone}));
      window.location.href = 'shop.html';
    } catch {
      error.textContent = 'პროფილის შესანახად ჩართე ბრაუზერის local storage.';
      error.hidden = false;
    }
  });
})();
