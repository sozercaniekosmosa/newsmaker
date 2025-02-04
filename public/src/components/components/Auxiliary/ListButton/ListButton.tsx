import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import React from "react";

import {ButtonGroup} from "react-bootstrap";
import {isFunction} from "../../../../utils.ts";


export type TArrParam = Array<any> | Array<[any]>;
export type TOnAction = (...arrParam: any[]) => Promise<any>;

interface RequestGPTProps {
    arrParam: TArrParam;
    onAction?: TOnAction;
    className?: string;
}

function ListButton({arrParam, onAction, className = ''}: RequestGPTProps) {
    const cheekingValue = arrParam[0]?.[0];
    const isHasElementGenerator = cheekingValue && isFunction(cheekingValue)
    return (
        <ButtonGroup className={className}>
            {arrParam.map((arrSubParam, idi) => {
                if (!Array.isArray(arrSubParam)) arrSubParam = [arrSubParam];
                return isHasElementGenerator ? arrSubParam[0](idi, ...arrSubParam) :
                    <ButtonSpinner variant="secondary btn-sm text-truncate" key={idi} onAction={() => {
                        // @ts-ignore
                        return onAction(...arrSubParam);
                    }}>{arrSubParam[0]}</ButtonSpinner>;
            })}
        </ButtonGroup>);
}

export {ListButton};

