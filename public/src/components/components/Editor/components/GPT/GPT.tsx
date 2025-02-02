import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner";
import React, {useState} from "react";

import {Button, ButtonGroup} from "react-bootstrap";
import global from "../../../../../global.ts";
import {toGPT} from "../../../../utils.ts";


export default function GPT({news, setNews}) {
    const [type, setType] = useState('mistral')

    const onGPT = async (promptCmd: string, isTotal = false) => {

        let textContent: any = isTotal ? news.text : (global.selectedText ?? news.text.trim());

        const text = await toGPT(type, promptCmd, textContent);
        let textGPT = promptCmd && news.textGPT ? news.textGPT?.replace(textContent, text) : (news.textGPT ?? '') + text + '\n\n';
        setNews({...news, textGPT: !news?.textGPT?.length ? news.title + '.\n' + textGPT : textGPT});
        return text ? 0 : 2
    };

    const list = [
        {
            name: '50 слов',
            clb: onGPT,
            arrParam: ['Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов', true]
        },
        {
            name: '30 слов', clb: onGPT,
            arrParam: ['Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов.', true]
        },
        {name: 'Перефразируй', clb: onGPT, arrParam: ['Перефразируй']},
        {
            name: 'СИ', clb: onGPT,
            arrParam: ['Переведи значения в соответствии с Российской системой мер. Ответь очень кратко в виде пересчитаного значения']
        },
        {
            name: 'Аббр. название в текст', clb: onGPT,
            arrParam: ['Все аббревиатуры и названия необходимо представить в виде слов учитывая форму произношения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов']
        },
        {
            name: 'Число в текст', clb: onGPT,
            arrParam: ['Все числа необходимо представить в виде слов учитывая форму произношения и единицы измерения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов']
        },
        {
            name: 'На английский', clb: onGPT,
            arrParam: ['Переведи на английский. Ответ дожен быть в виде требуемого без лишних слов']
        },
    ]

    return <div className="d-flex flex-column w-100 flex-stretch" style={{position: 'relative'}}>
        <ButtonGroup className="mb-1">
            {list.map(({name, clb, arrParam}, idi) => (<ButtonSpinner variant="secondary btn-sm text-truncate" key={idi} onAction={() => {
                // @ts-ignore
                return clb(...arrParam);
            }}>{name}</ButtonSpinner>))}
        </ButtonGroup>
        <div className="d-flex flex-row justify-content-end gap-1 text-nowrap">
            <div><input className="me-1" type="checkbox" checked={type == 'yandex'} onChange={(e) => e.target.checked && setType('yandex')}/>YA
            </div>
            <div><input className="me-1" type="checkbox" checked={type == 'arli'} onChange={(e) => e.target.checked && setType('arli')}/>AR
            </div>
            <div><input className="me-1" type="checkbox" checked={type == 'mistral'} onChange={(e) => e.target.checked && setType('mistral')}/>MY
            </div>
        </div>
        <input type="text" value={news.textAdd ?? ''} onChange={({target}) => setNews({...news, textAdd: target.value})}
               className="rounded border my-1  px-2"
               placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={news.textGPT || ''}
                  onChange={({target}) => setNews({...news, textGPT: target.value})}/>
        <div style={{position: 'absolute', bottom: '6px', left: '6px', opacity: .5}}>Слов: {(news.textGPT?.match(/ /g) || []).length}</div>
    </div>
}