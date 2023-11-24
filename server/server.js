const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cutMP3IntoSegments, downloadYoutube } = require('./cut-mp3'); // Importez la fonction depuis le fichier mp3Utils.js

const app = express();
const port = 3000;

app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/cut-mp3', upload.single('mp3File'), async (req, res) => {  
    
    const outputPath = req.body.outputPath;
    const segmentDuration = req.body.segmentDuration;

    let inputFilePath;

    if(req.file){
        const mp3Buffer = req.file.buffer;
        inputFilePath = path.join(__dirname, req.file.originalname);

        // Enregistrez le fichier MP3 temporaire à partir du buffer
        fs.writeFileSync(inputFilePath, mp3Buffer);
    }
    else if(req.body.youtubeURL){
        // Téléchargez la vidéo YouTube
        inputFilePath = await downloadYoutube(req.body.youtubeURL);
    }
    
    const outputDirectory = path.join(__dirname, 'output');
    // Assurez-vous que le répertoire de sortie existe
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }

    // Exécutez la fonction de découpage
    cutMP3IntoSegments(inputFilePath, outputDirectory, segmentDuration);

    res.sendStatus(200);
    
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});