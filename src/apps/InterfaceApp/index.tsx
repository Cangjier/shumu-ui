import { Splitter } from "antd";
import { forwardRef, useEffect } from "react";
import { InterfaceNavigatorApp } from "../InterfaceNavigatorApp";
import { useUpdate } from "../../natived";
import { Editor, loader } from "@monaco-editor/react";
import * as monaco from 'monaco-editor'
import { historyAppActions, pushHistory } from "../ProjectsApp";
import { clientServices } from "../../services/clientServices";
import { IAnynomousNode, TopologyApp } from "../TopologyApp";
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
    const [topologyData, updateTopologyData, topologyDataRef] = useUpdate<IAnynomousNode[]>([]);
    const [mainTabSizes, updateMainTabSizes, mainTabSizesRef] = useUpdate<(number | undefined)[]>([300, undefined]);
    const [subTabSizes, updateSubTabSizes, subTabSizesRef] = useUpdate<(number | undefined)[]>([undefined, 300]);
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
                updateRightPanelType("topology");
            }
            else {
                updateEditorFilePath(path);
                updateTopologyData([]);
                updateRightPanelType("editor");
            }
        }
        else {
            updateEditorFilePath(path);
            updateTopologyData([]);
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
                                        display: rightPanelType === "editor" ? "flex" : "none",
                                        flex: 1
                                    }}
                                    filePath={editorFilePath}
                                />
                                <TopologyApp
                                    style={{
                                        display: rightPanelType === "topology" ? "flex" : "none",
                                        flex: 1
                                    }}
                                    data={topologyData}
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