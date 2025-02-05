import "./style.css"
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {eventBus, formatDateTime, getRandomRange} from "../../../../utils.ts";

let count = 0

function truncateString(str, num) {
    return str.length > num ? str.slice(0, num) + "..." : str;
}

const PopupMessage = () => {

    const [arrMess, setArrMess] = useState([])
    const refPopup = useRef(null);

    useEffect(() => {

        const addMessage = (e) => {
            const type = e?.type ?? 'log';
            const mess = `${count++}: ${e?.data}`;
            if (!mess) return;
            let color: string[] = ['#fff', '#000'];
            if (type == 'ok') color = ['#b8ff72', '#000']
            if (type == 'warn') color = ['#ffd000', '#000']
            if (type == 'err') color = ['#cc0000', '#ffffff']
            setArrMess(arr => {
                return [...arr, [type, Date.now(), mess, ...color]];
            })
        };

        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type === 'popup-message') {
                if (!data) return;
                addMessage({data})
                console.log(data)
            }
        })

        eventBus.addEventListener('popup-message', addMessage)


        // const loop2 = () => {
        //     eventBus.dispatchEvent('popup-message', {
        //         data: formatDateTime(new Date(Date.now())),
        //         type: ([null, 'warn', 'err'])[getRandomRange(0, 2, 0)]
        //     })
        //     setTimeout(loop2, 1000 * Math.random())
        // }
        // loop2();

        const timing = {
            ok: 3000,
            err: 4000,
            warn: 3000,
            log: 2500,
        }

        const loop = () => {
            setArrMess(arr => {
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i][1] + timing[arr[i][0]] < Date.now()) {
                        arr.splice(i, 1);
                        arr = [...arr];
                    }
                }
                return arr;
            })
            setTimeout(loop, 100)
        }
        loop();

    }, []);

    useEffect(() => {
        setTimeout(() => {
            const arr = [...refPopup.current.querySelectorAll('.fade-in')];
            for (let i = 0; i < arr.length; i++) {
                arr[i].classList.add('visible');
            }
        }, 100)
    }, [arrMess]);

    // @ts-ignore
    return <div style={{position: 'absolute', top: 0, right: 0, height: '100vh', /*width: '20vw'*/}} ref={refPopup}>
        {arrMess.map(([type, data, mess, back, color], idi) => {
            return <div className="me-1 mt-1 p-1 border rounded fade-in" style={{backgroundColor: back, color}}
                        key={idi}>{truncateString(mess, 100)}</div>;
        })}
    </div>;
}

const OK = (mess) => eventBus.dispatchEvent('popup-message', {data: mess, type: 'ok'})
const LOG = (mess) => eventBus.dispatchEvent('popup-message', {data: mess, type: 'log'})
const ERR = (mess) => eventBus.dispatchEvent('popup-message', {data: mess, type: 'err'})
const WARN = (mess) => eventBus.dispatchEvent('popup-message', {data: mess, type: 'warn'})

export {PopupMessage, OK, LOG, ERR, WARN};