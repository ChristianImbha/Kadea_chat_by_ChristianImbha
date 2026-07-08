// On attend que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.querySelector('.btn-toggle-password');
    const passwordInput = document.getElementById('password');
    const API_URL = 'https://kadea-chat-api.onrender.com';
    const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';
    /**
 * Affiche le popup d'erreur personnalisé
 * @param {string} message - Le texte à afficher dans la notification
 */
function showPopup(message) {
  popupMessage.textContent = message;
  customPopup.classList.remove('hidden');
}

// Écouteur pour fermer le popup d'erreur au clic sur son bouton
closePopupBtn.addEventListener('click', () => {
  customPopup.classList.add('hidden');
});

// Fermer le popup d'erreur si l'utilisateur clique en dehors de la boîte blanche
customPopup.addEventListener('click', (e) => {
  if (e.target === customPopup) {
    customPopup.classList.add('hidden');
  }
});
    // 1. Afficher / Masquer le mot de passe
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Changer l'icône oeil / oeil barré
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        });
    }
    // 2. Gestion de la soumission du formulaire (Authentification)
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Récupération des éléments du formulaire
            const emailInput = document.getElementById('email').value.trim();
            const password = passwordInput.value;
            const rememberMe = document.getElementById('remember-me').checked;

            // Préparation des données pour l'API
            const payload = {
                email: emailInput,
                password: password
            };
            try {
                
                const response = await fetch("https://kadea-chat-api.onrender.com/auth/login", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                       'x-api-key': Workspace_API_KEY
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    // Si le serveur renvoie une erreur (ex: mauvais mot de passe)
                    throw new Error(data.message || 'Authentification échouée');
                }
                // En cas de succès : Stockage du token de session
                // Si "Keep me signed in" est coché -> localStorage (persistant), sinon sessionStorage (temporaire)
                if (rememberMe) {
                    localStorage.setItem('token', data.data.token);
                } else {
                    sessionStorage.setItem('token',data.data.token);
                }

                // Stocker aussi optionnellement les infos de l'utilisateur connecté (nom, avatar, id)
                localStorage.setItem('user_profile', JSON.stringify(data.user));

                alert('Connexion réussie ! Redirection...');
                
                // Redirection vers l'interface principale de la messagerie
                window.location.href = 'chat.html';

            } catch (error) {
                console.error('Erreur lors de la connexion :', error);
                alert(`Erreur : ${error.message}`);
            }
        });
    }
});