//0-ok, 1-processing, 2-error
import React, {useEffect, useState} from "react";
import {Button} from "react-bootstrap";

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

    return (<div className={"d-flex flex-row  gap-1 text-nowrap align-items-center " + className}>
        {arrNames.map(([name, param], idi) => (
            <div key={idi} className="d-flex">
                <input className="me-1" type="checkbox" checked={selectedItem == param}
                       onChange={(e) => e.target.checked && setSelectedItem(param)}/>{name}
            </div>))}
    </div>)
}

export default GroupCheckbox;