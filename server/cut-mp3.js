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

const removeEmojis = (text) => {
    if (!text) {
        return '';
    }
    return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}

// Fonction pour télécharger une vidéo YouTube
async function downloadYoutube(youtubeURL) {
    const videoInfo = await ytdl.getInfo(youtubeURL);
    const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio' });
    let title = removeEmojis(videoInfo.videoDetails.title);    
    title = title.replace(/[!|@#$%^&*]/g, "").replace(/[^\w_ ]/, "").replaceAll(" ", "_").replaceAll("__", "_").replaceAll("\"","");
    
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

    const totalSegments = Math.ceil(metadata.format.duration / segmentDuration);
    const segmentName = metadata.format.filename.split('\\').pop().replace(/\.[^/.]+$/, '');
    for (let i = 0; i < totalSegments; i++) {
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