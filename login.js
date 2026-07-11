// On attend que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.querySelector('.btn-toggle-password');
    const passwordInput = document.getElementById('password');
    const API_URL = 'https://kadea-chat-api.onrender.com';
    const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';
   
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
                    throw new Error(data.message || 'Authentification échouée');
                }

                // Récupération sécurisée du token selon la structure de ton API
                // (s'adapte si le token est dans data.token ou data.data.token)
                const userToken = data.token || (data.data && data.data.token);
                
                // Extraction de l'ID utilisateur (utile pour renderMessages dans chat.js)
                const userId = data.user?.id || data.userId || (data.data && data.data.user && data.data.user.id);

                if (!userToken) {
                    throw new Error("Le serveur n'a pas renvoyé de jeton d'authentification valide.");
                }

                // Stockage du jeton selon le choix "Remember me"
                if (rememberMe) {
                    localStorage.setItem('token', userToken);
                } else {
                    sessionStorage.setItem('token', userToken);
                }

                // Stockage des informations essentielles pour le fonctionnement du chat
                if (userId) {
                    localStorage.setItem('userId', userId);
                }
                localStorage.setItem('user_profile', JSON.stringify(data.user || data.data?.user || {}));
                             
                // Redirection vers l'interface principale
                window.location.href = 'chat.html';

            } catch (error) {
                console.error('Erreur lors de la connexion :', error);
                alert(`Erreur : ${error.message}`);
            }
        });
    }
});