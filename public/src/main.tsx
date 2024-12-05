import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import Editor from './components/editor'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <Editor/>
  // </StrictMode>,
)
