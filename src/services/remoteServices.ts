import axios from "axios";
import SparkMD5 from 'spark-md5';
import { ILayoutTab } from "../pages/Home";
import { generateGUID } from "./utils";
import { BaseServices } from "./baseServices";
export type Guid = string;

const debug = import.meta.env.VITE_DEBUG === "true";
if (debug) {
    console.log("!!! Debug Mode");
}
const RemoteServices = () => {
    const base = BaseServices(undefined);
    const api = base.api;
    const getLayout = async () => {
        let response = await api.get("/layout.json");
        return response.data as {
            tabs?: ILayoutTab[]
        };
    };
    return {
        getLayout,
        ...base
    }
}

export const remoteServices = RemoteServices();