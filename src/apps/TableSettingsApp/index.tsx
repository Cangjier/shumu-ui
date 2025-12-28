import { InfoCircleOutlined } from "@ant-design/icons";
import { Switch, Input, Tooltip, InputNumber } from "antd";
import { ColumnProps } from "antd/es/table";
import { forwardRef } from "react";
import { TableApp } from "../TableApp";

export interface ITableSettingsRecord {
    key: string;
    value: string | boolean | number;
    description?: string;
    placeholder?: string;

}

export const TableSettingsApp = forwardRef<{}, {
    style?: React.CSSProperties;
    data: ITableSettingsRecord[];
    onChange: (key: string, value: any) => void;
    keyWidth?: number | string;
}>((props, ref) => {
    const columns: ColumnProps<ITableSettingsRecord>[] = [
        {
            title: "Key",
            key: "key",
            width: props.keyWidth,
            render: (value: any, record: ITableSettingsRecord, index: number) => {
                if (record.description) {
                    return <div style={{
                        display: "flex",
                        flexDirection: "row",
                        gap: "5px"
                    }}>
                        <div>{value.key}</div>
                        <Tooltip title={record.description}>
                            <InfoCircleOutlined />
                        </Tooltip>
                    </div>
                }
                else {
                    return <div>{value.key}</div>
                }
            }
        },
        {
            title: "Value",
            key: "value",
            render: (value: any, record: ITableSettingsRecord, index: number) => {
                if (typeof record.value === "string") {
                    return <Input.TextArea autoSize defaultValue={record.value as string} placeholder={record.placeholder} onChange={e => props.onChange(record.key, e.target.value)} />
                }
                else if (typeof record.value === "boolean") {
                    return <Switch defaultChecked={value.value as boolean} onChange={e => props.onChange(record.key, e)} />
                }
                else if (typeof record.value === "number") {
                    return <InputNumber defaultValue={value.value as number} onChange={v => props.onChange(value.key, v)} />
                }
                return <div>{value.value}</div>
            }
        }
    ];
    return <div style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        ...props.style
    }}>
        <TableApp style={{
            flex: 1,
            height: 0
        }} columns={columns} dataSource={props.data} />
    </div>
});