// Configuration Supabase
const supabaseUrl = 'https://polssnudsqqbkhhfsuio.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHNzbnVkc3FxYmtoaGZzdWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODk4MDgsImV4cCI6MjA2MTg2NTgwOH0.8xKPmqxvx9xRjdT5ImDrnU_qHqxILVQClB2iTclf_Fc';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const fabUpload = document.getElementById('fabUpload');
const uploadModal = document.getElementById('uploadModal');
const closeModal = document.getElementById('closeModal');
const videoInput = document.getElementById('videoInput');
const uploadButton = document.getElementById('uploadButton');
const uploadProgress = document.getElementById('uploadProgress');
const videosList = document.getElementById('videosList');
const videoTitleInput = document.getElementById('videoTitle');
const splash = document.getElementById('splash');
let splashStart = Date.now();

// Modal open/close logic
fabUpload.addEventListener('click', () => {
    uploadModal.classList.add('show');
});
closeModal.addEventListener('click', () => {
    uploadModal.classList.remove('show');
    resetUploadForm();
});
window.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.classList.remove('show');
        resetUploadForm();
    }
});
function resetUploadForm() {
    videoInput.value = '';
    videoTitleInput.value = '';
    uploadProgress.textContent = '';
}

function hideSplashMin2s() {
    const elapsed = Date.now() - splashStart;
    const minDuration = 2000;
    if (elapsed >= minDuration) {
        if (splash) splash.classList.add('hide');
    } else {
        setTimeout(() => {
            if (splash) splash.classList.add('hide');
        }, minDuration - elapsed);
    }
}

// Fonction pour uploader une vidéo
async function uploadVideo(file) {
    try {
        uploadProgress.textContent = 'Upload en cours...';
        // Vérifier la taille du fichier (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            throw new Error('Le fichier est trop volumineux. Maximum 50MB autorisé.');
        }
        // Récupérer le titre
        const title = videoTitleInput.value.trim() || file.name;
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        // Uploader la vidéo
        const { data, error } = await supabase.storage
            .from('videotheque')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        if (error) {
            console.error('Détails de l\'erreur:', error);
            if (error.statusCode === 403) {
                throw new Error('Erreur de permission. Vérifiez les politiques de sécurité dans Supabase.');
            }
            throw error;
        }
        // Uploader le titre dans un fichier JSON à côté de la vidéo
        const metaName = `${timestamp}-${file.name}.json`;
        const metaContent = JSON.stringify({ title });
        await supabase.storage
            .from('videotheque')
            .upload(metaName, new Blob([metaContent], { type: 'application/json' }), {
                cacheControl: '3600',
                upsert: true
            });
        uploadProgress.textContent = 'Upload réussi !';
        setTimeout(() => {
            uploadModal.classList.remove('show');
            resetUploadForm();
        }, 1200);
        // Rafraîchir la liste des vidéos
        loadVideos();
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        uploadProgress.textContent = `Erreur: ${error.message}`;
    }
}

// Fonction pour charger et afficher les vidéos
async function loadVideos() {
    try {
        const { data, error } = await supabase.storage
            .from('videotheque')
            .list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            });
        if (error) {
            console.error('Détails de l\'erreur:', error);
            if (error.statusCode === 403) {
                throw new Error('Erreur de permission. Vérifiez les politiques de sécurité dans Supabase.');
            }
            throw error;
        }
        videosList.innerHTML = '';
        if (data.length === 0) {
            videosList.innerHTML = '<p>Aucune vidéo disponible.</p>';
            hideSplashMin2s();
            return;
        }
        // Filtrer les fichiers vidéo et charger les titres associés
        const videoFiles = data.filter(f => f.name && !f.name.endsWith('.json'));
        for (const video of videoFiles) {
            const videoUrl = supabase.storage
                .from('videotheque')
                .getPublicUrl(video.name);
            // Chercher le fichier meta
            const metaName = `${video.name}.json`;
            let title = video.name;
            try {
                const { data: metaData, error: metaError } = await supabase.storage
                    .from('videotheque')
                    .download(metaName);
                if (!metaError && metaData) {
                    const text = await metaData.text();
                    const meta = JSON.parse(text);
                    if (meta.title) title = meta.title;
                }
            } catch (e) {}
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <video controls>
                    <source src="${videoUrl.data.publicUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
                <div class="video-info">
                    <h3>${title}</h3>
                    <button class="delete-video" data-videoname="${video.name}" data-metaname="${metaName}" title="Supprimer la vidéo">🗑️</button>
                </div>
            `;
            videosList.appendChild(videoCard);
        }
        // Ajout des listeners de suppression
        document.querySelectorAll('.delete-video').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const videoName = btn.getAttribute('data-videoname');
                const metaName = btn.getAttribute('data-metaname');
                if (confirm('Supprimer cette vidéo ?')) {
                    await deleteVideoAndMeta(videoName, metaName);
                    loadVideos();
                }
            });
        });
        hideSplashMin2s();
    } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error);
        videosList.innerHTML = `<p>Erreur: ${error.message}</p>`;
        hideSplashMin2s();
    }
}

// Événements
uploadButton.addEventListener('click', () => {
    const file = videoInput.files[0];
    if (file) {
        uploadVideo(file);
    } else {
        uploadProgress.textContent = 'Veuillez sélectionner une vidéo';
    }
});

// Charger les vidéos au chargement de la page
loadVideos();

async function deleteVideoAndMeta(videoName, metaName) {
    try {
        // Supprimer la vidéo
        await supabase.storage.from('videotheque').remove([videoName]);
        // Supprimer le fichier meta (titre)
        await supabase.storage.from('videotheque').remove([metaName]);
    } catch (error) {
        alert('Erreur lors de la suppression : ' + error.message);
    }
} 