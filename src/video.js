// const DIR_CONTENT = '../public/public/news/24.11.07/tg-nodJVO9st/img/';
import {CreateVideo, findExtFiles, findExtFilesAbs, pathResolveRoot} from "./utils.js";

const DIR_CONTENT = '../public/public/news/24.11.28/tg-c6Hxu7RJ3/';
const DIR_IMG = '../content/img/';
const DIR_AUDIO = '../content/audio/';
const DIR_VIDEO = '../content/video/';
const DIR_FFMPEG = '../content/ffmpeg/';
const pathAudioSpeech = DIR_CONTENT + 'speech.mp3';

const pathSubtitles = 'news.txt';
const numImages = 5;
const pathVideo = 'news.mp4';
const pathVideoIntro = DIR_VIDEO + 'intro.mp4';
const pathVideoEnd = DIR_VIDEO + 'end.mp4';

const cv = new CreateVideo({dir_ffmpeg: DIR_FFMPEG, dir_content: DIR_CONTENT});
const pathAudioBridge = DIR_AUDIO + 'bridge.mp3';
const pathAudioBack = DIR_AUDIO + 'back.mp3';
const pathAudioBackLowVol = DIR_AUDIO + 'back-05.mp3';
const pathAudio = 'out.mp3';

// cv.changeVolume({pathFile: pathAudioBridge, volume: 0.5})


// create intro -------
// const pathAudioIntro = DIR_AUDIO + 'intro.mp3';
// const pathImgLogo = DIR_IMG + 'img+logo.png';
// const pathImgLogo2 = DIR_IMG + 'img+logo2.png';
//
// const durIntro = await cv.getDuration(pathAudioIntro)
// await cv.imageToVideo({
//     arrImage: [
//         pathImgLogo2,
//         pathImgLogo,
//         pathImgLogo2],
//     transDur: .6,
//     duration: durIntro * 3-10,
//     pathOut: pathVideoIntro,
//     // indexEff: 43,
//     arrEff: ['hblur', 'zoomin', 'zoomin']
// })
// await cv.crop({path: pathVideoIntro, start: 6, duration: 6})
// // await cv.crop({pathAudio: pathVideoIntro, start: 0, duration: durIntro - 3})
// await cv.joinVideoAudio({pathVideo: pathVideoIntro, pathAudio: pathAudioIntro});
// await cv.crop({path: pathVideoIntro, start: 0, duration: 6})
// ----------------


// --------- пакетная подготовка картинок
// const targetWidth = 1280; // Ширина
// const targetHeight = 720; // Высота
// const backgroundColor = {r: 32, g: 32, b: 32, alpha: 1};
// await cv.packageResizeImage(10, 'jfif', targetWidth, targetHeight, backgroundColor);
// --------- img -> video + audio

//.\ffmpeg.exe -y -i .\middle.mp4 -i .\news.mp4 -filter_complex "[0:v][1:v]overlay=320:180:shortest=1[v];[0:a][1:a]amix=inputs=2[a]" -map "[v]" -map "[a]" -shortest output.mp4

export const buildAnNews = async ({dir_ffmpeg, dir_content, pathBridge, pathLogoMini, from}) => {
    let prc = 100 / 7, currPrc = 0;

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    const video = new CreateVideo({dir_ffmpeg, dir_content});
    const durationSpeech = await video.getDuration('speech.mp3')

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    await video.addAudioToAudio({pathAudioSrc: 'speech.mp3', pathAudioAdded: pathBridge, pathAudioOut: pathAudio})

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    const duration = await video.getDuration(pathAudio)

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    await video.imageToVideo({arrPathImg: await findExtFilesAbs(dir_content, 'png'), duration, pathOut: pathVideo})

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    await video.addTextVideoAudio({pathVideo, text: 'источник\\\: ' + from, pos: {x: '10', y: 'H-th-10'}, param: {size: 20, color: 'white'}})


    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    await video.joinVideoAudio({pathVideo, pathAudio});
    // global.messageSocket.send({type: 'progress', data: currPrc += prc})
    // await video.addSubtitles({pathSubtitles, duration: durationSpeech, pathVideo});

    global.messageSocket.send({type: 'progress', data: currPrc += prc})
    await video.addImg({pathVideo, pathImg: pathLogoMini, y: '10', w: 100, h: 70});

    global.messageSocket.send({type: 'progress', data: -1})
// -----------
}
export const test = async ({dir_ffmpeg, pathVideo, dir_content, pathLogoMini, pathOut}) => {
    const video = new CreateVideo({dir_ffmpeg, dir_content});
    await video.addImg({pathVideo, pathImg: pathLogoMini, pathOut, y: '10', w: 100, h: 70});
// -----------
}

// create end
// await cv.joinVideoAudio({pathVideo: pathVideoEnd, pathAudio: pathAudioBridge});
// await cv.changeVolume({pathFile: pathVideoEnd, volume: 0});
// -----------

export const buildAllNews = async ({dir_ffmpeg, dir_content, arrPathVideo, pathBackground, pathIntro, pathEnd, pathOut}) => {
    const video = new CreateVideo({dir_ffmpeg, dir_content});
// seq video news
    await video.concatVideo({
        arrPathVideo,
        pathOut: '_news.mp4'
    })
    await video.joinVideoAudio({pathVideo: '_news.mp4', pathAudio: pathBackground, replace: false});

    await video.concatVideo({
        arrPathVideo: [pathIntro, '_news.mp4', pathEnd],
        pathOut
    })
    await video.dry('_news.mp4')
}

// seq video news
// await cv.concatVideo({
//     arrPathVideo: [
//         pathResolveRoot(DIR_CONTENT) + '\\' + 'news.mp4',
//         pathResolveRoot(DIR_CONTENT) + '\\' + 'news2.mp4',
//         pathVideoEnd,
//     ],
//     pathOut: 'out-news.mp4'
// })
// await cv.joinVideoAudio({pathVideo: 'out-news.mp4', pathAudio: pathAudioBackLowVol, replace: false});

// await cv.concatVideo({
//     arrPathVideo: [
//         pathVideoIntro,
//         'out-news.mp4',
//     ],
//     pathOut: '_out-news.mp4'
// })
//
// await cv.changeVolume({pathFile: '_out-news.mp4', volume: .25});
// cv.dry('out-news.mp4')
// -------------