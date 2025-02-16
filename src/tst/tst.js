import ffmpeg from 'fluent-ffmpeg'
import libffmpeg from '@ffmpeg-installer/ffmpeg'
import libffprobe from '@ffprobe-installer/ffprobe'
import {removeDir, removeFile, renameFile} from "../utils.js";
import fs from "fs";
import {fr} from "chrono-node";

// ffmpeg.setFfmpegPath("C:\\Dev\\Prj\\2024\\newsmaker\\content\\ffmpeg\\ffmpeg.exe");
ffmpeg.setFfmpegPath("D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\tst\\ffmpeg.exe");
// ffmpeg.setFfmpegPath(libffmpeg.path);
ffmpeg.setFfprobePath(libffprobe.path);

const getDuration = (path) => new Promise((resolve, reject) => ffmpeg(path).ffprobe((err, metadata) => !err ? resolve(metadata.streams[0].duration) : reject(err)))
const getFrames = (path) => new Promise((resolve, reject) => ffmpeg(path).ffprobe((err, metadata) => !err ? resolve(metadata.streams[0].nb_frames) : reject(err)))
const getDataVideo = (path) => new Promise((resolve, reject) => ffmpeg(path).ffprobe((err, metadata) => !err ? resolve(metadata) : reject(err)))

const videoFromImage = ({pathInput, pathOut, dur = 5, fps = 30, scale = 1.2, clb}) => new Promise((resolve, reject) => ffmpeg(pathInput)
    .inputOption(["-vsync 0",/* "-hwaccel nvdec",*//* "-hwaccel cuvid",*/ "-hwaccel_device 0"])
    // .size('1920x1080').autopad('#cc0000').keepPixelAspect()
    .videoFilter(`scale=7680x4320:force_original_aspect_ratio=decrease,zoompan=z='min(zoom+${scale - 1}/(${fps}*${dur}),${scale})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${fps}*${dur}:fps=${fps},scale=1920:1084`)
    .output(pathOut)
    .on('start', (command) => clb && clb('start', 'Запущена команда: ' + command))
    .on('progress', ({frames}) => clb && clb('progress', Math.trunc(frames / (fps * dur) * 100)))
    .on('end', () => {
        clb && clb('end', 'Обработка завершена');
        resolve()
    })
    .on('error', (err) => {
        console.error('Ошибка:', err)
        clb && clb('error', err);
        reject()
    })
    .run());

async function getArrDataVideo(arrPath) {
    const promiseArrDataVideo = arrPath.map(path => getDataVideo(path));
    const arrDataVideo = (await Promise.allSettled(promiseArrDataVideo)).map(it => it.value)
    return arrDataVideo.map(dataVideo => {
        const duration = dataVideo.streams[0].duration;
        const frames = dataVideo.streams[0].nb_frames;
        return {duration, frames};
    });
}

async function videoConcat({arrPath, pathOut, maxDuration, tmTrans, clb}) {
    return new Promise(async (resolve, reject) => {
        let out;
        const arrDurFrame = await getArrDataVideo(arrPath);
        const frameAll = arrDurFrame.reduce((acc, {frames}) => acc + frames, 0)

        const getBlendFilter = (n, dur, offset) => {
            let in1 = n === 0 ? n : (out ?? 'v0');
            let in2 = n + 1;
            out = 'v' + n;
            return `[${in1}][${in2}]xfade=transition=fade:duration=${dur}:offset=${offset}[${out}]`;
        };

        let ff = ffmpeg()

        arrPath.forEach(path => ff.input(path))
        const _arr = Array(arrPath.length - 1).fill(); // для цикла
        let arrOffset = _arr.map((it, i) => arrDurFrame.slice(0, i + 1).reduce((acc, {duration}) => acc + duration - tmTrans, 0));// offset
        ff.complexFilter(_arr.map((it, i) => getBlendFilter(i, tmTrans, arrOffset[i])))

        // ff.complexFilter([
        //     getBlendFn(0, 1, 4), getBlendFn(1, 1, 8),
        //     '[0][1]xfade=transition=wipeleft:duration=1:offset=4[v2]',
        //     '[v2][2]xfade=transition=wipeleft:duration=1:offset=8[vout]',
        // ])


        ff.outputOptions(['-c:v libx264', `-map [${out}]`])
        // ff.outputOptions(['-c:v libx264', `-map [${out}]`])

        ff.inputOption(["-vsync 0", "-hwaccel_device 0"]);
        if (maxDuration) ff.duration(maxDuration);
        ff.output(pathOut)
            // .on('stderr', (data) => console.log(data))
            .on('start', (command) => clb && clb('start', command))
            .on('progress', ({frames}) => clb && clb('progress', Math.trunc(frames / frameAll * 100)))
            .on('end', () => {
                clb && clb('end', 'Обработка завершена');
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

const buildVideo = async ({arrPath, duration, fps = 30, scale = 2, tmTrans = 2, dir, secPerFrame = 5, clb}) => {//ожидается что первым фреймом будет title

    console.time();

    function getArrImgPathForDur(deltaDur, secPerFrame, arrImagePath) {
        const quantImg = Math.ceil(Math.abs(deltaDur) / secPerFrame)
        if (deltaDur > 0) {//нехватка
            const addArrImgPath = Array(Math.ceil(quantImg / arrImagePath.length) + 1).fill(arrImagePath.slice(1)).flat().splice(0, quantImg);
            return [...arrImagePath, ...addArrImgPath]
        } else if (deltaDur < 0) {//избыток
            return [arrImagePath[0], ...arrImagePath.slice(0, quantImg + 1)]
        } else if (deltaDur === 0) {
            return arrImagePath;
        }
    }

    const arrVideoPath = arrPath.filter(path => path.split('.')[1] === 'mp4');
    let arrImagePath = arrPath.filter(path => path.split('.')[1] === 'png');

    if (duration) {//если задана длительность расчитываем количество картинок
        const arrDurFrame = await getArrDataVideo(arrVideoPath);
        const durVideoAll = arrDurFrame.reduce((acc, {duration}) => acc + duration, 0)

        const durImageAll = arrImagePath.length * secPerFrame;

        const shortageDur = duration - (durVideoAll + durImageAll);
        arrImagePath = getArrImgPathForDur(shortageDur, secPerFrame, arrImagePath);
    }

    let tmp_dir = dir + `\\tmp\\`;
    if (!fs.existsSync(tmp_dir)) fs.mkdirSync(tmp_dir, {recursive: true});

    let _prc = -1;
    const promiseArrTaskVideoGen = arrImagePath.map((pathImg, i) => videoFromImage({
        pathInput: pathImg, pathOut: tmp_dir + i + '.mp4', dur: secPerFrame + tmTrans, fps, scale, clb: (type, data) => {
            if (type === 'progress' && data > _prc) {
                clb && clb(type, Math.trunc((data ?? 0) * .5))
                _prc = data;
            }
        }
    }))

    await Promise.allSettled(promiseArrTaskVideoGen);

    const arrVideoPathFull = [tmp_dir + '0.mp4', ...arrVideoPath, ...arrImagePath.slice(1).map((_, i) => tmp_dir + (i + 1) + '.mp4')]

    await videoConcat({
        arrPath: arrVideoPathFull, pathOut: dir + '\\out.mp4', maxDuration: duration, tmTrans, clb: (type, data) => {
            if (type === 'progress') {
                clb && clb(type, Math.trunc((data ?? 50) * .5 + 50))
            }
            if (type === 'end') clb && clb('progress', 100)
        }
    })

    await removeDir(tmp_dir);

    console.timeEnd();
}

const concatAudio = ({arrPath, pathOut, clb}) => {
    return new Promise(async (resolve, reject) => {
        const ff = ffmpeg();

        arrPath.forEach(path => ff.input(path))

        ff
            .on('start', (command) => clb && clb('start', command))
            .on('end', () => {
                clb && clb('end', 'Обработка завершена');
                resolve();
            })
            .on('error', (err) => {
                console.error('Ошибка:', err);
                clb && clb('error', err);
                reject();
            })
            .mergeToFile(pathOut); // Указываем выходной файл
    })
}

const textToVideo = ({path, pathOut, arrText, clb}) => {
    return new Promise(async (resolve, reject) => {

        const framesAll = await getFrames(path)

        const ff = ffmpeg(path)

        let arrTextCmd = arrText.map((it) => {
            const {text, pos = {x: '10', y: 'H-th-10'}, param = {size: 14, color: 'white'}} = it;
            return `drawtext=text='${text}':font='Arial':fontcolor=black:fontsize=${param.size}:x=${pos.x}+1:y=${pos.y}+1,drawtext=text='${text}':font='Arial':fontcolor=${param.color}:fontsize=${param.size}:x=${pos.x}:y=${pos.y}`;
        });

        ff.inputOption(["-vsync 0", "-hwaccel_device 0"]);
        ff.audioCodec('copy')
        ff.complexFilter(arrTextCmd)

        ff
            .output(pathOut)
            .on('start', (command) => clb && clb('start', command))
            .on('progress', ({frames}) => {
                clb && clb('progress', Math.ceil(frames / framesAll * 100));
                resolve();
            })
            .on('end', () => {
                clb && clb('end', 'Обработка завершена');
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

const addImageToVideo = ({path, pathImg, w = 100, h = 100, x = 'W-w-10', y = 'H-h-10', from = 0, to, clb}) => {
    return new Promise(async (resolve, reject) => {
        const pathOut = path.split('.').join('_.')

        const framesAll = await getFrames(path)
        const ff = ffmpeg()
        // - filter_complex
        // "[1:v]scale=${w}:${h}[overlay];[0:v][overlay] overlay=${x}:${y}:${to ? `enable='between(t,${from ?? 0},${to})'` : ''}" \
        ff
            .input(path)
            .input(pathImg)
            .inputOption(["-vsync 0", "-hwaccel_device 0"])
            .complexFilter([{filter: 'scale', inputs: '1', outputs: 'img'}, {
                filter: 'overlay', inputs: ['0', 'img'], options: {
                    x, y, enable: to ? `between(t,${from ?? 0},${to})` : undefined
                }
            }])
            .output(pathOut)
            // .on('stderr', (data) => console.log(data))
            .on('start', (command) => clb && clb('start', command))
            .on('progress', ({frames}) => {
                clb && clb('progress', Math.ceil(frames / framesAll * 100));
                resolve();
            })
            .on('end', () => {
                clb && clb('end', 'Обработка завершена');
                removeFile(path);
                renameFile(pathOut, path);
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
const mergeVideoAudio = ({pathv, patha, replace = true, clb}) => {
    return new Promise(async (resolve, reject) => {

        const pathOut = pathv.split('.').join('_.')

        const ff = ffmpeg()


        // if (replace)
        //     cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -i ${this.setDir(pathAudio)} -c:v copy -c:a copy ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;
        // else
        // cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -stream_loop -1 -i ${this.setDir(pathAudio)} -filter_complex "[0:a]volume=.7[a0];[1:a]volume=.5[a1];[a0][a1]amerge=inputs=2[a];" -map 0:v -map "[a]" -c:v copy -c:a aac -ac 2 ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;

        // -filter_complex "[0:a]volume=.7[a0];[1:a]volume=.5[a1];[a0][a1]amerge=inputs=2[a];" -map 0:v -map "[a]" -c:v copy -c:a aac -ac 2

        ff
            .addInput(pathv)
            .addInput(patha)
        // .inputOption(["-vsync 0", "-hwaccel_device 0"])

        if (replace) {
            ff.addOptions(['-map 0:v', '-map 1:a', '-c:v copy'])
        } else {
            // ff.complexFilter([
            //     {filter: 'volume', inputs: '[0:a]', outputs: 'a0', options: .7},
            //     {filter: 'volume', inputs: '[1:a]', outputs: 'a1', options: .5},
            //     {
            //         filter: 'amerge', inputs: ['[a0]', '[a1]'], outputs: '[a]',
            //         options: {inputs: 2}
            //     },]);
            //
            // ff.addOptions(['-map 0:v', '-map "[a]"', '-c:v copy', '-c:a aac -ac 2']);
            ff
                .inputOptions(['-stream_loop', '-1'])
                .complexFilter([
                    {filter: 'volume', options: {volume: 0.7}, inputs: '0:a', outputs: 'a0'},
                    {filter: 'volume', options: {volume: 0.5}, inputs: '1:a', outputs: 'a1'},
                    // {filter: 'amerge', options: {inputs: 2}, inputs: ['a0', 'a1'], outputs: 'a'},

                    {
                        filter: 'amerge',
                        options: { inputs: 2 },
                        inputs: ['a0', 'a1'],
                        outputs: 'merged'
                    },
                    {
                        filter: 'pan',
                        options: { args: 'stereo|c0=merged0+merged1|c1=merged0+merged1' },
                        inputs: 'merged',
                        outputs: 'stereo_audio'
                    },

                    {
                        filter: 'loudnorm',
                        options: {
                            I: -14, // Целевой уровень интегральной громкости (LUFS) для YouTube
                            LRA: 7, // Целевой диапазон громкости (LU) для YouTube
                            tp: -1.5, // Целевой пиковый уровень (дБ)
                            measured_I: -14, // Измеренный уровень интегральной громкости (LUFS)
                            measured_LRA: 7, // Измеренный диапазон громкости (LU)
                            measured_tp: -1.5, // Измеренный пиковый уровень (дБ)
                            measured_thresh: -31.5, // Измеренный порог (дБ)
                            offset: 0.0, // Смещение (дБ)
                            linear: true, // Линейная нормализация
                            print_format: 'json' // Формат вывода
                        },
                        inputs: 'stereo_audio',
                        outputs: 'norm_a'
                    }
                ])
                .outputOptions([
                    '-map', '0:v',
                    '-map', '[norm_a]',
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-ac', '2'
                ])
        }

        ff
            .output(pathOut, "./temp")
            .on('stderr', (data) => console.log(data))
            .on('start', (command) => clb && clb('start', command))
            .on('progress', ({percent}) => {
                clb && clb('progress', Math.ceil(percent));
                resolve();
            })
            .on('end', () => {
                clb && clb('progress', 100);
                clb && clb('end', 'Обработка завершена');
                removeFile(pathv);
                renameFile(pathOut, pathv);
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

let dir = process.cwd() + '\\tst';

// await concatAudio({
//     arrPath: [dir + '\\speech1.mp3', dir + '\\speech2.mp3'], pathOut: dir + '\\out.mp3', clb: (type, mess) => console.log(type, mess)
// })

// await buildVideo({
//     arrPath: Array(4).fill().map((_, i) => dir + '\\input' + i + '.png'),
//     duration: 27,
//     tmTrans: 2,
//     dir,
//     secPerFrame: 3,
//     fps: 5,
//     scale: 1.5,
//     clb: (type, prc) => console.log(prc + '%')
// })

// await textToVideo({
//     path: dir + '\\out.mp4',
//     pathOut: dir + '\\out1.mp4',
//     arrText: [{text: 'источник\\\: dsngkjn fkjg k', pos: {x: '10', y: 'H-th-10'}, param: {size: 30, color: 'white'}}],
//     clb: (type, mess) => console.log(mess)
// })

// await mergeVideoAudio({pathv: dir + '\\out.mp4', patha: dir + '\\speech1.mp3', clb: (type, mess) => console.log(mess)})
// await addImageToVideo({path: dir + '\\out.mp4', pathImg: dir + '\\logo.png', y: '10', w: 100, h: 70, clb: (type, mess) => console.log(mess)})
// await mergeVideoAudio({pathv: dir + '\\out.mp4', patha: dir + '\\speech1.mp3', clb: (type, mess) => console.log(mess)})
await mergeVideoAudio({pathv: dir + '\\out — копия.mp4', patha: dir + '\\speech2.mp3', replace: false, clb: (type, mess) => console.log(mess)})



