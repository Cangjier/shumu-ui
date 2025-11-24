import { Tabs } from "antd";
import { forwardRef, useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useUpdate } from "../../natived";
import { ITerminalConstructor, localServices } from "../../services/localServices";


export interface ITerminalAppProps {
    style?: React.CSSProperties;
}
export interface ITerminalAppRef {
}
export const TerminalApp = forwardRef<ITerminalAppRef, ITerminalAppProps>((props, ref) => {
    const [tabs, updateTabs, tabsRef] = useUpdate<{
        label: string;
        key: string;
    }[]>([]);
    const [activeTab, updateActiveTab] = useUpdate<string>("");
    const terminalsRef = useRef<{
        [key: string]: {
            terminal: Terminal;
            container: HTMLDivElement | null;
            terminalEnd: ITerminalConstructor;
        }
    }>({});
    const terminalEndRef = useRef<ITerminalConstructor | null>(null);
    const initializeRef = useRef(() => {
        let terminalEnd = localServices.terminalConstructor();
        terminalEnd.initialize();
        terminalEndRef.current = terminalEnd;
        const unlisten = terminalEnd.listen((id) => tabsRef.current.some(tab => tab.key == id), (id, bytes) => {
            let terminalFront = terminalsRef.current[id];
            if (terminalFront) {
                terminalFront.terminal.write(bytes);
            }
        });
        return () => {
            unlisten();
        }
    });
    const onCloseTab = (key: string) => {
        let terminalEnd = terminalEndRef.current;
        if (terminalEnd) {
            terminalEnd.close(key);
        }
    }
    const onOpenTab = async () => {
        let terminalEnd = terminalEndRef.current;
        if (terminalEnd) {
            let id = await terminalEnd.create({

            });
            const fitAddon = new FitAddon();
            const term = new Terminal({
                convertEol: true,
                fontSize: 14,
                theme: { background: "#1e1e1e" },
            });

            terminalsRef.current[id] = {
                terminal: term,
                terminalEnd: terminalEnd,
                container: null
            };
            term.loadAddon(fitAddon);
            term.onData((data) => {
                terminalEnd.send(id, data);
            });
            updateTabs([...tabs, {
                label: id,
                key: id
            }]);
            updateActiveTab(id);

        }
    }
    useEffect(() => {
        initializeRef.current();
    }, []);
    return <div style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        ...props.style
    }}>
        {tabs.map((tab) => (
            <div key={tab.key}
                style={{
                    display: activeTab === tab.key ? "flex" : "none",
                    flex: 1,
                }} ref={s => {
                    if (terminalsRef.current[tab.key] && s) {
                        terminalsRef.current[tab.key].container = s;
                        terminalsRef.current[tab.key].terminal.open(s);
                        terminalsRef.current[tab.key].terminalEnd.start(tab.key);
                    }
                }} />
        ))}
        <Tabs
            size={"small"}
            type="editable-card"
            tabPosition="right"
            items={tabs}
            activeKey={activeTab}
            onChange={updateActiveTab}
            onEdit={(e: React.MouseEvent | React.KeyboardEvent | string, action: "add" | "remove") => {
                if (action === "remove") {
                    onCloseTab(e as string);
                }
                else if (action === "add") {
                    onOpenTab();
                }
            }}
        />
    </div>
});