/**
 * ==============================================================================
 * GESTION DE LA RÉINITIALISATION DU MOT DE PASSE (FORGOT / RESET PASSWORD)
 * ==============================================================================
 */

// --- CONFIGURATION DE L'API ---
// Clé d'API nécessaire pour authentifier les requêtes auprès du serveur
const API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168"; 

// URL de base du serveur API backend
const API_URL = "https://kadea-chat-api.onrender.com";

// --- SÉLECTION DES ÉLÉMENTS DU DOM ---
// Formulaire de saisie de l'adresse email
const forgotForm = document.getElementById('forgot-form');

// Formulaire de saisie du code à 6 chiffres et du nouveau mot de passe
const resetForm = document.getElementById('reset-form');

/**
 * ------------------------------------------------------------------------------
 * ÉTAPE 1 : DEMANDE D'ENVOI DU CODE DE RÉINITIALISATION
 * ------------------------------------------------------------------------------
 * Envoie l'adresse email saisie par l'utilisateur au backend.
 * Si l'email existe, le serveur génère et envoie un code de vérification.
 */
forgotForm.addEventListener('submit', async (e) => {
    // Empêche le rechargement par défaut de la page lors de la soumission du formulaire
    e.preventDefault();

    // Récupération et nettoyage de la valeur de l'email
    const email = document.getElementById('forgot-email').value.trim();

    try {
        // Envoi de la requête POST au point d'accès de réinitialisation
        const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            // Succès : Bascule l'affichage vers l'étape 2 (masque le 1er formulaire, affiche le 2nd)
            forgotForm.classList.add('hidden');
            resetForm.classList.remove('hidden');
        } else {
            // Gestion des erreurs renvoyées par le serveur (ex: email introuvable)
            const errorData = await response.json();
            alert(`Erreur : ${errorData.message || 'Impossible d\'envoyer le code.'}`);
        }
    } catch (error) {
        // Gestion des erreurs réseau ou d'interruption de connexion
        console.error('Erreur réseau :', error);
        alert('Erreur de connexion au serveur.');
    }
});

/**
 * ------------------------------------------------------------------------------
 * ÉTAPE 2 : SOUMISSION DU CODE ET DU NOUVEAU MOT DE PASSE
 * ------------------------------------------------------------------------------
 * Valide le code reçu par l'utilisateur et met à jour son mot de passe.
 */
resetForm.addEventListener('submit', async (e) => {
    // Empêche le comportement par défaut du formulaire
    e.preventDefault();

    // Récupération des valeurs saisies dans le second formulaire
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('new-password').value;

    try {
        // Envoi de la requête de réinitialisation avec le code et le nouveau mot de passe
        const response = await fetch(`${BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY 
            },
            body: JSON.stringify({ 
                code: code, 
                newPassword: newPassword 
            })
        });

        if (response.ok) {
            // Confirmation de la réinitialisation réussie
            alert('Votre mot de passe a été modifié avec succès !');
            
            // Redirection vers la page d'authentification / connexion
            window.location.href = 'index.html';
        } else {
            // Gestion des erreurs serveur (ex: code incorrect ou expiré)
            const errorData = await response.json();
            alert(`Erreur : ${errorData.message || 'Code invalide ou expiré.'}`);
        }
    } catch (error) {
        // Gestion des erreurs de communication avec l'API
        console.error('Erreur réseau :', error);
        alert('Erreur de connexion au serveur.');
    }
});