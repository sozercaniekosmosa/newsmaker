export type TArrParam = Array<any> | Array<[any]>;
export type TOnGenerate = (...arrParam: any[]) => any;

interface TPropsElement {
    arrParam: TArrParam;
    onGenerate: TOnGenerate;
}

function GeneratorList({arrParam, onGenerate}: TPropsElement) {
    return arrParam.map((arrSubParam, idi) => {
        if (!Array.isArray(arrSubParam)) arrSubParam = [arrSubParam];
        arrSubParam.push(idi); //подмешиваем ID
        return onGenerate(...arrSubParam);
    })
}

export {GeneratorList};

