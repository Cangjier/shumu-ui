import { forwardRef, useRef } from "react";
import { Editor, loader } from "@monaco-editor/react";
import { useUpdate } from "../../natived";
import { Button, message, Spin, Tooltip } from "antd";
import { pathUtils } from "../../services/utils";
import { PlayCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { localServices } from "../../services/localServices";

export interface IInterfaceEditorProps {
    style?: React.CSSProperties;
    filePath: string;
}
export interface IInterfaceEditorRef {
}

export const InterfaceEditor = forwardRef<IInterfaceEditorRef, IInterfaceEditorProps>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [code, updateCode, codeRef] = useUpdate<string>("");
    const codeRawRef = useRef<string>("");
    const [codeChanged, updateCodeChanged, codeChangedRef] = useUpdate<boolean>(false);
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number;
        percent?: number;
        message?: string;
    }>({
        loading: 0,
        percent: undefined,
        message: undefined
    });
    const Try = async (options: {
        useLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useLoading) {
            updateLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        try {
            await callback();
        } catch (error) {
            let isInnerError = false;
            if (options.useLoading && loadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (isInnerError) {
                throw error;
            }
            else {
                if (error instanceof Error) {
                    messageApi.error(error.message);
                } else {
                    messageApi.error("Unknown error");
                }
            }
        } finally {
            if (options.useLoading) {
                updateLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };
    const saveModifiedCode = async (onSaved: () => void) => {
        await Try({ useLoading: true }, async () => {
            await localServices.file.write(`${props.filePath}`, codeRef.current);
            onSaved();
        });
    };
    const onRunCode = async () => {
        await Try({ useLoading: true }, async () => {
            console.log(codeRef.current);
        });
    };
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            ...props.style
        }}>
            {messageContextHolder}
            <div style={{
                display: "flex",
                flexDirection: "row",
                gap: "15px",
                alignItems: "center",
                padding: "5px 10px",
                borderRadius: "5px",
                backgroundColor: "#eee"
            }}>
                <div>{pathUtils.getFileName(props.filePath)}</div>
                <Tooltip title={codeChanged ? "Save" : "No changes to save"}>
                    <Button style={{
                        color: codeChanged ? "#ff4d4f" : "#aaa",
                    }} size={"small"} type="text" icon={<SaveOutlined />} onClick={() => {
                        saveModifiedCode(() => {
                            updateCodeChanged(false);
                            codeRawRef.current = codeRef.current;
                        });
                    }} />
                </Tooltip>
                <Tooltip title="Run"><Button size={"small"} type="text" icon={<PlayCircleOutlined />} onClick={() => onRunCode()} /></Tooltip>
            </div>
            <Editor
                value={code}
                onChange={(value, e) => {
                    updateCode(value ?? "");
                }}
            />
            <div style={{
                position: "absolute",
                display: loading.loading > 0 ? "flex" : "none",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}><Spin tip={loading.message} percent={loading.percent} /></div>
        </div>
    );
});