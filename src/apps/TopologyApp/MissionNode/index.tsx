import { ComponentType, forwardRef } from "react";
import { IAnynomousNode } from "..";
import { Handle, NodeProps, Position } from "reactflow";

export interface IMissionNodeProps {
    isRoot: boolean;
    parentKey: string | undefined;
    raw: IAnynomousNode;
    hasChildren: boolean;
    depth: number;
}


export const MissionNode: ComponentType<NodeProps> = ({ data, selected }) => {
    const { isRoot, parentKey, raw, hasChildren, depth } = data as IMissionNodeProps;
    const getNodeStyle = () => {
        const baseStyle: React.CSSProperties = {
            padding: '10px 16px',
            borderRadius: '8px',
            border: `2px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
            backgroundColor: 'white',
            boxShadow: selected ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
            minWidth: '150px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: isRoot ? '600' : '400',
        };

        // 根据深度设置不同颜色
        const depthColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const color = depthColors[Math.min(depth, depthColors.length - 1)];

        return {
            ...baseStyle,
            borderColor: selected ? '#6366f1' : color,
            backgroundColor: isRoot ? '#f8fafc' : 'white',
        };
    };

    return (
        <div style={getNodeStyle()}>
            {/* 输入句柄 - 只有非根节点才有 */}
            {!isRoot && (
                <Handle
                    type="target"
                    position={Position.Top}
                    style={{ background: '#6b7280' }}
                />
            )}

            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{raw.name}</div>
            {raw.description && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {raw.description}
                </div>
            )}

            {/* 输出句柄 - 只有有子节点的节点才有 */}
            {hasChildren && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    style={{ background: '#6b7280' }}
                />
            )}
        </div>
    );
};