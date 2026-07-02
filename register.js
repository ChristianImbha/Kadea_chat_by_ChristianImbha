// URL de base de ton API REST locale (fournie par le cahier des charges)
const API_URL = "http://localhost:3000/auth";

// Gestion de la visibilité des mots de passe (icône de l'œil)
document.querySelectorAll('.btn-toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    // Récupère l'identifiant du champ cible grâce à l'attribut data-target
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = button.querySelector('i');
    
    // Alterne entre le type 'password' et 'text'
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-regular', 'fa-solid'); // Change le style de l'icône
    } else {
      input.type = 'password';
      icon.classList.replace('fa-solid', 'fa-regular');
    }
  });
});