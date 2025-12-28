import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BezierEdge, Connection, Edge, Node } from "reactflow";
import { usePropsRef, useUpdate } from "../../natived";
import ELK, { ElkNode, LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { calculateWordCount, generateGUID, useModal } from "../../services/utils";

import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
    useNodesData,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import Icon, { ArrowLeftOutlined, ArrowRightOutlined, CloseOutlined, EditOutlined, ExpandOutlined, InfoCircleOutlined, PlusOutlined, RedoOutlined, SettingOutlined, UndoOutlined, VerticalLeftOutlined, VerticalRightOutlined } from "@ant-design/icons";
import { InputNumber, Input, Switch, Table, InputRef, message, Tooltip, Spin } from "antd";
import { ColumnProps } from "antd/es/table";
import { TableApp } from "../TableApp";
import GenerateSvg from "../../svgs/Generate.svg?react";
import TreeExpandSvg from "../../svgs/TreeExpand.svg?react";
import ClearSvg from "../../svgs/Clear.svg?react";
import { localServices } from "../../services/localServices";
import { ITableSettingsRecord, TableSettingsApp } from "../TableSettingsApp";
import { getInterfaceSettings, IInterfaceSettings, openInterfaceSettings } from "../InterfaceSettings";

const elk = new ELK();

export interface IAnynomousData {
    label: React.ReactNode;
    parentKey?: string;
    isRoot?: boolean;
    hasChildren?: boolean;
    depth?: number;
    raw?: IAnynomousNode;
}

const AnynomousView = forwardRef<{}, {
    settings: IInterfaceSettings;
    style?: React.CSSProperties;
    data: IAnynomousNode;
    collapsed?: boolean;
    onClose?: () => void;
    onEdit?: () => void;
    onGenerate?: () => void;
    onCollapse?: () => void;
    onExpand?: () => void;
    onClearChildren?: () => void;
    onMovePrevious?: () => void;
    onMoveNext?: () => void;
    onMoveFirst?: () => void;
    onMoveLast?: () => void;
    onAddChild?: () => void;
}>((props, ref) => {
    let keys = Object.keys(props.data).filter(key => key !== "children" &&
        key !== "key" &&
        props.settings.Topology.FilterKeyFields.includes(key) == false &&
        key !== props.settings.Topology.TitleField
    );
    const titleValue = (props.settings.Topology.TitleField && props.settings.Topology.TitleField in props.data) ? props.data[props.settings.Topology.TitleField] : undefined;
    const renderValue = (value: any) => {
        if (typeof value === "string") {
            let wordCount = calculateWordCount(value);
            if (wordCount > 100) {
                let lines = value.split(/[\r\n]+/).filter(line => line.trim().length > 0);
                return lines.map((line,index) => {
                    if(index == 0){
                        return <div key={line}>({wordCount}) {line}</div>;
                    }
                    else{
                        return <div key={line}>{line}</div>;
                    }
                });
            }
            else {
                let lines = value.split(/[\r\n]+/).filter(line => line.trim().length > 0);
                return lines.map(line => <div key={line}>{line}</div>);
            }

        }
        else {
            return value;
        }
    };
    return <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        ...props.style
    }}>
        {titleValue && titleValue.length > 0 ? <div style={{
            textAlign: "center",
            fontWeight: "bold"
        }}>{titleValue}</div> : undefined}
        <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            gap: "2px",
        }}>
            {keys.map(key => {
                return <div style={{
                    textAlign: "left",
                    whiteSpace: "pre-wrap",
                }} key={key}>{props.settings.Topology.EnableKeyField ? `${key}: ` : ""}{renderValue(props.data[key])}</div>
            })}
        </div>
        <div style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px"
        }}>
            <Tooltip title="Edit"><EditOutlined onClick={() => props.onEdit?.()} /></Tooltip>
            <Tooltip title="Close"><CloseOutlined onClick={() => props.onClose?.()} /></Tooltip>
            <Tooltip title="Generate"><Icon component={GenerateSvg} onClick={() => props.onGenerate?.()} /></Tooltip>
            {props.data.children && props.data.children.length > 0 ? <Tooltip title="Clear Children"><Icon component={ClearSvg} onClick={() => props.onClearChildren?.()} /></Tooltip> : undefined}
            {props.data.children && props.data.children.length > 0 ? <Tooltip title={props.collapsed ? "Expand" : "Collapse"}><Icon style={{
                color: props.collapsed ? "#1890ff" : "#999",
                fill: props.collapsed ? "#1890ff" : "#999"
            }} component={TreeExpandSvg} onClick={() => {
                if (props.collapsed) {
                    props.onExpand?.();
                }
                else {
                    props.onCollapse?.();
                }
            }} /></Tooltip> : undefined}
            <Tooltip title="Move First"><VerticalRightOutlined onClick={() => props.onMoveFirst?.()} /></Tooltip>
            <Tooltip title="Move Previous"><ArrowLeftOutlined onClick={() => props.onMovePrevious?.()} /></Tooltip>
            <Tooltip title="Move Next"><ArrowRightOutlined onClick={() => props.onMoveNext?.()} /></Tooltip>
            <Tooltip title="Move Last"><VerticalLeftOutlined onClick={() => props.onMoveLast?.()} /></Tooltip>
            <Tooltip title="Add Child"><PlusOutlined onClick={() => props.onAddChild?.()} /></Tooltip>
        </div>
    </div>
});

export const LayoutNodes = (nodes: Node<IAnynomousData>[], edges: Edge[], settings: IInterfaceSettings, options: LayoutOptions) => {
    const elkOptions = {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '80',
        'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.edgeRouting': 'SPLINES'
    };
    const isHorizontal = options['elk.direction'] === 'RIGHT';
    const graph = {
        id: 'root',
        layoutOptions: {
            ...elkOptions,
            ...options,
        },
        children: nodes.map((node) => ({
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            width: settings.Topology.NodeWidth ?? 300,
            height: settings.Topology.NodeHeight ?? 180,

        })),
        edges: edges,
    };

    return elk
        .layout(graph as any)
        .then((layoutedGraph) => ({
            nodes: layoutedGraph?.children?.map((node) => ({
                ...node,
                // React Flow expects a position property on the node instead of `x`
                // and `y` fields.
                position: { x: node.x, y: node.y },
            })),

            edges: layoutedGraph.edges,
        }))
        .catch(console.error);
};

export interface ITransformOptions {
    rawKeyField?: string
}

export interface ITopologyAppProps {
    style?: React.CSSProperties;
    data: IAnynomousNode[] | undefined;
    onGetConfig: () => Promise<any>;
    onSaveConfig: (config: any) => Promise<void>;
    onChangeData: (data: IAnynomousNode[]) => Promise<void>;
    onSaveData: (data: IAnynomousNode[]) => Promise<void>;
    settings: ITableSettingsRecord[];
    onChangeSettings: (settings: ITableSettingsRecord[]) => Promise<void>;
    onUndo: () => Promise<void>;
    onRedo: () => Promise<void>;
    onGenerate?: (commandLine: string) => Promise<void>;
}

export interface ITopologyAppRef {
    fitView: () => void;
    refresh: (isFitView: boolean) => Promise<void>;
}

export interface IAnynomousNode {
    children?: IAnynomousNode[],
    [key: string]: any
}


const TopologyAppInner = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    const propsRef = usePropsRef(props);
    const [messageApi, messageContextHolder] = message.useMessage();
    const { showModal, modalContainer } = useModal();
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [config, updateConfig, configRef] = useUpdate<{
        collapsedKeys?: string[];
    }>({
        collapsedKeys: [],
    });
    const nodesRef = useRef<Node<IAnynomousData>[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number;
        percent?: number;
        message?: string;
    }>({
        loading: 0,
        percent: undefined,
        message: undefined,
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
    const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds) as any), []);
    const generateNodeView = (itemKey: string, item: IAnynomousNode, settings: IInterfaceSettings) => {
        return <AnynomousView style={{
            width: "100%",
            height: "100%",
        }} settings={settings}
            data={item}
            onEdit={() => onEditNode(itemKey)}
            onClose={() => onCloseNode(itemKey)}
            onGenerate={() => onGenertate(itemKey)}
            onCollapse={() => onCollapse(itemKey)}
            onExpand={() => onExpand(itemKey)}
            onClearChildren={() => onClearChildren(itemKey)}
            onMoveFirst={() => onMoveFirst(itemKey)}
            onMovePrevious={() => onMovePrevious(itemKey)}
            onMoveNext={() => onMoveNext(itemKey)}
            onMoveLast={() => onMoveLast(itemKey)}
            onAddChild={() => onAddChild(itemKey)}
            collapsed={configRef.current.collapsedKeys?.includes(itemKey) ?? false}
        />
    };
    const FlattenNodes = (parentKey: string | undefined, raw: IAnynomousNode[], depth: number, settings: IInterfaceSettings, result: {
        nodes: Node<IAnynomousData>[],
        edges: Edge[]
    }) => {
        raw.forEach((item, index) => {
            const itemKey = item[settings.Topology.IDField ?? "key"] ?? generateGUID();
            result.nodes.push({
                id: itemKey,
                type: "mission",
                position: {
                    x: index,
                    y: depth
                },
                data: {
                    label: generateNodeView(itemKey, item, settings),
                    parentKey: parentKey,
                    isRoot: parentKey === undefined,
                    hasChildren: (item.children && item.children.length > 0) ?? false,
                    depth: depth,
                    raw: item
                }
            });
            if (parentKey) {
                result.edges.push({
                    id: `edge-${parentKey}-${itemKey}`,
                    source: parentKey,
                    target: itemKey,
                    type: 'bezier',
                });
            }
            if (item.children && item.children.length > 0 && configRef.current.collapsedKeys?.includes(itemKey) != true) {
                FlattenNodes(itemKey, item.children, depth + 1, settings, result);
            }
        });
    }
    const refreshRef = useRef(async (isFitView: boolean = true) => {
        if (propsRef.current.data == undefined) {
            setNodes([]);
            setEdges([]);
            return;
        }
        let config = await propsRef.current.onGetConfig?.();
        if (config) {
            updateConfig(config);
        }
        else {
            updateConfig({
                collapsedKeys: [],
            });
        }
        const tempNodes: Node<IAnynomousData>[] = [];
        const tempEdges: Edge[] = [];
        const settings = getInterfaceSettings(propsRef.current.settings);
        FlattenNodes(undefined, propsRef.current.data, 0, settings, { nodes: tempNodes, edges: tempEdges });
        const result = await LayoutNodes(tempNodes, tempEdges, settings, {
            "elk.direction": "DOWN"
        });
        console.log(result);
        setNodes(result?.nodes ?? []);
        setEdges(result?.edges ?? []);
        if (isFitView) {
            setTimeout(() => {
                fitView();
            }, 100);
        }
    });
    const onFitView = () => {
        fitView();
    }
    const onOpenSettings = async () => {
        let result = await openInterfaceSettings({
            settings: propsRef.current.settings,
            showModal: showModal,
            onFilterKey: (key: string) => key.startsWith("Topology."),
            mapKeys: undefined,
        });
        if (result) {
            propsRef.current.onChangeSettings?.(result.interfaceSettings);
            await refreshRef.current();
        }
    }
    const removeKeyFromData = (data: IAnynomousNode[], key: string, settings: IInterfaceSettings) => {
        let result = data;
        if (data.some(item => item[settings.Topology.IDField ?? "key"] === key)) {
            result = result.filter(item => item[settings.Topology.IDField ?? "key"] !== key);
        }
        for (let item of result) {
            if (item.children && item.children.length > 0) {
                item.children = removeKeyFromData(item.children, key, settings);
            }
        }
        return result;
    }
    const getNodeFromData: (data: IAnynomousNode[], key: string, settings: IInterfaceSettings) => IAnynomousNode | undefined = (data: IAnynomousNode[], key: string, settings: IInterfaceSettings) => {
        if (data.some(item => item[settings.Topology.IDField ?? "key"] === key)) {
            return data.find(item => item[settings.Topology.IDField ?? "key"] === key);
        }
        let result = undefined;
        for (let item of data) {
            if (item.children && item.children.length > 0) {
                result = getNodeFromData(item.children, key, settings);
                if (result != undefined) {
                    break;
                }
            }
        }
        return result;
    }
    const onCloseNode = async (nodeKey: string) => {
        const settings = getInterfaceSettings(propsRef.current.settings);
        let node = nodesRef.current.find(n => n.id === nodeKey);
        if (node == undefined) {
            messageApi.error("Node not found");
            return;
        }
        let raw = node.data.raw as IAnynomousNode;
        if (raw[settings.Topology.IDField ?? "key"] == undefined) {
            messageApi.error("Node key is undefined");
            return;
        }
        let data = propsRef.current.data;
        if (data == undefined) {
            messageApi.error("Data is undefined");
            return;
        }
        let newData = removeKeyFromData(data, raw[settings.Topology.IDField ?? "key"], settings);
        if (propsRef.current.onSaveData) {
            await propsRef.current.onSaveData(newData);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        await refreshRef.current(false);
    }
    const onEditNode = async (nodeKey: string) => {
        const settings = getInterfaceSettings(propsRef.current.settings);
        let node = nodesRef.current.find(n => n.id === nodeKey);
        if (node == undefined) {
            messageApi.error("Node not found");
            return;
        }
        let raw = node.data.raw as IAnynomousNode;
        if (raw[settings.Topology.IDField ?? "key"] == undefined) {
            messageApi.error("Node key is undefined");
            return;
        }
        let data = propsRef.current.data;
        if (data == undefined) {
            messageApi.error("Data is undefined");
            return;
        }
        let nodeData = getNodeFromData(data, raw[settings.Topology.IDField ?? "key"], settings);
        if (nodeData == undefined) {
            messageApi.error("Node data not found");
            return;
        }
        let nodeDataKeys = Object.keys(nodeData);
        let tempSettings = nodeDataKeys.filter(key => key != "children").map(key => ({
            key: key,
            value: nodeData[key]
        }));
        let accept = await showModal(() => {
            const [innerSettings, setInnerSettings] = useState(tempSettings);
            useEffect(() => {
                tempSettings = innerSettings;
            }, [innerSettings]);
            return <TableSettingsApp
                data={innerSettings}
                onChange={(key, value) => setInnerSettings(innerSettings.map(s => s.key === key ? { ...s, value: value } : s))} />
        }, {
            width: "80vw",
            height: "65vh",
            margin: "20px 0 0 0"
        });
        if (accept) {
            for (let setting of tempSettings) {
                nodeData[setting.key] = setting.value;
            }
            if (propsRef.current.onSaveData) {
                await propsRef.current.onSaveData(data);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        }
    }
    const onGenertate = async (nodeKey: string) => {
        const settings = getInterfaceSettings(propsRef.current.settings);
        let node = nodesRef.current.find(n => n.id === nodeKey);
        if (node == undefined) {
            messageApi.error("Node not found");
            return;
        }
        let raw = node.data.raw as IAnynomousNode;
        if (raw[settings.Topology.IDField ?? "key"] == undefined) {
            messageApi.error("Node key is undefined");
            return;
        }
        let result = await openInterfaceSettings({
            settings: propsRef.current.settings,
            showModal: showModal,
            onFilterKey: key => ["Topology.GenerateCommandLine", "Topology.IDField"].includes(key),
            mapKeys: {
                "Topology.GenerateCommandLine": "Command Line",
                "Topology.IDField": "Key Field",
            },
            otherSettings: [
                {
                    key: "Prompt",
                    value: localStorage.getItem("Topology.Generate.Prompt") ?? "",
                    placeholder: "The prompt will be replaced with the {prompt}"
                },
                {
                    key: "Context File Path",
                    value: localStorage.getItem("Topology.Generate.ContextFilePath") ?? "",
                    placeholder: "The context file path will be replaced with the {context_file_path}"
                }
            ]
        });
        if (result) {
            await Try({ useLoading: true }, async () => {
                await propsRef.current.onChangeSettings?.(result.interfaceSettings);
                let prompt = result.otherSettings.find(s => s.key === "Prompt")?.value as string;
                localStorage.setItem("Topology.Generate.Prompt", prompt);
                let contextFilePath = result.otherSettings.find(s => s.key === "Context File Path")?.value as string;
                localStorage.setItem("Topology.Generate.ContextFilePath", contextFilePath);
                let commandLine = getInterfaceSettings(result.interfaceSettings).Topology.GenerateCommandLine ?? "";
                commandLine = commandLine.replace("{key}", `"${raw[settings.Topology.IDField ?? "key"]}"`);
                commandLine = commandLine.replace("{prompt}", `"${prompt}"`);
                commandLine = commandLine.replace("{key_field}", `"${settings.Topology.IDField ?? "key"}"`);
                commandLine = commandLine.replace("{context_file_path}", `"${contextFilePath}"`);
                await propsRef.current.onGenerate?.(commandLine);
            });
        }
    }
    const updateConfigWithSave = async (callback: (config: { collapsedKeys?: string[] }) => { collapsedKeys?: string[] }) => {
        let newConfig = callback(configRef.current);
        if (propsRef.current.onSaveConfig) {
            await propsRef.current.onSaveConfig(newConfig);
        }
    }
    const onCollapse = async (nodeKey: string) => {
        await Try({ useLoading: true }, async () => {
            await updateConfigWithSave(old => ({ ...old, collapsedKeys: [...(old.collapsedKeys ?? []).filter(key => key !== nodeKey), nodeKey] }));
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        });
    }
    const onExpand = async (nodeKey: string) => {
        await Try({ useLoading: true }, async () => {
            await updateConfigWithSave(old => ({ ...old, collapsedKeys: [...(old.collapsedKeys ?? []).filter(key => key !== nodeKey)] }));
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        });
    }
    const onClearChildren = async (nodeKey: string) => {
        await Try({ useLoading: true }, async () => {
            const settings = getInterfaceSettings(propsRef.current.settings);
            let node = nodesRef.current.find(n => n.id === nodeKey);
            if (node == undefined) {
                messageApi.error("Node not found");
                return;
            }
            let raw = node.data.raw as IAnynomousNode;
            if (raw[settings.Topology.IDField ?? "key"] == undefined) {
                messageApi.error("Node key is undefined");
                return;
            }
            let data = propsRef.current.data;
            if (data == undefined) {
                messageApi.error("Data is undefined");
                return;
            }
            let nodeData = getNodeFromData(data, raw[settings.Topology.IDField ?? "key"], settings);
            if (nodeData == undefined) {
                messageApi.error("Node data not found");
                return;
            }
            nodeData.children = [];
            if (propsRef.current.onSaveData) {
                await propsRef.current.onSaveData(data);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        });
    }
    const onMoveTo = async (nodeKey: string, onIndex: (oldIndex: number, oldLength: number) => number) => {
        await Try({ useLoading: true }, async () => {
            const settings = getInterfaceSettings(propsRef.current.settings);
            let node = nodesRef.current.find(n => n.id === nodeKey);
            if (node == undefined) {
                messageApi.error("Node not found");
                return;
            }
            let raw = node.data.raw as IAnynomousNode;
            if (raw[settings.Topology.IDField ?? "key"] == undefined) {
                messageApi.error("Node key is undefined");
                return;
            }
            let parentKey = node.data.parentKey;
            if (parentKey == undefined) {
                messageApi.error("Node is the root");
                return;
            }
            let data = propsRef.current.data;
            if (data == undefined) {
                messageApi.error("Data is undefined");
                return;
            }
            let parentNodeData = getNodeFromData(data, parentKey, settings);
            if (parentNodeData == undefined) {
                messageApi.error("Parent node data not found");
                return;
            }
            let index = parentNodeData.children?.findIndex(item => item[settings.Topology.IDField ?? "key"] === raw[settings.Topology.IDField ?? "key"]);
            if (index == undefined) {
                messageApi.error("Node is not a child of the parent node");
                return;
            }
            if (parentNodeData.children == undefined || parentNodeData.children.length == 0) {
                messageApi.error("Parent node has no children");
                return;
            }
            let newIndex = onIndex(index, parentNodeData.children.length);
            if (newIndex == index) {
                return;
            }
            if (newIndex < 0 || newIndex > parentNodeData.children.length) {
                messageApi.error("New index is out of range");
                return;
            }
            // 先移除，再插入
            let indexNodeData = parentNodeData.children?.[index];
            if (indexNodeData == undefined) {
                messageApi.error("Node data not found");
                return;
            }
            parentNodeData.children?.splice(index, 1);
            // 插入newIndex位置
            parentNodeData.children?.splice(newIndex, 0, indexNodeData);
            if (propsRef.current.onSaveData) {
                await propsRef.current.onSaveData(data);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        });
    };
    const onMovePrevious = async (nodeKey: string) => {
        await onMoveTo(nodeKey, (index, length) => index - 1);
    };
    const onMoveNext = async (nodeKey: string) => {
        await onMoveTo(nodeKey, (index, length) => index + 1);
    };
    const onMoveLast = async (nodeKey: string) => {
        await onMoveTo(nodeKey, (index, length) => length - 1);
    };
    const onMoveFirst = async (nodeKey: string) => {
        await onMoveTo(nodeKey, (index, length) => 0);
    };
    const onAddChild = async (nodeKey: string) => {
        const settings = getInterfaceSettings(propsRef.current.settings);
        let node = nodesRef.current.find(n => n.id === nodeKey);
        if (node == undefined) {
            messageApi.error("Node not found");
            return;
        }
        let raw = node.data.raw as IAnynomousNode;
        if (raw[settings.Topology.IDField ?? "key"] == undefined) {
            messageApi.error("Node key is undefined");
            return;
        }
        let data = propsRef.current.data;
        if (data == undefined) {
            messageApi.error("Data is undefined");
            return;
        }
        let nodeData = getNodeFromData(data, raw[settings.Topology.IDField ?? "key"], settings);
        if (nodeData == undefined) {
            messageApi.error("Node data not found");
            return;
        }
        let tempSettings = [{
            key: settings.Topology.IDField ?? "key",
            value: "",
            placeholder: "The key of the child node"
        }];
        for (let field of settings.Topology.RequiredFields ?? []) {
            tempSettings.push({
                key: field,
                value: "",
                placeholder: `The ${field} of the child node`
            });
        }
        let accept = await showModal(() => {
            const [innerSettings, setInnerSettings] = useState(tempSettings);
            useEffect(() => {
                tempSettings = innerSettings;
            }, [innerSettings]);
            return <TableSettingsApp
                data={innerSettings}
                onChange={(key, value) => setInnerSettings(innerSettings.map(s => s.key === key ? { ...s, value: value } : s))} />
        }, {
            width: "80vw",
            height: "65vh",
            margin: "20px 0 0 0"
        });
        if (accept) {
            let newNode = {
                [settings.Topology.IDField ?? "key"]: tempSettings[0].value,
                children: [],
            };
            for (let field of settings.Topology.RequiredFields ?? []) {
                newNode[field] = tempSettings.find(s => s.key === field)?.value as string;
            }
            if (nodeData.children == undefined) {
                nodeData.children = [];
            }
            nodeData.children.push(newNode);
            if (propsRef.current.onSaveData) {
                await propsRef.current.onSaveData(data);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            await refreshRef.current(false);
        }
    };
    useEffect(() => {
        nodesRef.current = nodes;
        edgesRef.current = edges;
    }, [nodes, edges]);
    useEffect(() => {
        refreshRef.current(false);
    }, [props.settings]);
    useEffect(() => {
        refreshRef.current(false);
    }, [props.data]);
    useImperativeHandle(ref, () => ({
        fitView: onFitView,
        refresh: refreshRef.current,
    }), []);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        ...propsRef.current.style
    }}>
        {modalContainer}
        {messageContextHolder}
        <ReactFlow
            minZoom={0.1}
            maxZoom={4}
            nodes={nodes}
            edges={edges}
            edgeTypes={{
                default: BezierEdge,
            }}
            fitView={true}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesFocusable={false}
            proOptions={{ hideAttribution: true }}
            // onConnect={onConnect}
            onInit={() => { }}
        >
            <Panel position="top-right">
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "10px"
                }}>
                    <Tooltip placement="bottomLeft" title="Fit View"><ExpandOutlined onClick={onFitView} /></Tooltip>
                    <Tooltip placement="bottomLeft" title="Undo"><UndoOutlined onClick={() => propsRef.current.onUndo?.()} /></Tooltip>
                    <Tooltip placement="bottomLeft" title="Redo"><RedoOutlined onClick={() => propsRef.current.onRedo?.()} /></Tooltip>
                    <Tooltip placement="bottomLeft" title="Settings"><SettingOutlined onClick={onOpenSettings} /></Tooltip>
                </div>
            </Panel>
            <Background />
        </ReactFlow>
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
});

export const TopologyApp = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    return <ReactFlowProvider><TopologyAppInner {...props} ref={ref} /></ReactFlowProvider>
});