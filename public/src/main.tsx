import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import NewsMaker from './components/NewsMaker.tsx'
import {eventBus, webSocket} from "./utils.ts";
import glob from "./global.ts";

glob.host = 'http://localhost:5173/'
glob.hostAPI = 'http://localhost:5173/api/v1/'
glob.wsHost = 'localhost'
glob.wsPort = '3000'

let nodeRoot = document.getElementById('root');
createRoot(nodeRoot!).render(
    // <StrictMode>
    <NewsMaker/>
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
                eventBus.dispatchEvent('connect-to-srv')
            },
            clbMessage: ({data: mess}) => {
                // console.log("Получены данные: " + mess);
                const {type, data} = JSON.parse(mess);
                eventBus.dispatchEvent('message-socket', {type, data})
            }
        })
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        // setTimeout(() => messageSocket(nui), 2000);
    }
}

await createMessageSocket();