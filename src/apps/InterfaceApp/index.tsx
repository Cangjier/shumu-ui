import { Splitter } from "antd";
import { forwardRef, useEffect, useRef } from "react";
import { InterfaceNavigatorApp } from "../InterfaceNavigatorApp";
import { useUpdate } from "../../natived";
import { Editor, loader } from "@monaco-editor/react";
import * as monaco from 'monaco-editor'
import { historyAppActions, pushHistory } from "../ProjectsApp";
import { clientServices } from "../../services/clientServices";
import { IAnynomousNode, ITopologyAppRef, TopologyApp } from "../TopologyApp";
import { pathUtils } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { InterfaceEditor } from "../InterfaceEditor";
import { ITerminalAppRef, TerminalApp } from "../TerminalApp";
import { ITableSettingsRecord } from "../TableSettingsApp";
import { getInterfaceSettingRecords } from "../InterfaceSettings";

loader.config({ monaco })

export interface IInterfaceAppProps {
    style?: React.CSSProperties;
}
export interface IInterfaceAppRef {
}
type RightPanelType = "none" | "editor" | "topology";
export const InterfaceApp = forwardRef<IInterfaceAppRef, IInterfaceAppProps>((props, ref) => {
    const [interfacePath, updateInterfacePath, interfacePathRef] = useUpdate<string | undefined>(undefined);
    const [rightPanelType, updateRightPanelType, rightPanelTypeRef] = useUpdate<RightPanelType>("none");
    const [editorFilePath, updateEditorFilePath, editorFilePathRef] = useUpdate<string | undefined>(undefined);
    const [topologyFilePath, updateTopologyFilePath, topologyFilePathRef] = useUpdate<string | undefined>(undefined);
    const [topologyData, updateTopologyData, topologyDataRef] = useUpdate<IAnynomousNode[]>([]);
    const [topologyCollapsedKeys, updateTopologyCollapsedKeys, topologyCollapsedKeysRef] = useUpdate<string[]>([]);
    const [mainTabSizes, updateMainTabSizes, mainTabSizesRef] = useUpdate<(number | undefined)[]>([300, undefined]);
    const [subTabSizes, updateSubTabSizes, subTabSizesRef] = useUpdate<(number | undefined)[]>([undefined, 300]);
    const [interfaceSettings, updateInterfaceSettings, interfaceSettingsRef] = useUpdate<ITableSettingsRecord[]>(getInterfaceSettingRecords());
    const topologyAppRef = useRef<ITopologyAppRef>(null);
    const terminalAppRef = useRef<ITerminalAppRef>(null);
    const isValidTopologyData = (data: any): boolean => {
        if (Array.isArray(data)) {
            return data.every(item => {
                return isValidTopologyData(item);
            });
        }
        else if (typeof data === "object" && data !== null) {
            return Object.keys(data).every((key: string) => {
                if (key == "children") {
                    if (Array.isArray(data[key])) {
                        return data[key].every(item => {
                            return isValidTopologyData(item);
                        });
                    }
                    else {
                        return false;
                    }
                }
                else {
                    if (typeof data[key] === "string") {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            });
        }
        else {
            return false;
        }
    };
    const onSelectFile = async (path: string) => {
        let pathDirectoryName = pathUtils.getFileName(pathUtils.getDirectoryName(path));
        if (path.endsWith(".json")) {
            let data = JSON.parse(await localServices.file.read(path));
            if (pathDirectoryName == "cases" && isValidTopologyData(data)) {
                if (Array.isArray(data)) {
                    updateTopologyData(data);
                }
                else {
                    updateTopologyData([data]);
                }
                updateEditorFilePath(undefined);
                updateTopologyFilePath(path);
                updateRightPanelType("topology");
            }
            else {
                updateEditorFilePath(path);
                updateTopologyData([]);
                updateTopologyFilePath(undefined);
                updateRightPanelType("editor");
            }
        }
        else {
            updateEditorFilePath(path);
            updateTopologyData([]);
            updateTopologyFilePath(undefined);
            updateRightPanelType("editor");
        }
    };
    useEffect(() => {
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == "all" && message.data.action == historyAppActions.selectHistory) {
                let func = async () => {
                    let currentFolder = message.data.history.path;
                    updateInterfacePath(currentFolder);
                };
                func();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    useEffect(() => {
        onInitializeInterfaceSettings();
    }, [interfacePath]);
    useEffect(() => {
        onInitializeInterfaceSettings();
    }, []);
    const onInitializeInterfaceSettings = async () => {
        let settingsFilePath = `${interfacePathRef.current}/settings.json`;
        if (await localServices.file.fileExists(settingsFilePath)) {
            let settings = await localServices.file.read(settingsFilePath);
            if (settings) {
                let cacheSettings = [] as ITableSettingsRecord[];
                let settingsObject = JSON.parse(settings);
                let settingCatalogKeys = Object.keys(settingsObject);
                for (let settingCatalogKey of settingCatalogKeys) {
                    let settingCatalog = settingsObject[settingCatalogKey];
                    if (Array.isArray(settingCatalog)) {
                        for (let setting of settingCatalog) {
                            cacheSettings.push({
                                key: `${settingCatalogKey}.${setting.key}`,
                                value: setting.value
                            });
                        }
                    }
                }
                updateInterfaceSettings(old => {
                    return old.map(s => {
                        let cacheSetting = cacheSettings.find(c => c.key === s.key);
                        return cacheSetting ? { ...s, ...cacheSetting } : s;
                    });
                });
            }
        }
    }
    const onChangeInterfaceSettings = async (settings: ITableSettingsRecord[]) => {
        if (interfacePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.directoryExists(interfacePathRef.current)) {
            let settingsFilePath = `${interfacePathRef.current}/settings.json`;
            let allSettings: { [key: string]: ITableSettingsRecord[] } = {};
            for (let setting of settings) {
                if (setting.key.includes(".") == false) {
                    continue;
                }
                let catalogKey = setting.key.substring(0, setting.key.indexOf("."));
                let settingKey = setting.key.substring(setting.key.indexOf(".") + 1);
                if (!allSettings[catalogKey]) {
                    allSettings[catalogKey] = [];
                }
                allSettings[catalogKey].push({
                    ...setting,
                    key: settingKey,
                });
            }
            await localServices.file.write(settingsFilePath, JSON.stringify(allSettings));
            updateInterfaceSettings(settings);
        }
    }
    const onChangeTopologyData = async (data: IAnynomousNode[]) => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        let historyCount = await localServices.history.count(topologyFilePathRef.current);

        if (await localServices.file.fileExists(topologyFilePathRef.current)) {
            if (historyCount == 0) {
                await localServices.history.push(topologyFilePathRef.current, await localServices.file.read(topologyFilePathRef.current));
            }
            await localServices.file.write(topologyFilePathRef.current, JSON.stringify(data));
        }
        updateTopologyData(data);
        await localServices.history.push(topologyFilePathRef.current, JSON.stringify(data));
    }
    const onSaveTopologyData = async (data: IAnynomousNode[]) => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        let historyCount = await localServices.history.count(topologyFilePathRef.current);
        if (await localServices.file.fileExists(topologyFilePathRef.current)) {
            if (historyCount == 0) {
                await localServices.history.push(topologyFilePathRef.current, await localServices.file.read(topologyFilePathRef.current));
            }
            await localServices.file.write(topologyFilePathRef.current, JSON.stringify(data));
        }
        await localServices.history.push(topologyFilePathRef.current, JSON.stringify(data));
    }
    const onUndoTopologyData = async () => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.fileExists(topologyFilePathRef.current) == false) {
            return;
        }
        let content = await localServices.history.undo(topologyFilePathRef.current);
        if (content == undefined) {
            return;
        }
        await localServices.file.write(topologyFilePathRef.current, content);
        updateTopologyData(JSON.parse(content));
    }
    const onRedoTopologyData = async () => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.fileExists(topologyFilePathRef.current) == false) {
            return;
        }
        let content = await localServices.history.redo(topologyFilePathRef.current);
        if (content == undefined) {
            return;
        }
        await localServices.file.write(topologyFilePathRef.current, content);
        updateTopologyData(JSON.parse(content));
    }
    const onGenerate = async (commandLine: string) => {
        if (topologyFilePathRef.current) {
            let historyCount = await localServices.history.count(topologyFilePathRef.current);
            if (await localServices.file.fileExists(topologyFilePathRef.current)) {
                if (historyCount == 0) {
                    await localServices.history.push(topologyFilePathRef.current, await localServices.file.read(topologyFilePathRef.current));
                }
            }
            commandLine = commandLine.replace("{file_path}", topologyFilePathRef.current.replace(/\\/g, "/") ?? "");
            await terminalAppRef.current?.executeCommand(commandLine);
            let data = JSON.parse(await localServices.file.read(topologyFilePathRef.current));
            if (Array.isArray(data)) {
                updateTopologyData(data);
            }
            else {
                updateTopologyData([data]);
            }
            await localServices.history.push(topologyFilePathRef.current, JSON.stringify(data));
        }
    }
    const onExecuteCommand = async (command: string) => {
        await terminalAppRef.current?.executeCommand(command);
    }
    const onGetTopologyConfig = async () => {
        let path = topologyFilePathRef.current;
        if (path == undefined) {
            return [];
        }
        let configPath = `${pathUtils.getDirectoryName(path)}/${pathUtils.getFileNameWithoutExtension(path)}.config.json`;
        if (await localServices.file.fileExists(configPath) == false) {
            return [];
        }
        let oldConfigString = await localServices.file.read(configPath);
        let oldConfig = oldConfigString ? JSON.parse(oldConfigString) : {};
        return oldConfig;
    }
    const onSaveTopologyConfig = async (config: { collapsedKeys?: string[] }) => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        let configPath = `${pathUtils.getDirectoryName(topologyFilePathRef.current)}/${pathUtils.getFileNameWithoutExtension(topologyFilePathRef.current)}.config.json`;
        let oldConfigString = await localServices.file.fileExists(configPath) ? await localServices.file.read(configPath) : undefined;
        let oldConfig = oldConfigString ? JSON.parse(oldConfigString) : {};
        let newConfig = {
            ...oldConfig,
            ...config
        };
        await localServices.file.write(configPath, JSON.stringify(newConfig));
    }
    useEffect(() => {
        if (interfacePathRef.current == undefined || interfacePathRef.current == "") {
            return;
        }
        let terminalRef = terminalAppRef.current;
        if (terminalRef) {
            terminalRef.cd(interfacePathRef.current);
        }
    }, [interfacePath]);
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            ...props.style
        }}>
            <Splitter style={{
                flex: 1,
                height: 0
            }} onResize={(size) => {
                updateMainTabSizes([size[0], size[1]]);
            }}>
                <Splitter.Panel size={mainTabSizes[0]} min={"20%"} max={"50%"}>
                    <InterfaceNavigatorApp interfacePath={interfacePath}
                        settings={interfaceSettings}
                        onChangeSettings={onChangeInterfaceSettings}
                        onSelectFile={onSelectFile}
                        executeCommand={onExecuteCommand}
                        onChangeInterfacePath={async (path) => {
                            console.log("Interface path changed to:", path);
                            await pushHistory(path, true);
                            updateInterfacePath(path);
                        }} />
                </Splitter.Panel>
                <Splitter.Panel size={mainTabSizes[1]}>
                    <div style={{
                        width: "100%",
                        height: "100%",
                        flexDirection: "column",
                    }}>
                        <Splitter layout={"vertical"} style={{
                            flex: 1
                        }} onResize={(size) => {
                            updateSubTabSizes([size[0], size[1]]);
                        }}>
                            <Splitter.Panel size={subTabSizes[0]}>
                                <InterfaceEditor
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: rightPanelType === "editor" ? "flex" : "none"
                                    }}
                                    filePath={editorFilePath}
                                />
                                <TopologyApp
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: rightPanelType === "topology" ? "flex" : "none"
                                    }}
                                    ref={topologyAppRef}
                                    data={topologyData}
                                    onGetConfig={onGetTopologyConfig}
                                    onSaveConfig={onSaveTopologyConfig}
                                    settings={interfaceSettings}
                                    onChangeSettings={onChangeInterfaceSettings}
                                    onChangeData={onChangeTopologyData}
                                    onSaveData={onSaveTopologyData}
                                    onUndo={onUndoTopologyData}
                                    onRedo={onRedoTopologyData}
                                    onGenerate={onGenerate}
                                />
                            </Splitter.Panel>
                            <Splitter.Panel size={subTabSizes[1]}>
                                <TerminalApp ref={terminalAppRef} />
                            </Splitter.Panel>
                        </Splitter>
                    </div>
                </Splitter.Panel>
            </Splitter>
        </div>
    );
});