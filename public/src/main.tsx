import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import NewsMaker from './components/NewsMaker.tsx'
import {eventBus, webSocket} from "./utils.ts";
import glob from "./global.ts";

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
    if (text.length) glob.selectedText = text
})

// @ts-ignore
document.addEventListener('onmouseup', () => {
    const text = window.getSelection().toString()
    console.log(text)
    if (text.length) {
        glob.selectedText = text
        // @ts-ignore
        window.selectedText = text
    }
})

async function createMessageSocket() {
    try {
        webSocket({
            host: 'localhost', port: 3000, timeReconnect: 1500,
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