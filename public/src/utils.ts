export function camelToKebab(camelCaseString: string): string {
    return camelCaseString.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// EventBus.dispatchEvent('evb-key', {event, combine, nodeFocus}))
class EventBus {
    private bus: HTMLElement;

    constructor() {
        this.bus = document.createElement('eventbus');
    }

    addEventListener(event, callback) {
        this.bus.addEventListener(event, e => callback(...e.detail));
    }

    removeEventListener(event, callback) {
        this.bus.removeEventListener(event, callback);
    }

    dispatchEvent(event, ...data) {
        this.bus.dispatchEvent(new CustomEvent(event, {detail: data}));
    }
}

//@ts-ignore
export const eventBus = window.EventBus = new EventBus;

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


export const isEmpty = obj => Object.keys(obj).length === 0;

export const meval = function (js, scope) {
    return new Function(`with (this) { return (${js}); }`).call(scope);
}

export const getID = (host, port = '', tid, ccid = '') => `${host}:${port}${tid ?? ''}${ccid ?? ''}`;

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

export function webSocket(
    {host, port, protocol = 'json', clbOpen = null, clbMessage = null, clbClose = null, clbError = null, timeReconnect = 1000}) {

    let isConnected = false;
    const reconnect = (param) => {
        if (isConnected) return;
        isConnected = true;
        setTimeout(() => {
            isConnected = false;
            console.log('попытка соединения с сервером ...')
            _webSocket(param)
        }, timeReconnect);
    }

    function _webSocket(param) {
        const ws = new WebSocket(`ws://${host}:${port}`, protocol) as WebSocket;


        ws.onopen = () => {
            isConnected = false;
            try {
                if (clbOpen) {
                    const objSend = clbOpen();
                    if (objSend) {
                        ws.send(objSend);
                    }
                }
                console.log('WebSocket соединение открыто')
            } catch (e) {
                // console.log(e)
            }
        };
        ws.onmessage = (message) => {
            try {
                clbMessage && clbMessage(message);
            } catch (e) {
                // console.log(e)
            }
        };

        ws.onclose = (ev) => {
            try {
                clbClose && clbClose(ev);
                console.log('WebSocket соединение закрыто')
                // ws.terminate()
            } catch (e) {
                // console.log(e)
            } finally {
                reconnect(arguments);
            }
        };
        ws.onerror = err => {
            // console.log(err)
            return clbError && clbError(err);
        };

        return ws
    }

    return _webSocket(arguments);
}