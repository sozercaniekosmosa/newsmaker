import React from 'react';
import './style.css'; // Предполагается, что стили находятся в этом файле

const ScrollChild = ({children, className = ""}) => {
    return <div className={"scroll-child flex-stretch " + className}>{children}</div>;
};

const ScrollParent = ({children, className = ""}) => {
    return <div className={"scroll-parent " + className}>{children}</div>;
};

export {ScrollChild, ScrollParent};