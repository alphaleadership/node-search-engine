// Import des modules
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const sgdb = require('../sgdb'); // Import de la classe sgdb
const aes = require("../aes");
const crypto=require("crypto");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
function createDisplayFunction() {
    let isFirstCall = true;

    return function(newString) {
        fs.appendFileSync("log.txt",newString +"\n")
        if (!isFirstCall) {
            process.stdout.write('\x1b[1A'); // Move cursor up one line
            process.stdout.write('\x1b[2K'); // Erase the entire line
        }
        process.stdout.write(newString +"\n");
        isFirstCall = false;
    };
}
class Chrono {
    constructor() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.running = false;
    }

    start() {
        if (!this.running) {
            this.startTime = Date.now() - this.elapsedTime;
            this.running = true;
        }
    }

    stop() {
        if (this.running) {
            this.elapsedTime = Date.now() - this.startTime;
            this.running = false;
        }
    }

    reset() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.running = false;
    }

    getTime() {
        if (this.running) {
            return Date.now() - this.startTime;
        }
        return this.elapsedTime;
    }

    getTimeFormatted() {
        const time = this.getTime();
        const milliseconds = time % 1000;
        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / (1000 * 60)) % 60);
        const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

        return `${this._pad(hours)}h:${this._pad(minutes)}min:${this._pad(seconds)}s.${this._pad(milliseconds, 3)}ms`;
    }

    _pad(number, digits = 2) {
        return number.toString().padStart(digits, '0');
    }
}

// Exemple d'utilisation
const chrono = new Chrono();
// Fonction pour convertir une durée en format humain en timestamp
function humanDurationToTimestamp(duration) {
  const durationPattern = /(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?/;
  const matches = duration.match(durationPattern);

  let totalMilliseconds = 0;

  if (matches) {
      const days = matches[1] ? parseInt(matches[1]) : 0;
      const hours = matches[2] ? parseInt(matches[2]) : 0;
      const minutes = matches[3] ? parseInt(matches[3]) : 0;
      const seconds = matches[4] ? parseInt(matches[4]) : 0;

      totalMilliseconds += days * 24 * 60 * 60 * 1000; // Conversion des jours en millisecondes
      totalMilliseconds += hours * 60 * 60 * 1000; // Conversion des heures en millisecondes
      totalMilliseconds += minutes * 60 * 1000; // Conversion des minutes en millisecondes
      totalMilliseconds += seconds * 1000; // Conversion des secondes en millisecondes
  }

  return totalMilliseconds;
}

// Exemple d'utilisation
const duration1 = "2d 3h 45m 30s";
const duration2 = "5h 20m";
const duration3 = "30m";

console.log(humanDurationToTimestamp(duration1)); // 183930000 (2 jours, 3 heures, 45 minutes et 30 secondes en millisecondes)
console.log(humanDurationToTimestamp(duration2)); // 19200000 (5 heures et 20 minutes en millisecondes)
console.log(humanDurationToTimestamp(duration3)); // 1800000 (30 minutes en millisecondes)



    


// Exemple d'utilisation
const display = createDisplayFunction();

display('Hello, world!');


// Création de l'instance sgdb pour gérer les bases de données
const dbManager = new sgdb('db');
const hash = new aes.hash("1234567890123456");

// Ajouter des bases de données pour les pages et les liens
dbManager.addddb('indexedPages',10);
dbManager.addddb('links',10);

// Obtenir les instances de base de données
const indexedPagesDB = dbManager.accessdb('indexedPages');
//indexedPagesDB.importData("./db/indexedPages.json");
const linksDB = dbManager.accessdb('links');
//linksDB.importData("./db/links.json");
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
    return `${pagesDir}/${encodeURIComponent(hash.getHash(url))}.txt`;
}

// Fonction pour extraire et nettoyer les liens
function extractLinksWithCheerio($, baseUrl) {
    const links = [];
    $('[href]').each(function () {
        let link = $(this).attr('href');
        // Convertir les liens relatifs en liens absolus
        if (link.startsWith('/')) {
            link = new URL(link, baseUrl).href;
        }
        // Ajouter le lien s'il n'est pas déjà présent
        if (!links.includes(link)) {
            links.push(link);
        }
    });
    return links;
}

// Fonction pour indexer une page
async function indexPage(url) {
  display(url)
    try {
        // Vérifier si la page a été indexée récemment
        if (indexedPagesDB.has(url)) {
            const page = indexedPagesDB.get(url);
            const lastIndexedAt = new Date(page.lastIndexedAt);
            if ((Date.now() - lastIndexedAt.getTime()) < humanDurationToTimestamp("30m")) { // Une semaine en millisecondes
                display(`La page ${url} a été indexée récemment. Pas besoin de réindexer.`);
                return 0;
            }
        }
        if(url.startsWith("https://www.google.com/url?q=")){
          url=url.replace("https://www.google.com/url?q=","")
        }
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        let content = '';
        
        // Extraire le contenu des balises h* et p
        $('h1, h2, h3, h4, h5, h6, p').each(function () {
            content += $(this).text() + '\n';
        });
        $("img").each(function () { 
            if($(this).attr('src')){
                link=$(this).attr('src')
                if (link.startsWith('/')) {
                    link = new URL(link, url).href;
                }
                fs.appendFileSync("./images.txt", link + '\n');
            }
            
        });
        $("video").each(function () {
            if($(this).attr('src')){ 
                link=$(this).attr('src')
                if (link.startsWith('/')) {
                    link = new URL(link, url).href;
                }
            fs.appendFileSync("./videos.txt", link+ '\n')}
        });
        // Enregistrement du contenu dans un fichier texte
        const fileName = generateFileName(url);
        if(content.trim()){
            fs.writeFileSync(fileName, content.trim());
        }
        

        // Enregistrement dans la base de données
        const indexedPage = {
            url,
            title,
            filePath: fileName,
            lastIndexedAt: getCurrentDate() // Mettre à jour la date d'indexation
        };
        indexedPagesDB.set(url, indexedPage);
       // display(`Page ${url} indexée avec succès.`);

        // Recherche des liens dans la page avec Cheerio
      //  const links = extractLinksWithCheerio($, url);

      /*  links.forEach(linkUrl => {
            // Enregistrement des liens dans la base de données
            const link = {
                sourceUrl: url,
                targetUrl: linkUrl
            };
            linksDB.set(`${url}->${linkUrl}`, link);
        });*/

    } catch (error) {
       display(`Erreur lors de l'indexation de la page ${url}: ${error}`);
    } finally{
      return 1
    }
}

// Fonction pour indexer les pages correspondant aux liens
async function indexLinks() {
    display(linksDB)
    try {
        const links = Object.values(linksDB.getAll());
        for (const link of links) {
            let t =await indexPage(link.targetUrl);
            display(t)
            await sleep(500*t)
            display(`Liens restants à indexer: ${links.length - links.indexOf(link) - 1}`);
        }
        display('Tous les liens ont été indexés avec succès.');
    } catch (error) {
        display(`Erreur lors de l'indexation des liens: ${error}`);
    }
}

// Exemple d'utilisation
const urlgen=require("../perso/img-test/makeurl")




async function indexPages(urls) {
    display(urls)
    chrono.start();
    for (const url of urls) {
       // console.time(url)
        await indexPage(url);
        await sleep(crypto.randomInt(50000/2,100000/2))
        //console.timeEnd(url)
        //console.timeLog('index')
        display(`page restante a indexer: ${(linksDB.count())-urls.indexOf(url)-1} temps de traitement : ${chrono.getTimeFormatted()}`);
    }
}

        // Indexation des liens après avoir indexé les pages initiales
        indexLinks();
    
// Indexation des pages initiales


// Export des instances de base de données pour une utilisation dans d'autres fichiers si nécessaire
module.exports = { indexedPagesDB, linksDB };
