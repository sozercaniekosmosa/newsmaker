import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import NewsMaker from './components/NewsMaker.tsx'
import {addDay, eventBus, formatDateTime, getRandomRange, webSocket} from "./utils.ts";
import glob from "./global.ts";
import {Tab, Tabs} from "react-bootstrap";
import DailyReports from "./DailyReports/DailyReports.tsx";
import dataMotorActuator from "./DailyReports/data/DataMotorActuator.json";
import dataGasPollution from "./DailyReports/data/DataGasPollution.json";
import dataMotor from "./DailyReports/data/DataMotor.json";
import dataCompressor_1 from "./DailyReports/data/DataCompressor_1.json";
import dataCompressor_2 from "./DailyReports/data/DataCompressor_2.json";
import dataCompressor_3 from "./DailyReports/data/DataCompressor_3.json";
import dataGas from "./DailyReports/data/DataGas.json";
import dataGasOil from "./DailyReports/data/DataGasOil.json";
import dataAntifreezeDrainage from "./DailyReports/data/DataAntifreezeDrainage.json";
import dataTransportProduct from "./DailyReports/data/DataTransportProduct.json";
import React from "react";
import ReportsAll from "./DailyReports/ReportsAll.tsx";
import {ERR, OK} from "./components/components/Auxiliary/PopupMessage/PopupMessage.tsx";

glob.host = 'http://localhost:5173/'
glob.hostAPI = 'http://localhost:5173/api/v1/'
glob.wsHost = 'localhost'
glob.wsPort = '3000'


// const data = ;
// const backgroundColor =
//     `#${(+getRandomRange(50, 255, 0)).toString(16)}${(+getRandomRange(50, 255, 0)).toString(16)}${(+getRandomRange(50, 255, 0)).toString(16)}40`
// console.log(backgroundColor)
let nodeRoot = document.getElementById('root');
createRoot(nodeRoot!).render(
    // <StrictMode>
    <NewsMaker/>
    // <ReportsAll/>

    // </StrictMode>,
)

nodeRoot.addEventListener('dblclick', () => {
    glob.selectedText = undefined;
})
nodeRoot.addEventListener('mouseup', () => {
    const text = window.getSelection().toString()
    glob.selectedText = text.length ? text.trim() : null;
    // console.log(text)
})

async function createMessageSocket() {
    try {
        webSocket({
            host: glob.wsHost, port: glob.wsPort, timeReconnect: 1500,
            clbOpen: () => {
                eventBus.dispatchEvent('connect-to-srv');
                OK('Связь с сервером восстановлена')
            },
            clbMessage: ({data: mess}) => {
                // console.log("Получены данные: " + mess);
                const {type, data} = JSON.parse(mess);
                eventBus.dispatchEvent('message-socket', {type, data})
            },
            clbError: () => ERR('Нет связи с сервером')
        })
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        // setTimeout(() => messageSocket(nui), 2000);
    }
}

await createMessageSocket();