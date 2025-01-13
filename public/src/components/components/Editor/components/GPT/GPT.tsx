import ButtonSpinner from "../../../ButtonSpinner/ButtonSpinner";
import React, {useState} from "react";
import {getSelelected, insertAt} from "../../../../../utils";
import axios from "axios";
import globals from "globals";
import {Button, ButtonGroup} from "react-bootstrap";
import glob from "../../../../../global.ts";
import {updateNewsDB} from "../../../../utils.ts";

export default function GPT({news, setNews}) {
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')

    const [stateLoadGPT, setStateLoadGPT] = useState({type: '', state: 0});

    async function onGPT(type: string, promptCmd = null) {
        setStateLoadGPT({type, state: 1})

        try {
            let nodeNewsTextContainer = document.querySelector('.news-text');
            const textContent = glob.selectedText ?? nodeNewsTextContainer.textContent;
            const {data: text} = await axios.post(glob.host + 'gpt', {id: news.id, type, text: textContent, prompt: promptCmd ?? prompt});

            if (text.toLocaleLowerCase().includes('в интернете есть много сайтов с информацией на эту')) throw 'ошибка';

            let textGPT = promptCmd ? news.textGPT.replace(textContent, text) : news.textGPT + text + '\n\n';
            setNews({...news, textGPT})

            setStateLoadGPT({type, state: 0})
        } catch (e) {
            console.log(e)
            setStateLoadGPT({type, state: 2})
        }
    }


    return <div className="d-flex flex-column w-100 flex-stretch" style={{position: 'relative'}}>
        <ButtonGroup>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Выдели основные мысли и сократи текст до 30 слов')}>Обобщение</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Перефразируй')}>Перефразируй</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT('mistral', 'число в текст')}>Переведи число в текст</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Сократи текст в два раза')}>Сократи х2</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('перевод на английский')}>На английский</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Выдели основные мысли и на основе них сделай несколько не больше 4 тегов. формат ответа: тег, тег, тег')}>Теги</Button>
        </ButtonGroup>
        <textarea className="form-control me-1 operation__prompt rounded border mb-1 px-2" value={prompt} style={{height: '30px'}}
                  onChange={e => setPrompt(e.target.value)}/>
        <div className="d-flex flex-row w-100 justify-content-end mb-1">
            <ButtonGroup>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'yandex' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('yandex')}>ya-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'arli' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('arli')}>arli-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'mistral' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('mistral')}>mistral-GPT</ButtonSpinner>
            </ButtonGroup>
        </div>
        <input type="text" value={news.textAdd} onChange={({target}) => setNews({...news, textAdd: target.value})}
               className="rounded border my-1  px-2"
               placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={news.textGPT || ''}
                  onChange={({target}) => setNews({...news, textGPT: target.value})}/>
        <div style={{position: 'absolute', bottom: '6px', left: '6px', opacity: .5}}>Слов: {(news.textGPT?.match(/ /g) || []).length}</div>
    </div>
}