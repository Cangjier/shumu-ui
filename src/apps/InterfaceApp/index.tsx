import { Splitter } from "antd";
import { forwardRef, useEffect } from "react";
import { InterfaceNavigatorApp } from "../InterfaceNavigatorApp";
import { useUpdate } from "../../natived";
import { Editor, loader } from "@monaco-editor/react";
import { historyAppActions, pushHistory } from "../ProjectsApp";
import { clientServices } from "../../services/clientServices";

export interface IInterfaceAppProps {
    style?: React.CSSProperties;
}
export interface IInterfaceAppRef {
}
type RightPanelType = "none" | "editor";
export const InterfaceApp = forwardRef<IInterfaceAppRef, IInterfaceAppProps>((props, ref) => {
    const [interfacePath, updateInterfacePath, interfacePathRef] = useUpdate<string>("");
    const [rightPanelType, updateRightPanelType, rightPanelTypeRef] = useUpdate<RightPanelType>("none");
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
            }}>
                <Splitter.Panel defaultSize="300px" min="20px" max="50%">
                    <InterfaceNavigatorApp interfacePath={interfacePath} onChangeInterfacePath={async (path) => {
                        console.log("Interface path changed to:", path);
                        await pushHistory(path, true);
                        updateInterfacePath(path);
                    }} />
                </Splitter.Panel>
                <Splitter.Panel>
                    <div style={{
                        display: rightPanelType === "editor" ? "flex" : "none",
                        width: "100%",
                        height: "100%",
                        flexDirection: "column",
                    }}>
                        <Editor
                        />
                    </div>
                </Splitter.Panel>
            </Splitter>
        </div>
    );
});