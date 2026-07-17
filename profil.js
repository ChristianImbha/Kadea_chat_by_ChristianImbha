document.addEventListener("DOMContentLoaded", () => {
    // 1. Récupération des données réelles dans le localStorage
    const savedName = localStorage.getItem("userName");
    const savedEmail = localStorage.getItem("userEmail");
    const savedAvatar = localStorage.getItem("userAvatar");
    const savedUserId = localStorage.getItem("userId");

    // 2. Ciblage des éléments de ta page (basé sur ton interface)
    // On cible le h1 du nom (qui contient "Alex Rivera")
    const nameHeading = document.querySelector("h1.text-gray-900, .font-bold.text-gray-900"); 
    // On cible le paragraphe de l'email
    const emailParagraph = document.querySelector("p.text-gray-500, .text-sm.text-gray-500");
    // On cible l'image de l'avatar
    const avatarImg = document.querySelector("img[alt='Avatar'], .rounded-full.object-cover");

    // 3. Injection des données dynamiques
    if (nameHeading && savedName) {
        nameHeading.textContent = savedName;
    }

    if (emailParagraph && savedEmail) {
        emailParagraph.textContent = savedEmail;
    }

    if (avatarImg) {
        // Si tu as un avatar personnalisé dans l'API, on l'affiche, sinon on génère un robot Dicebear propre avec ton ID
        if (savedAvatar && savedAvatar !== "undefined" && savedAvatar !== "") {
            avatarImg.src = savedAvatar;
        } else {
            const userId = savedUserId || "default";
            avatarImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
        }
        // Petit correctif de sécurité pour l'affichage de l'image
        avatarImg.classList.add("w-24", "h-24", "rounded-full", "object-cover");
    }
});