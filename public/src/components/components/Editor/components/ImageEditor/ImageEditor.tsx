import React, {useCallback, useEffect, useRef, useState} from 'react';
import {debounce} from "../../../../../utils.ts";

type Tool = 'blur' | 'rectangle' | 'text';
type HistoryItem = ImageData;
type TextItem = { text: string; x: number; y: number; color: string; size: number };

interface ImageEditorProps {
    pathImage?: string; // Optional property
    onSaveImage?: (nodeCanvas: HTMLCanvasElement, path: string) => void; // Optional property
}

let onSave: (nodeCanvas: HTMLCanvasElement, path: string) => void

const ImageEditor: React.FC<ImageEditorProps> = ({pathImage, onSaveImage}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedTool, setSelectedTool] = useState<Tool>('blur');
    const [color, setColor] = useState('#ff0000');
    const [fontSize, setFontSize] = useState(20);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startCoords, setStartCoords] = useState<{ x: number; y: number } | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [texts, setTexts] = useState<TextItem[]>([]);

    useEffect(() => {
        pathImage && loadImage(pathImage);
        onSave = debounce((nodeCanvas: HTMLCanvasElement, path: string) => onSaveImage(nodeCanvas, path), 2000)
    }, []);

    // Добавление в историю
    const pushToHistory = useCallback((data: ImageData) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), data]);
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    // Загрузка изображения
    const loadImage = useCallback((url: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx?.drawImage(img, 0, 0);
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (imageData) pushToHistory(imageData);
        };

        img.src = url;
    }, [pushToHistory]);

    // Обработчики отмены/повтора
    const handleUndoRedo = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y' && historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, history.length]);

    // Вставка из буфера обмена
    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image')) {
                const blob = item.getAsFile();
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setImageUrl(url);
                    loadImage(url);
                }
            }
        }
    }, [loadImage]);

    useEffect(() => {
        document.addEventListener('keydown', handleUndoRedo);
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('keydown', handleUndoRedo);
            document.removeEventListener('paste', handlePaste);
        };
    }, [handleUndoRedo, handlePaste]);

    // Получение координат с учетом масштаба
    const getScaledCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return {x: 0, y: 0};

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    // Генерация ядра Гаусса
    const generateGaussianKernel = (radius: number) => {
        const kernel: number[] = [];
        const sigma = radius / 3;
        let sum = 0;

        for (let x = -radius; x <= radius; x++) {
            const coefficient = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel.push(coefficient);
            sum += coefficient;
        }

        return kernel.map(v => v / sum);
    };

    // Применение Gaussian blur к ImageData
    const applyGaussianBlur = (imageData: ImageData, radius: number) => {
        const kernel = generateGaussianKernel(radius);
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(pixels.length);

        // Горизонтальное размытие
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;

                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const idx = (y * width + px) * 4;
                    const weight = kernel[kx + radius];

                    r += pixels[idx] * weight;
                    g += pixels[idx + 1] * weight;
                    b += pixels[idx + 2] * weight;
                    a += pixels[idx + 3] * weight;
                }

                const idx = (y * width + x) * 4;
                result[idx] = r;
                result[idx + 1] = g;
                result[idx + 2] = b;
                result[idx + 3] = a;
            }
        }

        // Вертикальное размытие
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let r = 0, g = 0, b = 0, a = 0;

                for (let ky = -radius; ky <= radius; ky++) {
                    const py = Math.min(height - 1, Math.max(0, y + ky));
                    const idx = (py * width + x) * 4;
                    const weight = kernel[ky + radius];

                    r += result[idx] * weight;
                    g += result[idx + 1] * weight;
                    b += result[idx + 2] * weight;
                    a += result[idx + 3] * weight;
                }

                const idx = (y * width + x) * 4;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = a;
            }
        }

        return new ImageData(pixels, width, height);
    };

    // Обработчик движения мыши для размытия
    const handleBlurTool = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
        if (!canvasRef.current) return;

        const radius = 50;
        const areaSize = radius * 2;

        // Получаем область для размытия
        const sx = Math.max(0, x - radius);
        const sy = Math.max(0, y - radius);
        const sw = Math.min(canvasRef.current.width - sx, areaSize);
        const sh = Math.min(canvasRef.current.height - sy, areaSize);

        const imageData = ctx.getImageData(sx, sy, sw, sh);
        const blurredData = applyGaussianBlur(imageData, 15);

        ctx.putImageData(blurredData, sx, sy);
    }, []);

    // Обработчики рисования
    const handleMouseDown: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
        const coords = getScaledCoords(e);
        setIsDrawing(true);
        setStartCoords(coords);

        if (selectedTool === 'rectangle') {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) pushToHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
    };

    const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
        if (!isDrawing || !startCoords) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const coords = getScaledCoords(e);

        switch (selectedTool) {
            case 'rectangle':
                ctx.putImageData(history[historyIndex], 0, 0);
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.fillRect(startCoords.x, startCoords.y, coords.x - startCoords.x, coords.y - startCoords.y);
                ctx.strokeRect(startCoords.x, startCoords.y, coords.x - startCoords.x, coords.y - startCoords.y);
                break;

            case 'blur':
                handleBlurTool(ctx, coords.x, coords.y);
                // ctx.filter = 'blur(10px)';
                // ctx.globalAlpha = 0.7;
                // ctx.beginPath();
                // ctx.arc(coords.x, coords.y, 20, 0, Math.PI * 2);
                // ctx.fill();
                // ctx.filter = 'none';
                // ctx.globalAlpha = 1;
                break;
        }

        onSave(canvasRef.current, pathImage);
    };

    const handleMouseUp: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
        if (!isDrawing || !startCoords) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        if (selectedTool === 'rectangle') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            pushToHistory(imageData);
        }

        setIsDrawing(false);
        setStartCoords(null);
    };

    // Добавление текста
    const handleAddText = async (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (selectedTool !== 'text') return;

        const coords = getScaledCoords(e);
        const text = prompt('Введите текст:');
        if (!text) return;

        setTexts(prev => [...prev, {
            text,
            x: coords.x,
            y: coords.y,
            color,
            size: fontSize
        }]);
    };

    // Отрисовка текста
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        if (!~historyIndex) return;

        ctx.putImageData(history[historyIndex], 0, 0);
        texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = `${t.size}px Arial`;
            ctx.fillText(t.text, t.x, t.y);
        });
    }, [texts, history, historyIndex]);


    return (
        <div style={{padding: '20px'}}>
            <div style={{marginBottom: '20px'}} hidden={true}>
                <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) loadImage(URL.createObjectURL(file));
                }}/>
            </div>

            <div style={{marginBottom: '10px', display: 'flex', gap: '10px'}}>
                <button hidden={true} onClick={() => setSelectedTool('blur')} data-active={selectedTool === 'blur'}>
                    Размытие
                </button>
                <button hidden={true} onClick={() => setSelectedTool('rectangle')}
                        data-active={selectedTool === 'rectangle'}>
                    Прямоугольник
                </button>
                <button hidden={true} onClick={() => setSelectedTool('text')}
                        data-active={selectedTool === 'text'}>Текст
                </button>
                <button hidden={true}
                        onClick={() => onSave(canvasRef.current, pathImage)}>Сохранить
                </button>
                <input hidden={true} type="color" value={color} onChange={e => setColor(e.target.value)}/>

                {selectedTool === 'text' && (
                    <input
                        type="number"
                        value={fontSize}
                        onChange={e => setFontSize(Number(e.target.value))}
                        min="10"
                        max="100"
                    />
                )}
            </div>

            <canvas
                ref={canvasRef}
                style={{border: '1px solid #ccc', maxWidth: '100%'}}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleAddText}
            />
        </div>
    );
};

export default ImageEditor;