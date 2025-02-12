import ffmpeg from 'fluent-ffmpeg'
import libffmpeg from '@ffmpeg-installer/ffmpeg'
import libffprobe from '@ffprobe-installer/ffprobe'

console.log(ffmpeg.path)

ffmpeg.setFfmpegPath(libffmpeg.path);
ffmpeg.setFfprobePath(libffprobe.path);

// ffmpeg.setFfmpegPath('../../content/ffmpeg/ffmpeg.exe')
// ffmpeg.setFfprobePath('content/ffmpeg/ffprobe.exe')

// const command = ffmpeg();

ffmpeg('input.png')
    // .inputOptions('-loop 1') // Для создания видео из изображения
    // .videoFilter(
    // "zoompan=z='min(zoom-0.1,0.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080"
    // "zoompan=z='min(max(zoom,pzoom)+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1"
    // -c:v libx264 -crf 18 -preset veryslow output.mp4
    // )
    // .outputOptions('-t 5') // Длительность видео
    // .videoCodec('libx264')
    .outputOptions([
        "-vf",
        // "zoompan=z='zoom+0.0001':d=250:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        // "zoompan=z='min(zoom+0.001,2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        // "zoompan=z='min(max(zoom,pzoom)+0.0015,1.5)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=60:iw=981:ih=964:ow=981:oh=964"
        // "scale=981:964,zoompan=z='zoom+0.002':d=120:x='if(gt(iw,ih),iw/2-(iw/zoom/2),(ow-iw)/2)':y='if(gt(iw,ih),(oh-ih)/2,ih/2-(ih/zoom/2))':s=1920x1080'"
        "zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=250:s=981x964,scale=1920:1080"
    ])
    .output('output.mp4')
    .on('start', (command) => console.log('Запущена команда: ' + command))
    .on('end', () => console.log('Обработка завершена'))
    .on('error', (err) => console.error('Ошибка:', err))
    .run();