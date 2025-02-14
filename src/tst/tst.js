import ffmpeg from 'fluent-ffmpeg'
import libffmpeg from '@ffmpeg-installer/ffmpeg'
import libffprobe from '@ffprobe-installer/ffprobe'
import {checkFileExists, removeDir} from "../utils.js";
import fs from "fs";

ffmpeg.setFfmpegPath("C:\\Dev\\Prj\\2024\\newsmaker\\content\\ffmpeg\\ffmpeg.exe");
// ffmpeg.setFfmpegPath("D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\ffmpeg.exe");
// ffmpeg.setFfmpegPath(libffmpeg.path);
ffmpeg.setFfprobePath(libffprobe.path);


const getDataVideo = (path) => new Promise((resolve, reject) => {
    ffmpeg(path).ffprobe(function (err, metadata) {
        if (!err) resolve(metadata); else reject(err);
    });
})

function videoFromImage({pathInput, pathOutput, dur = 5, fps = 30, clb}) {
    return new Promise((resolve, reject) => ffmpeg(pathInput)
        .inputOption(["-vsync 0", // "-hwaccel nvdec",
            // "-hwaccel cuvid",
            "-hwaccel_device 0"])
        .videoFilter(`scale=7680x4320:force_original_aspect_ratio=decrease,zoompan=z='min(zoom+.2/(${fps}*${dur}),1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${fps}*${dur}:fps=${fps},scale=1920:1084`)
        // .output('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output.mp4')
        .output(pathOutput)
        .on('start', (command) => {
            clb && clb('start', 'Запущена команда: ' + command);
            // console.time()
        })
        // .on('progress', ({frames}) => console.log(frames / 150 * 100))
        .on('progress', ({frames}) => clb && clb('progress', Math.trunc(frames / (fps * dur) * 100)))
        .on('end', () => {
            console.log('Обработка завершена');
            clb && clb('end', 'Обработка завершена');
            // console.timeEnd()
            resolve()
        })
        .on('error', (err) => {
            console.error('Ошибка:', err)
            clb && clb('error', err);
            reject()
        })
        .run())
}

async function getArrDataVideo(arrPath) {
    const promiseArrDataVideo = arrPath.map(path => getDataVideo(path));
    const arrDataVideo = (await Promise.allSettled(promiseArrDataVideo)).map(it => it.value)
    const arrDurFrame = arrDataVideo.map(dataVideo => {
        const duration = dataVideo.streams[0].duration;
        const frames = dataVideo.streams[0].nb_frames;
        return {duration, frames};
    })

    return arrDurFrame;
}

async function videoConcat({arrPath, pathOutput, maxDuration, tmTrans, clb}) {
    return new Promise(async (resolve, reject) => {
        let out;
        const arrDurFrame = await getArrDataVideo(arrPath);
        const frameAll = arrDurFrame.reduce((acc, {frames}) => acc + frames, 0)

        const getBlendFn = (n, d, o) => {
            let in1 = n === 0 ? n : (out ?? 'v0');
            let in2 = n + 1;
            out = 'v' + n;
            return `[${in1}][${in2}]xfade=transition=fade:duration=${d}:offset=${o}[${out}]`;
        };

        let ff = ffmpeg()

        arrPath.forEach(path => ff.input(path))
        ff.complexFilter(Array(arrPath.length - 1).fill().map((it, i) => getBlendFn(i, tmTrans, arrDurFrame.slice(0, i + 1).reduce((acc, {duration}) => acc + duration - tmTrans, 0))))

        // ff.complexFilter([
        //     getBlendFn(0, 1, 4),
        //     getBlendFn(1, 1, 8),
        //     // '[0][1]xfade=transition=wipeleft:duration=1:offset=4[v2]',
        //     // '[v2][2]xfade=transition=wipeleft:duration=1:offset=8[vout]',
        // ])


        ff.outputOptions([`-t ${maxDuration}`, '-c:v libx264', `-map [${out}]`])

        ff.inputOption(["-vsync 0", "-hwaccel_device 0"]);

        ff.output(pathOutput)
            // .on('stderr', (data) => console.log(data))
            .on('start', (command) => {
                clb && clb('start', 'Запущена команда: ' + command);
                console.time()
            })
            .on('progress', ({frames}) => clb && clb('progress', Math.trunc(frames / frameAll * 100)))
            .on('end', () => {
                console.log('Обработка завершена');
                clb && clb('end', 'Обработка завершена');
                console.timeEnd();
                resolve();
            })
            .on('error', (err) => {
                console.error('Ошибка:', err);
                clb && clb('error', err);
                reject();
            })
            .run();
    })
}


// videoFromImage('input.png', 'output.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('input2.png', 'output2.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('input3.png', 'output3.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('input4.png', 'output4.mp4', 7, 30, (type, data) => console.log(type, data));
// await videoConcat(['output.mp4', 'output2.mp4', 'output3.mp4', 'output4.mp4'], 'out.mp4', 2, (type, data) => console.log(type, data))

// videoFromImage('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input.png', 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input2.png', 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output2.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input3.png', 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output3.mp4', 7, 30, (type, data) => console.log(type, data));
// videoFromImage('D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\input4.png', 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output4.mp4', 7, 30, (type, data) => console.log(type, data));
// await videoConcat([
//     'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output.mp4',
//     'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output2.mp4',
//     'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output3.mp4',
//     'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\output4.mp4',
// ], 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\out.mp4', 2, (type, data) => console.log(type, data))


const buildV = async ({arrPath, duration, fps = 30, tmTrans = 2, dir, secPerFrame = 5, clb}) => {//ожидается что первым фреймом будет title

    function getArrImgPathForDur(deltaDur, secPerFrame, arrImagePath) {
        const quantImg = Math.ceil(Math.abs(deltaDur) / secPerFrame)
        if (deltaDur > 0) {//нехватка
            const addArrImgPath = Array(Math.ceil(quantImg / arrImagePath.length)).fill(arrImagePath.slice(1)).flat().splice(0, quantImg);
            return [...arrImagePath, ...addArrImgPath]
        } else if (deltaDur < 0) {//избыток
            return [arrImagePath[0], ...arrImagePath.slice(0, quantImg + 1)]
        } else if (deltaDur === 0) {
            return arrImagePath;
        }
    }

    const arrVideoPath = arrPath.filter(path => path.split('.')[1] === 'mp4');
    const arrImagePath = arrPath.filter(path => path.split('.')[1] === 'png');

    const arrDurFrame = await getArrDataVideo(arrVideoPath);
    const durVideoAll = arrDurFrame.reduce((acc, {duration}) => acc + duration, 0)

    const durImageAll = arrImagePath.length * secPerFrame;

    const shortageDur = duration - (durVideoAll + durImageAll);
    let arrImagePathFull = getArrImgPathForDur(shortageDur, secPerFrame, arrImagePath);

    let tmp_dir = dir + `\\tmp\\`;
    if (!fs.existsSync(tmp_dir)) fs.mkdirSync(tmp_dir, {recursive: true});

    const _arrPrc = [];
    const promiseArrTaskVideoGen = arrImagePathFull.map((pathImg, i) => videoFromImage({
        pathInput: pathImg, pathOutput: tmp_dir + i + '.mp4', dur: secPerFrame + tmTrans, fps, clb: (type, data) => {
            if (type === 'progress') {
                _arrPrc.push(data)
                if (_arrPrc.length > 10) _arrPrc.shift();
                const avg = _arrPrc.reduce((acc, val) => acc + val, 0) / _arrPrc.length;
                clb && clb(type, (Math.ceil(avg) ?? 0) * .5)
            }
            if (type === 'end') clb && clb('progress', 50)
        }
    }))

    await Promise.allSettled(promiseArrTaskVideoGen);

    const arrVideoPathFull = [tmp_dir + '0.mp4', ...arrVideoPath, ...arrImagePathFull.slice(1).map((_, i) => tmp_dir + (i + 1) + '.mp4')]

    await videoConcat({
        arrPath: arrVideoPathFull, pathOutput: dir + '\\out.mp4', maxDuration: duration, tmTrans, clb: (type, data) => {
            if (type === 'progress') {
                clb && clb(type, (Math.ceil(data) ?? 50) * .5 + 50)
            }
            if (type === 'end') clb && clb('progress', 100)
        }
    })

    await removeDir(tmp_dir);

}

await buildV({
    arrPath: Array(4).fill().map((_, i) => process.cwd() + '\\input' + i + '.png'),
    duration: 20,
    tmTrans: 2,
    dir: process.cwd(),
    secPerFrame: 5,
    fps: 3,
    // clb: (type, prc) => console.log(type, prc)
})

console.log(process.cwd());

