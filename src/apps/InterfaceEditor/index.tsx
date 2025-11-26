import { forwardRef, useEffect, useRef } from "react";
import { Editor, loader, OnMount } from "@monaco-editor/react";
import { usePropsRef, useUpdate } from "../../natived";
import { Button, message, Spin, Tooltip } from "antd";
import { pathUtils } from "../../services/utils";
import { PlayCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { localServices } from "../../services/localServices";
import { editor } from "monaco-editor";
import * as monaco from 'monaco-editor'

import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import parserHtml from 'prettier/parser-html';
import parserCss from 'prettier/parser-postcss';
import parserTypescript from 'prettier/parser-typescript';

export interface FormatOptions {
    printWidth?: number;
    tabWidth?: number;
    useTabs?: boolean;
    semi?: boolean;
    singleQuote?: boolean;
    trailingComma?: 'es5' | 'none' | 'all';
    bracketSpacing?: boolean;
    bracketSameLine?: boolean;
    arrowParens?: 'avoid' | 'always';
}

export const formatCode = async (
    code: string,
    language: string,
    options: FormatOptions = {}
) => {
    try {
        const defaultOptions: FormatOptions = {
            printWidth: 80,
            tabWidth: 2,
            useTabs: false,
            semi: true,
            singleQuote: true,
            trailingComma: 'es5',
            bracketSpacing: true,
            bracketSameLine: false,
            arrowParens: 'avoid',
            ...options
        };

        let parser: string;
        let plugins: any[] = [];

        switch (language) {
            case 'javascript':
                parser = 'babel';
                plugins = [parserBabel];
                break;
            case 'typescript':
                parser = 'typescript';
                plugins = [parserTypescript];
                break;
            case 'html':
                parser = 'html';
                plugins = [parserHtml];
                break;
            case 'css':
            case 'scss':
            case 'less':
                parser = 'css';
                plugins = [parserCss];
                break;
            case 'json':
                parser = 'json';
                plugins = [parserBabel];
                break;
            default:
                parser = 'babel';
                plugins = [parserBabel];
        }

        return await prettier.format(code, {
            parser,
            plugins,
            ...defaultOptions
        });
    } catch (error) {
        console.error('Format error:', error);
        return code; // 格式化失败时返回原代码
    }
};
let isSetuped = false;
export const setupMonaco = () => {
    if (isSetuped) {
        return;
    }
    isSetuped = true;
    // 设置 JSON 格式化选项
    monaco.languages.json.jsonDefaults.setModeConfiguration({
        documentFormattingEdits: true
    });

    // 设置 TypeScript 格式化选项
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
    });

    // 注册格式化提供程序
    monaco.languages.registerDocumentFormattingEditProvider('javascript', {
        provideDocumentFormattingEdits: async (model, options) => {
            return [
                {
                    range: model.getFullModelRange(),
                    text: await formatCode(model.getValue(), model.getLanguageId()),
                },
            ];
        },
    });
};

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
            let model = editorRef.current?.getModel();
            if (model != null) {
                let extension = pathUtils.getFileExtension(filePath);
                switch (extension) {
                    case "json":
                        monaco.editor.setModelLanguage(model, 'json');
                        break;
                    case "html":
                        monaco.editor.setModelLanguage(model, 'html');
                        break;
                    case "ts":
                        monaco.editor.setModelLanguage(model, 'typescript');
                        break;
                    case "js":
                        monaco.editor.setModelLanguage(model, 'javascript');
                        break;
                    case "cpp":
                    case "cxx":
                    case "h":
                    case "hpp":
                        monaco.editor.setModelLanguage(model, 'cpp');
                        break;
                    case "c":
                        monaco.editor.setModelLanguage(model, 'c');
                        break;
                    case "java":
                        monaco.editor.setModelLanguage(model, 'java');
                        break;
                    case "py":
                        monaco.editor.setModelLanguage(model, 'python');
                        break;
                    case "md":
                        monaco.editor.setModelLanguage(model, 'markdown');
                        break;
                    default:
                        monaco.editor.setModelLanguage(model, 'plaintext');
                        break;

                }
            }
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
    setupMonaco();
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