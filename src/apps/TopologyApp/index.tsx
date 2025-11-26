import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Connection, Edge, Node } from "reactflow";
import { usePropsRef, useUpdate } from "../../natived";
import ELK, { ElkNode, LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { generateGUID, useModal } from "../../services/utils";

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
import { CloseOutlined, EditOutlined, ExpandOutlined, RedoOutlined, SettingOutlined, UndoOutlined } from "@ant-design/icons";
import { InputNumber, Input, Switch, Table, InputRef, message } from "antd";
import { ColumnProps } from "antd/es/table";

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
    settings: ITopologySettings;
    style?: React.CSSProperties;
    data: IAnynomousNode;
    onClose?: () => void;
    onEdit?: () => void;
}>((props, ref) => {
    let keys = Object.keys(props.data).filter(key => key !== "children" &&
        key !== "key" &&
        props.settings.FilterKeyFields.includes(key) == false &&
        key !== props.settings.TitleField
    );
    const titleValue = (props.settings.TitleField && props.settings.TitleField in props.data) ? props.data[props.settings.TitleField] : undefined;
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
                return <div style={{ textAlign: "left" }} key={key}>{props.settings.EnableKeyField ? `${key}: ` : ""}{props.data[key]}</div>
            })}
        </div>
        <div style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px"
        }}>
            <EditOutlined onClick={() => props.onEdit?.()} />
            <CloseOutlined onClick={() => props.onClose?.()} />
        </div>
    </div>
});

export interface ITopologySettings {
    EnableKeyField: boolean;
    FilterKeyFields: string[];
    TitleField?: string;
    NodeWidth?: number;
    NodeHeight?: number;
    IDField?: string;
}



export const LayoutNodes = (nodes: Node<IAnynomousData>[], edges: Edge[], settings: ITopologySettings, options: LayoutOptions) => {
    const elkOptions = {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '80',
        'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
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
            width: settings.NodeWidth ?? 300,
            height: settings.NodeHeight ?? 180,

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
    onChangeData: (data: IAnynomousNode[]) => Promise<void>;
    onSaveData: (data: IAnynomousNode[]) => Promise<void>;
    settings: ITopologySettingsRecord[];
    onChangeSettings: (settings: ITopologySettingsRecord[]) => Promise<void>;
    onUndo: () => Promise<void>;
    onRedo: () => Promise<void>;
}

export interface ITopologyAppRef {
    refresh: () => Promise<void>;
}

export interface IAnynomousNode {
    children?: IAnynomousNode[],
    [key: string]: any
}

export interface ITopologySettingsRecord {
    key: string;
    value: string | boolean | number;
    type: "string" | "boolean" | "number"
}

const TopologySettings = forwardRef<{}, {
    style?: React.CSSProperties;
    data: ITopologySettingsRecord[];
    onChange: (key: string, value: any) => void;
}>((props, ref) => {
    const columns: ColumnProps<ITopologySettingsRecord>[] = [
        {
            title: "Key",
            dataIndex: "key",
            key: "key",
        },
        {
            title: "Value",
            key: "value",
            render: (value: any, record: ITopologySettingsRecord, index: number) => {
                if (record.type === "string") {
                    return <Input defaultValue={record.value as string} onChange={e => props.onChange(record.key, e.target.value)} />
                }
                else if (record.type === "boolean") {
                    return <Switch defaultChecked={value.value as boolean} onChange={e => props.onChange(record.key, e)} />
                }
                else if (record.type === "number") {
                    return <InputNumber defaultValue={value.value as number} onChange={v => props.onChange(value.key, v)} />
                }
                return <div>{value.value}</div>
            }
        }
    ];
    return <div style={{
        display: "flex",
        flexDirection: "column",
        ...props.style
    }}>
        <Table columns={columns} dataSource={props.data} />
    </div>
});

const TopologyAppInner = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    const propsRef = usePropsRef(props);
    const [messageApi, messageContextHolder] = message.useMessage();
    const { showModal, modalContainer } = useModal();
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const nodesRef = useRef<Node<IAnynomousData>[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds) as any), []);
    const getSettings: () => ITopologySettings = () => {
        const getSetting = (key: string) => {
            return propsRef.current.settings.find(s => s.key === key)?.value as boolean | string | number | undefined;
        }
        return {
            EnableKeyField: (getSetting("EnableKeyField") as boolean) ?? true,
            FilterKeyFields: (getSetting("FilterKeyFields") as string).split(/[,，;；\s]+/).filter(s => s.trim() !== "") ?? [],
            TitleField: (getSetting("TitleField") as string) ?? undefined,
            NodeWidth: Number.isNaN(Number(getSetting("NodeWidth"))) ? 300 : Number(getSetting("NodeWidth")),
            NodeHeight: Number.isNaN(Number(getSetting("NodeHeight"))) ? 180 : Number(getSetting("NodeHeight")),
            IDField: (getSetting("IDField") as string) ?? "key",
        };
    }
    const FlattenNodes = (parentKey: string | undefined, raw: IAnynomousNode[], depth: number, settings: ITopologySettings, result: {
        nodes: Node<IAnynomousData>[],
        edges: Edge[]
    }) => {
        raw.forEach((item, index) => {
            const itemKey = item[settings.IDField ?? "key"] ?? generateGUID();
            result.nodes.push({
                id: itemKey,
                type: "mission",
                position: {
                    x: index,
                    y: depth
                },
                data: {
                    label: <AnynomousView style={{
                        width: "100%",
                        height: "100%",
                    }} settings={settings}
                        data={item}
                        onEdit={() => onEditNode(itemKey)}
                        onClose={() => onCloseNode(itemKey)} />,
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
                    type: 'smoothstep',
                });
            }
            if (item.children && item.children.length > 0) {
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
        const tempNodes: Node<IAnynomousData>[] = [];
        const tempEdges: Edge[] = [];
        const settings = getSettings();
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
        let tempSettings = propsRef.current.settings.map(s => ({ ...s }));
        let accept = await showModal(() => {
            const [innerSettings, setInnerSettings] = useState(tempSettings);
            useEffect(() => {
                tempSettings = innerSettings;
            }, [innerSettings]);
            return <TopologySettings
                data={innerSettings}
                onChange={(key, value) => setInnerSettings(innerSettings.map(s => s.key === key ? { ...s, value: value } : s))} />
        }, {
            width: "80vw",
            height: "65vh",
            margin: "20px 0 0 0"
        });
        if (accept) {
            propsRef.current.onChangeSettings?.(tempSettings);
            await refreshRef.current();
        }
    }
    const onEditNode = (nodeKey: string) => {

    }
    const removeKeyFromData = (data: IAnynomousNode[], key: string, settings: ITopologySettings) => {
        let result = data;
        if (data.some(item => item[settings.IDField ?? "key"] === key)) {
            result = result.filter(item => item[settings.IDField ?? "key"] !== key);
        }
        for (let item of result) {
            if (item.children && item.children.length > 0) {
                item.children = removeKeyFromData(item.children, key, settings);
            }
        }
        return result;
    }
    const onCloseNode = async (nodeKey: string) => {
        const settings = getSettings();
        let node = nodesRef.current.find(n => n.id === nodeKey);
        if (node == undefined) {
            messageApi.error("Node not found");
            return;
        }
        let raw = node.data.raw as IAnynomousNode;
        if (raw[settings.IDField ?? "key"] == undefined) {
            messageApi.error("Node key is undefined");
            return;
        }
        let data = propsRef.current.data;
        if (data == undefined) {
            messageApi.error("Data is undefined");
            return;
        }
        let newData = removeKeyFromData(data, raw[settings.IDField ?? "key"], settings);
        if (propsRef.current.onSaveData) {
            await propsRef.current.onSaveData(newData);
        }
        setNodes(nodesRef.current.filter(n => n.id !== nodeKey));
    }
    useEffect(() => {
        nodesRef.current = nodes;
        edgesRef.current = edges;
    }, [nodes, edges]);
    useEffect(() => {
        refreshRef.current(false);
    }, [props.settings]);
    useEffect(() => {
        refreshRef.current(true);
    }, [props.data]);
    useImperativeHandle(ref, () => ({
        refresh: () => refreshRef.current()
    }), []);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        ...propsRef.current.style
    }}>
        {modalContainer}
        {messageContextHolder}
        <ReactFlow
            minZoom={0.1}
            maxZoom={4}
            nodes={nodes}
            edges={edges}
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
                    <ExpandOutlined onClick={onFitView} />
                    <UndoOutlined onClick={() => propsRef.current.onUndo?.()} />
                    <RedoOutlined onClick={() => propsRef.current.onRedo?.()} />
                    <SettingOutlined onClick={onOpenSettings} />
                </div>
            </Panel>
            <Background />
        </ReactFlow>
    </div>
});

export const TopologyApp = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    return <ReactFlowProvider><TopologyAppInner {...props} ref={ref} /></ReactFlowProvider>
});