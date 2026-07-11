// configuration de l'API Kadea
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168";
// Sécurisation de la page : Vérification immédiate du Token
const token = localStorage.getItem("token");
if (!token) {
   
    window.location.href = "login.html";
}

// Variables pour suivre l'état de la discussion active
let activeRoomId = null;

// Ciblage des éléments du DOM indispensables
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");

// Éléments d'en-tête du chat actif
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");

// 1. FONCTION : Charger et afficher la liste des conversations (à gauche)
async function loadRooms() {
    try {
        const response = await fetch(`"https://kadea-chat-api.onrender.com"/rooms`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer les salons.");

        const data = await response.json();
        renderRoomsList(data.rooms || data); // S'adapte selon le format renvoyé par ton API
    } catch (error) {
        console.error("Erreur lors du chargement des salons :", error);
    }
}

// 2. FONCTION : Injecter la liste des salons dans le HTML
function renderRoomsList(rooms) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; // On vide le loader ou les éléments statiques

    rooms.forEach(room => {
        const roomElement = document.createElement("div");
        roomElement.className = `flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition ${activeRoomId === room.id ? 'bg-slate-100' : ''}`;
        
        roomElement.innerHTML = `
            <img src="${room.avatar || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${room.name}</h3>
                <p class="text-xs text-gray-500 truncate">${room.lastMessage || 'Aucun message'}</p>
            </div>
        `;

        // Événement au clic pour ouvrir la discussion
        roomElement.addEventListener("click", () => selectRoom(room));
        roomsContainer.appendChild(roomElement);
    });
}

// 3. FONCTION : Sélectionner un salon et charger son historique
async function selectRoom(room) {
    activeRoomId = room.id;
    
    // Mettre à jour l'en-tête du chat actif
    activeChatTitle.textContent = room.name;
    activeChatStatus.textContent = "En ligne";
    activeChatAvatar.src = room.avatar || 'https://via.placeholder.com/40';
    
    // Rendre le panneau visible sur mobile au besoin
    chatPanel.classList.remove("hidden");

    await loadMessages(room.id);
    
    // Re-rendre la liste pour appliquer la classe active (fond grisé)
    loadRooms(); 
}

// 4. FONCTION : Récupérer les messages du salon actif
async function loadMessages(roomId) {
    try {
        const response = await fetch(`${API_URL}/rooms/${roomId}/messages`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key":Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur de récupération des messages.");

        const messages = await response.json();
        renderMessages(messages);
    } catch (error) {
        console.error("Erreur messages:", error);
    }
}

// 5. FONCTION : Afficher les messages à l'écran
function renderMessages(messages) {
    messagesContainer.innerHTML = ""; // Reset du conteneur de messages

    messages.forEach(msg => {
        // Déterminer si le message vient de moi ou d'un autre utilisateur
        const isMe = msg.senderId === localStorage.getItem("userId"); // Adapte la clé selon ton API
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex items-end space-x-2 max-w-[75%] ${isMe ? 'ml-auto justify-end' : ''}`;

        messageBlock.innerHTML = `
            <div class="${isMe ? 'bg-green-100 rounded-br-none' : 'bg-white rounded-bl-none'} text-gray-800 text-sm rounded-lg p-2.5 shadow-sm">
                ${!isMe ? `<p class="font-bold text-xs text-indigo-600 mb-0.5">${msg.senderName || 'Utilisateur'}</p>` : ''}
                <p>${msg.content}</p>
                <span class="block text-right text-[10px] text-gray-400 mt-1">${formatTime(msg.createdAt)}</span>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Scroll automatique vers le bas pour voir le dernier message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}