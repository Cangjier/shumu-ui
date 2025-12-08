import { Button, Dropdown, List, Splitter, Tabs } from "antd";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useUpdate } from "../../natived";
import { ITerminalConstructor, localServices } from "../../services/localServices";
import Icon, { CloseOutlined, CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { DelayedSaver } from "../../services/DelayedSaver";
import { SerializeAddon } from "@xterm/addon-serialize";
import TerminalSVG from "../../svgs/Terminal.svg?react";

export interface ITerminalState {
    id: string;
    raw: string;
    rows: number;
    cols: number;
}

export interface ITerminalAppProps {
    style?: React.CSSProperties;
}
export interface ITerminalAppRef {
    cd: (path: string) => Promise<void>;
    executeCommand: (command: string) => Promise<void>;
}
export const TerminalApp = forwardRef<ITerminalAppRef, ITerminalAppProps>((props, ref) => {
    const [tabs, updateTabs, tabsRef] = useUpdate<{
        label: string;
        key: string;
    }[]>([]);
    const [splitSizes, updateSplitSizes] = useUpdate<(number | undefined)[]>([undefined, 120]);
    const [activeTab, updateActiveTab, activeTabRef] = useUpdate<string>("");
    const terminalsRef = useRef<{
        [key: string]: {
            terminal: Terminal;
            container: HTMLDivElement | null;
            terminalEnd: ITerminalConstructor;
            fitAddon: FitAddon;
            serializeAddon: SerializeAddon;
            resizeObserver: ResizeObserver | null
        }
    }>({});
    const listensRef = useRef<((id: string, bytes: Uint8Array) => void)[]>([]);
    const terminalEndRef = useRef<ITerminalConstructor | null>(null);
    const delayedSaverRef = useRef<DelayedSaver<ITerminalState> | null>(null);
    const saveTerminal = (id: string) => {
        let terminalRef = terminalsRef.current[id];
        if (terminalRef) {
            delayedSaverRef.current?.triggerSave({
                getData: () => serializeTerminal(id, terminalRef.terminal)
            });
        }
    };
    const initializeRef = useRef(async () => {
        let terminalEnd = localServices.terminalConstructor();
        await terminalEnd.initialize();
        terminalEndRef.current = terminalEnd;
        delayedSaverRef.current = new DelayedSaver<ITerminalState>(async (data) => {
            await terminalEnd.save(data.id, data);
        });
        const unlisten = terminalEnd.listen((id) => tabsRef.current.some(tab => tab.key == id), (id, bytes) => {
            let terminalFront = terminalsRef.current[id];
            if (terminalFront) {
                terminalEndRef.current?.debug(`terminal-write: ${id}, ${bytes.length}bytes`);
                terminalFront.terminal.write(bytes);
                listensRef.current.forEach(listen => listen(id, bytes));
                saveTerminal(id);
            }
        });
        const ids = await terminalEnd.list();
        for (const id of ids) {
            addTab(terminalEnd, id);
        }
        return () => {
            unlisten();
        }
    });
    const onCloseTab = (key: string) => {
        let terminalEnd = terminalEndRef.current;
        if (terminalEnd) {
            terminalEnd.close(key);
            updateTabs(tabs.filter(tab => tab.key != key));
        }
    }
    const addTab = (terminalEnd: ITerminalConstructor, id: string) => {
        const fitAddon = new FitAddon();
        const serializeAddon = new SerializeAddon();
        const term = new Terminal({
            convertEol: true,
            fontSize: 14,
            theme: {
                background: "#ffffff",
                foreground: "#333333",

                cursor: "#000000",
                cursorAccent: "#ffffff",

                // selection: "#add6ff80",
                selectionBackground: "#ADD6FF80",   // VS Code 的浅蓝选区
                selectionForeground: "#000000",     // 选中文字变黑，VS Code 的默认行为

                black: "#000000",
                red: "#cd3131",
                green: "#008000",
                yellow: "#b5ba00",
                blue: "#0451a5",
                magenta: "#bc05bc",
                cyan: "#0598bc",
                white: "#555555",

                brightBlack: "#666666",
                brightRed: "#cd3131",
                brightGreen: "#0dbc79",
                brightYellow: "#e5e510",
                brightBlue: "#2472c8",
                brightMagenta: "#bc05bc",
                brightCyan: "#11a8cd",
                brightWhite: "#ffffff"
            }
        });

        terminalsRef.current[id] = {
            terminal: term,
            terminalEnd: terminalEnd,
            container: null,
            fitAddon: fitAddon,
            serializeAddon: serializeAddon,
            resizeObserver: null
        };
        term.loadAddon(fitAddon);
        term.loadAddon(serializeAddon);
        term.onData((data) => {
            terminalEnd.send(id, data);
        });
        updateTabs([...tabs, {
            label: "cmd",
            key: id
        }]);
    };
    const onOpenTab = async () => {
        let terminalEnd = terminalEndRef.current;
        if (terminalEnd) {
            let id = await terminalEnd.create({

            });
            addTab(terminalEnd, id);
            updateActiveTab(id);
        }
    };
    const serializeTerminal = (id: string, terminal: Terminal) => {
        let serializeAddon = terminalsRef.current[id].serializeAddon;
        (window as any).serializeAddon = serializeAddon;
        return {
            id: id,
            raw: serializeAddon.serialize(),
            rows: terminal.rows,
            cols: terminal.cols
        } as ITerminalState;
    };
    const deserializeTerminal = (id: string, terminal: Terminal, data: ITerminalState) => {
        terminal.reset();
        if (data.cols && data.rows) {
            terminal.resize(data.cols, data.rows);
        }
        terminal.write(data.raw);
        terminal.scrollToBottom();
    };
    const loadTerminal = async (id: string) => {
        let terminalEnd = terminalEndRef.current;
        if (terminalEnd) {
            let data = await terminalEnd.load(id);
            let terminalRef = terminalsRef.current[id];
            if (terminalRef) {
                deserializeTerminal(id, terminalRef.terminal, data);
            }
            else {
                throw new Error(`Terminal ${id} not found`);
            }
        }
    };
    const onActiveTabChange = (key: string) => {
        updateActiveTab(key);
        let terminalRef = terminalsRef.current[key];
        if (terminalRef) {
            terminalRef.terminal.focus();
            // terminalRef.terminal.refresh(0, terminalRef.terminal.rows - 1);
        }
    };
    const onCopy = async () => {
        let terminalRef = terminalsRef.current[activeTab];
        if (terminalRef) {
            console.log(`Copy: ${terminalRef.terminal.getSelection()}`);
            await navigator.clipboard.writeText(terminalRef.terminal.getSelection());
        }
        else {
            console.error(`onCopy: Terminal ${activeTab} not found`);
        }
    };
    const onPaste = async () => {
        async () => {
            let terminalRef = terminalsRef.current[activeTab];
            if (terminalRef) {
                await navigator.clipboard.readText().then(text => {
                    console.log(`Paste: ${text}`);
                    terminalEndRef.current?.send(activeTabRef.current, text);
                });
            }
            else {
                console.error(`onPaste: Terminal ${activeTab} not found`);
            }
        }
    };
    const getActiveTerminal = async (path?: string) => {
        let terminalEnd = terminalEndRef.current;
        if (Object.keys(terminalsRef.current).length == 0) {
            if (terminalEnd) {
                let id = await terminalEnd.create({
                    workingDirectory: path,
                });
                addTab(terminalEnd, id);
                updateActiveTab(id);
            }
        }
        else {
            let terminalRef = terminalsRef.current[activeTab];
            if (terminalRef == undefined && Object.keys(terminalsRef.current).length > 0) {
                updateActiveTab(Object.keys(terminalsRef.current)[0]);
                terminalRef = terminalsRef.current[Object.keys(terminalsRef.current)[0]];
            }
        }
        return {
            activeTab: activeTabRef.current,
            ...terminalsRef.current[activeTabRef.current]
        }
    }
    const onCD = async (path: string) => {
        let terminalEnd = terminalEndRef.current;
        if (Object.keys(terminalsRef.current).length == 0) {
            if (terminalEnd) {
                let id = await terminalEnd.create({
                    workingDirectory: path,
                });
                addTab(terminalEnd, id);
                updateActiveTab(id);
            }
        }
        else {
            let terminalRef = terminalsRef.current[activeTab];
            if (terminalRef == undefined && Object.keys(terminalsRef.current).length > 0) {
                updateActiveTab(Object.keys(terminalsRef.current)[0]);
                terminalRef = terminalsRef.current[Object.keys(terminalsRef.current)[0]];
            }
            if (terminalRef) {
                terminalEnd?.send(activeTabRef.current, `cd "${path}"\r`);
            }
        }
    }
    const executeCommand = async (command: string) => {
        let terminalRef = await getActiveTerminal();
        let done = `done-${Date.now()}`;

        let buffer = "";
        let promiseResolve: (value: string | PromiseLike<string>) => void = () => { };
        const promise = new Promise<string>((resolve, reject) => {
            promiseResolve = resolve;
        });
        const listen = (id: string, bytes: Uint8Array) => {
            if (id !== terminalRef.activeTab) return;
            buffer += String.fromCharCode(...bytes);
            if (buffer.includes(`\n${done}`)) {
                promiseResolve("");
            }
        }
        listensRef.current.push(listen);
        await terminalRef.terminalEnd.send(terminalRef.activeTab, `${command} & echo ${done}\r`);
        await promise;
        listensRef.current = listensRef.current.filter(listen => listen !== listen);
    }
    useImperativeHandle(ref, () => ({
        cd: onCD,
        executeCommand: executeCommand
    }), []);
    useEffect(() => {
        initializeRef.current();
    }, []);
    return <div style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        overflowX: "hidden",
        ...props.style
    }}>
        <Splitter layout="horizontal" onResize={updateSplitSizes}>
            <Splitter.Panel size={splitSizes[0]}>
                <Dropdown trigger={["contextMenu"]} menu={{
                    items: [
                        {
                            label: "Copy",
                            key: "copy",
                            icon: <CopyOutlined />,
                            onClick: onCopy
                        },
                        {
                            label: "Paste",
                            key: "paste",
                            icon: <PlusOutlined />,
                            onClick: onPaste
                        }
                    ]
                }}>
                    <div style={{
                        position: "relative", width: "100%",
                        height: "100%",
                    }}>
                        {tabs.map((tab) => (
                            <div key={tab.key}
                                style={{
                                    position: "absolute",
                                    visibility: (activeTab === tab.key) ? "visible" : "hidden",
                                    inset: 0
                                }} ref={s => {
                                    if (terminalsRef.current[tab.key] && s && terminalsRef.current[tab.key].container == null) {
                                        terminalsRef.current[tab.key].container = s;
                                        terminalsRef.current[tab.key].terminal.open(s);
                                        let func = async () => {
                                            await terminalsRef.current[tab.key].terminalEnd.start(tab.key);
                                            try {
                                                await loadTerminal(tab.key);
                                            }
                                            catch (error) {
                                                terminalEndRef.current?.debug(`loadTerminal error: ${tab.key}, ${error}`);
                                            }
                                            const lastResize = {
                                                rows: terminalsRef.current[tab.key].terminal.rows,
                                                cols: terminalsRef.current[tab.key].terminal.cols
                                            };
                                            const resize = () => {
                                                terminalEndRef.current?.debug(`resize: ${tab.key}`);
                                                terminalsRef.current[tab.key].fitAddon.fit();
                                                const { cols, rows } = terminalsRef.current[tab.key].terminal;
                                                if (lastResize.cols != cols || lastResize.rows != rows) {
                                                    lastResize.cols = cols;
                                                    lastResize.rows = rows;
                                                    terminalsRef.current[tab.key].terminalEnd.resize(tab.key, rows, cols);
                                                }
                                            }
                                            await new Promise(resolve => setTimeout(resolve, 200));
                                            const resizeObserver = new ResizeObserver(resize);
                                            terminalsRef.current[tab.key].resizeObserver = resizeObserver;
                                            resizeObserver.observe(s);
                                        }
                                        func();
                                    }
                                }} />
                        ))}
                    </div>
                </Dropdown>
            </Splitter.Panel>
            <Splitter.Panel size={splitSizes[1]}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    width: "100%"
                }}>
                    <div style={{
                        gap: "5px",
                        padding: "5px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}>
                        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                            <PlusOutlined onClick={onOpenTab} />
                        </div>
                        {tabs.map((tab) => (
                            <div key={tab.key} style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                cursor: "pointer",
                                backgroundColor: (activeTab === tab.key) ? "#f0f0f0" : "transparent",
                                borderRadius: "2px",
                                padding: "0px 5px",
                                gap: "5px",
                                boxShadow: (activeTab === tab.key) ? "0 0 5px 0 rgba(0, 0, 0, 0.1)" : "none",
                                transition: "all 0.3s ease"
                            }}>
                                <Icon component={TerminalSVG} onClick={() => onActiveTabChange(tab.key)} />
                                <div style={{ flex: 1, display: "flex", flexDirection: "column" }} onClick={() => onActiveTabChange(tab.key)}>
                                    {tab.label}
                                </div>
                                <Icon component={CloseOutlined} onClick={() => onCloseTab(tab.key)} />
                            </div>
                        ))}
                    </div>

                </div>
            </Splitter.Panel>
        </Splitter>


    </div>
});