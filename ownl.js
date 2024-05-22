const fs = require('fs');
const fetch = require('node-fetch');
// Importation du module

// Fonction pour sauvegarder une image encodée en base64
function saveBase64Image(base64Image, outputPath) {
  // Vérification que la chaîne commence par le préfixe correct
  const base64Prefix = 'data:image/png;base64,';
  console.log(base64Image)
  if (!base64Image.startsWith(base64Prefix)) {
    console.error('La chaîne base64 ne commence pas par le préfixe correct.');
    return;
  }

  // Extraction des données base64 (suppression du préfixe)
  const base64Data = base64Image.replace(base64Prefix, "");
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Affichage des données décodées sous forme de chaîne de caractères
  console.log('Données décodées (sous forme de chaîne) :', imageBuffer.toString('ascii'));
  // Décodage des données base64 et écriture dans un fichier
  fs.writeFile(outputPath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Une erreur s\'est produite lors de l\'écriture du fichier:', err);
      return
    } else {
      console.log('L\'image a été sauvegardée avec succès!');
      return
    }
  });
}



// Fonction pour télécharger une image à partir d'une URL avec un nom de fichier basé sur un incrément
async function downloadImage(url, index) {
    try {
       
  const base64Prefix = 'data:image/png;base64,';
  console.log(url)
  if (url.startsWith(base64Prefix)) {
    //console.error('La chaîne base64 ne commence pas par le préfixe correct.');
    saveBase64Image(url, `image/${index}.jpg`);
    return true
  }
        const response = await fetch(url);
        if (!response.ok) {
          
        }
        const buffer = await response.buffer(); // Convertir la réponse en tampon (buffer)
        const fileName = `image/${index}.jpg`; // Nom de fichier avec un incrément
        fs.writeFileSync(fileName, buffer); // Enregistrer le tampon dans un fichier
      //  console.log(`Image ${url} téléchargée avec succès sous le nom ${fileName}.`);
        return true; // Indique que l'image a été téléchargée avec succès
    } catch (error) {
       // console.error(`Erreur lors du téléchargement de l'image ${url}:`, error);
        return false; // Indique qu'il y a eu une erreur lors du téléchargement de l'image
    }
}

// Fonction récursive pour télécharger les images
async function downloadImagesRecursive(imageUrls, index = 0) {
    if (index >= imageUrls.length) {
        console.log('Téléchargement terminé.');
        return;
    }
   console.log(imageUrls[index])
    const success = await downloadImage(imageUrls[index], index + 1);
    if (success) {
        // Si le téléchargement a réussi, passer à l'image suivante
        downloadImagesRecursive(imageUrls, index + 1);
    } else {
        // Si le téléchargement a échoué, réessayer avec la même image
        downloadImagesRecursive(imageUrls, index+1);
    }
}

// Lire le fichier image.txt et télécharger les images
fs.readFile('images.txt', (err, data) => {
    if (err) {
        console.error('Erreur lors de la lecture du fichier image.txt:', err);
        return;
    }
    const imageUrls = data.toString().split('\n').filter(url => url.trim() !== ''); // Lire les lignes du fichier et supprimer les lignes vides
    console.log(imageUrls)
    downloadImagesRecursive(imageUrls,0);
});
