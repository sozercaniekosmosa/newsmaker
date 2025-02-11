import natural from 'natural';
import {findExtFiles, getDirAll, removeFile} from "../utils.js";
import {toPng} from "./imagePrcessing.js";
import fs from "fs";

const stemmer = natural.PorterStemmerRu;

function normalize(text) {
    const _text = text.replaceAll(/,/g, '');
    return _text.split(' ').map(word => stemmer.stem(word)).join(' ');
}

export function _findMostSimilar(target, array) {
    const normalizedTarget = normalize(target);
    const normalizedArray = array.map(normalize);

    let bestMatch = '';
    let bestScore = Number.MAX_SAFE_INTEGER;
    let _i = 0;

    normalizedArray.forEach((normSentence, index) => {
        // const score = natural.JaroWinklerDistance(normalizedTarget, normSentence);
        const arrWord = normSentence.split(' ');
        for (let i = 0; i < arrWord.length; i++) {
            const it = arrWord[i];
            const score = natural.LevenshteinDistance(it, normalizedTarget, {
                insertion_cost: 2, deletion_cost: 2, substitution_cost: 2
            });
            if (score < bestScore) {
                bestScore = score;
                _i = i;
                bestMatch = array[index]; // Возвращаем оригинальный вариант
            }
        }
    });

    if (bestScore > 2) {
        return null;
    } else {
        bestMatch.replaceAll(/\, /g, '/')
        return [bestMatch, _i, bestScore];
    }
}

export async function getAllImagesByTags(tags, arrPath) {
    const arr = [];
    const arrTag = tags.split(',').map(str => str.trim());
    for (let i = 0; i < arrTag.length; i++) {
        const tag = arrTag[i];
        const res = findSimilarImageByTag(tag, arrPath)
        if (res && res.length) arr.push(res)
    }
    const pathTagsImg = global.getPathTagsImg()
    const arrPathAll = arr.flat(2).map(it => (pathTagsImg + '\\' + it).replaceAll(/\//g, '\\'));

    const arrPathFull = []
    for (let i = 0; i < arrPathAll.length; i++) {
        const filePath = arrPathAll[i];
        const arrImgUrls = await findExtFiles(filePath, 'png', false);
        arrPathFull.push(arrImgUrls)
    }
    // const arrUrlImg = arrPathFull.flat(2).map(path => path.split('\\').slice(8).join('\\'));
    const arrUrlImg = arrPathFull.flat(2);

    return arrUrlImg;
}

function findSimilarImageByTag(tags, arrPath) {
    const setResTags = new Set();
    for (let i = 0; i < arrPath.length; i++) {
        const arrDir = arrPath[i];
        for (let j = 0; j < arrDir.length; j++) {
            const dir = arrDir[j];
            // if (dir.includes(tags) || tags.includes(dir)) {
            //     const _path = arrDir.slice(0, j + 1).join('/');
            //     setResTags.add(_path)
            // }
            const arr_dir = dir.split(' ').map(str => str.trim())
            for (let k = 0; k < arr_dir.length; k++) {
                const _dir = arr_dir[k];
                // if (dir.includes(tag)) {
                if (tags === _dir) {
                    const _path = arrDir.slice(0, j + 1).join('/');
                    setResTags.add(_path)
                }
            }
        }
    }
    return [...setResTags];
}

export const updateTags = async () => {
    const dir = global.getPathTagsImg();
    let arrDir = await getDirAll(dir);
    if (!global.dbGeneral.getByID('tags')) {
        global.dbGeneral.add('tags', {arr: arrDir, arrToRemove: []})
    } else {
        global.dbGeneral.update({id: 'tags', arr: arrDir})
    }
    const arrToRemove = global.dbGeneral.getByID('tags').arrToRemove;

    try {
        for (let i = 0; i < arrToRemove.length; i++) {
            await removeFile(arrToRemove[i]);
            arrToRemove.splice(i, 1)
        }
    } catch (e) {
        ERR(e)
    }
    global.dbGeneral.update({id: 'tags', arrToRemove})

    const arrImgPath = await findExtFiles(global.getPathTagsImg());
    for (let i = 0; i < arrImgPath.length; i++) {
        const path = arrImgPath[i];
        const isCorrect = /-(\d+)x(\d+)\.png/.test(path);
        if (!isCorrect) {
            try {
                await toPng({inputPath: path, outputFilePath: path})
                await removeFile(path);
            } catch (error) {
                if (error.code === 'EBUSY') {
                    arrToRemove.push(path)
                    global.dbGeneral.update({id: 'tags', arrToRemove})
                }
            }
        }

    }

    console.log(arrImgPath)
};