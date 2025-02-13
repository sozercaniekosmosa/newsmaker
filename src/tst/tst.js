import ffmpeg from 'fluent-ffmpeg'
import libffprobe from '@ffprobe-installer/ffprobe'

ffmpeg.setFfmpegPath('C:\\Dev\\Prj\\2024\\newsmaker\\src\\tst\\ffmpeg.exe');
// ffmpeg.setFfmpegPath(libffmpeg.path);
ffmpeg.setFfprobePath(libffprobe.path);


const getDataVideo = (path) =>
    new Promise((resolve, reject) => {
        ffmpeg(path).ffprobe(function (err, metadata) {
            if (!err)
                resolve(metadata)
            else
                reject(err)
        });
    })

function videoFromImage(pathInput, pathOutput, dur = 5, fps = 30, clb) {
// ffmpeg('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input.png')
    ffmpeg(pathInput)
        .inputOption([
            "-vsync 0",
            // "-hwaccel nvdec",
            // "-hwaccel cuvid",
            "-hwaccel_device 0"
        ])
        .videoFilter(
            `scale=7680x4320:force_original_aspect_ratio=decrease,zoompan=z='min(zoom+.2/(${fps}*${dur}),1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${fps}*${dur}:fps=${fps}`
        )
        // .output('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output.mp4')
        .output(pathOutput)
        .on('start', (command) => {
            clb && clb('start', 'Запущена команда: ' + command);
            console.time()
        })
        // .on('progress', ({frames}) => console.log(frames / 150 * 100))
        .on('progress', ({frames}) => clb && clb('progress', Math.trunc(frames / (fps * dur) * 100)))
        .on('end', () => {
            console.log('Обработка завершена');
            clb && clb('start', 'Обработка завершена');
            console.timeEnd()
        })
        .on('error', (err) => console.error('Ошибка:', err))
        .run();
}

async function videoConcat(arrPath, pathOutput, clb) {

    let out;

    const promiseArrDataVideo = arrPath.map(path => getDataVideo(path));
    const arrDataVideo = (await Promise.allSettled(promiseArrDataVideo)).map(it => it.value)
    const arrDurFrame = arrDataVideo.map(dataVideo => {
        const duration = dataVideo.streams[0].duration;
        const frames = dataVideo.streams[0].nb_frames;
        return {duration, frames};
    })


    const getBlendFn = (n, d, o) => {
        let in1 = n === 0 ? n : (out ?? 'v0');
        let in2 = n + 1;
        out = 'v' + n;
        return `[${in1}][${in2}]xfade=transition=wipeleft:duration=${d}:offset=${o}[${out}]`;
    };

    let ff = ffmpeg()

    arrPath.forEach(path => ff.input(path))
    ff.complexFilter(Array(arrPath.length - 1).fill().map((it, i) => getBlendFn(i, .1, arrDurFrame.slice(0, i + 1).reduce((acc, {duration}) => acc + duration - 1, 0))))

    // getBlendFn(0, 1, 4),
    // getBlendFn(1, 1, 8),
    // '[0][1]xfade=transition=wipeleft:duration=1:offset=4[v2]',
    // '[v2][2]xfade=transition=wipeleft:duration=1:offset=8[vout]',


    ff.outputOptions([
        '-c:v libx264',
        `-map [${out}]`
    ])

    ff.inputOption([
        "-vsync 0",
        "-hwaccel_device 0"
    ]);

    ff.output(pathOutput)
        // .on('stderr', (data) => console.log(data))
        .on('start', (command) => {
            clb && clb('start', 'Запущена команда: ' + command);
            console.time()
        })
        .on('progress', ({frames}) => clb && clb('progress', frames))
        .on('end', () => {
            console.log('Обработка завершена');
            clb && clb('start', 'Обработка завершена');
            console.timeEnd()
        })
        .on('error', (err) => console.error('Ошибка:', err))
        .run();
}

// ffmpeg('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input.png')
// videoFromImage('input.png', 'output.mp4', 5, 50, (type, data) => console.log(type, data));
// videoFromImage('input2.png', 'output2.mp4', 5, 50, (type, data) => console.log(type, data));
// videoFromImage('input3.png', 'output3.mp4', 5, 50, (type, data) => console.log(type, data));
await videoConcat(['output.mp4', 'output2.mp4', 'output3.mp4'], 'out.mp4', (type, data) => console.log(type, data))


