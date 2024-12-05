import fs, {promises as fsPromises} from 'fs'
import PATH from "path";
import {WebSocketServer} from "ws";
import {spawn} from "child_process";
import {resolve} from "path";
import * as console from "node:console";
import sharp from "sharp";
import * as util from "node:util";

const base64Language = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toShortString = (value, language = base64Language) => {
    const len = language.length;
    let acc = "";
    while (value > 0) {
        const index = value % len;
        acc += language.charAt(index);
        value /= len;
    }
    return acc.split('').reverse().join('').replace(/^0+/g, '');
};
let __id = 0;
export const generateUID = (pre = '') => pre + toShortString((new Date().getTime()) + Math.ceil(Math.random() * 100) + (__id++))

export const getHashCyrb53 = function (str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export const getHashCyrb53Arr = function (arr, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < arr.length; i++) {
        ch = arr[i];
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

let revokes = new WeakMap();

export const removeProxy = function (obj) {
    let [originalObj, revoke] = revokes.get(obj);
    revoke();
    return originalObj;
}

export const onProxy = function (obj, clb) {
    const makeHandler = (path = '') => ({
        get(target, key) {
            return typeof target[key] === 'object' && target[key] !== null ? new Proxy(target[key], makeHandler(path + (Array.isArray(target) ? `[${key}]` : '.' + key))) : Reflect.get(...arguments);
            // return Reflect.get(...arguments);
        }, set(target, key, val) {
            if (target[key] === val) return false;
            clb && clb(target, key, val, path);
            return Reflect.set(...arguments);
        }
    });

    let {proxy, revoke} = Proxy.revocable(obj, makeHandler());
    revokes.set(proxy, [obj, revoke]);
    return proxy;
}

export const isEmpty = obj => Object.keys(obj).length === 0;

export const meval = function (js, scope) {
    return new Function(`with (this) { return (${js}); }`).call(scope);
}

export const getID = (host, port = '', tid, ccid = '') => `${host}:${port}${tid ?? ''}${ccid ?? ''}`;

export const DataEvents = class {
    TYPE_ROOT = 'r'
    TYPE_INIT = 'i'
    TYPE_ASSIGN = '='
    TYPE_OBJ_ASSIGN = '*'
    TYPE_ADD = '+'
    TYPE_REMOVE = '-'
    TYPE_ERROR = '!'
    TYPE_WAIT = 'w'

    data = {};
    arrChange = [];
    eventEmitter;

    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;

        //TODO: изменения по времени и по объему
        const loop = () => {
            if (this.arrChange.length) {
                this.eventEmitter && this.eventEmitter.emit('data-changed', this.arrChange);
                this.arrChange = [];
            }
            setTimeout(loop, 1000);
            // setTimeout(loop, 0);
        }
        loop();
    }

    isTypeDiff = (a, b) => !!(Array.isArray(a) ^ Array.isArray(b))
    isTypeArrBoth = (a, b) => Array.isArray(a) && Array.isArray(b)
    addChange = (type, path, val) => this.arrChange.push([type, val, path]);

    getData(dataSet) {
        if (dataSet) this.data = dataSet; else return this.data;
    }

    mergeData(path = '', src, greedy = false, concat = false) {

        let dest = this.data;

        if (typeof dest !== 'object') throw 'dest is not an object!';

        let pathArr = [], key;

        if (path.length) {
            pathArr = path.split('.');
            key = pathArr[pathArr.length - 1];
            for (let i = 0; i < pathArr.length - 1; i++) {
                const k = pathArr[i];
                dest = dest?.[k] ? dest[k] : Number.isInteger(+k) ? (dest[k] = []) : (dest[k] = {});
            }
        }

        if (typeof src !== 'object') {// изменение значения
            dest[key] = src;
            this.addChange(this.TYPE_ASSIGN, path, src);
        } else if (concat && this.isTypeArrBoth(dest[key], src)) {// объединение массивов
            dest[key] = [...dest[key], ...src];
            this.addChange(this.TYPE_ADD, path, src);
        } else if (this.isTypeDiff(dest[key], src)) {// изменение значения
            dest[key] = src;
            const type = typeof src === 'object' ? this.TYPE_OBJ_ASSIGN : this.TYPE_ASSIGN;
            this.addChange(type, path, JSON.parse(JSON.stringify(src)));
        } else {
            this.#merge(dest[key] ?? dest, src, greedy, concat, pathArr);
        }
    }

    #merge(dest, src, greedy = false, concat = false, pathArr = []) {
        const arrKeySrc = Object.keys(src);
        greedy && Object.keys(dest).forEach(key => {// удаление
            if (!arrKeySrc.includes(key)) {
                delete dest[key];
                this.addChange(this.TYPE_REMOVE, pathArr.join('.'));
            }
        });

        for (const key of arrKeySrc) {
            const [valSrc, valDest] = [src[key], dest[key]];
            pathArr.push(key);

            if (valSrc === null) continue;


            if (valDest === undefined) {// добавление
                dest[key] = valSrc;
                this.addChange(this.TYPE_ASSIGN, pathArr.join('.'), dest[key]);
            } else if (this.isTypeDiff(valDest, valSrc)) {// замена
                dest[key] = valSrc;
                const type = typeof src === 'object' ? this.TYPE_OBJ_ASSIGN : this.TYPE_ASSIGN;
                this.addChange(type, pathArr.join('.'), dest[key]);
            } else if (concat && this.isTypeArrBoth(valDest, valSrc)) {// массивы объеденены
                dest[key] = [...dest[key], ...valSrc];
                this.addChange(this.TYPE_ADD, pathArr.join('.'), dest[key]);
            } else if (typeof valSrc === 'object') {
                this.#merge(valDest, valSrc, greedy, concat, pathArr);
            } else if (valDest !== valSrc) {// изменено значение
                dest[key] = valSrc;
                this.addChange(this.TYPE_ASSIGN, pathArr.join('.'), dest[key]);
                pathArr.pop();
            } else {
                pathArr.pop();
            }
        }

        pathArr.pop();
    }

    #createObjectDimension = (obj, pathArr) => {
        let key = pathArr.pop();
        pathArr.forEach(key => obj = obj?.[key] ? obj[key] : Number.isInteger(+key) ? (obj[key] = []) : (obj[key] = {}))
        return {obj, key};
    }

    applyData(key = '', data, isRoot) {
        const tmpKey = isRoot ? '' : (key.length ? key + '.' : key);
        data.forEach(([type, val, path], i) => {
            if (type === this.TYPE_ROOT) {
                this.data = val;
                this.eventEmitter.emit(key, data[i]);
            } else if (type === this.TYPE_INIT) {
                this.data[key] ??= [];
                const index = path ? path : i; // если будет путь(всегда один индекс) тогда используем его

                this.data[key][index] = val;
                this.eventEmitter.emit(key, data[index]);
            } else if (type === this.TYPE_ERROR) {
                this.eventEmitter.emit(key, [...data[i]]);
            } else if (type === this.TYPE_WAIT) {
                this.eventEmitter.emit(key, [...data[i]]);
            } else {
                const {obj, key: keySrc} = this.#createObjectDimension(this.data, (tmpKey + path).split('.'));
                obj[keySrc] = val;
                this.addChange(type, tmpKey + path, val);
                this.eventEmitter.emit(key, [...data[i], obj, keySrc]);
            }
            // this.eventEmitter.emit(key, data[i]);//TODO: тут наверное нужно будет для ускорения сделать на прямую без системы событий
        });
        // this.eventEmitter.emit(key, data);//оптимизировал тк задвоение цикла нахер!!!
    }

    filterApply(arrChanged, arrFilter) {
        if (!arrFilter) return arrChanged ? arrChanged : [[this.TYPE_ROOT, this.data]]; // полная cdata
        let tmpArr = [];
        if (arrChanged) {// частички
            arrChanged.forEach(([type, val, path]) => path && arrFilter.forEach((src, j) => path.includes(src) && tmpArr.push([type, val, j + path.substring(src.length)])))
            return tmpArr.length ? tmpArr : undefined;
        }
        arrFilter.forEach(it => {// инициализация
            let d = this.data;
            it.split('.').forEach(k => d = d?.[k]);
            if (d !== undefined) tmpArr.push([this.TYPE_INIT, d]);
        })
        return tmpArr;
    }

    onData(eventName, {clbInit, clbAssign, clbAdd, clbRemove, clbObjAssign, clbError, clbWait}) {
        this.eventEmitter.on(eventName, ([type, val, path, obj, key]) => {//TODO: и тут возможно нужно будет для ускорения сделать напрямую без системы событий
            switch (type) {
                case this.TYPE_ROOT:
                    clbInit && clbInit(val);
                    break;
                case this.TYPE_INIT:
                    clbInit && clbInit(val);
                    break;
                case this.TYPE_ASSIGN:
                    clbAssign && clbAssign(val, path, obj, key);
                    break;
                case this.TYPE_OBJ_ASSIGN:
                    clbObjAssign && clbObjAssign(val, path, obj, key);
                    break;
                case this.TYPE_ADD:
                    clbAdd && clbAdd(val, path, obj, key);
                    break;
                case this.TYPE_REMOVE:
                    clbRemove && clbRemove(val, path, obj, key);
                    break;
                case this.TYPE_ERROR:
                    clbError && clbError(val);
                    break;
                case this.TYPE_WAIT:
                    clbWait && clbWait(val);
                    break;
            }
        });
    }
}

export const getObjectByPath = (obj, pathArr) => {
    for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        if (obj?.[k]) {
            obj = obj[k];
        } else {
            return undefined;
        }
    }
    return {obj, key: pathArr[pathArr.length - 1]};
}

export const createObjectDimension = (obj, pathArr) => {
    for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        obj = obj?.[k] ? obj[k] : Number.isInteger(+k) ? (obj[k] = []) : (obj[k] = {});
    }
    return {obj, key: pathArr[pathArr.length - 1]};
}

export const isFunction = functionToCheck => functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

export const formatDateTime = (date = new Date(), dateTimeFormat = 'dd.mm.yyyy hh:MM:ss') => {

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = date.getFullYear();
    const syear = year % 100;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formatMap = {
        'dd': day, 'mm': month, 'yyyy': year, 'yy': syear, 'hh': hours, 'MM': minutes, 'ss': seconds
    };

    return dateTimeFormat.replace(/dd|mm|yyyy|yy|hh|MM|ss/g, match => formatMap[match]);
}

export const addYear = (y) => new Date(new Date().setFullYear(new Date().getFullYear() + y));
export const addMonth = (m) => new Date(new Date().setMonth(new Date().getMonth() + m));
export const addDay = (d, date) => {
    date = date ?? new Date;
    return new Date(date.setDate((date.getDate() + d)));
};
export const addHour = (h) => new Date(new Date().setHours(new Date().getHours() + h));
export const addMinute = (m) => new Date(new Date().setMinutes(new Date().getMinutes() + m));
export const addSecond = (s) => new Date(new Date().setSeconds(new Date().getSeconds() + s));

const addZero = (numb) => numb < 10 ? '0' + numb : numb

export const formatTime = (date) => {
    let hh = addZero(date.getHours());
    let min = addZero(date.getMinutes());
    let ss = addZero(date.getSeconds());
    let fff = date.getMilliseconds();

    return `${hh}:${min}:${ss}${fff !== 0 ? '.' + fff : ''}`;
}

export const formatDate = (date) => {
    let dd = addZero(date.getDate());
    let mm = addZero(date.getMonth() + 1);
    let yyyy = date.getFullYear();

    return `${dd}.${mm}.${yyyy}`;
}


export const getRandomRange = (min, max, fix = 2) => {
    return (Math.random() * (max - min) + min).toFixed(fix);
}


export const readFileAsync = async (path, options) => {
    try {
        const data = await fsPromises.readFile(path, options);
        return data;
    } catch (err) {
        throw 'Ошибка чтения файла: ' + path
    }
};

export const writeFileAsync = async (filePath, data) => {
    try {

        const dir = PATH.dirname(filePath)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
        await fsPromises.writeFile(filePath, data);
    } catch (err) {
        throw 'Ошибка записи файла: ' + filePath
    }
};


export async function getDirectories(srcPath) {
    const files = await fsPromises.readdir(srcPath);
    const directories = [];
    try {
        for (const file of files) {
            const filePath = PATH.join(srcPath, file);
            const stat = await fsPromises.stat(filePath);
            if (stat.isDirectory()) {
                directories.push(file);
            }
        }
    } catch (error) {
        console.error(`Ошибка при получении директорий ${srcPath}: ${error.message}`);
    }
    return directories;
}

export async function getDataFromArrayPath(arrPaths) {
    const filesContent = [];

    for (const p of arrPaths) {
        try {
            const stat = await fsPromises.stat(p);
            if (stat.isFile()) {
                const content = await readFileAsync(p, 'utf-8'); // Чтение содержимого файла
                filesContent.push({path: p, content}); // Сохраняем путь и содержимое
            } else if (stat.isDirectory()) {
                // Если это директория, получаем все файлы внутри
                const dirFiles = await fsPromises.readdir(p);
                const fullPaths = dirFiles.map(file => PATH.join(p, file));
                const nestedContent = await getDataFromArrayPath(fullPaths); // Рекурсивно получаем содержимое файлов из поддиректорий
                filesContent.push(...nestedContent);
            }
        } catch (error) {
            console.error(`Ошибка при обработке пути ${p}: ${error.message}`);
        }
    }

    return filesContent;
}

export class WEBSocket {
    arrSubscriber = [];
    activeConnections = [];

    constructor(webServer, {clbAddConnection = null, clbMessage = null, clbClose = null}) {

        const wss = new WebSocketServer({server: webServer})

        wss.on('connection', (ws, req) => {// Слушатель для новых подключений WebSocket

            console.log('Соединение открыто');

            this.activeConnections.push(ws);
            clbAddConnection && clbAddConnection({ws, arrActiveConnection: this.activeConnections});
            this.arrSubscriber.forEach(clbSub => clbSub({type: 'connection', ws, arrActiveConnection: this.activeConnections}));

            ws.on('message', (mess) => { // Слушатель для входящих сообщений
                try {
                    let host = req.socket.remoteAddress;
                    if (host === '::1') host = 'localhost';

                    clbMessage && clbMessage({ws, arrActiveConnection: this.activeConnections, mess, host})
                    this.arrSubscriber.forEach(clbSub => clbSub({
                        type: 'message', ws, arrActiveConnection: this.activeConnections, mess, host
                    }));

                    console.log(mess)
                    // setTimeout(() =>ws.terminate(), 6000)
                } catch (e) {
                    ws.send(e);
                    console.log(e)
                }
            });
            ws.on('close', () => { // Слушатель для закрытия соединения
                const index = this.activeConnections.indexOf(ws);
                if (index !== -1) {
                    this.activeConnections.splice(index, 1);
                }
                clbClose && clbClose({ws, arrActiveConnection: this.activeConnections})
                this.arrSubscriber.forEach(clbSub => clbSub({type: 'close', ws, arrActiveConnection: this.activeConnections}));
                console.log('Соединение закрыто');
            });
        });
    }

    send = (mess) => this.activeConnections.forEach(ws => ws.send(JSON.stringify(mess)))
    getActiveConnections = () => this.activeConnections;
    subscribe = (clb) => {
        this.arrSubscriber.push(clb)
    }
}

/**
 * Wrapper для функции (clb), которая будет вызвана не раньше чем через ms мс. после
 * последнего вызова если в момент тишины с момента последнего вызова будет произведен
 * еще вызов то реальный вызов будет не раньше чем через ms мс. после него
 * @param clb
 * @param ms
 * @returns {(function(): void)|*}
 */
export const debounce = (func, ms) => {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), ms);
    };
};

/**
 * Wrapper для функции (clb), которую нельзя вызвать чаще чем tm
 * @param clb
 * @param ms
 * @returns {(function(...[*]): void)|*}
 */
export const throttle = (clb, ms) => {

    let isThrottled = false, savedArgs, savedThis;

    function wrapper(...arg) {

        if (isThrottled) { // (2)
            savedArgs = arguments;
            savedThis = this;
            return;
        }

        clb.apply(this, arguments); // (1)

        isThrottled = true;

        setTimeout(function () {
            isThrottled = false; // (3)
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, ms);
    }

    return wrapper;
}

const pathRoot = process.cwd();
export const pathResolveRoot = (path) => path.startsWith('.') ? resolve(pathRoot, ...path.split(/\\|\//)) : path;

export const readData = async (path, options) => {
    try {
        const data = await readFileAsync(path, options);
        return data;
    } catch (error) {
        throw error;
    }
};
export const writeData = (path, data) => {
    try {
        writeFileAsync(pathResolveRoot(path), data);
    } catch (error) {
        throw error;
    }
};

export async function checkFileExists(filePath) {
    try {
        await fsPromises.access(filePath);
        console.log(`Файл ${filePath} существует.`);
        return true;
    } catch (error) {
        console.log(`Файл ${filePath} не существует.`);
        return false;
    }
}

export async function saveTextToFile(filePath, text) {
    try {
        // Получаем директорию из пути
        const dir = PATH.dirname(filePath);

        // Проверяем, существует ли директория, если нет - создаем
        await fsPromises.mkdir(dir, {recursive: true});

        // Записываем текст в файл
        await fsPromises.writeFile(filePath, text, 'utf8');

        console.log(`Файл успешно сохранен по пути: ${filePath}`);
    } catch (error) {
        console.error('Ошибка при сохранении файла:', error);
    }
}

export const asyncDelay = ms => new Promise(res => setTimeout(res, ms));

export const isCorrectString = (str) => /^[0-9a-zA-Zа-яА-Я\s\w\!@#$%^&*(),.?":{}|<>;'\[\]\\`~\-+=\/«»—–]+$/.test(str);

export const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// Промисификация fs.readdir
const readdir = util.promisify(fs.readdir);
// Промисификация fs.stat
const stat = util.promisify(fs.stat);

export const findExtFiles = async (directory, ext = 'png') => {
    let files = [];

    async function traverseDirectory(currentPath) {
        const items = await readdir(currentPath);

        for (const item of items) {
            const itemPath = PATH.join(currentPath, item);
            const itemStats = await stat(itemPath);

            if (itemStats.isDirectory()) {
                await traverseDirectory(itemPath);
            } else if (itemStats.isFile() && PATH.extname(itemPath) === '.' + ext) {
                files.push(itemPath);
            }
        }
    }

    await traverseDirectory(directory);
    return files;
};

export class CreateVideo {
    arrEff = ['fade', 'fadeblack', 'fadewhite', 'distance', 'wipeleft', 'wiperight', 'wipeup', 'wipedown', 'slideleft', 'slideright', 'slideup', 'slidedown', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'rectcrop', 'circleclose', 'circleopen', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'hlslice', 'hrslice', 'vuslice', 'vdslice', 'dissolve', 'pixelize', 'radial', 'hblur', 'wipetl', 'wipetr', 'wipebl', 'wipebr', 'fadegrays', 'squeezev', 'squeezeh', 'zoomin', 'hlwind', 'hrwind', 'vuwind', 'vdwind', 'coverleft', 'coverright', 'coverup', 'coverdown', 'revealleft', 'revealright', 'revealup', 'revealdown']

    dir_ffmpeg;
    dir_content;

    constructor({dir_ffmpeg, dir_content}) {
        if (dir_ffmpeg) this.dir_ffmpeg = pathResolveRoot(dir_ffmpeg) + '\\'
        if (dir_content) this.dir_content = pathResolveRoot(dir_content) + '\\'

        // this.execCmd('mkdir ' + this.dir_content + this.dir_tmp)
    }

    secondsToTime(seconds) {
        return new Date(seconds * 1000).toISOString().slice(11, 22);
    }

    async addSubtitles({
                           pathSubtitles, pathVideo, duration, timespan = 2,
                       }) {

        let text = await fsPromises.readFile(this.dir_content + pathSubtitles, 'utf8');

        let tmptext = text.replaceAll(/[\r\n]/g, ' ')
        tmptext = tmptext.replaceAll(/\s\s/g, ' ')

        const len = tmptext.length;
        const cs = duration / len;
        const minSplitLen = Math.trunc(len / (duration / timespan))

        let arrRes = [];
        while (1) {
            const si = tmptext.lastIndexOf(' ', minSplitLen);
            if (si === -1) break;
            const it = tmptext.slice(0, si)
            tmptext = tmptext.slice(tmptext.lastIndexOf(' ', minSplitLen)).trim()
            arrRes.push(it);
        }
        arrRes.push(tmptext);


        let acc = `
            [Script Info]
            ; Script generated by FFmpeg/Lavc59.18.100
            ScriptType: v4.00+
            ;PlayResX: 384
            ;PlayResY: 288
            ScaledBorderAndShadow: yes
            
            [V4+ Styles]
            Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
            Style: Default,Arial,16,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,0
            
            [Events]
            Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
            `;
        if (arrRes.length === 0) return;
        let tm = 0, _tm = 0, lastIndex = arrRes.length - 1;
        arrRes = arrRes.map((it, i) => {
            tm += it.length * cs
            if (lastIndex === i) tm += 1;
            const r = `Dialogue: 0,${this.secondsToTime(_tm)},${this.secondsToTime(tm)},Default,,0,0,0,,${it}`;
            _tm = tm;
            return r;
        })

        acc += arrRes.join('\n')

        await fsPromises.writeFile('./subtitle.ass', acc);

        await this.execCmd('ren ' + this.dir_content + pathVideo + ' _' + pathVideo);

        const cmdAddSub = `${this.dir_ffmpeg}ffmpeg.exe -y -i ${this.dir_content}${'_' + pathVideo} -vf ass=subtitle.ass ${this.dir_content}${pathVideo}`;
        await this.execCmd(cmdAddSub);

        await this.execCmd('del ' + this.dir_content + '_' + pathVideo);

        console.log(`add sub: ${pathVideo} (${duration} sec)`)
    }

    async imageToVideo({arrPathImg, numImg, transDur = .3, duration, pathOut = 'out.mp4', indexEff = 0, arrEff}) {
        arrEff = arrEff ?? this.arrEff;
        // if (numImages === 0) throw 'Minimum two images required';

        if (arrPathImg !== undefined) numImg = arrPathImg.length;

        let cmdVideoSeq = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto `;

        const imgDur = (+duration + numImg * +transDur) / numImg;
        // const n = '\n'
        const n = ''

        if (arrPathImg !== undefined) {
            cmdVideoSeq += arrPathImg.map((it) => `-loop 1 -t ${imgDur.toFixed(2)} -i ${this.setDir(it)}`).join(' ');
        } else {
            cmdVideoSeq += Array(numImg).fill('').map((it, i) => `-loop 1 -t ${imgDur.toFixed(2)} -i ${this.dir_content}${i}.png`).join(' ');
        }

        cmdVideoSeq += ' -filter_complex "' + n;
        cmdVideoSeq += `[0][1]xfade=transition=${arrEff[indexEff]}:duration=${transDur}:offset=${imgDur - transDur}[f0];` + n;
        for (let i = 1; i < numImg - 1; i++) {
            let off = ((i + 1) * (imgDur - transDur)).toFixed(2);
            off = i + 2 >= numImg ? off - 1 : off
            cmdVideoSeq += `[f${i - 1}][${i + 1}]xfade=transition=${arrEff[(i + indexEff) % arrEff.length]}:duration=${transDur}:offset=${off}[f${i}];` + n;
        }
        cmdVideoSeq += `[f${numImg - 2}]scale=1920:1080[vout]" -map "[vout]" -pix_fmt yuv420p `;
        cmdVideoSeq += this.setDir(pathOut);

        await this.execCmd(cmdVideoSeq);

        await this.fitVideoTime({duration, pathVideo: pathOut})

        console.log(`img->video: ${pathOut} (${duration} sec)`)
    }

    async getDuration(pathVideoAudio) {
        const cmdGetDurAudio = `${this.dir_ffmpeg}ffprobe.exe -i ${this.setDir(pathVideoAudio)} -show_entries format=duration -v quiet -of csv="p=0"`
        const dur = await this.execCmd(cmdGetDurAudio);
        console.log(`duration: ${pathVideoAudio} (${dur} sec)`)
        return dur;
    }

    async fitVideoTime({duration, pathVideo, pathOut = pathVideo}) {
        const cmdGetDur = `${this.dir_ffmpeg}ffprobe.exe -i ${this.setDir(pathVideo)} -show_entries format=duration -v quiet -of csv="p=0"`
        const currDur = await this.execCmd(cmdGetDur)
        const cmdFitTime = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -filter:v "setpts=${duration}/${currDur}*PTS" ${this.setDir(pathOut, pathOut === pathVideo ? '_' : '')}`
        await this.execCmd(cmdFitTime)

        if (pathOut === pathVideo) await this.dry(pathVideo);

        console.log(`fit: ${pathVideo} (${duration} sec)`)
    }

    async joinVideoAudio({pathVideo, pathAudio, pathVideoOut = pathVideo, replace = true}) {

        let cmdJoinVideoAudio;
        if (replace) cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -i ${this.setDir(pathAudio)} -c:v copy -c:a copy ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`; else cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -stream_loop -1 -i ${this.setDir(pathAudio)} -filter_complex "[0:a]volume=.5[a0];[1:a]volume=.5[a1];[a0][a1]amerge=inputs=2[a];" -map 0:v -map "[a]" -c:v copy -c:a aac -ac 2 ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;
        // cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -stream_loop -1 -i ${this.setDir(pathAudio)} -filter_complex "[0:a]volume=.1[a0];[1:a]volume=.1[a1];[a0][a1]amerge=inputs=2[a];[a]dynaudnorm[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -ac 2 ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;
        // cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -stream_loop -1 -i ${this.setDir(pathAudio)} -filter_complex "[0:a][1:a]amerge=inputs=2[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -ac 2 ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;
        // cmdJoinVideoAudio = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -i ${this.setDir(pathAudio)} -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" -c:v copy -c:a aac -b:a 192k ${this.setDir(pathVideo, pathVideoOut === pathVideo ? '_' : '')}`;
        await this.execCmd(cmdJoinVideoAudio);

        if (pathVideoOut === pathVideo) await this.dry(pathVideo)

        console.log(`join: ${pathVideo}+${pathAudio}`)
    }

    async addAudioToAudio({pathAudioSrc, pathAudioAdded, pathAudioOut = pathAudioSrc}) {

        const cmdJoinAudioPair = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathAudioSrc)} -i ${this.setDir(pathAudioAdded)} -filter_complex "[0:a][1:a]concat=n=2:a=1:v=0[a]" -map "[a]" ${this.setDir(pathAudioOut, pathAudioOut === pathAudioSrc ? '_' : '')}`
        await this.execCmd(cmdJoinAudioPair);

        if (pathAudioOut === pathAudioSrc) await this.dry(pathAudioSrc)

        console.log(`add audio to audio ${pathAudioSrc} + ${pathAudioAdded}`)
    }

    async cropVideo({path, start = 0, duration = 0}) {
        let startParam = start === 0 ? '' : '-ss ' + start;
        const cmdJoinAudioPair = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(path)} ${startParam} -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -avoid_negative_ts make_zero ${this.setDir(path, '_')}`
        await this.execCmd(cmdJoinAudioPair);
        await this.dry(path)

        console.log(`crop file: ${path}`)
    }

    async cropAudio({path, start = 0, duration = 0}) {
        let startParam = start === 0 ? '' : '-ss ' + start;
        const cmdJoinAudioPair = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(path)} ${startParam} -t ${duration} -c copy -avoid_negative_ts make_zero ${this.setDir(path, '_')}`
        await this.execCmd(cmdJoinAudioPair);
        await this.dry(path)

        console.log(`crop file: ${path}`)
    }

    async changeVolume({pathFile, volume = 1, pathOut = pathFile}) {
        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathFile)} -af "volume=${volume}" -c:v copy ${this.setDir(pathOut, pathOut === pathFile ? '_' : '')}`
        await this.execCmd(cmd);
        if (pathOut === pathFile) await this.dry(pathFile)

        console.log(`change volume: ${pathFile}+${pathFile}`)
    }

    async concatVideo({arrPathVideo, pathOut = 'out.mp4', isExistAudio = true}) {
        const listInVideo = arrPathVideo.map(it => `-i ${this.setDir(it)}`).join(' ')
        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto ${listInVideo} -filter_complex "concat=n=${arrPathVideo.length}:v=1:a=${isExistAudio ? 1 : 0}" -vn ${this.setDir(pathOut)}`

        await this.execCmd(cmd);
        console.log(`concat video: ${arrPathVideo.join(', ')}`)
    }

    async mergeAudio({file1, file2, timing = 0, duration, pathAudioOut = file1}) {
        const delay = timing * 1000;


        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i "${this.setDir(file1)}" -i "${this.setDir(file2)}" -filter_complex "[0:a]adelay=0|0[a0];[1:a]adelay=${delay}|${delay}[a1];[a0][a1]amix=inputs=2:duration=longest[a];[a]atrim=end=${duration}[a_trimmed]" -map "[a_trimmed]" "${this.setDir(pathAudioOut, pathAudioOut === file1 ? '_' : '')}"`;
        await this.execCmd(cmd);

        if (pathAudioOut === file1) await this.dry(file1)

        console.log(`merge video: ${file1} & ${file2} (${timing})`)
    }

    async reverseVideo({pathVideo, pathOut = pathVideo}) {
        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathVideo)} -vf reverse ${this.setDir(pathVideo, pathVideo === pathVideo ? '_' : '')}`;
        await this.execCmd(cmd);

        if (pathVideo === pathOut) await this.dry(pathVideo)

        console.log(`reverse video: ${pathVideo}`)
    }

    async normalizeAudio({pathAudio, pathOut = pathAudio}) {
        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto -i ${this.setDir(pathAudio)} -af "loudnorm=I=-14:TP=-1.0:LRA=11" -ar 44100 -ac 2 -b:a 192k ${this.setDir(pathAudio, pathAudio === pathAudio ? '_' : '')}`;
        await this.execCmd(cmd);

        if (pathAudio === pathOut) await this.dry(pathAudio)

        console.log(`normalize audio: ${pathAudio}`)
    }

    async addImg({pathVideo, pathImg, pathOut = pathVideo, from, to, w = 100, h = 100, x = 'W-w-10', y = 'H-h-10'}) {
        const cmd = `${this.dir_ffmpeg}ffmpeg.exe -y -hwaccel auto \
        -i ${this.setDir(pathVideo)} -i ${this.setDir(pathImg)} \
        -filter_complex "[1:v]scale=${w}:${h}[overlay];[0:v][overlay] overlay=${x}:${y}:${to ? `enable='between(t,${from ?? 0},${to})'` : ''}" \
        -pix_fmt yuv420p -c:a copy ${this.setDir(pathOut, pathOut === pathVideo ? '_' : '')}`;
        await this.execCmd(cmd);

        if (pathVideo === pathOut) await this._dry(pathVideo)

        console.log(`add img to video: ${pathVideo}`)
    }

    execCmd(cmd) {
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, {shell: true,})
            const output = [];
            child.stdout.on('data', chunk => output.push(chunk))
            child.on('close', () => resolve(output.join('').trim()))
            child.on('error', error => reject(error))
        });
    }

    async remove(path) {
        await this.execCmd('del ' + pathResolveRoot(this.setDir(path)));
    }

    async _dry(pathFile) {
        await this.execCmd('del ' + this.setDir(pathFile));
        await this.execCmd('ren ' + this.setDir(pathFile, '_') + ' ' + PATH.basename(pathFile));
    }

    async dry(pathFile) {
        await this.execCmd('del ' + pathResolveRoot(this.setDir(pathFile)));
        await this.execCmd('ren ' + pathResolveRoot(this.setDir(pathFile, '_')) + ' ' + PATH.basename(pathFile));
    }

    setDir(path, pfx = '') {

        let t = 0;
        if (~path.indexOf('\\')) t = 1;
        if (~path.indexOf('/')) t = 2;

        if (t > 0) {
            if (pfx !== '') {
                let a = path.split(/\\|\//)
                a.push('_' + a.pop())
                path = a.join(t === 1 ? '\\' : '/')
            }

            return path;
        } else {
            return this.dir_content + pfx + path;
        }
    }

    async packageResizeImage({numImages, ext = 'jfif', targetWidth, targetHeight, backgroundColor}) {
        for (let i = 0; i < numImages; i++) {
            const pathImg = i + '.';
            await this.resizeImage(pathImg + ext, pathImg + 'png', targetWidth, targetHeight, backgroundColor)
            await this.remove('_' + pathImg + ext)
        }
    }

    async resizeImage(inputFilePath, outputFilePath, targetWidth, targetHeight, backgroundColor) {
        try {
            let outputPng = this.setDir(inputFilePath.split('.').slice(0, -1).join('.') + '.png', '_');
            await this.toPng({inputPath: this.setDir(inputFilePath), outputPath: outputPng})
            let sh = await sharp(this.setDir(outputPng))
            await sh.resize({
                width: targetWidth, height: targetHeight, fit: 'contain', // Сохраняет пропорции, добавляя отступы
                background: backgroundColor // Цвет заполнения
            })
            await sh.toFile(this.setDir(outputFilePath));
            // console.log('Изображение успешно обработано и сохранено в', outputFilePath);
            await this.dry(outputPng)
        } catch (error) {
            console.error('Ошибка при обработке изображения:', error);
        }
    }

    async toPng({inputPath, outputPath, arrayBuffer}) {
        arrayBuffer = inputPath ? await fsPromises.readFile(inputPath) : arrayBuffer;
        return new Promise((resolve, reject) => {
            sharp(arrayBuffer)
                .toFormat('png') // Указываем формат вывода
                .toFile(this.setDir(outputPath), (err, info) => {
                    if (err) {
                        console.error('Ошибка при конвертации:', err);
                        reject();
                        return;
                    }
                    console.log('Конвертация завершена:', info);
                    resolve();
                });
        });
    }
}