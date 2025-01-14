import React from 'react';
import './style.css'; // Предполагается, что стили находятся в этом файле

const ScrollChildY = ({children, className = ""}) => {
    return <div className={"scroll-child-y flex-stretch " + className}>{children}</div>;
};

const ScrollChildX = ({children, className = ""}) => {
    return <div className={"scroll-child-x flex-stretch " + className}>{children}</div>;
};

const ScrollParent = ({children, className = "", onDrop = null, onDragOver = null}) => {
    return <div className={"scroll-parent " + className} onDrop={onDrop} onDragOver={onDragOver}>{children}</div>;
};

export {ScrollChildX, ScrollChildY, ScrollParent};