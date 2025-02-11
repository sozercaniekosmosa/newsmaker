import fs, {promises as fsPromises} from 'fs'
import * as console from "node:console";
import sharp from "sharp";
import {removeFile} from "../utils.js";


async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function resizeImage({
                                      inputArrBufOrPath,
                                      outputFilePath,
                                      width = null,
                                      height = null,
                                      maxWidth = 1920,
                                      maxHeight = 1080,
                                      fit = 'inside',
                                      background = true,
                                      withoutEnlargement = true,
                                      position
                                  }) {
    try {
        let image = await sharp(inputArrBufOrPath).resize(maxWidth, maxHeight, {
            fit,
            withoutEnlargement,
            position
        }).toBuffer();
        image = await sharp(image).flatten({background: '#454545'}).toFormat('png');

        const {width: _w, height: _h} = await image.metadata();

        if (width && (_w !== width || _h !== height) && background) {
            const resizeImageBlur = image.clone().resize({width, height, fit: 'fill'});
            const imgBackBlur = await resizeImageBlur.blur(25).toBuffer();

            const foregroundImage = await image
                .resize({width, height, fit: "contain", background: {r: 128, g: 200, b: 255, alpha: 0.5}})
                .toBuffer();

            image = await sharp(imgBackBlur)
                .composite([{input: foregroundImage, gravity: 'center'}])
        }
        const {width: w, height: h} = await image.metadata()

        let outPath = outputFilePath;
        const isExist = /-(\d+)x(\d+)\.png/.test(outPath);
        const arrPathPart = outPath.split(isExist ? /-(\d+)x(\d+)\.png/ : /\.png/);
        outPath = arrPathPart[0] + `-${w}x${h}.png`;

        await image.normalize().sharpen().toFile(outPath);

        // console.log('Изображение успешно обработано и сохранено в', outputFilePath);
        return outPath;
    } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
    }
}

export const toPng = async ({inputPath, outputFilePath}) => {
    try {
        let image = await sharp(inputPath);
        const {width: w, height: h} = await image.metadata()

        let outPath = outputFilePath;
        if (!outPath.endsWith('.png')) outPath = outPath.substring(0, outPath.lastIndexOf('.'))
        const isExist = /-(\d+)x(\d+)\.png/.test(outPath);
        const arrPathPart = outPath.split(isExist ? /-(\d+)x(\d+)\.png/ : /\.png/);
        outPath = arrPathPart[0] + `-${w}x${h}.png`;

        await image.toFormat('png').toFile(outPath);

        // console.log('Изображение успешно обработано и сохранено в', outputFilePath);
        return outPath;
    } catch (error) {
        throw error;
        // console.error('Ошибка при обработке изображения:', error);
    }
};

export const toPngT = async ({inputPath, outputFilePath}) => {
    try {
        let image = await sharp(inputPath).flatten({background: '#676767'});

        await image.toFormat('png').toFile(outputFilePath);

        // return outPath;
    } catch (error) {
        throw error;
    }
};

// await toPngT({
//     inputPath: 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\services\\t.png',
//     outputFilePath: 'D:\\Dev\\JS\\Prj\\2024\\newsmaker\\src\\services\\o.png'
// })

// await resizeImage('img.png', 'out.png', 1920, 1080)

// async function createVignetteOverlay(pathFile, outputFilePath, width, height) {
//     // Размеры изображения (должны совпадать с исходным)
//     try {
//         const inputImage = await sharp(pathFile);
//         // const inputImageBlur = sharp(await inputImage.toBuffer());
//         // const resizeImageBlur = inputImageBlur.resize({
//         //     width, height, fit: 'fill'// fit: sharp.fit.cover, // Заполнение с обрезкой
//         // });
//
//         const obj = await inputImage.metadata();
//         console.log(obj)
//         const {width: w, height: h} = obj
//
//         // const width = 800;
//         // const height = 600;
//
//         // 1. Создаём радиальную маску с прозрачностью
//         const vignetteMask = `
//     <svg width="${w}" height="${w}">
//         <radialGradient id="gradient" cx="50%" cy="50%" r="65%">
//             <stop offset="0%" stop-opacity="0"/>
//             <stop offset="100%" stop-opacity="1"/>
//         </radialGradient>
//         <rect x="0" y="0" width="${w}" height="${h}" fill="url(#gradient)"/>
//     </svg>`;
//
//         // 2. Обрабатываем маску
//         const maskBuffer = await sharp(Buffer.from(vignetteMask))
//             .toFormat('png')
//             .blur(20) // Размытие краёв виньетки
//             .toBuffer();
//
//         // 3. Применяем маску к исходному изображению
//         let vignetteImage = await inputImage
//             .composite([{
//                 input: maskBuffer,
//                 blend: 'dest-in' // Используем альфа-канал маски
//             }]).toBuffer();
//
//         vignetteImage = await sharp(vignetteImage)
//
//         vignetteImage = vignetteImage.resize({
//             width, height, fit: 'contain', background: {r: 128, g: 200, b: 255, alpha: 0.5}, // Прозрачный фон
//         })
//
//         // .toBuffer();
//
//         // 4. Накладываем результат на фоновое изображение
//         const inputImageBlur = sharp(await inputImage.toBuffer());
//         const resizeImageBlur = inputImageBlur.resize({
//             width, height, fit: 'fill'// fit: sharp.fit.cover, // Заполнение с обрезкой
//         });
//         const imgBackBlur = resizeImageBlur.blur(25);
//
//         console.log(await imgBackBlur.metadata())
//         console.log(await vignetteImage.metadata())
//
//         await sharp(await vignetteImage.toBuffer())
//             .composite([{
//                 input: imgBackBlur,
//                 blend: 'over' // Стандартное наложение с прозрачностью
//             }])
//             .toFile(outputFilePath);
//     } catch (e) {
//         console.error(e)
//     }
// }


async function applyVignette(inputPath, outputPath, width, height) {
    try {
        // Загружаем исходное изображение и получаем его размеры
        let image = sharp(inputPath);
        const {width: w, height: h} = await image.metadata();

        const resizeImageBlur = image.clone().resize({width, height, fit: 'cover'});
        const imgBackBlur = await resizeImageBlur.blur(50).toBuffer();


        const mask = await getVignetteMaskAlpha(w, h);
        const imageVignette = await image.composite([{input: mask, blend: 'dest-in'}])


        const foregroundImage = await imageVignette
            .resize({width, height, fit: 'contain'});

        image = await sharp(imgBackBlur)
            .composite([{input: await foregroundImage.toBuffer(), gravity: 'center'}]).normalize().sharpen()

        await image.toFile(outputPath);
    } catch (e) {
        console.error(e)
    }
}

async function getVignetteMaskAlpha(width, height) {
    const vignetteMask = `
    <svg width="${width}" height="${height}">
        <radialGradient id="gradient" cx="50%" cy="50%" r="60%">
            <stop offset="50%" stop-opacity="1"/>
            <stop offset="70%" stop-opacity="0"/>
        </radialGradient>
        <rect x="0" y="0" width="${width}" height="${height}" fill="url(#gradient)"/>
    </svg>`;

    return await sharp(Buffer.from(vignetteMask))
        .toFormat('png')
        .blur(80) // Размытие краёв виньетки
        .toBuffer();

}

// Использование
// applyVignette('img.png', 'out.png', 1920, 1080)