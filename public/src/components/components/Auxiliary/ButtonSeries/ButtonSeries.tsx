// import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import React from "react";

import {ButtonGroup} from "react-bootstrap";
import {GeneratorList} from "./GeneratorList.tsx";


export type TArrParam = Array<any> | Array<[any]>;
export type TOnGenerate = (...arrParam: any[]) => any;

interface TPropsElement {
    arrParam: TArrParam;
    onGenerate?: TOnGenerate;
    className?: string;
}

function ButtonSeries({arrParam, onGenerate, className = ''}: TPropsElement) {
    return <ButtonGroup className={className}>
        <GeneratorList arrParam={arrParam} onGenerate={onGenerate}/>
    </ButtonGroup>
}

export {ButtonSeries};

