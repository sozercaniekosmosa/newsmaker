import React, {useEffect, useState} from "react";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import axios from "axios";
import global from "../../../../../global.ts";
import glob from "../../../../../global.ts";
import {extractDimensionsFromUrl, toGPT} from "../../../../utils.ts";
import DraggableList from "../../../Auxiliary/DraggableList/DraggableList.tsx";
import {eventBus} from "../../../../../utils.ts";
import {ButtonSeries, TArrParam} from "../../../Auxiliary/ButtonSeries/ButtonSeries.tsx";

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

const getLocalImage = async (id, setArrImg): Promise<void> => {
    try {
        const {data: arrSrc} = await axios.get(glob.hostAPI + 'local-image-src', {params: {id}});
        setArrImg(arrSrc.map((srcUrl: string) => {
            return {src: srcUrl + '?' + new Date().getTime(), ...extractDimensionsFromUrl(srcUrl)};
        }))
    } catch (e) {
        // setArrImg([])
    }
}

let currID;
export default function Images({news, setNews, maxImage, typeServiceGPT}) {
    const [arrImg, setArrImg] = useState([])
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [stateTagGPT, setStateTagGPT] = useState(0)
    const [quantity, setQuantity] = useState(5);
    const [timeout, setTimeout] = useState(3);
    const [update, setUpdate] = useState((new Date()).getTime())

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-news') {
                setUpdate((new Date()).getTime());
            }
        })
    }, [])

    useEffect(() => {
        if (!news) return
        (() => getLocalImage(news.id, setArrImg))();
    }, [update])

    useEffect(() => {
        if (!news) return;
        (() => getLocalImage(news.id, setArrImg))();

        if (currID == news?.id) return;
        currID = news.id;


        setArrImg([]);
    }, [news])

    async function reqImg({quant}) {
        setStateImageLoad(1);
        try {
            const {id, tags} = news;

            const selectedText = global.selectedText;
            const prompt = selectedText ?? tags;

            const {data: {arrUrl, id: respID}} = await axios.get(global.hostAPI + 'images',
                {params: {prompt, max: quant ?? quantity, id, timeout: timeout * 1000}});
            setStateImageLoad(0)

            if (currID !== +respID) return 0; //TODO: переделать
            setArrImg(arrUrl.map(src => ({src, width: undefined, height: undefined,})))
            return 0
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
            return 2
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
        let src = (new URL(global.draggingElement.src)).pathname.split('/').at(-1) + '?' + new Date().getTime();
        setNews({...news, arrImg: [...news.arrImg, src]});
        global.draggingElement = null;
    }

    let onGetTagsGPT = async () => {
        const text = await toGPT(typeServiceGPT, 'Выдели основные мысли, факты, персоны и на основе них сделай несколько не больше 5 тегов. Ни чего лишенего только ответ формата: тег, тег, тег', news?.text ?? '');
        setNews(now => ({...now, tags: text}));
        return text ? 0 : 2;
    };

    const onPrepareImgTitleNews = async (news, image) => {
        await axios.post(global.hostAPI + 'create-title-image', {
            id: news.id,
            url: image.src
        });
        setUpdate((new Date()).getTime())
    };

    let onConfirmRemoveImage = async (src: string = null) => {
        try {
            const path = (src.includes('?')) ? src.split('?')[0] : src;
            await axios.get(global.hostAPI + 'remove-image', {params: {path}});
            setUpdate((new Date()).getTime())
        } catch (e) {
            console.log(e)
        }
    };

    const arrPrompt: TArrParam = [['Получить теги']]

    return <div className="d-flex flex-column w-100 notranslate position-relative">
                        <textarea className="options__tags d-flex flex-row border rounded mb-1 p-2 notranslate"
                                  value={news?.tags || ''}
                                  onChange={({target}) => setNews(was => ({...was, tags: target.value}))}
                                  style={{height: '5em'}}/>
        <div className="d-flex flex-row mb-1 gap-1 w-auto">
            <ButtonSeries arrParam={arrPrompt} onGenerate={onGetTagsGPT}/>
            <div className={"d-flex gap-1 " + (news.tags.length ? '' : 'ev-none opacity-25')}>
                <ButtonSeries arrParam={[1, 2, 3, 5, 10, 15, 20, 25, 35, 40]} onGenerate={(n) => reqImg({quant: n})}/>
                <input className="rounded border text-end ms-2 flex-stretch" type="range" value={timeout} min={1}
                       max={20}
                       step={1} onChange={({target}) => setTimeout(+target.value)} title="Таймаут"/>
                <span className="p-1 text-center" style={{width: '3.5em'}}>{timeout + ' сек'}</span>
            </div>
        </div>
        <div className="operation__img border rounded mb-1" style={{backgroundColor: '#ebf0f7'}}>
            <Gallery galleryID="my-test-gallery" images={arrImg} news={news}
                     onPrepareImgTitleNews={onPrepareImgTitleNews}
                     onConfirmRemoveImage={onConfirmRemoveImage}/>
            <div className="position-absolute" style={{bottom: '6px', right: '6px', opacity: .5}}>
                Всего: {arrImg.length} ({maxImage} сек)
            </div>
        </div>
        <div className="flex-stretch border rounded mb-1" style={{backgroundColor: '#ebf0f7'}} onDrop={onDropSortImg}
             onDragOver={e => e.preventDefault()}>
            {news?.arrImg?.length === 0 && <div>
                <center className="text-secondary opacity-50"><h6>Перетащите изображения (сверху) из загруженых...</h6>
                </center>
            </div>}
            <DraggableList onChange={onChangeSort} className="d-flex flex-wrap flex-stretch justify-content-center">
                {news?.arrImg.map((item, index) => {
                    return <img key={index} className="sortable sortable-img border m-1 rounded shadow-sm" draggable
                                src={'/' + news.pathSrc + '/img/' + item}
                                data-index={index}
                                onContextMenu={(e) => onRemoveImage(e)}/>
                })}
            </DraggableList>
        </div>
    </div>
}