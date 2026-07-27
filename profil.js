
// ----------------------------------------------------------------------------
// 1. CONFIGURATION ET CONSTANTES SYSTEME
// ----------------------------------------------------------------------------
// Identifiants pour le service d'hébergement d'images Cloudinary
const CLOUD_NAME = 'dctgg4xw'; 
const UPLOAD_PRESET = 'ciu7uafl'; 

// Clé d'API globale pour l'authentification auprès du serveur Kadea Chat
const API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168"; 

// ----------------------------------------------------------------------------
// 2. SÉLECTION ET CIBLAGE DES ÉLÉMENTS DU DOM
// ----------------------------------------------------------------------------
const avatarInput = document.getElementById('avatar-input');
const profileAvatar = document.getElementById('profile-page-avatar');
const profileForm = document.getElementById('profile-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = profileForm.querySelector('button[type="submit"]');

// Variable globale pour conserver l'URL sécurisée générée par Cloudinary
let urlImageCloudinary = "";

/**
 * Affiche dynamiquement des alertes de statut personnalisées dans le DOM.
 * 
 * @param {string} message - Le texte à afficher dans l'alerte.
 * @param {'success'|'loading'|'error'} type - Le niveau d'alerte pour le style visuel.
 */
function showAlert(message, type = 'success') {
    alertBox.textContent = message;
    alertBox.className = "w-full p-3 rounded-xl text-xs md:text-sm text-center font-medium mt-4 block transition-all duration-200";
    
    // Application des styles selon l'état (Support du Dark Mode inclus)
    if (type === 'success') {
        alertBox.classList.add('bg-green-50', 'text-green-600', 'dark:bg-green-950/30', 'dark:text-green-400');
    } else if (type === 'loading') {
        alertBox.classList.add('bg-blue-50', 'text-blue-600', 'dark:bg-blue-950/30', 'dark:text-blue-400');
    } else {
        alertBox.classList.add('bg-red-50', 'text-red-600', 'dark:bg-red-950/30', 'dark:text-red-400');
    }
}

// ----------------------------------------------------------------------------
// 3. GESTION ET UPLOAD DE LA PHOTO DE PROFIL (CLOUDINARY)
// ----------------------------------------------------------------------------
avatarInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validation du format : accepte uniquement les fichiers images
    if (!file.type.startsWith('image/')) {
        showAlert("Le fichier doit être une image valide (JPG ou PNG).", "error");
        avatarInput.value = '';
        return;
    }

    // A. Feedback visuel instantané (Prévisualisation locale pour optimiser l'expérience utilisateur)
    const localUrl = URL.createObjectURL(file);
    profileAvatar.src = localUrl;

    // B. Verrouillage du bouton pour éviter la soumission avant la fin du téléversement
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    showAlert("Téléchargement de l'image en cours...", "loading");

    // C. Requête d'upload asynchrone vers l'API Cloudinary
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Échec du téléversement de l'image sur Cloudinary.");

        const data = await response.json();
        
        // Conservation de l'URL Cloudinary distante pour l'enregistrement final
        urlImageCloudinary = data.secure_url;
        showAlert("Image téléchargée ! N'oubliez pas d'enregistrer vos modifications.", "success");

    } catch (error) {
        console.error("Erreur d'upload Cloudinary :", error);
        showAlert("Erreur lors du téléchargement de la photo. Veuillez réessayer.", "error");
    } finally {
        // Déverrouillage du bouton de soumission
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

// ----------------------------------------------------------------------------
// 4. SOUMISSION DU FORMULAIRE ET MISE À JOUR DE L'UTILISATEUR (API)
// ----------------------------------------------------------------------------
profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Récupération des jetons et des données saisies
    const token = localStorage.getItem('token');
    const nomUtilisateur = document.getElementById('profile-name').value;
    const statutBio = document.getElementById('profile-status').value;

    // Récupération de l'image : nouvelle URL Cloudinary ou image existante par défaut
    const urlPhotoFinale = urlImageCloudinary || profileAvatar.src;

    showAlert("Enregistrement du profil...", "loading");
    submitBtn.disabled = true;

    try {
        // Envoi des données modifiées à l'API backend
        const response = await fetch('https://kadea-chat-api.onrender.com/users/me', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fullName: nomUtilisateur,   
                avatarUrl: urlPhotoFinale,  
                bio: statutBio              
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erreur lors de la mise à jour des informations.");
        }

        showAlert("Profil mis à jour avec succès !", "success");

        // Redirection vers le chat après une courte pause de validation
        setTimeout(() => {
            window.location.href = "chat.html";
        }, 1500);

    } catch (error) {
        console.error("Erreur API lors du PATCH :", error);
        showAlert(error.message || "Impossible de mettre à jour le profil.", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

// ----------------------------------------------------------------------------
// 5. GESTION DE LA DÉCONNEXION (LOGOUT)
// ----------------------------------------------------------------------------
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Suppression des identifiants et des jetons enregistrés localement
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        
        // Redirection de l'utilisateur vers la page de connexion
        window.location.href = "index.html";
    });
}

// ----------------------------------------------------------------------------
// 6. GESTION DU BASCULEMENT DE THÈME (DARK / LIGHT MODE)
// ----------------------------------------------------------------------------
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
}