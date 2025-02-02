import React from 'react';

const Select = ({onChange, arrList, value, style = {}, className = ''}) => {
    return (<select style={style} value={value} className={"form-select " + className}
                    onChange={(e) => onChange && onChange(e.target.value)}>{arrList && Object.entries(arrList).map(([text, val], idi) => {
        return <option value={val as string} key={idi}>{text as string}</option>
    })}</select>);
}

export default Select;