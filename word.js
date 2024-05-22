// Import des modules
const fs = require('fs');
const path = require('path');
const sgdb = require('../sgdb'); // Import de la classe sgdb
const Filter = require('bad-words');

// Création de l'instance sgdb pour gérer les bases de données
const dbManager = new sgdb('db');

// Ajouter une base de données pour les mots indexés
dbManager.addddb('indexedWords');

// Obtenir l'instance de base de données
const indexedWordsDB = dbManager.accessdb('indexedWords');

// Répertoire où se trouvent les fichiers texte des pages
const pagesDir = 'pages';

// Répertoire des fichiers de configuration des langues
const languageConfigDir = 'config';

// Fonction pour lire le contenu d'un fichier
function readFileContent(filePath) {
    return fs.readFileSync(filePath, ).toString();
}

// Fonction pour normaliser les mots (mettre en minuscule et retirer la ponctuation)
function normalizeWord(word) {
    return word.replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ').toLowerCase();
}

// Fonction pour charger la configuration de la langue
function loadLanguageConfig(language) {
    const filePath = path.join(languageConfigDir, `${language}.json`);
    if (fs.existsSync(filePath)) {
        const config = JSON.parse(readFileContent(filePath));
        return {
            stopWords: new Set(config.stopWords),
            badWords: new Set(config.badWords)
        };
    } else {
        throw new Error(`Configuration pour la langue ${language} non trouvée.`);
    }
}

// Fonction pour détecter la langue du fichier
function detectLanguage(fileName) {
    if (fileName.endsWith('_fr.txt')) {
        return 'french';
    } else if (fileName.endsWith('_en.txt')) {
        return 'english';
    } else {
        return 'english'
    }
}

// Fonction pour indexer les mots dans un fichier
function indexWordsInFile(filePath, language) {
    const { stopWords, badWords } = loadLanguageConfig(language);
    const filter = new Filter();
    filter.addWords(...badWords);

    const content = readFileContent(filePath);
    const words = content.split(/\s+/).map(normalizeWord).filter(Boolean); // Split and normalize words
    const wordCounts = {};

    words.forEach(word => {
        if (!filter.isProfane(word) && !stopWords.has(word)) {
            if (word in wordCounts) {
                wordCounts[word]++;
            } else {
                wordCounts[word] = 1;
            }
        }
    });

    for (const [word, count] of Object.entries(wordCounts)) {
        if (indexedWordsDB.has(word)) {
            indexedWordsDB.set(word, indexedWordsDB.get(word) + count);
        } else {
            indexedWordsDB.set(word, count);
        }
    }

    console.log(`Fichier ${filePath} indexé avec succès.`);
}

// Fonction pour scanner tous les fichiers et indexer les mots
function indexWordsInAllFiles() {
    const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.txt'));

    files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        const language = detectLanguage(file);
        indexWordsInFile(filePath, language);
    });

    console.log('Tous les fichiers ont été scannés et les mots indexés.');
}

// Lancer le processus d'indexation des mots
indexWordsInAllFiles();
