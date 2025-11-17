import { PlusOutlined } from "@ant-design/icons";
import { Button, message, Spin, Tree, TreeDataNode } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { IFileNode } from "../../services/interfaces";
import { useUpdate } from "../../natived";
import { localServices } from "../../services/localServices";
import DirectoryTree from "antd/es/tree/DirectoryTree";

export interface IInterfaceNavigatorAppProps {
    interfacePath: string;
}
export interface IInterfaceNavigatorAppRef {

}

export interface IFileRecord extends IFileNode, TreeDataNode {
    key: string;
    children?: IFileRecord[];
}

export const InterfaceNavigatorApp = forwardRef<IInterfaceNavigatorAppRef, IInterfaceNavigatorAppProps>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [fileRecords, updateFileRecords, fileRecordsRef] = useUpdate<IFileRecord[]>([]);
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number;
        percent?: number;
        message?: string;
    }>({
        loading: 0,
        percent: undefined,
        message: undefined
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
    const refreshRef = useRef(async () => {
        const transform = (nodes: IFileNode[]): IFileRecord[] => {
            return nodes.map(item => ({
                key: item.fullPath,
                title: item.name,
                isLeaf: item.type === "file",
                ...item,
                children: item.children ? transform(item.children) : undefined
            } as IFileRecord));
        };
        await Try({ useLoading: true }, async () => {
            let records = await localServices.file.listAll(props.interfacePath);
            updateFileRecords(transform(records));
        });
    });
    useEffect(() => {
        refreshRef.current();
    }, [props.interfacePath]);
    useEffect(() => {
        refreshRef.current();
    }, []);
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            position: "relative"
        }}>
            {messageContextHolder}
            <div style={{
                display: 'flex',
                flexDirection: 'row'
            }}>
                <Button type="text" icon={<PlusOutlined />}>New Project</Button>
            </div>
            <DirectoryTree
                blockNode
                treeData={fileRecords} />
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