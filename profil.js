// Configuration Cloudinary (Remplace ces valeurs par les tiennes si nécessaire)
const CLOUD_NAME = 'dctgg4xw'; 
const UPLOAD_PRESET = 'ciu7uafl'; 
const API_KEY_KADEA = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168"; 

// Ciblage des éléments HTML
const avatarInput = document.getElementById('avatar-input');
const profileAvatar = document.getElementById('profile-page-avatar');
const profileForm = document.getElementById('profile-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = profileForm.querySelector('button[type="submit"]');

// Variable globale pour stocker l'URL renvoyée par Cloudinary
let urlImageCloudinary = "";

/**
 * Fonction pour afficher des messages de statut propres à l'écran
 */
function showAlert(message, type = 'success') {
    alertBox.textContent = message;
    alertBox.className = "w-full p-3 rounded-xl text-xs md:text-sm text-center font-medium mt-4 block";
    
    if (type === 'success') {
        alertBox.classList.add('bg-green-50', 'text-green-600', 'dark:bg-green-950/30', 'dark:text-green-400');
    } else if (type === 'loading') {
        alertBox.classList.add('bg-blue-50', 'text-blue-600', 'dark:bg-blue-950/30', 'dark:text-blue-400');
    } else {
        alertBox.classList.add('bg-red-50', 'text-red-600', 'dark:bg-red-950/30', 'dark:text-red-400');
    }
}

/**
 * 1. ÉCOUTEUR DU CHANGEMENT DE PHOTO
 */
avatarInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Vérification du type de fichier
    if (!file.type.startsWith('image/')) {
        showAlert("Le fichier doit être une image valide (JPG ou PNG).", "error");
        avatarInput.value = '';
        return;
    }

    // A. Affichage local instantané pour l'UX
    const localUrl = URL.createObjectURL(file);
    profileAvatar.src = localUrl;

    // B. Désactivation du bouton de soumission pendant l'envoi à Cloudinary
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    showAlert("Téléchargement de l'image en cours...", "loading");

    // C. Envoi vers Cloudinary
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Échec de l'envoi Cloudinary");

        const data = await response.json();
        
        // Stockage de l'URL sécurisée finale
        urlImageCloudinary = data.secure_url;
        showAlert("Image prête ! N'oubliez pas d'enregistrer vos modifications.", "success");

    } catch (error) {
        console.error("Erreur Cloudinary :", error);
        showAlert("Erreur lors du téléchargement de la photo. Réessayez.", "error");
    } finally {
        // Réactivation du bouton d'enregistrement
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

/**
 * 2. SOUMISSION DU FORMULAIRE ET MISE À ZONE DE L'API
 */
profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const nomUtilisateur = document.getElementById('profile-name').value;
    const statutBio = document.getElementById('profile-status').value;

    // Si aucune nouvelle image n'a été uploadée sur Cloudinary, on garde l'ancienne
    const urlPhotoFinale = urlImageCloudinary || profileAvatar.src;

    showAlert("Enregistrement du profil...", "loading");
    submitBtn.disabled = true;

    try {
        const response = await fetch('https://kadea-chat-api.onrender.com/users/me', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY_KADEA,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fullName: nomUtilisateur,   // Modifié : 'name' devient 'fullName' pour correspondre à Prisma
                avatarUrl: urlPhotoFinale,  // Envoi de l'URL Cloudinary ou actuelle
                bio: statutBio              // Envoi du statut/bio
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erreur lors de la mise à jour");
        }

        showAlert("Profil mis à jour avec succès !", "success");

        // Optionnel : Redirection après 1.5 seconde vers la page chat
        setTimeout(() => {
            window.location.href = "chat.html";
        }, 1500);

    } catch (error) {
        console.error("Erreur API :", error);
        showAlert(error.message || "Impossible de mettre à jour le profil.", "error");
    } finally {
        submitBtn.disabled = false;
    }
  // Logout
    const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Nettoyage de la session
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        
        // Redirection vers l'accueil / connexion
        window.location.href = "index.html";
    });
}
    // ==========================================
// GESTION DU THEME SOMBRE (DARK MODE)
// ==========================================
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
});