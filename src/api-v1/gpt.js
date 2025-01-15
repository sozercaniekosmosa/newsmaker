//import global from "../global.js";
import express from "express";
import {arliGPT, mistralGPT, yandexGPT, yandexToSpeech} from "../ai.js";

const routerGPT = express.Router();

routerGPT.post('/gpt', async (req, res) => {
    const {body: {id, type, text, prompt}} = req;
    let textGPT = '';
    try {
        switch (type) {
            case 'yandex':
                textGPT = await yandexGPT(prompt, text, res);
                break;
            case 'arli':
                textGPT = await arliGPT(prompt, text, res);
                break;
            case 'mistral':
                textGPT = await mistralGPT(prompt, text, res);
                break;
            default:
                textGPT = await arliGPT(prompt, text, res);
        }
        // global.dbNews.update(id, {textGPT: textGPT});
        res.status(200).send(textGPT);
    } catch (error) {
        console.log(error)
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerGPT.post('/to-speech', async (req, res) => {

    try {
        const {body: {id, text, voice, speed}} = req;

        let news = global.dbNews.getByID(id);
        await yandexToSpeech({text, path: news.pathSrc, voice: voice ?? 'marina', speed: speed ?? 1.4});

        res.send('ok');
    } catch (error) {
        console.log(error)
        res.status(error.status || 500).send({error: error?.message || error},);
    }


});

export default routerGPT;