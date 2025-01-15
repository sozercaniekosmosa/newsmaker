//import global from "../global.js";
import {formatDateTime, pathResolveRoot, saveTextToFile} from "../utils.js";
import {execFile} from "child_process";
import express from "express";

const routerGeneral = express.Router();

routerGeneral.post('/open-dir', async (req, res) => {

    try {
        const {body: {id}} = req;
        let folderPath;

        if (id) {
            const news = global.dbNews.getByID(id);
            folderPath = pathResolveRoot(`./public/public/${news.pathSrc}/`);
        } else {
            const {arrTask, title, date, srcImg} = global.dbTask.getByID('config')
            folderPath = pathResolveRoot(`./public/public/done/` + formatDateTime(new Date(date), 'yy-mm-dd_hh_MM_ss' + '/'));
        }

        try {
            execFile('explorer.exe', [folderPath], {stdio: 'ignore'});
            console.log('Папка открыта в проводнике');
        } catch (error) {
            console.error(`Ошибка при открытии папки: ${error}`);
        }


        res.send('ok');
    } catch (error) {
        console.log(error)
        res.status(error.status || 500).send({error: error?.message || error},);
    }


});
routerGeneral.post('/save-text', async (req, res) => {
    try {
        const {body: {path, data}} = req;
        let filePath = `./public/public/${path}`
        await saveTextToFile(filePath, data)
        res.status(200).send('ok');
    } catch (e) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
})

export default routerGeneral;