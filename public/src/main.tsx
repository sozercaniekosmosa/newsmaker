import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import NewsMaker from './components/NewsMaker.tsx'
import {eventBus, webSocket} from "./utils.ts";

createRoot(document.getElementById('root')!).render(
    // <StrictMode>
    <NewsMaker/>
    // </StrictMode>,
)

async function createMessageSocket() {
    try {
        webSocket({
            host: 'localhost', port: 3000, timeReconnect: 1500,
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