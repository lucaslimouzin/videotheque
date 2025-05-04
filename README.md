# Vidéothèque Supabase

Une application web simple permettant d'uploader et de visualiser des vidéos stockées sur Supabase.

## Prérequis

- Un compte Supabase
- Un bucket de stockage nommé "videotheque" créé dans votre projet Supabase

## Installation

1. Clonez ce dépôt
2. Ouvrez le fichier `script.js`
3. Remplacez `VOTRE_URL_SUPABASE` et `VOTRE_CLE_SUPABASE` par vos informations d'identification Supabase
4. Ouvrez `index.html` dans votre navigateur

## Configuration Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com)
2. Dans le menu de gauche, allez dans "Storage"
3. Créez un nouveau bucket nommé "videotheque"
4. Configurez les permissions du bucket pour permettre l'upload et la lecture des fichiers
5. Copiez l'URL de votre projet et la clé API depuis les paramètres du projet

## Utilisation

1. Sélectionnez une vidéo à uploader en utilisant le bouton "Choisir un fichier"
2. Cliquez sur "Uploader" pour envoyer la vidéo
3. Les vidéos uploadées apparaîtront automatiquement dans la section "Vidéos disponibles"
4. Vous pouvez lire les vidéos directement dans le navigateur

## Fonctionnalités

- Upload de vidéos
- Affichage en grille des vidéos disponibles
- Lecture des vidéos directement dans le navigateur
- Interface responsive et moderne 