import React from "react";
import global from "../../../../../global.ts";
import {toGPT} from "../../../../utils.ts";
import {ListButton, TOnAction, TArrParam} from "../../../Auxiliary/ListButton/ListButton.tsx";

export default function Text({typeServiceGPT, news, setNews}) {

    const onGPT: TOnAction = async (name, promptCmd, isTotal = false) => {

        let textContent: any = isTotal ? news.text : (global.selectedText ?? news.text.trim());

        const text = await toGPT(typeServiceGPT, promptCmd, textContent);
        let textGPT = promptCmd && news.textGPT ? news.textGPT?.replace(textContent, text) : (news.textGPT ?? '') + text + '\n\n';
        setNews({...news, textGPT: !news?.textGPT?.length ? news.title + '.\n' + textGPT : textGPT});
        return text ? 0 : 2
    };

    const arrPrompt: TArrParam = [
        ['50 слов', 'Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов', true],
        ['30 слов', 'Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов.', true],
        ['Перефразируй', 'Перефразируй'],
        ['СИ', 'Переведи значения в соответствии с Российской системой мер. Ответь очень кратко в виде пересчитаного значения'],
        ['Аббр. название в текст', 'Все аббревиатуры и названия необходимо представить в виде слов учитывая форму произношения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов'],
        ['Число в текст', 'Все числа необходимо представить в виде слов учитывая форму произношения и единицы измерения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов'],
        ['На английский', 'Переведи на английский. Ответ дожен быть в виде требуемого без лишних слов'],
    ]

    return <div className="d-flex flex-column flex-stretch" style={{position: 'relative'}}>
        <ListButton arrParam={arrPrompt} onAction={onGPT}/>
        <input type="text" value={news.textAdd ?? ''} onChange={({target}) => setNews({...news, textAdd: target.value})}
               className="rounded border my-1  px-2"
               placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={news.textGPT || ''}
                  onChange={({target}) => setNews({...news, textGPT: target.value})}/>
        <div style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            opacity: .5
        }}>Слов: {(news.textGPT?.match(/ /g) || []).length}</div>
    </div>
}