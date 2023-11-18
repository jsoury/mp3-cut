const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');

// Fonction pour obtenir les métadonnées d'un fichier MP3
function getMetadata(inputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
            if (err) {
                reject("MetaData not Found. " + err);
            } else {
                resolve(metadata);
            }
        });
    });
}

// Fonction pour télécharger une vidéo YouTube
async function downloadYoutube(youtubeURL) {
    const videoInfo = await ytdl.getInfo(youtubeURL);
    console.log("videoInfo", videoInfo);
    const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio' });
    console.log(videoInfo.videoDetails.title);
    const title = videoInfo.videoDetails.title.replace(/[!|@#$%^&*]/g, "").replace(/[^\w_ ]/, "").replaceAll(" ", "_");
    console.log(title);
    const inputFilePath = path.join(__dirname, `${title}.mp3`);

    return new Promise((resolve, reject) => {
        ytdl(youtubeURL, { format: videoFormat })
            .pipe(fs.createWriteStream(inputFilePath))
            .on('finish', () => resolve(inputFilePath))
            .on('error', (error) => reject(error));
    });
}
// Fonction pour découper le fichier MP3 en segments
async function cutMP3IntoSegments (inputFilePath, outputDirectory, segmentDuration) {
    const metadata = await getMetadata(inputFilePath)
    console.log(metadata);

    const totalSegments = Math.ceil(metadata.format.duration / segmentDuration);
    const segmentName = metadata.format.filename.split('\\').pop().replace(/\.[^/.]+$/, '');
    console.log("segmentName",segmentName);
    for (let i = 0; i < totalSegments; i++) {
        console.log(i);
        const startTime = i === 0 ? 0 : i * segmentDuration;

        ffmpeg(inputFilePath)
            .audioCodec('libvorbis')
            .audioQuality(4)
            .on('end', () => {
                console.log(`Segment ${i + 1} terminé.`);            
            })
            .on('error', (err) => {
                console.error(`Erreur lors du découpage du segment ${i + 1} :`, err);
            })
            .on('progress', (progress) => {
                console.log(`Segment ${i + 1} - Progression : ${Math.floor(progress.percent)}%`);
            })
            .setStartTime(startTime)
            .setDuration(segmentDuration)
            .output(`${outputDirectory}/${segmentName}-${i + 1}.ogg`)
            .run();
    }
    
}

module.exports = { cutMP3IntoSegments, downloadYoutube }