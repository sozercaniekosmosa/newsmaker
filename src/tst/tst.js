import ffmpeg from 'fluent-ffmpeg'
import libffmpeg from '@ffmpeg-installer/ffmpeg'
import libffprobe from '@ffprobe-installer/ffprobe'

ffmpeg.setFfmpegPath(libffmpeg.path);
ffmpeg.setFfprobePath(libffprobe.path);

// ffmpeg.setFfmpegPath('../../content/ffmpeg/ffmpeg.exe')
// ffmpeg.setFfprobePath('content/ffmpeg/ffprobe.exe')

// const command = ffmpeg();

ffmpeg('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input.png')
    .inputOption([
        "-vsync 0",
        "-hwaccel nvdec",
        "-hwaccel cuvid",
        "-hwaccel_device 0"
    ])
    .videoFilter(
        "scale=7680x4320:force_original_aspect_ratio=decrease,zoompan=z='min(zoom+.2/(30*5),1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=30*5:fps=30"
    )
    // .outputOptions('-t 5') // Длительность видео
    // .videoCodec('libx264')
    // .outputOptions([
    //     "-vf",
    //     "scale=7680x4320,zoompan=z='min(zoom+.2/125,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125"
    // ])
    .output('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output.mp4')
    .on('start', (command) => console.log('Запущена команда: ' + command))
    // .on('progress', ({frames}) => console.log(frames / 150 * 100))
    .on('progress', ({frames}) => console.log(frames / 150 * 100))
    .on('end', () => console.log('Обработка завершена'))
    .on('error', (err) => console.error('Ошибка:', err))
    .run();