import { Button, Dropdown, Input, List, message, Space, Spin, Switch, Tabs, Tooltip } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { pathUtils, useModal } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { clientServices } from "../../services/clientServices";
import { ArrowsAltOutlined, CopyOutlined, DeleteOutlined, DownOutlined, FolderOpenOutlined, MenuOutlined, PlusOutlined } from "@ant-design/icons";
import { FileDialog } from "../FileDialog";
import { useUpdate } from "../../natived/lib/Util";
import TerminalSvg from "../../svgs/Terminal.svg?react";
import CommitSvg from "../../svgs/Commit.svg?react";
import BranchSvg from "../../svgs/Branches.svg?react";
import { broadcastSwitchToHome, homeAppActions, homeAppName } from "../../pages/Home";

export interface IHistoryInfo {
    path: string,
    lastUsedTime: number
}

export interface HistoryRecord extends IHistoryInfo {
    key: string
}
export const historyFileName = "history.json";
export const historyAppName = "history-app";
export const historyAppActions = {
    refresh: "refresh",
    selectHistory: "select-history",
}
export const broadcastSelectHistoryFromHistoryToAll = (history: HistoryRecord) => {
    clientServices.broadcast({
        is_broadcast_message: true,
        from: historyAppName,
        to: "all",
        data: {
            action: historyAppActions.selectHistory,
            history: history
        }
    });
};
export const broadcastRefreshHistoryToHistory = () => {
    clientServices.broadcast({
        is_broadcast_message: true,
        from: "unknown",
        to: historyAppName,
        data: {
            action: "refresh"
        }
    });
};
export const pushHistory = async (path: string, isBroadcast: boolean = true) => {
    let project: IHistoryInfo = {
        path: path.replace(/\\/g, "/"),
        lastUsedTime: Date.now()
    };
    let projectsString = await localServices.file.readAppdata(historyFileName);
    let projects: IHistoryInfo[] = [];
    if (projectsString != "") {
        projects = JSON.parse(projectsString) as IHistoryInfo[];
    }
    let existingIndex = projects.findIndex(p => p.path == project.path);
    if (existingIndex > -1) {
        projects.splice(existingIndex, 1);
    }
    projects.unshift(project);
    if (projects.length > 99) {
        projects.pop();
    }
    await localServices.file.writeAppdata(historyFileName, JSON.stringify(projects));
    broadcastRefreshHistoryToHistory();
};



export const ProjectsApp = forwardRef<{}, {
    style?: React.CSSProperties;
}>((props, ref) => {
    const { showModal, modalContainer } = useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const [histories, setHistories] = useState<HistoryRecord[]>([]);
    const [historyRepeatedNames, setHistoryRepeatedNames] = useState<string[]>([]);
    const [historyLoading, updateHistoryLoading, historyLoadingRef] = useUpdate({
        loading: 0,
        message: "",
        progress: undefined
    });
    const [neuecaxLoading, updateNeuecaxLoading, neuecaxLoadingRef] = useUpdate({
        loading: 0,
        message: "",
        progress: undefined
    });
    type TabEnum = "history";
    const [tab, setTab] = useState<TabEnum>("history");
    useEffect(() => {
        setHistoryRepeatedNames(histories.map(p => pathUtils.getFileName(p.path)).filter((name, index, self) => self.indexOf(name) !== index));
    }, [histories]);
    const Try = async (options: {
        useHistoryLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useHistoryLoading) {
            updateHistoryLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        try {
            await callback();
        } catch (error) {
            let isInnerError = false;
            if (options.useHistoryLoading && historyLoadingRef.current.loading > 1) {
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
            if (options.useHistoryLoading) {
                updateHistoryLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };
    const onSelectHistory = (history: HistoryRecord) => {
        broadcastSelectHistoryFromHistoryToAll(history);
        broadcastSwitchToHome("git", historyAppName);
    };
    const onDeleteHistory = async (project: HistoryRecord) => {
        let projectsString = await localServices.file.readAppdata(historyFileName);
        let projects: IHistoryInfo[] = JSON.parse(projectsString) as IHistoryInfo[];
        let index = projects.findIndex(p => p.path == project.path);
        if (index > -1) {
            projects.splice(index, 1);
        }
        await localServices.file.writeAppdata(historyFileName, JSON.stringify(projects));
        setHistories(projects.map(p => ({
            key: p.path,
            ...p
        })));
    };
    const initializeHistoryRef = useRef(async () => {
        await Try({ useHistoryLoading: true }, async () => {
            let projectsString = await localServices.file.readAppdata(historyFileName);
            if (projectsString == "") {
                projectsString = "[]";
            }
            let projects = JSON.parse(projectsString) as IHistoryInfo[];
            setHistories(projects.map(p => ({
                key: p.path,
                ...p
            })));
        });
    });
    const onExploreHistory = async (history: HistoryRecord) => {
        await localServices.file.openDirectoryInExplorer(history.path);
    };
    const onCopyHistoryPath = async (history: HistoryRecord) => {
        await navigator.clipboard.writeText(history.path);
        messageApi.success("Copied to clipboard");
    };
    const onAddHistory = async () => {
        let currentFolder: string | undefined = undefined;
        let accept = await showModal((self) => {
            return <FileDialog
                style={{
                    flex: 1,
                    height: 0
                }}
                defaultCurrentFolder={currentFolder}
                onCurrentFolderChange={(path) => currentFolder = path} />
        }, {
            contentStyles: {
                padding: "10px 0"
            },
            footerStyles: {
                padding: "0px 10px"
            },
            bodyStyles: {
                height: "65vh",
                display: "flex",
                flexDirection: "column"
            },
            width: "80vw"
        })
        if (accept) {
            await Try({ useHistoryLoading: true }, async () => {
                if (currentFolder != undefined) {
                    let tempProject: HistoryRecord = {
                        key: currentFolder,
                        path: currentFolder,
                        lastUsedTime: Date.now()
                    };
                    await pushHistory(currentFolder);
                    onSelectHistory(tempProject);
                }
            });
        }
    };
    const getHistoryAlias = (history: HistoryRecord) => {
        let name = pathUtils.getFileName(history.path);
        let repeatedIndex = historyRepeatedNames.findIndex(n => n == name);
        if (repeatedIndex == -1) {
            return name;
        }
        return `${pathUtils.getFileName(pathUtils.getDirectoryName(history.path))}/${name}`;
    };
    useEffect(() => {
        let func = async () => {
            await Try({}, async () => {
                await initializeHistoryRef.current();
            });
        };
        func();
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == historyAppName && message.data.action == "refresh") {
                initializeHistoryRef.current();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        ...props.style
    }}>
        {contextHolder}
        {modalContainer}
        <Tabs activeKey={tab} onChange={(key) => setTab(key as TabEnum)} items={[{
            key: "history",
            label: "History",
            children: undefined
        }, {
            key: "neuecax-workspace",
            label: "Neuecax-Workspace",
            children: undefined
        }]} tabBarExtraContent={{
            right: tab == "history" ? <Tooltip title="Add folder"><Button type="text" icon={<PlusOutlined />} onClick={() => onAddHistory()} >Add Folder</Button></Tooltip> : undefined
        }} />
        <div style={{
            position: "relative",
            display: tab == "history" ? "flex" : "none",
            flex: 1,
            flexDirection: "column",
            height: 0
        }}>
            <List style={{
                display: "block",
                flex: 1,
                height: 0,
                overflowY: "auto"
            }}
                dataSource={histories}
                renderItem={item => <List.Item style={{
                }}
                    actions={[
                        <Tooltip title="Remove item from history"><Button type="text" icon={<DeleteOutlined />} danger onClick={() => onDeleteHistory(item)} /></Tooltip>,
                        <Tooltip title="Explore item in file explorer"><Button type="text" icon={<FolderOpenOutlined />} onClick={() => onExploreHistory(item)} /></Tooltip>,
                        <Tooltip title="Copy item path to clipboard"><Button type="text" icon={<CopyOutlined />} onClick={() => onCopyHistoryPath(item)} /></Tooltip>,
                    ]}>
                    <List.Item.Meta
                        title={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory(item)}>{getHistoryAlias(item)}</span>}
                        description={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory(item)}>{item.path.replace(/\\/g, "/")}</span>}
                    />
                </List.Item>}
            />
            <div style={{
                display: historyLoading.loading > 0 ? 'flex' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.02)',
                zIndex: 10
            }}>
                <Spin tip={historyLoading.message} percent={historyLoading.progress} />
            </div>
        </div>
    </div>
});