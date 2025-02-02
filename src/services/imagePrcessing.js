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

async function resizeImage(pathFile, outputFilePath, width, height) {
    try {
        const inputImage = sharp(pathFile);
        const inputImageBlur = sharp(await inputImage.toBuffer());
        const resizeImageBlur = inputImageBlur.resize({
            width, height, fit: 'fill'// fit: sharp.fit.cover, // Заполнение с обрезкой
        });

        const obj = await inputImage.metadata();
        console.log(obj)
        const {width: w, height: h} = obj

        const mask = await sharp({
            create: {
                width: w,
                height: h,
                channels: 4,
                background: {r: 0, g: 0, b: 0, alpha: .8}
            }
        }).png().blur(80).toBuffer();


        const imgBackBlur = await resizeImageBlur.blur(25).toBuffer();

        // Создать основное изображение с учётом "contain"
        // const foregroundImage = await inputImage
        //     .resize({
        //         width, height, fit: 'contain', background: {r: 128, g: 200, b: 255, alpha: 0.5}, // Прозрачный фон
        //     })
        //     .toBuffer();

        const foregroundImage2 = await sharp(await inputImage.toBuffer())
            .composite([{
                input: mask,
                blend: 'dest-in'
            }])/*.toFile(outputFilePath)*/.toBuffer();


        // Скомбинировать изображения
        await sharp(imgBackBlur)
            .composite([{input: foregroundImage2, gravity: 'center'}]).normalize().sharpen()
            .toFile(outputFilePath);

        console.log('Изображение успешно обработано и сохранено в', outputFilePath);
    } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
    }
}


const toPng = async ({inputPath, outputPath, arrayBuffer}) => {
    try {
        arrayBuffer = inputPath ? await fsPromises.readFile(inputPath) : arrayBuffer;

        const info = await sharp(arrayBuffer)
            .toFormat('png') // Указываем формат вывода
            .toFile(outputPath);

        console.log('Конвертация завершена:', info);
    } catch (err) {
        console.error('Ошибка при конвертации:', err);
        throw err;
    }
};

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

await createVignetteOverlay('img.png', 'out.png', 1920, 1080)