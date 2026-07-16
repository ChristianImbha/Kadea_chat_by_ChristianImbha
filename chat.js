// configuration de l'API
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

// Éléments du profil utilisateur connecté
const myAvatar = document.getElementById("active-user-avatar"); 
const myName = document.getElementById("active-user-name"); 
const currentUserId = localStorage.getItem("userId");

// Sécurisation de la page : Vérification immédiate du Token
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

// Variables pour suivre l'état de la discussion active
let activeConversationId = null;

// Ciblage des éléments du DOM indispensables
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");
const deleteConvBtn = document.getElementById("delete-conv-btn");

// Éléments d'en-tête du chat actif et colonnes
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");
const colLeft = document.getElementById("col-left");
const colRight = document.getElementById("col-right");
const backBtn = document.getElementById("back-to-list-btn");

// ===================================================
//  LOGIQUE RESPONSIVE : Affichage / Masquage mobile
// ===================================================

// Affiche le chat à droite et cache la liste de gauche sur mobile
function showChatColumn() {
    if (window.innerWidth < 768) { // Point de rupture standard Tailwind md (768px)
        if (colLeft) colLeft.classList.add("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    }
}

// Affiche la liste de gauche et cache le chat sur mobile (quand on clique sur Retour)
function showListColumn() {
    if (window.innerWidth < 768) {
        if (colRight) {
            colRight.classList.add("hidden");
            colRight.classList.remove("flex");
        }
        if (colLeft) colLeft.classList.remove("hidden");
    }
}

// Écouteur sur le bouton de retour en arrière
if (backBtn) {
    backBtn.addEventListener("click", showListColumn);
}

// Sécurité : Rétablit l'affichage complet si on élargit la fenêtre du navigateur
window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
        if (colLeft) colLeft.classList.remove("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    } else {
        // Sur mobile, on affiche la liste par défaut
        showListColumn();
    }
});

// Fonction utilitaire pour formater l'heure
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 1. Charger et afficher la liste de TOUS les utilisateurs du Workspace sauf soi-même
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer la liste des utilisateurs.");
        
        const resJson = await response.json();
        
        let usersArray = [];
        if (resJson.data && Array.isArray(resJson.data.users)) {
            usersArray = resJson.data.users;
        } else if (Array.isArray(resJson.data)) {
            usersArray = resJson.data;
        } else if (Array.isArray(resJson)) {
            usersArray = resJson;
        }

        let currentUserId = localStorage.getItem("userId");
        if (currentUserId) {
            currentUserId = currentUserId.replace(/['"]+/g, '').trim();
        }

        const filteredUsers = usersArray.filter(user => {
            if (!user.id) return true; 
            const cleanUserId = String(user.id).replace(/['"]+/g, '').trim();
            return cleanUserId !== currentUserId;
        });

        renderUsersList(filteredUsers); 

    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
    }
}

// 2. FONCTION : Charger et afficher les infos de l'utilisateur connecté avec Fallback
async function loadMyProfile() {
    try {
        let response = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) {
            console.warn("Route /auth/me rejetée, passage à la route de secours...");
            const currentUserId = localStorage.getItem("userId");
            response = await fetch(`${API_URL}/users/${currentUserId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                }
            });
        }

        if (!response.ok) throw new Error("Impossible de récupérer le profil.");

        const resJson = await response.json();
        const userData = resJson.data || resJson;
        
        const myId = userData.id || userData._id;

        if (myId) {
            localStorage.setItem("userId", myId);
            if (myName) {
                myName.textContent = myId;
            }
        }

        if (myAvatar) {
            myAvatar.src = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${myId || 'default'}`;
        }
    } catch (error) {
        console.error("Erreur profil :", error);
        const localId = localStorage.getItem("userId");
        if (myName && localId) myName.textContent = localId;
    }
}

// 3. FONCTION : Injecter la liste des utilisateurs dans le HTML à gauche
function renderUsersList(users) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; 

    if (users.length === 0) {
        roomsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center p-4">Aucun autre utilisateur trouvé.</p>`;
        return;
    }

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.dataset.targetUserId = user.id;
        userElement.dataset.conversationId = user.id; 
        userElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition`;
        
        const displayAvatar = user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

        userElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${user.fullName || 'Utilisateur'}</h3>
                <p class="text-xs text-green-500 truncate">Cliquez pour discuter</p>
            </div>
        `;

        userElement.addEventListener("click", () => handleStartChat(user.id, user.fullName, displayAvatar));
        roomsContainer.appendChild(userElement);
    });
}

// 4. FONCTION INTERMÉDIAIRE : Cliquer sur un utilisateur 
async function handleStartChat(targetUserId, displayName, displayAvatar) {
    try {
        console.log("Clic détecté pour l'utilisateur :", targetUserId);

        const response = await fetch(`${API_URL}/conversations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            },
            body: JSON.stringify({
                type: "private",
                participantIds: [targetUserId],
                name: displayName
            })
        });

        console.log("Statut HTTP reçu de l'API :", response.status);

        if (!response.ok) throw new Error(`Erreur API : Statut ${response.status}`);

        const result = await response.json();
        console.log("Données reçues de la conversation :", result);
        
        let conversationId = null;
        if (result.data) {
            conversationId = result.data.id || (result.data.conversation && result.data.conversation.id);
        } else {
            conversationId = result.id;
        }

        console.log("ID final extrait pour l'affichage :", conversationId);

        if (conversationId) {
            selectConversation({
                id: conversationId,
                name: displayName,
                avatar: displayAvatar
            });
        } else {
            console.error("Structure JSON inattendue : impossible de lire l'ID de la conversation.");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la discussion :", error);
    }
}

// 5. FONCTION : Sélectionner une conversation et charger son historique
async function selectConversation(conv) {
    activeConversationId = conv.id;
    
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar;
    
    if (chatPanel) chatPanel.classList.remove("hidden");

    document.querySelectorAll(".conversation-item").forEach(el => {
        if (el.dataset.conversationId === conv.id) {
            el.classList.add("bg-slate-100");
        } else {
            el.classList.remove("bg-slate-100");
        }
    });

    await loadMessages(conv.id);

    // 🚀 BASCULE MOBILE : Une fois le chat configuré, on l'affiche et on cache les contacts
    showChatColumn();
}

// 6. FONCTION : Récupérer les messages de la conversation active
async function loadMessages(conversationId) {
    try {
         const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur de récupération des messages.");

        const messages = await response.json();
        renderMessages(messages);
    } catch (error) {
        console.error("Erreur messages:", error);
    }
}

// 7. FONCTION : Afficher les messages à l'écran (Corrigée pour l'alignement gauche/droite)
function renderMessages(messagesData) {
    const messagesContainer = document.getElementById("messages-container"); 
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = ""; 

    let messages = [];
    if (Array.isArray(messagesData)) {
        messages = messagesData;
    } else if (messagesData && messagesData.data) {
        if (Array.isArray(messagesData.data)) {
            messages = messagesData.data;
        } else if (messagesData.data.messages && Array.isArray(messagesData.data.messages)) {
            messages = messagesData.data.messages;
        }
    } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
        messages = messagesData.messages;
    }

    if (messages.length === 0) {
        messagesContainer.innerHTML = "<p class='text-center text-gray-500 py-4'>Aucun message dans cette discussion.</p>";
        return;
    } 

    let currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
        currentUserId = currentUserId.replace(/['"]+/g, '').trim(); 
    }

   messages.forEach(msg => {
        let senderId = msg.senderId || msg.userId || (msg.sender && msg.sender.id);
        if (senderId) {
            senderId = String(senderId).replace(/['"]+/g, '').trim();
        }
        
        const senderName = msg.sender?.fullName || '';
        const isMe = (senderId === currentUserId) || (senderName === "Christian Imbha");
        const msgId = msg.id || msg._id; // On récupère l'ID du message
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2 group`; // "group" pour le survol CSS

        messageBlock.innerHTML = `
            <div class="flex items-center space-x-2">
                ${isMe && msgId ? `
                    <button onclick="deleteMessage('${msgId}')" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition text-xs p-1" title="Supprimer">
                        🗑️
                    </button>
                ` : ''}
                <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-sm flex flex-col">
                    ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${senderName || 'Utilisateur'}</p>` : ''}
                    <p class="break-words">${msg.content || msg.text || ''}</p>
                    <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 8. ÉCOUTEUR D'ÉVÉNEMENT : Gérer l'envoi d'un nouveau message
if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        messageInput.value = "";

        try {
            const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                },
                body: JSON.stringify({ content: content })
            });

            if (response.ok) {
                await loadMessages(activeConversationId);
            } else {
                alert("Erreur lors de l'envoi du message.");
            }
        } catch (error) {
            console.error("Erreur envoi:", error);
        }
    });
}

// fonction  SUPPRESSION D'UN MESSAGE

//  PROMESSE DE CONFIRMATION PERSONNALISÉE
// ===================================================
function customConfirm() {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirm-modal");
        const okBtn = document.getElementById("confirm-ok-btn");
        const cancelBtn = document.getElementById("confirm-cancel-btn");

        if (!modal || !okBtn || !cancelBtn) {
            // Secours si le HTML n'est pas prêt
            resolve(confirm("Voulez-vous vraiment supprimer ce message ?"));
            return;
        }

        // Affiche le modal avec une petite animation
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        lucide.createIcons(); // Recharge l'icône triangle d'alerte

        const handleOk = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            okBtn.removeEventListener("click", handleOk);
            cancelBtn.removeEventListener("click", handleCancel);
        };

        okBtn.addEventListener("click", handleOk);
        cancelBtn.addEventListener("click", handleCancel);
    });
}

// ===================================================
//  SUPPRESSION D'UN MESSAGE (Avec le nouveau popup)
// ===================================================
async function deleteMessage(messageId) {
    // On appelle notre modal moderne 
    const confirmed = await customConfirm();
    
    if (!confirmed) {
        showToast("Suppression annulée", "info");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/messages/${messageId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (response.ok) {
            showToast("Message supprimé avec succès !", "success");
            await loadMessages(activeConversationId);
        } else {
            showToast("Impossible de supprimer ce message.", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression du message :", error);
        showToast("Une erreur est survenue.", "error");
    }
}

// ===================================================
//  NOTIFICATION TOAST (Avec Toast vert centré sur l'écran)
// ===================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    
    // Cas spécial : Le toast vert de succès est centré au milieu de l'écran
    if (type === "success") {
        const centerToast = document.createElement("div");
        
        // Classes Tailwind pour le centrage absolu sur l'écran avec une animation de zoom (scale)
        centerToast.className = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] flex flex-col items-center p-6 rounded-2xl shadow-2xl border text-center transition-all duration-300 transform scale-90 opacity-0 bg-emerald-50 border-emerald-200 text-emerald-800 min-w-[280px] pointer-events-auto`;
        
        centerToast.innerHTML = `
            <span class="text-4xl mb-3">✅</span>
            <div class="text-base font-bold">${message}</div>
        `;

        document.body.appendChild(centerToast);

        // Animation d'entrée
        setTimeout(() => {
            centerToast.classList.remove("scale-90", "opacity-0");
            centerToast.classList.add("scale-100", "opacity-100");
        }, 50);

        // Disparition automatique au bout de 2.5 secondes
        setTimeout(() => {
            centerToast.classList.remove("scale-100", "opacity-100");
            centerToast.classList.add("scale-90", "opacity-0");
            setTimeout(() => {
                centerToast.remove();
            }, 300);
        }, 2500);
        
        return; // On s'arrête ici pour le type success
    }

    // Comportement classique en bas à droite pour "error" et "info"
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `flex items-center p-4 rounded-xl shadow-xl border text-sm font-medium transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto min-w-[250px]`;

    if (type === "error") {
        toast.className += " bg-rose-50 border-rose-200 text-rose-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">❌</span>
            <div class="flex-1">${message}</div>
        `;
    } else { // type === "info"
        toast.className += " bg-blue-50 border-blue-200 text-blue-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">ℹ️</span>
            <div class="flex-1">${message}</div>
        `;
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-4", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    }, 50);

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-4", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
//  SUPPRESSION D'UNE CONVERSATION COMPLÈTE
// ===================================================
async function deleteConversation(conversationId) {
    if (!confirm("Attention ! Voulez-vous vraiment supprimer toute cette conversation ? Cette action est irréversible.")) return;

    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (response.ok) {
            showToast("Conversation supprimée.", "success");
            
            // On réinitialise l'état
            activeConversationId = null;
            
            // On cache le panneau de chat
            if (chatPanel) chatPanel.classList.add("hidden");
            
            // On recharge la liste des contacts à gauche
            await loadUsers();
            
            // Sur mobile, on revient à l'affichage de la liste
            showListColumn();
        } else {
            showToast("Impossible de supprimer la conversation.", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression de la conversation :", error);
        showToast("Une erreur est survenue.", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const profileTrigger = document.getElementById("my-profile-trigger");
    const profileView = document.getElementById("profile-view");
    const chatView = document.getElementById("col-right");

    if (profileTrigger && profileView && chatView) {
        profileTrigger.addEventListener("click", async () => {
            // 1. On bascule l'affichage des sections
            chatView.classList.add("hidden");
            chatView.classList.remove("md:flex");
            profileView.classList.remove("hidden");
            profileView.classList.add("flex");

            // 2. On charge dynamiquement le HTML de ta page profil si ce n'est pas déjà fait
            if (profileView.innerHTML.trim() === "") {
                try {
                    const response = await fetch("profile.html"); // Remplace par le nom exact de ton fichier
                    if (response.ok) {
                        const htmlContent = await response.text();
                        
                        // On extrait uniquement le contenu utile (ex: le <main> ou la structure centrale)
                        profileView.innerHTML = htmlContent;
                        
                        // Si tu utilises des icônes Lucide dans ta page profil :
                        if (window.lucide) {
                            lucide.createIcons();
                        }
                    } else {
                        profileView.innerHTML = "<p class='p-6 text-red-500'>Impossible de charger le profil.</p>";
                    }
                } catch (error) {
                    console.error("Erreur de chargement du profil :", error);
                }
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const profileTrigger = document.getElementById("my-profile-trigger");

    if (profileTrigger) {
        profileTrigger.addEventListener("click", () => {
            // Redirige directement l'utilisateur vers ta page profil existante
            window.location.href = "Profil.html"; 
        });
    }
});

//  CHARGER LES INFOS DE L'UTILISATEUR CONNECTÉ
// ===================================================
async function loadCurrentUser() {
    const avatarImg = document.getElementById("active-user-avatar");
    const nameSpan = document.getElementById("active-user-name");

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (response.ok) {
            const resJson = await response.json();
            const userData = resJson.data || resJson;

            // 1. Mise à jour de l'avatar du bouton "Mon Profil" à gauche
            if (avatarImg && userData.avatarUrl) {
                avatarImg.src = userData.avatarUrl;
            } else if (avatarImg) {
                // Image par défaut si l'utilisateur n'a pas d'avatar
                avatarImg.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userData.username || 'default'}`;
            }

            // 2. Mise à jour du nom d'affichage à gauche
            if (nameSpan) {
                nameSpan.textContent = userData.fullName || "Utilisateur";
            }

            // On stocke temporairement l'image dans le localStorage pour la page profile.html
            localStorage.setItem("userAvatar", userData.avatarUrl || "");
            localStorage.setItem("userName", userData.fullName || "");
            localStorage.setItem("userEmail", userData.email || "");

        }
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur connecté :", error);
    }
}

// Appelle la fonction au chargement initial de ton script
document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUser();
});
// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadUsers(); 
    loadMyProfile();
});

