// BLOC 1 : Configuration globale et liaisons API
const API_URL = "https://kadea-chat-api.onrender.com";
const Workspace_API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168";

// Récupération des éléments du DOM pour le popup d'erreur personnalisé
const customPopup = document.getElementById('custom-popup');
const popupMessage = document.getElementById('popup-message');
const closePopupBtn = document.getElementById('close-popup-btn');

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

// Gestion de la visibilité des mots de passe (icône de l'œil)
document.querySelectorAll('.btn-toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-regular', 'fa-solid'); // Devient œil plein
    } else {
      input.type = 'password';
      icon.classList.replace('fa-solid', 'fa-regular'); // Devient œil contouré
    }
  });
});

// Gestionnaire pour la fermeture du Pop-up de succès et redirection
document.getElementById('popupClose').addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.classList.add('hidden');
  window.location.href = 'index.html'; // Redirection vers la page de connexion
});


// BLOC 2 : Interception de l'événement de soumission du formulaire
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // Empêche le rechargement natif de la page

  // Récupération des valeurs saisies
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validation locale : Correspondance des mots de passe
  if (password !== confirmPassword) {
    showPopup("⚠️ Erreur : Les mots de passe ne correspondent pas !");
    return;
  }
  
  // Validation locale : Présence d'un caractère spécial
  const specialCharRegex = /[!@#$%^&*(),.?:{}|<>]/;
  if (!specialCharRegex.test(password)) {
    showPopup("⚠️ Sécurité : Votre mot de passe doit contenir au moins un caractère spécial (ex: @, !, $, etc.).");
    return;
  }

  // BLOC 3 : Préparation de l'objet de données (Payload)
  const payload = {
    fullName: fullName, 
    email: email,
    password: password
  };

  try {
    // Appel API vers le endpoint d'inscription
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Workspace_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      // Affichage du pop-up de succès (lié aux identifiants réels de register.html)
      const popup = document.getElementById('popup');
      popup.classList.remove('hidden');
    } else {
      // Gestion des erreurs renvoyées par l'API (ex: Email déjà existant)
      showPopup(`Échec de l'inscription : ${data.message || "Veuillez vérifier les informations saisies."}`);
    }

  } catch (error) {
    // Gestion des pannes réseau ou plantages majeurs
    console.error("Erreur réseau :", error);
    showPopup("Impossible de joindre le serveur. Veuillez vérifier votre connexion internet.");
  }
  
});