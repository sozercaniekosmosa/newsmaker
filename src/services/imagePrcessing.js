import fs, {promises as fsPromises} from 'fs'
import * as console from "node:console";
import sharp from "sharp";


async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function resizeImage(inputArrBufOrPath, outputFilePath, width = null, height = null) {
    try {
        let image = sharp(inputArrBufOrPath).toFormat('png');

        const {width: _w, height: _h} = await image.metadata()

        if (width && !(_w === width && _h === height)) {
            const resizeImageBlur = image.clone().resize({width, height, fit: 'fill'});
            const imgBackBlur = await resizeImageBlur.blur(25).toBuffer();

            const foregroundImage = await image
                .resize({width, height, fit: 'contain', background: {r: 128, g: 200, b: 255, alpha: 0.5}})
                .toBuffer();

            image = await sharp(imgBackBlur)
                .composite([{input: foregroundImage, gravity: 'center'}]).normalize().sharpen()
        }
        const {width: w, height: h} = await image.metadata()
        let outPath = outputFilePath;

        let arrPathPart = outPath.split(/\.png/)
        outPath = arrPathPart[0] + `-${w}x${h}.png`;
        await image.toFile(outPath);

        console.log('Изображение успешно обработано и сохранено в', outputFilePath);
    } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
    }
}

// await resizeImage('img.png', 'out.png', 1920, 1080)

async function createVignetteOverlay(pathFile, outputFilePath, width, height) {
    // Размеры изображения (должны совпадать с исходным)
    try {
        const inputImage = await sharp(pathFile);
        // const inputImageBlur = sharp(await inputImage.toBuffer());
        // const resizeImageBlur = inputImageBlur.resize({
        //     width, height, fit: 'fill'// fit: sharp.fit.cover, // Заполнение с обрезкой
        // });

        const obj = await inputImage.metadata();
        console.log(obj)
        const {width: w, height: h} = obj

        // const width = 800;
        // const height = 600;

        // 1. Создаём радиальную маску с прозрачностью
        const vignetteMask = `
    <svg width="${w}" height="${w}">
        <radialGradient id="gradient" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-opacity="0"/>
            <stop offset="100%" stop-opacity="1"/>
        </radialGradient>
        <rect x="0" y="0" width="${w}" height="${h}" fill="url(#gradient)"/>
    </svg>`;

        // 2. Обрабатываем маску
        const maskBuffer = await sharp(Buffer.from(vignetteMask))
            .toFormat('png')
            .blur(20) // Размытие краёв виньетки
            .toBuffer();

        // 3. Применяем маску к исходному изображению
        let vignetteImage = await inputImage
            .composite([{
                input: maskBuffer,
                blend: 'dest-in' // Используем альфа-канал маски
            }]).toBuffer();

        vignetteImage = await sharp(vignetteImage)

        vignetteImage = vignetteImage.resize({
            width, height, fit: 'contain', background: {r: 128, g: 200, b: 255, alpha: 0.5}, // Прозрачный фон
        })

        // .toBuffer();

        // 4. Накладываем результат на фоновое изображение
        const inputImageBlur = sharp(await inputImage.toBuffer());
        const resizeImageBlur = inputImageBlur.resize({
            width, height, fit: 'fill'// fit: sharp.fit.cover, // Заполнение с обрезкой
        });
        const imgBackBlur = resizeImageBlur.blur(25);

        console.log(await imgBackBlur.metadata())
        console.log(await vignetteImage.metadata())

        await sharp(await vignetteImage.toBuffer())
            .composite([{
                input: imgBackBlur,
                blend: 'over' // Стандартное наложение с прозрачностью
            }])
            .toFile(outputFilePath);
    } catch (e) {
        console.error(e)
    }
}

// await createVignetteOverlay('img.png', 'out.png', 1920, 1080)