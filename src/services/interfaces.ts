export type Guid = string;
export type DateTime = string;

export interface IUserInfomation {
    isLogin: boolean,
    name?: string,
    id?: string,
    email?: string,
    avatar_url?: string,
    html_url?: string
}

export interface ILoginInfo {
    username: string,
    password: string,
    remember: boolean
}

export interface IProgress {
    dateTime?: string,
    progress: number,
    message?: string,
    parentID?: string,
    id?: string,
    status?: 'todo' | 'doing' | 'success' | 'failed',
    data?: any
}

export interface ILocation {
    x: number | "left" | "right" | "center" | string,
    y: number | "top" | "bottom" | "center" | string,
    width: number | string,
    height: number | string,
}
export interface ICommonFolder {
    name: string,
    type: "disk" | "user",
    path: string,
    icon?: string
}

export interface IFolderItem {
    name: string;
    type: "file" | "directory";
    path: string;
    modifyTime: string;
}

export interface IFileNode {
    name: string;
    fullPath:string;
    type: "file" | "directory";
    children?:IFileNode[];
}
