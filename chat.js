// configuration de l'API
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

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

// Éléments d'en-tête du chat actif
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");

// Fonction utilitaire pour formater l'heure
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 1. FONCTION : Charger et afficher la liste des conversations (à gauche)
async function loadConversations() {
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer les conversations.");
        
        // 1. extrataction de JSON de la réponse dans la variable 'data'
        const data = await response.json();
        console.log("Données reçues de l'API :", data);
        
        let conversationsArray = [];
        
        // On descend d'un étage dans l'objet de l'API Kadea
        if (data.data) {
            if (Array.isArray(data.data)) {
                conversationsArray = data.data;
            } else if (data.data.conversations && Array.isArray(data.data.conversations)) {
                conversationsArray = data.data.conversations; // C'est ici que se cache le tableau !
            }
        } else if (Array.isArray(data)) {
            conversationsArray = data;
        }
        renderConversationsList(conversationsArray); 
    } catch (error) {
        console.error("Erreur lors du chargement des conversations :", error);
    }
}

// 2. FONCTION : Injecter la liste des conversations dans le HTML
function renderConversationsList(conversations) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; 

    if (conversations.length === 0) {
        roomsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center p-4">Aucune conversation.</p>`;
        return;
    }

    conversations.forEach(conv => {
        const convElement = document.createElement("div");
        convElement.dataset.conversationId = conv.id;
        convElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition ${activeConversationId === conv.id ? 'bg-slate-100' : ''}`;
        
        // Trouver le participant qui n'est pas moi pour afficher son nom
        const currentUserId = localStorage.getItem("userId");
        const interlocuteur = conv.participants?.find(p => p.id !== currentUserId);
        const displayName = conv.type === 'private' ? (interlocuteur?.fullName || 'Utilisateur') : conv.name;
        const displayAvatar = interlocuteur?.avatarUrl || 'https://via.placeholder.com/40';

        convElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${displayName}</h3>
                <p class="text-xs text-gray-500 truncate">Cliquez pour voir les messages</p>
            </div>
        `;

        convElement.addEventListener("click", () => selectConversation({
            id: conv.id,
            name: displayName,
            avatar: displayAvatar
        }));
        roomsContainer.appendChild(convElement);
    });
}


// 3. FONCTION : Sélectionner une conversation et charger son historique
async function selectConversation(conv) {
    activeConversationId = conv.id;
    
    // Mettre à jour l'en-tête du chat actif
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar || 'https://via.placeholder.com/40';
    
    if (chatPanel) chatPanel.classList.remove("hidden");

    // Changement visuel immédiat de la classe active sans re-fetch inutile
    document.querySelectorAll(".conversation-item").forEach(el => {
        if (el.dataset.conversationId === conv.id) {
            el.classList.add("bg-slate-100");
        } else {
            el.classList.remove("bg-slate-100");
        }
    });

    await loadMessages(conv.id);
}

// 4. FONCTION : Récupérer les messages de la conversation active
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

// 5. FONCTION : Afficher les messages à l'écran (Ajustée pour Tailwind)
function renderMessages(messagesData) {
    const messagesContainer = document.getElementById("messages-container"); // Ajuste l'ID si nécessaire
    messagesContainer.innerHTML = ""; // On vide le conteneur

    // 🔍 Sécurisation : On cherche le tableau des messages dans la réponse de l'API
    let messagesArray = [];
    
    if (Array.isArray(messagesData)) {
        messagesArray = messagesData;
    } else if (messagesData && messagesData.data) {
        if (Array.isArray(messagesData.data)) {
            messagesArray = messagesData.data;
        } else if (messagesData.data.messages && Array.isArray(messagesData.data.messages)) {
            messagesArray = messagesData.data.messages;
        }
    } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
        messagesArray = messagesData.messages;
    }

    // Si aucun message ou si le salon est vide, on s'arrête proprement
    if (messagesArray.length === 0) {
        messagesContainer.innerHTML = "<p class='text-center text-gray-500 py-4'>Aucun message dans cette discussion.</p>";
        return;
    } 

    messages.forEach(msg => {
        const isMe = msg.sender?.id === localStorage.getItem("userId"); 
        
        const messageBlock = document.createElement("div");
        // Utilisation de w-full et justification pour bloquer les messages du bon côté
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;

        messageBlock.innerHTML = `
            <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-xs flex flex-col">
                ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${msg.sender?.fullName || 'Utilisateur'}</p>` : ''}
                <p class="break-words">${msg.content}</p>
                <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Scroll automatique vers le bas
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 6. ÉCOUTEUR D'ÉVÉNEMENT : Gérer l'envoi d'un nouveau message
if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        // Reset de l'input instantané pour fluidité UX
        messageInput.value = "";

        try {
            // Route de type POST /conversations/{id}/messages
            const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                },
                body: JSON.stringify({ content: content }) // Payload attendu par l'API : { content: "..." }
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
// 7. GESTION DE LA CRÉATION D'UNE NOUVELLE DISCUSSION VIA L'INTERFACE
const btnAddConversation = document.getElementById("btn-add-conversation");
const newUserIdInput = document.getElementById("new-user-id");

if (btnAddConversation && newUserIdInput) {
    btnAddConversation.addEventListener("click", async () => {
        const targetUserId = newUserIdInput.value.trim();

        if (!targetUserId) {
            alert("Veuillez coller l'ID d'un utilisateur pour commencer une discussion.");
            return;
        }

        try {
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
                    name: "Discussion Privée"
                })
            });

            if (response.ok) {
                alert("Discussion créée avec succès !");
                newUserIdInput.value = ""; // Vide le champ
                await loadConversations(); // Recharge la liste de gauche pour l'afficher
            } else {
                const errorData = await response.json();
                alert(`Erreur : ${errorData.message || "Impossible de créer la discussion"}`);
            }
        } catch (error) {
            console.error("Erreur création conversation :", error);
            alert("Une erreur réseau est survenue.");
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadConversations();
});
