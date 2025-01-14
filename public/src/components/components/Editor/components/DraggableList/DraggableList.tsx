import React, {useState, useEffect, useRef} from 'react';
import './style.css'

const base64Language = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toShortString = (value, language = base64Language) => {
    const len = language.length;
    let acc = "";
    while (value > 0) {
        const index = value % len;
        acc += language.charAt(index);
        value /= len;
    }
    return acc.split('').reverse().join('').replace(/^0+/g, '');
};
let __id = 0;
const generateUID = (pre = '') => pre + toShortString((new Date().getTime()) + Math.ceil(Math.random() * 100) + (__id++));

const toLocalPos = ({target, clientX, clientY}) => {
    var {left, top} = target.getBoundingClientRect();
    return {x: clientX - left, y: clientY - top};
};


const DraggableList = ({
                           className = '', onChange = (i: any, to: any) => {
    }, children = null
                       }) => {
    const [nodeDragging, setNodeDragging] = useState(null);
    const [selectIndex, setSelectIndex] = useState(null);
    const [isCenter, setIsCenter] = useState(false);
    const [isLeftSide, setIsLeftSide] = useState(false);
    const [isClose, setIsClose] = useState(false);
    const [_target, setTarget] = useState(null);

    const nodeContainerRef = useRef(null);

    const handleDragStart = (event) => {
        const target = event.target;
        setNodeDragging(target);
        setSelectIndex([...target.parentElement.children].findIndex(it => it === target));
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        const target = event.target;
        const {x, y} = toLocalPos(event);

        if (!event.target.draggable) return;
        if (!nodeDragging) return;

        target.classList.remove('dragover');
        _target?.classList.remove('dragover');

        if (target === nodeDragging) return;

        target.classList.add('dragover');

        setTarget(target);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const target = event.target;

        if (!nodeDragging) return;
        if (target === nodeDragging) return;

        let node = nodeDragging;
        node.classList.add('sortable');
        node.setAttribute('draggable', true);
        target.classList.remove('dragover')

        const targetIndex = event.target.dataset.index;
        const nodeIndex = node.dataset.index;

        console.log(targetIndex, nodeIndex)
        // target.after(node);

        // const _arr = arrMoveItem(arrItems, nodeIndex, targetIndex);
        // setArrItems(_arr);

        setNodeDragging(null);
        setTarget(null);

        onChange(nodeIndex, targetIndex);
    };

    return <div ref={nodeContainerRef} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} className={className}>
        {React.Children.map(children, (child, index) => {
            return React.cloneElement(child, {draggable: true, ['data-index']: index})
        })}
    </div>
};

export default DraggableList;