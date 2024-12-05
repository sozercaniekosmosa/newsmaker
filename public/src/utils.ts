const base64Language = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const toShortString = (value, language = base64Language) => {
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
            return typeof target[key] === 'object' && target[key] !== null
                ? new Proxy(target[key], makeHandler(path + (Array.isArray(target) ? `[${key}]` : '.' + key)))
                : Reflect.get(...arguments);
            // return Reflect.get(...arguments);
        },
        set(target, key, val) {
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
        if (dataSet)
            this.data = dataSet;
        else
            return this.data;
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

export const writeFileAsync = async (path, data) => {
    try {
        await fsPromises.writeFile(path, data);
    } catch (err) {
        throw 'Ошибка записи файла: ' + path
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
 * @param func
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

    let isThrottled = false,
        savedArgs,
        savedThis;

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

export function getSelelected(node): { selectedText: string; startPos: number; endPos: number } { //получить выделенный текст
    let startPos = node.selectionStart;
    let endPos = node.selectionEnd;
    let selectedText = node.value.substring(startPos, endPos);

    if (selectedText.length <= 0) return {selectedText: undefined, startPos, endPos}; // stop here if selection length is <= 0

    // console.log("startPos: " + startPos, " | endPos: " + endPos);
    // console.log("selectedText: " + selectedText);

    return {selectedText, startPos, endPos};
}

export const insertAt = (str, sub, pos) => `${str.slice(0, pos)}${sub}${str.slice(pos)}`;//вставить подстроку в позицию внутри строки