import { forwardRef, useCallback, useEffect, useRef } from "react";
import { Connection, Edge, Node } from "reactflow";
import { usePropsRef, useUpdate } from "../../natived";
import ELK, { ElkNode, LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { generateGUID } from "../../services/utils";

import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const elk = new ELK();

export interface IAnynomousData {
    label: React.ReactNode;
    parentKey?: string;
    isRoot?: boolean;
    hasChildren?: boolean;
    depth?: number;
    raw?: IAnynomousNode;
}


export const FlattenNodes = (parentKey: string | undefined, raw: IAnynomousNode[], depth: number, result: {
    nodes: Node<IAnynomousData>[],
    edges: Edge[]
}) => {
    raw.forEach(item => {
        const itemKey = item.key ?? generateGUID();
        result.nodes.push({
            id: itemKey,
            type: "mission",
            position: {
                x: 0,
                y: 0
            },
            data: {
                label: <div style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                }}>
                    <div>{item.name}</div>
                    <div style={{
                        flex: 1,
                        height: 0,
                        overflowY: "auto",
                        // 字体左上角对齐
                        textAlign: "left",
                    }}>{item.description}</div>
                </div>,
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
            FlattenNodes(itemKey, item.children, depth + 1, result);
        }
    });
}

export const LayoutNodes = (nodes: Node<IAnynomousData>[], edges: Edge[], nodeWidth: number, nodeHeight: number, options: LayoutOptions) => {
    const elkOptions = {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '80',
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
            width: nodeWidth,
            height: nodeHeight,
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
    data: IAnynomousNode[] | undefined
}

export interface ITopologyAppRef {
}

export interface IAnynomousNode {
    children?: IAnynomousNode[],
    [key: string]: any
}

export const TopologyApp = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    const propsRef = usePropsRef(props);
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds) as any), []);
    const refreshRef = useRef(async () => {
        if (propsRef.current.data == undefined) {
            setNodes([]);
            setEdges([]);
            return;
        }
        const tempNodes: Node<IAnynomousData>[] = [];
        const tempEdges: Edge[] = [];
        FlattenNodes(undefined, propsRef.current.data, 0, { nodes: tempNodes, edges: tempEdges });
        const result = await LayoutNodes(tempNodes, tempEdges, 200, 120, {
            "elk.direction": "DOWN"
        });
        console.log(result);
        setNodes(result?.nodes ?? []);
        setEdges(result?.edges ?? []);
    });
    useEffect(() => {
        refreshRef.current();
    }, [props.data]);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        ...propsRef.current.style
    }}>
        <ReactFlow
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
            <Background />
        </ReactFlow>
    </div>
});