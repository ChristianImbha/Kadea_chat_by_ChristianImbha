// On attend que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.querySelector('.btn-toggle-password');
    const passwordInput = document.getElementById('password');
    // 1. Fonctionnalité Bonus : Afficher / Masquer le mot de passe
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
            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value;
            const rememberMe = document.getElementById('remember-me').checked;

            // Préparation des données pour l'API de Kadea
            const loginData = {
                email: email,
                password: password
            };
            try {
                // Remplacer l'URL ci-dessous par l'endpoint exact fourni dans tes consignes API
                const response = await fetch("https://kadea-chat-api.onrender.com/auth/login", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (!response.ok) {
                    // Si le serveur renvoie une erreur (ex: mauvais mot de passe)
                    throw new Error(result.message || 'Authentification échouée');
                }
                // En cas de succès : Stockage du token de session
                // Si "Keep me signed in" est coché -> localStorage (persistant), sinon sessionStorage (temporaire)
                if (rememberMe) {
                    localStorage.setItem('kadea_chat_token', result.token);
                } else {
                    sessionStorage.setItem('kadea_chat_token',result.token);
                }

                // Stocker aussi optionnellement les infos de l'utilisateur connecté (nom, avatar, id)
                localStorage.setItem('user_profile', JSON.stringify(result.user));

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