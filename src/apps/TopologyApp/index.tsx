import { forwardRef, useCallback, useEffect } from "react";
import ReactFlow, { Edge, Node } from "reactflow";
import { MissionNode } from "./MissionNode";
import { useUpdate } from "../../natived";
import dagre from 'dagre';

export interface ITopologyAppProps {
    data: IAnynomousNode[]
}

export interface ITopologyAppRef {
}

export interface IAnynomousNode {
    children?: IAnynomousNode[],
    [key: string]: any
}

export const FlattenNodes = (parentKey: string | undefined, raw: IAnynomousNode[],depth: number, result: {
    nodes: Node<any, string | undefined>[],
    edges: Edge[]
}, options: {
    rawKeyField?: string
}) => {
    const { rawKeyField = "key" } = options;
    raw.forEach(item => {
        const itemKey = (item as any)[rawKeyField] as string;
        result.nodes.push({
            id: itemKey,
            type: "mission",
            position: {
                x: 0,
                y: 0
            },
            data: {
                parentKey: parentKey,
                isRoot: parentKey === undefined,
                hasChildren: item.children && item.children.length > 0,
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
    });

    raw.forEach(item => {
        const itemKey = (item as any)[rawKeyField] as string;
        if (item.children && item.children.length > 0) {
            FlattenNodes(itemKey, item.children, depth + 1, result, options);
        }
    });
}

export const LayoutNodes = (nodes: Node<any, string | undefined>[], edges: Edge[], direction = 'TB') => {
    const nodeWidth = 100;
    const nodeHeight = 100;
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 100,  // 节点间距
        ranksep: 120,  // 层级间距
        align: 'UL',   // 对齐方式
    });

    // 设置节点
    nodes.forEach(node => {
        dagreGraph.setNode(node.id, {
            width: nodeWidth,
            height: nodeHeight
        });
    });

    // 设置边
    edges.forEach(edge => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // 更新节点位置
    const layoutedNodes = nodes.map(node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            targetPosition: 'top',
            sourcePosition: 'bottom',
        };
    }) as Node<any, string | undefined>[];

    return { nodes: layoutedNodes, edges };
};

export const TopologyApp = forwardRef<ITopologyAppRef, ITopologyAppProps>((props, ref) => {
    const nodeTypes = {
        mission: MissionNode
    };
    const [nodes, updateNodes] = useUpdate<Node<any, string | undefined>[]>([]);
    const [edges, updateEdges] = useUpdate<Edge[]>([]);
    useEffect(() => {
        let tempNodes: Node<any, string | undefined>[] = [];
        let tempEdges: Edge[] = [];
        FlattenNodes(undefined, props.data, 0, { nodes: tempNodes, edges: tempEdges }, {
            rawKeyField: "key"
        });
        const { nodes: layoutedNodes, edges: layoutedEdges } = LayoutNodes(tempNodes, tempEdges);
        updateNodes(layoutedNodes);
        updateEdges(layoutedEdges);
    }, [props.data]);
    return <div style={{
        display: "flex",
        flexDirection: "column"
    }}>
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={() => { }}
            onEdgesChange={() => { }}
            onConnect={() => { }}
            onInit={() => { }}
        />
    </div>
});