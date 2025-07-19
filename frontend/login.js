// frontend/login.js
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('name-input');
    const signupFields = document.getElementById('signup-fields');
    const addContactBtn = document.getElementById('add-contact-btn');
    const contactInput = document.getElementById('contact-input');
    const contactList = document.getElementById('contact-list');
    const authBtn = document.getElementById('auth-btn');
    const notificationEl = document.getElementById('notification');

    let favoriteContacts = [];

    // --- NOTIFICATION ---
    let notificationTimeout;
    function showNotification(message, type = 'info') {
        clearTimeout(notificationTimeout);
        notificationEl.textContent = message;
        notificationEl.className = 'show';
        notificationEl.classList.add(type);
        notificationTimeout = setTimeout(() => {
            notificationEl.className = notificationEl.className.replace('show', '');
        }, 4000);
    }

    // --- DYNAMIC CONTACT LIST ---
    function renderContacts() {
        contactList.innerHTML = '';
        favoriteContacts.forEach((contact, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${contact}</span>
                <button type="button" class="remove-contact-btn" data-index="${index}"><i class="fas fa-times-circle"></i></button>
            `;
            contactList.appendChild(li);
        });
    }

    addContactBtn.addEventListener('click', () => {
        const contact = contactInput.value.trim();
        if (contact && !favoriteContacts.includes(contact)) {
            favoriteContacts.push(contact);
            renderContacts();
            contactInput.value = '';
        }
    });

    contactList.addEventListener('click', (e) => {
        if (e.target.closest('.remove-contact-btn')) {
            const index = e.target.closest('.remove-contact-btn').dataset.index;
            favoriteContacts.splice(index, 1);
            renderContacts();
        }
    });


    // --- AUTH LOGIC ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authBtn.disabled = true;
        authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();

        try {
            const res = await fetch('/api/users/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, favoriteContacts })
            });
            
            const data = await res.json();

            if (!res.ok) {
                // If user doesn't exist, server returns an error. We interpret this as a need to sign up.
                if (res.status === 400 && data.message.includes('Name and at least one contact')) {
                    showNotification('New user? Please provide your name and at least one contact.', 'info');
                    signupFields.style.display = 'flex';
                    nameInput.required = true;
                } else {
                    throw new Error(data.message || 'Authentication failed');
                }
            } else {
                // SUCCESS! User is logged in or signed up.
                localStorage.setItem('sjt_userId', data._id); // Store user ID
                localStorage.setItem('sjt_userName', data.name); // Store user name
                localStorage.setItem('sjt_userEmail', data.email); 
                window.location.href = '/index.html'; // Redirect to main app
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            authBtn.disabled = false;
            authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Continue';
        }
    });
});