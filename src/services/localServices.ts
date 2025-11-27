import axios from "axios";
import { ICommonFolder, IFileNode, IFolderItem } from "./interfaces";
import { BaseServices } from "./baseServices";
const debug = import.meta.env.VITE_DEBUG === "true";
if (debug) {
    console.log("!!! Debug Mode");
}

export interface terminalOptions {
    shell?: string;
    workingDirectory?: string;
    environmentVariables?: any;
    columns?: number;
    rows?: number;
}

export interface ITerminalConstructor {
    initialize: () => Promise<void>;
    list: () => Promise<string[]>;
    create: (options: terminalOptions) => Promise<string>;
    close: (id: string) => Promise<void>;
    start: (id: string) => Promise<void>;
    listen: (onPredicate: (id: string) => boolean, callback: (id: string, bytes: Uint8Array) => void) => () => void;
    send: (id: string, data: string) => Promise<void>;
    resize: (id: string, rows: number, columns: number) => Promise<void>;
    save: (id: string, data: any) => Promise<void>;
    load: (id: string) => Promise<any>;
    debug: (message: string) => void;
}

const LocalServices = () => {
    const base = BaseServices((window as any).webapplication?.baseURL ?? "http://localhost:12332");
    const { api, runAsync, run } = base;
    const fileConstructor = () => {
        const list = async (path: string) => {
            let response = await run("file", {
                action: "list",
                path
            });
            return (response as {
                items: IFolderItem[]
            }).items;
        };
        const listAll = async (path: string) => {
            let response = await run("file", {
                action: "list-all",
                path
            });
            return (response as {
                nodes: IFileNode[]
            }).nodes;
        };
        const read = async (path: string) => {
            let response = await run("file", {
                action: "read",
                path
            });
            return (response as {
                content: string
            }).content;
        };
        const write = async (path: string, content: string) => {
            await run("file", {
                action: "write",
                path,
                content
            });
        };
        const commonFolders = async () => {
            let response = await run("file", {
                action: "common-folders"
            });
            return response as {
                items: ICommonFolder[]
            }
        };
        const directoryExists = async (path: string) => {
            let response = await run("file", {
                action: "directory-exists",
                path
            });
            return (response as {
                exists: boolean
            }).exists;
        };
        const fileExists = async (path: string) => {
            let response = await run("file", {
                action: "file-exists",
                path
            });
            return (response as {
                exists: boolean
            }).exists;
        };
        const createDirectory = async (path: string) => {
            await run("file", {
                action: "create-directory",
                path
            });
        };
        const deleteDirectory = async (path: string) => {
            await run("file", {
                action: "delete-directory",
                path
            });
        };
        const getDirectoryName = async (path: string) => {
            let response = await run("file", {
                action: "get-directory-name",
                path
            });
            return (response as {
                path: string
            }).path;
        };
        const getFileName = async (path: string) => {
            let response = await run("file", {
                action: "get-file-name",
                path
            });
            return (response as {
                name: string
            }).name;
        };
        const getFileExtension = async (path: string) => {
            let response = await run("file", {
                action: "get-file-extension",
                path
            });
            return (response as {
                extension: string
            }).extension;
        };
        const getFileNameWithoutExtension = async (path: string) => {
            let response = await run("file", {
                action: "get-file-name-without-extension",
                path
            });
            return (response as {
                name: string
            }).name;
        };
        const revealFileInExplorer = async (path: string) => {
            path = path.replace(/\//g, "\\");
            await run("file", {
                action: "reveal-file-in-explorer",
                path
            });
        };
        const openDirectoryInExplorer = async (path: string) => {
            path = path.replace(/\//g, "\\");
            await run("file", {
                action: "open-directory-in-explorer",
                path
            });
        };
        const readAppdata = async (path: string) => {
            let response = await run("file", {
                action: "read-appdata",
                path
            });
            return (response as {
                content: string
            }).content;
        };
        const writeAppdata = async (path: string, content: string) => {
            await run("file", {
                action: "write-appdata",
                path,
                content
            });
        };
        return {
            list,
            listAll,
            read,
            write,
            commonFolders,
            directoryExists,
            fileExists,
            createDirectory,
            deleteDirectory,
            getDirectoryName,
            getFileName,
            getFileExtension,
            getFileNameWithoutExtension,
            revealFileInExplorer,
            openDirectoryInExplorer,
            readAppdata,
            writeAppdata
        };
    };
    const file = fileConstructor();
    const terminalConstructor = () => {
        const debug = (message: string) => {
            // console.log(`[Terminal] ${new Date().toISOString()} ${message}`);
        };
        const terminalOutputRoute: Map<(id: string) => boolean, (id: string, bytes: Uint8Array) => void> = new Map();
        let ws: WebSocket | null = null;
        let startedResolve: Map<string, (value: void | PromiseLike<void>) => void> = new Map();
        let isStarted: Map<string, boolean> = new Map();
        let messageQueue: Map<string, Uint8Array[]> = new Map();
        const base64ToUint8Array = (base64: string): Uint8Array => {
            // 移除可能的 data URL 前缀（如 "data:image/png;base64,"）
            const base64Data = base64.replace(/^data:[^;]+;base64,/, '');

            // 解码 Base64 字符串
            const binaryString = atob(base64Data);

            // 将二进制字符串转换为 Uint8Array
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            return bytes;
        };
        const processMessageQueue = (terminalID: string) => {
            debug(`processMessageQueue: ${terminalID}`);
            if (messageQueue.has(terminalID) === false) {
                messageQueue.set(terminalID, []);
            }
            let queue = messageQueue.get(terminalID);
            if (queue === undefined) {
                return;
            }
            while (queue.length > 0) {
                let messageItem = queue.shift();
                if (messageItem) {
                    for (let [onPredicate, callback] of terminalOutputRoute.entries()) {
                        if (onPredicate(terminalID)) {
                            callback(terminalID, messageItem);
                        }
                    }
                }
            };
        };
        const initialize = () => {
            return new Promise<void>((resolve, reject) => {
                ws = new WebSocket(`ws://${api.defaults.baseURL?.substring(api.defaults.baseURL?.lastIndexOf("/") + 1)}/`);
                ws.binaryType = 'arraybuffer';
                ws.onopen = () => {
                    resolve();
                }
                ws.onmessage = (event) => {
                    let data = JSON.parse(event.data);
                    if (data.type === "terminal-output") {
                        let terminalID = data.terminalID;
                        // base64 decode, 采用浏览器自带的解码器
                        let output = base64ToUint8Array(data.output as string);
                        debug(`terminal-output: ${terminalID}, ${output.length}bytes`);
                        if (messageQueue.has(terminalID) === false) {
                            messageQueue.set(terminalID, []);
                        }
                        let queue = messageQueue.get(terminalID);
                        if (queue === undefined) {
                            return;
                        }
                        queue.push(output);
                        if (isStarted.get(terminalID)) {
                            processMessageQueue(terminalID);
                        }
                    }
                    else if (data.type === "terminal-started") {
                        debug(`terminal-started: ${data.terminalID}`);
                        processMessageQueue(data.terminalID);
                        isStarted.set(data.terminalID, true);
                        startedResolve.get(data.terminalID)?.();
                        startedResolve.delete(data.terminalID);
                    }
                }
                ws.onclose = () => {

                }
            });
        };
        const list = async () => {
            let response = await api.get("/api/v1/terminal/list");
            if (response.data.success) {
                return response.data.data as string[];
            }
            else {
                throw new Error(response.data.message);
            }
        }
        const create = async (options: terminalOptions) => {
            let response = await api.post("/api/v1/terminal/create", {
                options
            });
            if (response.data.success) {
                return response.data.data as string;
            }
            else {
                throw new Error(response.data.message);
            }
        }
        const close = async (id: string) => {
            ws?.send(JSON.stringify({
                url: "/api/v1/terminal/close",
                terminalID: id
            }));
        }
        const start = (id: string) => {
            return new Promise<void>((resolve, reject) => {
                startedResolve.set(id, resolve);
                isStarted.set(id, false);
                ws?.send(JSON.stringify({
                    url: "/api/v1/terminal/start",
                    terminalID: id
                }));
            });
        }
        const listen = (onPredicate: (id: string) => boolean, callback: (id: string, bytes: Uint8Array) => void) => {
            terminalOutputRoute.set(onPredicate, callback);
            return () => {
                terminalOutputRoute.delete(onPredicate);
            }
        }
        const send = async (id: string, data: string) => {
            ws?.send(JSON.stringify({
                url: "/api/v1/terminal/send",
                terminalID: id,
                data
            }));
        }
        const resize = async (id: string, rows: number, columns: number) => {
            ws?.send(JSON.stringify({
                url: "/api/v1/terminal/resize",
                terminalID: id,
                rows,
                columns
            }));
        }
        const save = async (id: string, data: any) => {
            ws?.send(JSON.stringify({
                url: "/api/v1/terminal/save",
                terminalID: id,
                data
            }));
        }
        const load = async (id: string) => {
            let response = await api.get("/api/v1/terminal/load", {
                params: { terminalID: id }
            });
            if (response.data.success) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message);
            }
        }
        return {
            initialize,
            list,
            create,
            close,
            start,
            listen,
            send,
            resize,
            save,
            load,
            debug
        } as ITerminalConstructor;
    };
    const historyConstructor = () => {
        const push = async (path: string, content: string) => {
            await run("history", {
                action: "push",
                path,
                content
            });
        }
        const undo = async (path: string) => {
            let response = await run("history", {
                action: "undo",
                path
            });
            return (response as {
                content: string
            }).content;
        }
        const redo = async (path: string) => {
            let response = await run("history", {
                action: "redo",
                path
            });
            return (response as {
                content: string
            }).content;
        }
        const count = async (path: string) => {
            let response = await run("history", {
                action: "count",
                path
            });
            return (response as {
                count: number
            }).count;
        }
        return {
            push,
            undo,
            redo,
            count
        }
    }
    const history = historyConstructor();
    return {
        file,
        terminalConstructor,
        history,
        ...base
    }
}

export const localServices = LocalServices();