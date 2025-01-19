import React, {useEffect, useState} from "react";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import axios from "axios";
import global from "../../../../../global.ts";
import {toGPT} from "../../../../utils.ts";
import DraggableList from "../../../Auxiliary/DraggableList/DraggableList.tsx";
import {Button} from "react-bootstrap";

function arrMoveItem(arr, fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
        throw new Error('Индексы выходят за пределы массива');
    }

    // Извлекаем элемент из старого индекса
    const element = arr.splice(fromIndex, 1)[0];

    // Вставляем элемент на новый индекс
    arr.splice(toIndex, 0, element);

    return arr;
}

let currID;
export default function Images({news, setNews, arrImg, setArrImg, maxImage}) {
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [stateTagGPT, setStateTagGPT] = useState(0)
    const [quantity, setQuantity] = useState(5);
    const [timeout, setTimeout] = useState(3);

    useEffect(() => {
        if (currID == news?.id) return;
        currID = news.id;

        setArrImg([]);
    }, [news])

    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, tags} = news;

            const selectedText = global.selectedText;
            const prompt = selectedText ?? tags;

            const {data: {arrUrl, id: respID}} = await axios.get(global.hostAPI + 'images',
                {params: {prompt, max: quantity, id, timeout: timeout * 1000}});
            setStateImageLoad(0)

            if (currID !== +respID) return; //TODO: переделать
            setArrImg(arrUrl.map(src => ({src, width: undefined, height: undefined,})))
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    let onChangeSort = (nodeIndex, targetIndex) => {
        const _arr = arrMoveItem([...news.arrImg], nodeIndex, targetIndex)
        setNews({...news, arrImg: _arr});
    };

    function onRemoveImage(e) {
        const index = e.target.dataset.index;
        news.arrImg.splice(index, 1)
        setNews({...news, arrImg: news.arrImg});
        e.preventDefault()
    }

    const onDropSortImg = () => {
        if (!global.draggingElement) return;
        //@ts-ignore
        let src = (new URL(global.draggingElement.src)).pathname.split('/').at(-1);
        setNews({...news, arrImg: [...news.arrImg, src]});
        global.draggingElement = null;
    }

    let onGetTagsGPT = async () => {
        setStateTagGPT(1)
        const text = await toGPT('mistral', 'Выдели основные мысли и на основе них сделай несколько не больше 4 тегов. Ни чего лишенего только ответ формата: тег, тег, тег', news?.text ?? '');
        setStateTagGPT(text ? 0 : 2);
        setNews(now => ({...now, tags: text}));
    };

    return <div className="d-flex flex-column w-100 notranslate position-relative">
                        <textarea className="options__tags d-flex flex-row border rounded mb-1 p-2 notranslate"
                                  value={news?.tags || ''}
                                  onChange={({target}) => setNews(was => ({...was, tags: target.value}))}
                                  style={{height: '5em'}}/>
        <div className="d-flex flex-row mb-1">
            <ButtonSpinner className="btn-secondary btn-sm" state={stateTagGPT} onClick={onGetTagsGPT}>Получить теги</ButtonSpinner>
            <input className="rounded border text-end ms-2 flex-stretch" type="range" value={quantity} min={1} max={40}
                   step={1} onChange={({target}) => setQuantity(+target.value)} title="Количество изображений"/>
            <span className="p-1 text-center" style={{width: '3em'}}>{quantity}</span>
            <input className="rounded border text-end ms-2 flex-stretch" type="range" value={timeout} min={1} max={20}
                   step={1} onChange={({target}) => setTimeout(+target.value)} title="Таймаут"/>
            <span className="p-1 text-center" style={{width: '3.5em'}}>{timeout + ' сек'}</span>
            <ButtonSpinner className="btn-secondary btn-sm" state={stateImageLoad}
                           onClick={requestImages}>
                Загрузить изображения
            </ButtonSpinner>
        </div>
        <div className="operation__img border rounded mb-1" style={{backgroundColor: '#ebf0f7'}}>
            <Gallery galleryID="my-test-gallery" images={arrImg}/>
            <div className="position-absolute" style={{bottom: '6px', right: '6px', opacity: .5}}>
                Всего: {arrImg.length} ({maxImage} сек)
            </div>
        </div>
        <div className="flex-stretch border rounded mb-1" style={{backgroundColor: '#ebf0f7'}} onDrop={onDropSortImg}
             onDragOver={e => e.preventDefault()}>
            {news?.arrImg?.length === 0 && <div>
                <center className="text-secondary opacity-50"><h6>Перетащите изображения (сверху) из загруженых...</h6></center>
            </div>}
            <DraggableList onChange={onChangeSort} className="d-flex flex-wrap flex-stretch justify-content-center">
                {news?.arrImg.map((item, index) => {
                    return <img key={index} className="sortable sortable-img border m-1 rounded shadow-sm" draggable
                                src={'./' + news.pathSrc + '/' + item}
                                data-index={index}
                                onContextMenu={(e) => onRemoveImage(e)}/>
                })}
            </DraggableList>
        </div>
    </div>
}