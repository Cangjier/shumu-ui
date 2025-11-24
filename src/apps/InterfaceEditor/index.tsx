import { forwardRef, useEffect, useRef } from "react";
import { Editor, loader, OnMount } from "@monaco-editor/react";
import { usePropsRef, useUpdate } from "../../natived";
import { Button, message, Spin, Tooltip } from "antd";
import { pathUtils } from "../../services/utils";
import { PlayCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { localServices } from "../../services/localServices";
import { editor } from "monaco-editor";
import * as monaco from 'monaco-editor'

export interface IInterfaceEditorProps {
    style?: React.CSSProperties;
    filePath: string | undefined;
}
export interface IInterfaceEditorRef {
}

export const InterfaceEditor = forwardRef<IInterfaceEditorRef, IInterfaceEditorProps>((props, ref) => {
    const propsRef = usePropsRef(props);
    const [messageApi, messageContextHolder] = message.useMessage();
    const [code, updateCode, codeRef] = useUpdate<string>("");
    const codeRawRef = useRef<string>("");
    const [codeChanged, updateCodeChanged, codeChangedRef] = useUpdate<boolean>(false);
    const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);
    const editorWordWrapRef = useRef<"on" | "off" | "wordWrapColumn" | "bounded" | undefined>("on");
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number;
        percent?: number;
        message?: string;
    }>({
        loading: 0,
        percent: undefined,
        message: undefined
    });
    const refreshRef = useRef(async (filePath: string | undefined) => {
        if (filePath == undefined) {
            updateCode("");
            codeRawRef.current = "";
            updateCodeChanged(false);
            return;
        }
        await Try({ useLoading: true }, async () => {
            if (filePath == undefined) {
                return;
            }
            let code = await localServices.file.read(filePath);
            if (code.includes("\r")) {
                editorRef.current?.getModel()?.setEOL(monaco.editor.EndOfLineSequence.CRLF);
            } else {
                editorRef.current?.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
            }
            updateCode(code);
            codeRawRef.current = code;
        });
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
    const onEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        editor.updateOptions({
            wordWrap: "on"
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (codeRef.current != codeRawRef.current) {
                saveModifiedCode(() => {
                    updateCodeChanged(false);
                    codeRawRef.current = codeRef.current;
                });
            }
        });
        // Alt+Z to wrap text
        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
            let wordWrap = editorWordWrapRef.current;
            if (wordWrap == "on") {
                wordWrap = "off";
            }
            else {
                wordWrap = "on";
            }
            editorWordWrapRef.current = wordWrap;
            editor.updateOptions({
                wordWrap: wordWrap
            });
        });
        const model = editor.getModel();
        if (model != null) {
            model.onDidChangeContent(() => {
                const modifiedValue = model.getValue();
                if (modifiedValue != codeRawRef.current) {
                    updateCode(modifiedValue);
                    updateCodeChanged(true);
                }
                else {
                    updateCodeChanged(false);
                }
            });
        }
    };
    useEffect(() => {
        refreshRef.current(props.filePath);
    }, [props.filePath]);
    return (
        <div style={{
            position: "relative",
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
                <div>{props.filePath ? pathUtils.getFileName(props.filePath) : "No file selected"}</div>
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
                onMount={onEditorMount}
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