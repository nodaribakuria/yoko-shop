(() => {
  const form = document.querySelector('#reset-form');
  const message = document.querySelector('#reset-message');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.hidden = true;
    const client = window.yokoSupabase;
    if (!client) {
      message.textContent = 'სერვერი ჯერ არ არის დაკავშირებული.';
      message.hidden = false;
      return;
    }
    const email = new FormData(form).get('email').trim();
    const redirectTo = new URL('update-password.html', window.location.href).href;
    try {
      const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo});
      message.textContent = error
        ? 'ბმულის გაგზავნა ვერ მოხერხდა. გადაამოწმე ელფოსტა და სცადე მოგვიანებით.'
        : 'თუ ამ ელფოსტაზე ანგარიში არსებობს, აღდგენის ბმული გაიგზავნა.';
    } catch {
      message.textContent = 'სერვერთან დაკავშირება ვერ მოხერხდა. სცადე მოგვიანებით.';
    }
    message.hidden = false;
  });
})();
