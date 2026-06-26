/*----Show/Hide Password----*/
document.getElementById('togglePassword').addEventListener('click', function() {
    const eye  = document.getElementById(`eye`);
    const pwd = document.getElementById('password');
    if (pwd.type === 'password'){
        pwd.type = 'text'
        eye.classList.replace('bi-eye', 'bi-eye-slash');
    }
    else{
        pwd.type = 'password'
        eye.classList.replace('bi-eye-slash', 'bi-eye');
    }
});

/*----Submit login form----*/
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const alertEl = document.getElementById('alertError');
    const alertMsg = document.getElementById('alertMessage');
    const submitBtn = document.getElementById('submitBtn');

    // Bootstrap validation
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    // UI loading
    alertEl.classList.add('d-none');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            credentials: 'include', // send and receive cookie
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if ((!response.ok) || response.redirected) {
            throw new Error('Credential not valid.');
        }
        window.location.href = '/list/requests';

    } catch (err) {
        alertMsg.textContent = 'Credential not valid';
        alertEl.classList.remove('d-none');
        form.classList.remove('was-validated');
    } finally {
        submitBtn.disabled = false;
    }
});