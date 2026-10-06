(() => {
  const client = window.yokoSupabase;
  const form = document.querySelector('#update-password-form');
  const status = document.querySelector('#update-status');
  const errorBox = document.querySelector('#update-error');
  let recoverySessionReady = false;

  if (!client) {
    status.textContent = 'სერვერი ჯერ არ არის დაკავშირებული.';
    return;
  }

  function acceptRecoverySession(session) {
    if (!session) return;
    recoverySessionReady = true;
    form.hidden = false;
    status.textContent = 'დააყენე ახალი პაროლი.';
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || session) acceptRecoverySession(session);
  });
  client.auth.getSession().then(({data}) => {
    if (data.session) acceptRecoverySession(data.session);
    else if (!recoverySessionReady) status.textContent = 'აღდგენის ბმული არასწორია ან ვადა გაუვიდა. მოითხოვე ახალი ბმული.';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.hidden = true;
    if (!recoverySessionReady) {
      errorBox.textContent = 'აღდგენის ბმული თავიდან მოითხოვე.';
      errorBox.hidden = false;
      return;
    }
    const values = new FormData(form);
    const password = String(values.get('password'));
    if (password !== String(values.get('confirm'))) {
      errorBox.textContent = 'პაროლები ერთმანეთს არ ემთხვევა.';
      errorBox.hidden = false;
      return;
    }
    const {error} = await client.auth.updateUser({password});
    if (error) {
      errorBox.textContent = 'პაროლის შეცვლა ვერ მოხერხდა. სცადე სხვა პაროლი.';
      errorBox.hidden = false;
      return;
    }
    status.textContent = 'პაროლი წარმატებით შეიცვალა. ახლა შეგიძლია შეხვიდე.';
    form.hidden = true;
    await client.auth.signOut({scope: 'local'});
    setTimeout(() => { window.location.href = 'index.html?view=login'; }, 1800);
  });
})();
