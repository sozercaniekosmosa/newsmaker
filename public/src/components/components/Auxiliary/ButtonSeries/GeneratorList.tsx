// import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import React from "react";

import {ButtonGroup} from "react-bootstrap";
import {isFunction} from "../../../../utils.ts";


export type TArrParam = Array<any> | Array<[any]>;
export type TOnGenerate = (...arrParam: any[]) => any;

interface TPropsElement {
    arrParam: TArrParam;
    onGenerate: TOnGenerate;
    className?: string;
}

function GeneratorList({arrParam, onGenerate, className = ''}: TPropsElement) {
    return arrParam.map((arrSubParam, idi) => {
        if (!Array.isArray(arrSubParam)) arrSubParam = [arrSubParam];
        arrSubParam.push(idi); //подмешиваем ID
        return onGenerate(...arrSubParam);
    })
}

export {GeneratorList};

