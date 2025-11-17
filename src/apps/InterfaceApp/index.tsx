import { Splitter } from "antd";
import { forwardRef } from "react";
import { InterfaceNavigatorApp } from "../InterfaceNavigatorApp";
import { useUpdate } from "../../natived";
import { Editor, loader } from "@monaco-editor/react";

export interface IInterfaceAppProps {
    style?: React.CSSProperties;
}
export interface IInterfaceAppRef {
}
type RightPanelType = "none" | "editor";
export const InterfaceApp = forwardRef<IInterfaceAppRef, IInterfaceAppProps>((props, ref) => {
    const [interfacePath, updateInterfacePath, interfacePathRef] = useUpdate<string>("");
    const [rightPanel, updateRightPanel, rightPanelRef] = useUpdate<RightPanelType>("none");
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
                <Splitter.Panel defaultSize="240px" min="20px" max="50%">
                    <InterfaceNavigatorApp interfacePath={interfacePath} />
                </Splitter.Panel>
                <Splitter.Panel>
                    <div style={{
                        display: rightPanel === "editor" ? "flex" : "none",
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