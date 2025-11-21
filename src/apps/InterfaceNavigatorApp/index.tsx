import { PlusOutlined } from "@ant-design/icons";
import { Button, message, Spin, Tree, TreeDataNode } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { IFileNode } from "../../services/interfaces";
import { usePropsRef, useUpdate } from "../../natived";
import { localServices } from "../../services/localServices";
import DirectoryTree from "antd/es/tree/DirectoryTree";
import InterfaceSVG from "../../svgs/Interface.svg?react";
import { FileDialog } from "../FileDialog";
import { pathUtils, useModal } from "../../services/utils";

export interface IInterfaceNavigatorAppProps {
    interfacePath: string;
    onChangeInterfacePath: (path: string) => void;
}
export interface IInterfaceNavigatorAppRef {

}

export interface IFileRecord extends IFileNode, TreeDataNode {
    key: string;
    children?: IFileRecord[];
}

export const InterfaceNavigatorApp = forwardRef<IInterfaceNavigatorAppRef, IInterfaceNavigatorAppProps>((props, ref) => {
    const propsRef = usePropsRef(props);
    const [messageApi, messageContextHolder] = message.useMessage();
    const [fileRecords, updateFileRecords, fileRecordsRef] = useUpdate<IFileRecord[]>([]);
    const { showModal, modalContainer } = useModal();
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
            if(propsRef.current.interfacePath == ""){
                console.log("Interface path is empty");
                updateFileRecords([]);
                return;
            }
            let isExist = await localServices.file.directoryExists(propsRef.current.interfacePath);
            if (isExist == false) {
                updateFileRecords([]);
                messageApi.error(`Project directory not found: ${propsRef.current.interfacePath}`);
                return;
            }
            let records = await localServices.file.listAll(propsRef.current.interfacePath);
            let transformedRecords = transform(records);
            console.log("Transformed records:", transformedRecords);
            updateFileRecords(transformedRecords);
        });
    });
    useEffect(() => {
        refreshRef.current();
    }, [props.interfacePath]);
    useEffect(() => {
        refreshRef.current();
    }, []);
    const onSelectProject = async () => {
        let currentFolder = props.interfacePath;
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
            props.onChangeInterfacePath(currentFolder);
        }
    };
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            position: "relative",
            height: "100%"
        }}>
            {messageContextHolder}
            {modalContainer}
            <div style={{
                display: "flex",
                flexDirection: "row",
                gap: "5px",
                alignItems: "center",
                flexWrap: "wrap"
            }}>
                <Button size={"small"}
                    type="text"
                    icon={<InterfaceSVG />}
                    onClick={onSelectProject}>{props.interfacePath != "" ? pathUtils.getFileName(props.interfacePath) : "Select Project"}</Button>
                <Button type="text" icon={<PlusOutlined />} />
            </div>
            <div style={{
                flex: 1,
                height: 0
            }}>
            <DirectoryTree
                blockNode
                treeData={fileRecords} />
            </div>
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