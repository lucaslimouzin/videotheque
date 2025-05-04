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

// Fonction utilitaire pour générer une miniature (frame 0) à partir d'un fichier vidéo
async function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);
        video.playsInline = true;
        video.onloadeddata = () => {
            video.currentTime = 0;
        };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                URL.revokeObjectURL(video.src);
                if (blob) resolve(blob);
                else reject(new Error('Impossible de générer la miniature.'));
            }, 'image/jpeg', 0.8);
        };
        video.onerror = (e) => reject(new Error('Erreur lors du chargement de la vidéo pour la miniature.'));
    });
}

// Fonction utilitaire pour nettoyer le nom de fichier (Supabase safe)
function cleanFileName(name) {
    // Retire les accents et caractères spéciaux, remplace les espaces par des tirets
    return name
        .normalize('NFD').replace(/[00-\u036f]/g, '') // retire les accents
        .replace(/[^a-zA-Z0-9.\-_]/g, '-') // remplace les caractères spéciaux par des tirets
        .replace(/-+/g, '-') // évite les doubles tirets
        .replace(/^-+|-+$/g, ''); // retire les tirets en début/fin
}

// Détection mobile simple
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Ajout du bouton pour générer la miniature sur mobile
let generateThumbBtn = null;
if (!document.getElementById('generateThumbBtn')) {
    generateThumbBtn = document.createElement('button');
    generateThumbBtn.id = 'generateThumbBtn';
    generateThumbBtn.textContent = 'Générer la miniature';
    generateThumbBtn.style.display = 'none';
    generateThumbBtn.style.width = '100%';
    generateThumbBtn.style.margin = '0.5rem 0';
    uploadModal.querySelector('.modal-content').insertBefore(generateThumbBtn, uploadButton);
}

let fileToUpload = null;
let thumbBlobMobile = null;

videoInput.addEventListener('change', () => {
    fileToUpload = videoInput.files[0];
    thumbBlobMobile = null;
    if (isMobile() && fileToUpload) {
        generateThumbBtn.style.display = 'block';
        uploadButton.disabled = true;
    } else {
        generateThumbBtn.style.display = 'none';
        uploadButton.disabled = false;
    }
});

generateThumbBtn && generateThumbBtn.addEventListener('click', async () => {
    if (fileToUpload) {
        uploadProgress.textContent = 'Génération de la miniature...';
        try {
            thumbBlobMobile = await generateThumbnail(fileToUpload);
            uploadProgress.textContent = 'Miniature générée !';
            uploadButton.disabled = false;
        } catch (e) {
            uploadProgress.textContent = 'Erreur lors de la génération de la miniature.';
        }
    }
});

// Fonction pour uploader une vidéo
async function uploadVideo(file, thumbBlobOverride = null) {
    try {
        uploadProgress.textContent = 'Upload en cours...';
        // Vérifier la taille du fichier (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            throw new Error('Le fichier est trop volumineux. Maximum 50MB autorisé.');
        }
        // Récupérer le titre
        const title = videoTitleInput.value.trim() || file.name;
        // Générer un nom de fichier unique et propre
        const timestamp = Date.now();
        const safeName = cleanFileName(file.name);
        const fileName = `${timestamp}-${safeName}`;
        // Générer la miniature
        let thumbBlob = thumbBlobOverride;
        if (!thumbBlob) {
            uploadProgress.textContent = 'Génération de la miniature...';
            thumbBlob = await generateThumbnail(file);
        }
        const thumbName = `${timestamp}-${safeName.replace(/\.[^/.]+$/, '')}.jpg`;
        // Uploader la miniature
        uploadProgress.textContent = 'Upload de la miniature...';
        await supabase.storage
            .from('videotheque')
            .upload(thumbName, thumbBlob, {
                cacheControl: '3600',
                upsert: true
            });
        // Uploader la vidéo
        uploadProgress.textContent = 'Upload de la vidéo...';
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
        const metaName = `${timestamp}-${safeName}.json`;
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
        let videoFiles = data.filter(f => f.name && !f.name.endsWith('.json') && !f.name.endsWith('.jpg'));
        videoFiles = videoFiles.reverse(); // Afficher la plus récente en premier
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
            // Chercher la miniature
            const thumbName = `${video.name.replace(/\.[^/.]+$/, '')}.jpg`;
            const thumbUrl = supabase.storage
                .from('videotheque')
                .getPublicUrl(thumbName);
            console.log('Miniature pour', video.name, ':', thumbUrl.data.publicUrl); // DEBUG
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <div class="video-info">
                    <h3>${title}</h3>
                </div>
                <video controls poster="${thumbUrl.data.publicUrl || ''}">
                    <source src="${videoUrl.data.publicUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
                <div class="video-info">
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
        if (isMobile()) {
            if (!thumbBlobMobile) {
                uploadProgress.textContent = 'Veuillez générer la miniature.';
                return;
            }
            uploadVideo(file, thumbBlobMobile);
        } else {
            uploadVideo(file);
        }
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