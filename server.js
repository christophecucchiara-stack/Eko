const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Requis pour aligner la sécurité Web et Local

const app = express();

// 1. GESTION DU PORT DYNAMIQUE (Pour Render ou le PC en local)
const PORT = process.env.PORT || 3000;

// 2. MIDDLEWARES
app.use(cors()); // Autorise l'application index.html à interagir avec le serveur sans blocage CORS
app.use(express.json());

// Assure que le dossier de stockage existe sur la machine
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 3. CORRECTION DE LA ROUTE 404 : On mappe l'URL "/videos" vers le dossier physique "uploads"
app.use('/videos', express.static(uploadDir));

// Base de données temporaire en JSON
const DATA_FILE = path.join(__dirname, 'videos.json');

function lireDonnees() {
    if (!fs.existsSync(DATA_FILE)) return [];
    const json = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(json || '[]');
}

function sauvegarderDonnees(donnees) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(donnees, null, 2));
}

// 4. CONFIGURATION DE CONFIGURATION DE MULTER (Stockage des fichiers)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// Permet au serveur de distribuer directement les fichiers du dossier (HTML, CSS, JS)
app.use(express.static(__dirname));

// Route principale : quand on tape juste l'adresse, on charge index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// 5. LES ROUTES API

// Récupérer toutes les vidéos
app.get('/api/videos', (req, res) => {
    res.json(lireDonnees());
});

// Ajouter/Uploader une nouvelle vidéo
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Fichier vidéo manquant." });
    }

    const videos = lireDonnees();
    const nouvelleVideo = {
        id: Date.now(),
        filename: req.file.filename,
        username: req.body.username || 'anonyme',
        caption: req.body.caption || ''
    };

    videos.unshift(nouvelleVideo); // Ajoute au début du flux
    sauvegarderDonnees(videos);

    res.status(201).json(nouvelleVideo);
});

// Supprimer une vidéo
app.delete('/api/videos/:id', (req, res) => {
    const idASupprimer = parseInt(req.params.id);
    let videos = lireDonnees();
    
    const videoTrouvee = videos.find(v => v.id === idASupprimer);
    
    if (!videoTrouvee) {
        return res.status(404).json({ error: "Vidéo introuvable." });
    }

    // Supprime le fichier vidéo physique du disque dur
    const cheminFichier = path.join(uploadDir, videoTrouvee.filename);
    if (fs.existsSync(cheminFichier)) {
        fs.unlinkSync(cheminFichier);
    }

    // Filtre la liste JSON
    videos = videos.filter(v => v.id !== idASupprimer);
    sauvegarderDonnees(videos);

    res.json({ message: "Vidéo supprimée avec succès !" });
});

// 6. LANCEMENT DU SERVEUR
app.listen(PORT, () => {
    console.log(`🚀 Serveur Eko actif et configuré sur le port ${PORT}`);
});