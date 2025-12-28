import { useEffect, useState } from "react";
import { IShowModal } from "../../services/utils";
import { ITableSettingsRecord, TableSettingsApp } from "../TableSettingsApp";


export const getInterfaceSettingRecords: () => ITableSettingsRecord[] = () => {
    return [
        { key: "Topology.EnableKeyField", value: true },
        { key: "Topology.FilterKeyFields", value: "" },
        { key: "Topology.TitleField", value: "" },
        { key: "Topology.NodeWidth", value: 300 },
        { key: "Topology.NodeHeight", value: 180 },
        {
            key: "Topology.RequiredFields",
            value: "",
            placeholder: "such as: key,title,prompt",
            description: "The required fields of the node, separated by commas"
        },
        { key: "Topology.IDField", value: "key" },
        {
            key: "Topology.GenerateCommandLine",
            value: "",
            placeholder: "such as: your.exe generate -i {file_path} -k {key}",
            description: [`The command line to generate the node,`,
                `{key} will be replaced with the node key,`,
                `{file_path} will be replaced with the file path,`,
                `{prompt} will be replaced with the prompt,`,
                `{key_field} will be replaced with the key field,`,
                `{context_file_path} will be replaced with the context file path`
            ].join("\n")
        }, {
            key: "Project.OpenWorkspaceCommandLine",
            value: "",
            placeholder: "such as: your.exe open -i {file_path}",
            description: [`The command line to open the workspace,`,
                `{file_path} will be replaced with the file path`
            ].join("\n")
        }
    ]
};

export interface IInterfaceSettings {
    Topology: {
        EnableKeyField: boolean;
        FilterKeyFields: string[];
        TitleField?: string;
        NodeWidth?: number;
        NodeHeight?: number;
        IDField?: string;
        GenerateCommandLine?: string;
        RequiredFields?: string[];
    },
    Project: {
        OpenWorkspaceCommandLine?: string;
    }
}

export const getInterfaceSettings = (settings: ITableSettingsRecord[]): IInterfaceSettings => {
    const getSetting = (key: string) => {
        return settings.find(s => s.key === key)?.value as boolean | string | number | undefined;
    }
    return {
        Topology: {
            EnableKeyField: (getSetting("Topology.EnableKeyField") as boolean) ?? true,
            FilterKeyFields: (getSetting("Topology.FilterKeyFields") as string).split(/[,，;；\s]+/).filter(s => s.trim() !== "") ?? [],
            TitleField: (getSetting("Topology.TitleField") as string) ?? undefined,
            NodeWidth: Number.isNaN(Number(getSetting("Topology.NodeWidth"))) ? 300 : Number(getSetting("Topology.NodeWidth")),
            NodeHeight: Number.isNaN(Number(getSetting("Topology.NodeHeight"))) ? 180 : Number(getSetting("Topology.NodeHeight")),
            IDField: (getSetting("Topology.IDField") as string) ?? "key",
            GenerateCommandLine: (getSetting("Topology.GenerateCommandLine") as string) ?? "",
            RequiredFields: (getSetting("Topology.RequiredFields") as string).split(/[,，;；\s]+/).filter(s => s.trim() !== "") ?? [],
        },
        Project: {
            OpenWorkspaceCommandLine: (getSetting("Project.OpenWorkspaceCommandLine") as string) ?? "",
        }
    };
}

export const openInterfaceSettings = async (
    options: {
        settings: ITableSettingsRecord[],
        showModal: IShowModal,
        onFilterKey?: (key: string) => boolean,
        mapKeys?: { [key: string]: string },
        otherSettings?: ITableSettingsRecord[]
    }
) => {
    const interfaceSettingKeys = getInterfaceSettingRecords().map(s => s.key);
    let tempSettings: ITableSettingsRecord[] = [];
    let unusedSettings: ITableSettingsRecord[] = [];
    if (options.onFilterKey) {
        let usedKeys = interfaceSettingKeys.filter(options.onFilterKey);
        let unusedKeys = interfaceSettingKeys.filter(k => !usedKeys.includes(k));
        tempSettings = options.settings.filter(s => usedKeys.includes(s.key)).map(s => ({ ...s }));
        unusedSettings = options.settings.filter(s => unusedKeys.includes(s.key)).map(s => ({ ...s }));
    }
    else {
        tempSettings = options.settings.map(s => ({ ...s }));
        unusedSettings = [];
    }
    if (options.mapKeys) {
        tempSettings = tempSettings.map(s => ({ ...s, key: options.mapKeys![s.key] ?? s.key }));
    }
    if (options.otherSettings) {
        tempSettings = tempSettings.concat(options.otherSettings);
    }
    let accept = await options.showModal(() => {
        const [innerSettings, setInnerSettings] = useState(tempSettings);
        useEffect(() => {
            tempSettings = innerSettings;
        }, [innerSettings]);
        return <TableSettingsApp
            data={innerSettings}
            onChange={(key, value) => setInnerSettings(innerSettings.map(s => s.key === key ? { ...s, value: value } : s))} />
    }, {
        width: "80vw",
        height: "65vh",
        margin: "20px 0 0 0"
    });
    if (accept) {
        if (options.mapKeys) {
            let reverseMapKeys = Object.fromEntries(Object.entries(options.mapKeys).map(([key, value]) => [value, key]));
            tempSettings = tempSettings.map(s => ({ ...s, key: reverseMapKeys[s.key] ?? s.key }));
        }
        tempSettings = tempSettings.concat(unusedSettings);
        return {
            interfaceSettings: tempSettings.filter(s => interfaceSettingKeys.includes(s.key)),
            otherSettings: tempSettings.filter(s => !interfaceSettingKeys.includes(s.key)),
        };
    }
    else return undefined;
}