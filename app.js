// Éléments du DOM
const videoList = document.getElementById('videoList');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// Éléments du DOM pour l'upload
const uploadButton = document.getElementById('uploadButton');
const uploadModal = document.getElementById('uploadModal');
const closeModal = document.getElementById('closeModal');
const uploadForm = document.getElementById('uploadForm');
const cancelUpload = document.getElementById('cancelUpload');
const submitUpload = document.getElementById('submitUpload');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const cloudinaryUploadButton = document.getElementById('cloudinaryUpload');

// Variables globales pour stocker les vidéos
let allVideos = [];
let selectedVideo = null;

// Initialiser le widget Cloudinary
const cloudinaryWidget = cloudinary.createUploadWidget(
    {
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: cloudinaryConfig.folder,
        sources: ['local'],
        multiple: false,
        maxFileSize: 104857600, // 100MB
        resourceType: 'video',
        styles: {
            palette: {
                window: '#FFFFFF',
                windowBorder: '#90A0B3',
                tabIcon: '#0078FF',
                menuIcons: '#5A616A',
                textDark: '#000000',
                textLight: '#FFFFFF',
                link: '#0078FF',
                action: '#FF620C',
                inactiveTabIcon: '#0E2F5A',
                error: '#F44235',
                inProgress: '#0078FF',
                complete: '#20B832',
                sourceBg: '#E4EBF1'
            }
        }
    },
    (error, result) => {
        if (!error && result && result.event === 'success') {
            selectedVideo = result.info;
            document.getElementById('videoTitle').value = result.info.original_filename;
            submitUpload.disabled = false;
            
            // Mettre à jour la barre de progression
            progressFill.style.width = '100%';
            progressText.textContent = '100%';
            uploadProgress.hidden = false;
        }
    }
);

// Fonction pour charger les vidéos depuis le localStorage
function loadVideos() {
    try {
        const savedVideos = localStorage.getItem('videos');
        allVideos = savedVideos ? JSON.parse(savedVideos) : [];
        displayFilteredVideos(allVideos);
    } catch (error) {
        console.error('Erreur:', error);
        videoList.innerHTML = '<p class="error">Erreur lors du chargement des vidéos. Veuillez réessayer plus tard.</p>';
    }
}

// Fonction pour sauvegarder les vidéos dans le localStorage
function saveVideos() {
    localStorage.setItem('videos', JSON.stringify(allVideos));
}

// Fonction pour afficher les vidéos filtrées
function displayFilteredVideos(videos) {
    videoList.innerHTML = '';
    
    if (videos.length === 0) {
        videoList.innerHTML = '<p class="error">Aucune vidéo trouvée</p>';
        return;
    }
    
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        
        // Créer le lecteur vidéo
        const videoPlayer = document.createElement('video');
        videoPlayer.className = 'video-player';
        videoPlayer.controls = true;
        videoPlayer.preload = 'metadata';
        videoPlayer.playsInline = true;
        
        // Ajouter la source de la vidéo
        const source = document.createElement('source');
        source.src = video.secure_url;
        source.type = 'video/mp4';
        videoPlayer.appendChild(source);
        
        videoContainer.appendChild(videoPlayer);
        
        // Ajouter le bouton de suppression
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Voulez-vous vraiment supprimer cette vidéo ?')) {
                deleteVideo(video.public_id, videoItem);
            }
        });
        videoContainer.appendChild(deleteButton);
        
        // Créer la section d'informations
        const videoInfo = document.createElement('div');
        videoInfo.className = 'video-info';
        
        const uploadDate = new Date(video.created_at);
        const formattedDate = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(uploadDate);
        
        videoInfo.innerHTML = `
            <h3 class="video-title">${video.title || video.original_filename}</h3>
            <div class="video-details">
                <span>${formatFileSize(video.bytes)}</span>
                <span>•</span>
                <span>${formattedDate}</span>
            </div>
        `;
        
        videoItem.appendChild(videoContainer);
        videoItem.appendChild(videoInfo);
        videoList.appendChild(videoItem);
        
        // Gérer les erreurs de lecture
        videoPlayer.addEventListener('error', () => {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'video-error';
            errorMessage.innerHTML = `
                <p>Impossible de lire la vidéo</p>
                <a href="${video.secure_url}" target="_blank">Télécharger la vidéo</a>
            `;
            videoContainer.appendChild(errorMessage);
        });
    });
}

// Fonction utilitaire pour formater la taille des fichiers
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction de recherche
function searchVideos(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const filteredVideos = allVideos.filter(video => 
        (video.title || video.original_filename).toLowerCase().includes(normalizedQuery)
    );
    displayFilteredVideos(filteredVideos);
}

// Écouteurs d'événements pour la recherche
searchInput.addEventListener('input', (e) => {
    searchVideos(e.target.value);
});

searchButton.addEventListener('click', () => {
    searchVideos(searchInput.value);
});

// Charger les vidéos au chargement de la page
document.addEventListener('DOMContentLoaded', loadVideos);

// Gestionnaires d'événements pour le modal
uploadButton.addEventListener('click', () => {
    uploadModal.classList.add('show');
});

function closeUploadModal() {
    uploadModal.classList.remove('show');
    uploadForm.reset();
    uploadProgress.hidden = true;
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    selectedVideo = null;
    submitUpload.disabled = false;
}

closeModal.addEventListener('click', closeUploadModal);
cancelUpload.addEventListener('click', closeUploadModal);

// Fermer le modal en cliquant en dehors
uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        closeUploadModal();
    }
});

// Ouvrir le widget Cloudinary lors du clic sur le bouton
cloudinaryUploadButton.addEventListener('click', () => {
    cloudinaryWidget.open();
});

// Gestionnaire d'upload
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedVideo) {
        alert('Veuillez sélectionner une vidéo');
        return;
    }
    
    const title = document.getElementById('videoTitle').value;
    
    try {
        // Ajouter la vidéo à la liste
        const videoData = {
            ...selectedVideo,
            title: title
        };
        
        allVideos.unshift(videoData);
        saveVideos();
        
        // Rafraîchir la liste et fermer le modal
        displayFilteredVideos(allVideos);
        closeUploadModal();
        alert('Upload réussi !');
        
    } catch (error) {
        console.error('Erreur:', error);
        alert(`Une erreur est survenue lors de l'upload : ${error.message}`);
    }
});

// Fonction pour supprimer une vidéo
async function deleteVideo(publicId, videoElement) {
    try {
        // Supprimer la vidéo de la liste locale
        allVideos = allVideos.filter(video => video.public_id !== publicId);
        saveVideos();

        // Supprimer l'élément du DOM avec animation
        videoElement.style.opacity = '0';
        videoElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
            videoElement.remove();
            if (allVideos.length === 0) {
                videoList.innerHTML = '<p class="error">Aucune vidéo trouvée</p>';
            }
        }, 300);

    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la vidéo. Veuillez réessayer.');
    }
} 