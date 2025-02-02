import {addDay, formatDateTime} from "../utils.ts";
import {Button, Tab, Tabs} from "react-bootstrap";
import DailyReports from "./DailyReports.tsx";
import dataMotorActuator from "./data/DataMotorActuator.json";
import dataGasPollution from "./data/DataGasPollution.json";
import dataMotor from "./data/DataMotor.json";
import dataCompressor_1 from "./data/DataCompressor_1.json";
import dataCompressor_2 from "./data/DataCompressor_2.json";
import dataCompressor_3 from "./data/DataCompressor_3.json";
import dataGas from "./data/DataGas.json";
import dataGasOil from "./data/DataGasOil.json";
import dataAntifreezeDrainage from "./data/DataAntifreezeDrainage.json";
import dataTransportProduct from "./data/DataTransportProduct.json";
import React, {useState} from "react";

const ReportsAll = () => {
    const [dtFrom, setDtFrom] = useState<any>(new Date(Date.now()))
    return <>
        <div className="d-flex flex-row gap-1 m-2">
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}}
                   value={formatDateTime(addDay(0, new Date(dtFrom)), 'yyyy-mm-dd')}
                   onChange={e => setDtFrom(e.target.value)}/>
            <Button className="btn btn-secondary btn-sm">Загрузить отчет</Button>
        </div>

        <Tabs defaultActiveKey="motorActuator" className="m-2">
            <Tab eventKey="motorActuator" title="ИМ и ЭД" style={{flex: 1}} className="">
                <DailyReports data={dataMotorActuator}/>
            </Tab>
            <Tab eventKey="dataGaz" title="Загазованность" style={{flex: 1}} className="">
                <DailyReports data={dataGasPollution}/>
            </Tab>
            <Tab eventKey="Motor" title="Контур электродвигателя" style={{flex: 1}} className="">
                <DailyReports data={dataMotor}/>
            </Tab>
            <Tab eventKey="Compressor_1" title="Контур компрессора (ч.1)" style={{flex: 1}} className="">
                <DailyReports data={dataCompressor_1}/>
            </Tab>
            <Tab eventKey="Compressor_2" title="Контур компрессора (ч.2)" style={{flex: 1}} className="">
                <DailyReports data={dataCompressor_2}/>
            </Tab>
            <Tab eventKey="Compressor_3" title="Контур компрессора (ч.3)" style={{flex: 1}} className="">
                <DailyReports data={dataCompressor_3}/>
            </Tab>
            <Tab eventKey="Gas" title="Газовый контур" style={{flex: 1}} className="">
                <DailyReports data={dataGas}/>
            </Tab>
            <Tab eventKey="GasOil" title="Газомаслянный контур" style={{flex: 1}} className="">
                <DailyReports data={dataGasOil}/>
            </Tab>
            <Tab eventKey="AntifreezeDrainage" title="Антифриз-дренаж" style={{flex: 1}} className="">
                <DailyReports data={dataAntifreezeDrainage}/>
            </Tab>
            <Tab eventKey="LogTransportProduct" title="Журнал движения продукта" style={{flex: 1, justifyItems: 'center'}}>
                <DailyReports data={dataTransportProduct}/>
            </Tab>
        </Tabs></>
}

export default ReportsAll;