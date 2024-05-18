// Import des modules
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const sgdb = require('../sgdb'); // Import de la classe sgdb

// Création de l'instance sgdb pour gérer les bases de données
const dbManager = new sgdb('db');
function extractLinks(text) {
    const regex = /(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi;
    return text.match(regex) || [];
}
function cleanLinks(links) {
    const cleanedLinks = [];
    const urlRegex = /^(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i; // Expression régulière pour vérifier l'URL

    links.forEach(link => {
        // Vérifier si le lien correspond à l'expression régulière et s'il n'est pas déjà dans le tableau
        if (urlRegex.test(link) && !cleanedLinks.includes(link)) {
            cleanedLinks.push(link);
        }
    });

    return cleanedLinks;
}

// Ajouter des bases de données pour les pages et les liens
dbManager.addddb('indexedPages');
dbManager.addddb('links');

// Obtenir les instances de base de données
const indexedPagesDB = dbManager.accessdb('indexedPages');
const linksDB = dbManager.accessdb('links');

// Répertoire pour stocker les fichiers texte des pages
const pagesDir = 'pages';
if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir);
}

// Fonction pour obtenir la date actuelle
function getCurrentDate() {
    return new Date().toISOString();
}

// Fonction pour générer un nom de fichier basé sur l'URL
function generateFileName(url) {
    return `${pagesDir}/${encodeURIComponent(url)}.txt`;
}

// Fonction pour indexer une page
async function indexPage(url) {
    try {
        // Vérifier si la page a été indexée récemment
        if (indexedPagesDB.has(url)) {
            const page = indexedPagesDB.get(url);
            const lastIndexedAt = new Date(page.lastIndexedAt);
            if ((Date.now() - lastIndexedAt.getTime()) < 604800000) { // Une semaine en millisecondes
                console.log(`La page ${url} a été indexée récemment. Pas besoin de réindexer.`);
                return;
            }
        }

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        let content = '';
        console.log()
        // Extraire le contenu des balises h* et p
        $('h1, h2, h3, h4, h5, h6, p').each(function () {
            content += $(this).text() + '\n';
        });

        // Enregistrement du contenu dans un fichier texte
        const fileName = generateFileName(url);
        if(!url.indexOf("wiki")){
            console.log(content)
            fs.writeFileSync(fileName, content.trim(), 'utf8');
        }
        

        // Enregistrement dans la base de données
        const indexedPage = {
            url,
            title,
            filePath: fileName,
            lastIndexedAt: getCurrentDate() // Mettre à jour la date d'indexation
        };
        indexedPagesDB.set(url, indexedPage);
        console.log(`Page ${url} indexée avec succès.`);

        // Recherche des liens dans la page
        cleanLinks(extractLinks(response.data)).map((link)=> {
           
            if(link.startsWith("/")){
                const linkUrl=url+link
                if (linkUrl) {
                    // Enregistrement des liens dans la base de données
                    const link = {
                        sourceUrl: url,
                        targetUrl: linkUrl
                    };
                    linksDB.set(`${url}->${linkUrl}`, link);
                }
            }else{
                const linkUrl=link
                if (linkUrl) {
                    // Enregistrement des liens dans la base de données
                    const link = {
                        sourceUrl: url,
                        targetUrl: linkUrl
                    };
                    linksDB.set(`${url}->${linkUrl}`, link);
                }
            }
            
        });
    } catch (error) {
        console.log(`Erreur lors de l'indexation de la page ${url}: ${error}`);
    }
}

// Fonction pour indexer les pages correspondant aux liens
async function indexLinks() {
    try {
        const links = Object.values(linksDB.content);
        for (const link of links) {
            await indexPage(link.targetUrl);
        }
        console.log('Tous les liens ont été indexés avec succès.');
    } catch (error) {
        console.error(`Erreur lors de l'indexation des liens: ${error}`);
    }
}

// Exemple d'utilisation
const urlsToIndex = [
    'https://verdaccio.org/docs/configuration/#.verdaccio-db','https://github.com/alphaleadership/node-search-engine'
];

async function indexPages(urls) {
    for (const url of urls) {
        await indexPage(url);
    }
}

// Indexation des pages initiales
indexPages(urlsToIndex).then(() => {
    // Indexation des liens après avoir indexé les pages initiales
    indexLinks();
});

// Export des instances de base de données pour une utilisation dans d'autres fichiers si nécessaire
module.exports = { indexedPagesDB, linksDB };
