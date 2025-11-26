import { Splitter } from "antd";
import { forwardRef, useEffect, useRef } from "react";
import { InterfaceNavigatorApp } from "../InterfaceNavigatorApp";
import { useUpdate } from "../../natived";
import { Editor, loader } from "@monaco-editor/react";
import * as monaco from 'monaco-editor'
import { historyAppActions, pushHistory } from "../ProjectsApp";
import { clientServices } from "../../services/clientServices";
import { IAnynomousNode, ITopologyAppRef, ITopologySettingsRecord, TopologyApp } from "../TopologyApp";
import { pathUtils } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { InterfaceEditor } from "../InterfaceEditor";
import { TerminalApp } from "../TerminalApp";

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
    const [mainTabSizes, updateMainTabSizes, mainTabSizesRef] = useUpdate<(number | undefined)[]>([300, undefined]);
    const [subTabSizes, updateSubTabSizes, subTabSizesRef] = useUpdate<(number | undefined)[]>([undefined, 300]);
    const [topologySettings, updateTopologySettings, topologySettingsRef] = useUpdate<ITopologySettingsRecord[]>([
        { key: "EnableKeyField", value: true, type: "boolean" },
        { key: "FilterKeyFields", value: "", type: "string" },
        { key: "TitleField", value: "", type: "string" },
        { key: "NodeWidth", value: 300, type: "number" },
        { key: "NodeHeight", value: 180, type: "number" },
        { key: "IDField", value: "key", type: "string" }
    ]);
    const topologyAppRef = useRef<ITopologyAppRef>(null);
    const onSelectFile = async (path: string) => {
        let pathDirectoryName = pathUtils.getFileName(pathUtils.getDirectoryName(path));
        if (path.endsWith(".json")) {
            if (pathDirectoryName == "cases") {
                let data = JSON.parse(await localServices.file.read(path));
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
        onInitializeTopologySettings();
    }, [interfacePath]);
    useEffect(() => {
        onInitializeTopologySettings();
    }, []);
    const onInitializeTopologySettings = async () => {
        let settingsFilePath = `${interfacePathRef.current}/settings.json`;
        if (await localServices.file.fileExists(settingsFilePath)) {
            let settings = await localServices.file.read(settingsFilePath);
            if (settings) {
                let cacheSettings = (JSON.parse(settings)["topology"] ?? []) as ITopologySettingsRecord[];
                updateTopologySettings(old => {
                    return old.map(s => {
                        let cacheSetting = cacheSettings.find(c => c.key === s.key);
                        return cacheSetting ? { ...s, ...cacheSetting } : s;
                    });
                });
            }
        }
    }
    const onChangeTopologySettings = async (settings: ITopologySettingsRecord[]) => {
        if (interfacePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.directoryExists(interfacePathRef.current)) {
            let settingsFilePath = `${interfacePathRef.current}/settings.json`;
            let originalSettings: {
                topology: ITopologySettingsRecord[]
            } = {
                topology: []
            };
            if (await localServices.file.fileExists(settingsFilePath)) {
                originalSettings = JSON.parse(await localServices.file.read(settingsFilePath));
            }
            originalSettings.topology = settings;
            await localServices.file.write(settingsFilePath, JSON.stringify(originalSettings));
            updateTopologySettings(settings);
        }
    }
    const onChangeTopologyData = async (data: IAnynomousNode[]) => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.fileExists(topologyFilePathRef.current)) {
            await localServices.file.write(topologyFilePathRef.current, JSON.stringify(data));
        }
        updateTopologyData(data);
        await localServices.history.push(topologyFilePathRef.current, JSON.stringify(data));
    }
    const onSaveTopologyData = async (data: IAnynomousNode[]) => {
        if (topologyFilePathRef.current == undefined) {
            return;
        }
        if (await localServices.file.fileExists(topologyFilePathRef.current)) {
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
                        onSelectFile={onSelectFile}
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
                                    settings={topologySettings}
                                    onChangeSettings={onChangeTopologySettings}
                                    onChangeData={onChangeTopologyData}
                                    onSaveData={onSaveTopologyData}
                                    onUndo={onUndoTopologyData}
                                    onRedo={onRedoTopologyData}
                                />
                            </Splitter.Panel>
                            <Splitter.Panel size={subTabSizes[1]}>
                                <TerminalApp />
                            </Splitter.Panel>
                        </Splitter>
                    </div>
                </Splitter.Panel>
            </Splitter>
        </div>
    );
});