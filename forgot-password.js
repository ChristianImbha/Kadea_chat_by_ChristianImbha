// Initialisation des configurations et liaison au DOM
const Workspace_API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168"; 
const BASE_URL = "https://kadea-chat-api.onrender.com";

const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');
// 1. Demande d'envoi du code
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    try {
        const response = await fetch(`https://kadea-chat-api.onrender.com/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': Workspace_API_KEY
            },
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            // Masquer le premier formulaire et afficher le second
            forgotForm.classList.add('hidden');
            resetForm.classList.remove('hidden');
        } else {
            const errorData = await response.json();
            alert(`Erreur : ${errorData.message || 'Impossible d\'envoyer le code.'}`);
        }
    } catch (error) {
        console.error('Erreur réseau :', error);
        alert('Erreur de connexion au serveur.');
    }
});

// 2. Soumission du code et du nouveau mot de passe
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('new-password').value;

    try {
        const response = await fetch(`https://kadea-chat-api.onrender.com/auth/forgot-password/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({ code: code, newPassword: newPassword })
        });

        if (response.ok) {
            alert('Votre mot de passe a été modifié avec succès !');
            // Redirection vers la page de connexion
            window.location.href = "index.html";
        } else {
            const errorData = await response.json();
            alert(`Erreur : ${errorData.message || 'Code invalide ou expiré.'}`);
        }
    } catch (error) {
        console.error('Erreur réseau :', error);
        alert('Erreur de connexion au serveur.');
    }
});