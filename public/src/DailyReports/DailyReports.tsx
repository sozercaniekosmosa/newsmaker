import React from "react";
import "./style.css";
import {getRandomRange} from "../utils.ts";

const DailyReports = ({data}) => {
    // Извлекаем заголовок из данных
    const header = data.header;

    // Извлекаем заголовки столбцов и данные
    const columns = data.columns;
    const rows = data.rows;

    function preapareValue(value) {
        let val = value.length ? value : getRandomRange(0, 100, 1);
        let backgroundColor = 'yellow';
        if (val < 25 || val > 75) backgroundColor = 'red'
        if (val < 40 && val < 60) backgroundColor = 'green'

        return {backgroundColor, val}
    }

    const arrNameSpan = data.subheader?.split('|')?.map(it => it.split(':'))

    return (
        <>
            {/*<div className="ev-none" style={{position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor}}></div>*/}
            {/*@ts-ignore*/}
            <table border="1" cellPadding="5" className="m-2 shadow">
                <thead>
                <tr>
                    <th colSpan={columns.length + 1}>{header}</th>
                </tr>
                <tr>
                    {data.subheader && <th rowSpan={2} className="dr-time-col">Время</th>}
                    {data.subheader && (arrNameSpan?.length == 0 ?
                        <th colSpan={arrNameSpan.length}>{data.subheader}</th> : arrNameSpan.map(([name, span]) => {
                            return <th colSpan={span}>{name}</th>
                        }))}
                </tr>
                <tr>
                    {!data.subheader && <th rowSpan={2}>Время</th>}
                    {columns.map((col, index) => (
                        <th key={index}>{col}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((row, rowIndex) => <tr key={rowIndex}>
                    <td>{row.time}</td>
                    {row.values.map((value, colIndex) => {
                        const {backgroundColor, val} = preapareValue(value)
                        return <td key={colIndex} className={backgroundColor}>{val}</td>;
                    })}
                </tr>)}
                </tbody>
            </table>
        </>
    );
};

export default DailyReports;