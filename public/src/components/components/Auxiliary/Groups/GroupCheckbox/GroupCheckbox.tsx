//0-ok, 1-processing, 2-error
import React, {useCallback, useEffect, useState} from "react";
import {Button} from "react-bootstrap";
import {GeneratorList} from "../GeneratorList.tsx";

export type TArrName = Array<[string, any]>;
export type TOnChange = (data: any) => void;

interface TGroupCheckbox {
    state: any;
    arrNames: TArrName;
    onChange: TOnChange;
    className?: string;
}

function GroupCheckbox({state, arrNames, onChange, className = ''}: TGroupCheckbox) {

    const [selectedItem, setSelectedItem] = useState(state)

    useEffect(() => {
        onChange(selectedItem);
    }, [selectedItem]);

    const getElement = useCallback((name: string, param: string, idi: number) =>
            <div key={idi} className="d-flex">
                <input className="me-1" type="checkbox" checked={selectedItem == param}
                       onChange={(e) => e.target.checked && setSelectedItem(param)}/>
                {name}
            </div>
        , [selectedItem]);

    return <div className={"d-flex flex-row gap-1 text-nowrap align-items-center " + className}>
        <GeneratorList arrParam={arrNames} onGenerate={getElement}/>
    </div>
}

export default GroupCheckbox;